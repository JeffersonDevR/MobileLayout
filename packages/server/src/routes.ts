import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DevProxyManager } from './proxy';
import { ProjectScanner } from './scanner';
import { FilePatcher } from './patcher';
import { GeminiProvider } from './llm/gemini';
import { OpenCodeProvider } from './llm/opencode';
import { PromptBuilder, PromptContext } from './llm/prompt';
import { llmLogger } from './llm/logger';
import { mcpHub, MCP_TOOLS_DEFINITIONS, handleMcpToolCall } from './mcp-handler';

export interface AppState {
  targetUrl: string;
  projectPath: string;
  llmProvider: 'gemini' | 'opencode';
  geminiApiKey: string;
  geminiModel: string;
  openCodeBaseUrl: string;
  openCodeApiKey: string;
  openCodeModel: string;
}

const SETTINGS_FILE = path.resolve(__dirname, '../../mobile-layout-settings.json');

function loadPersistedSettings(state: AppState) {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (data.targetUrl) state.targetUrl = data.targetUrl;
      if (data.projectPath) state.projectPath = data.projectPath;
      if (data.llmProvider) state.llmProvider = data.llmProvider;
      if (data.geminiApiKey) state.geminiApiKey = data.geminiApiKey;
      if (data.geminiModel) state.geminiModel = data.geminiModel;
      if (data.openCodeBaseUrl) state.openCodeBaseUrl = data.openCodeBaseUrl;
      if (data.openCodeApiKey) state.openCodeApiKey = data.openCodeApiKey;
      if (data.openCodeModel !== undefined) state.openCodeModel = data.openCodeModel;
      console.log('[Settings] Loaded persisted model & API settings from disk.');
    }
  } catch (e: any) {
    console.warn('[Settings] Could not load persisted settings:', e.message);
  }
}

function savePersistedSettings(state: AppState) {
  try {
    const toSave = {
      targetUrl: state.targetUrl,
      projectPath: state.projectPath,
      llmProvider: state.llmProvider,
      geminiApiKey: state.geminiApiKey,
      geminiModel: state.geminiModel,
      openCodeBaseUrl: state.openCodeBaseUrl,
      openCodeApiKey: state.openCodeApiKey,
      openCodeModel: state.openCodeModel
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
    console.log('[Settings] Saved settings to disk:', SETTINGS_FILE);
  } catch (e: any) {
    console.warn('[Settings] Could not save persisted settings:', e.message);
  }
}

export function createApiRouter(proxyManager: DevProxyManager, state: AppState): Router {
  const router = Router();

  // Load any previously persisted settings from disk on router creation
  loadPersistedSettings(state);

  // Status & current config
  router.get('/status', (req: Request, res: Response) => {
    res.json({
      proxy: proxyManager.getStatus(),
      config: {
        projectPath: state.projectPath,
        projectExists: fs.existsSync(state.projectPath),
        targetUrl: state.targetUrl,
        llmProvider: state.llmProvider,
        geminiApiKey: state.geminiApiKey,
        geminiConfigured: !!state.geminiApiKey,
        geminiModel: state.geminiModel,
        openCodeBaseUrl: state.openCodeBaseUrl,
        openCodeApiKey: state.openCodeApiKey,
        openCodeModel: state.openCodeModel
      }
    });
  });

  // Update configuration
  router.post('/config', async (req: Request, res: Response) => {
    const {
      targetUrl,
      projectPath,
      llmProvider,
      geminiApiKey,
      geminiModel,
      openCodeBaseUrl,
      openCodeApiKey,
      openCodeModel
    } = req.body;

    if (targetUrl && targetUrl !== state.targetUrl) {
      state.targetUrl = targetUrl;
      await proxyManager.updateTarget(targetUrl);
    }

    if (projectPath !== undefined) state.projectPath = projectPath;
    if (llmProvider !== undefined) state.llmProvider = llmProvider;
    if (geminiApiKey !== undefined) state.geminiApiKey = geminiApiKey;
    if (geminiModel !== undefined) state.geminiModel = geminiModel;
    if (openCodeBaseUrl !== undefined) state.openCodeBaseUrl = openCodeBaseUrl;
    if (openCodeApiKey !== undefined) state.openCodeApiKey = openCodeApiKey;
    if (openCodeModel !== undefined) state.openCodeModel = openCodeModel;

    // Persist settings immediately to disk
    savePersistedSettings(state);

    res.json({
      success: true,
      config: {
        targetUrl: state.targetUrl,
        projectPath: state.projectPath,
        projectExists: fs.existsSync(state.projectPath),
        llmProvider: state.llmProvider,
        geminiApiKey: state.geminiApiKey,
        geminiModel: state.geminiModel,
        openCodeBaseUrl: state.openCodeBaseUrl,
        openCodeApiKey: state.openCodeApiKey,
        openCodeModel: state.openCodeModel
      }
    });
  });

  // Scan project to locate template corresponding to inspected element
  router.post('/scan-element', async (req: Request, res: Response) => {
    try {
      const { element, projectPath } = req.body;
      const rootDir = projectPath || state.projectPath;

      if (!rootDir || !fs.existsSync(rootDir)) {
        return res.status(400).json({
          error: `Project directory does not exist: ${rootDir}`
        });
      }

      const scanner = new ProjectScanner(rootDir);
      const match = await scanner.findMatchingElement(element);

      if (!match) {
        return res.json({
          found: false,
          message: 'No matching Angular template element found in src/app'
        });
      }

      res.json({
        found: true,
        match: {
          htmlFilePath: match.htmlFilePath,
          scssFilePath: match.scssFilePath,
          relativeHtmlPath: path.relative(rootDir, match.htmlFilePath),
          relativeScssPath: match.scssFilePath ? path.relative(rootDir, match.scssFilePath) : undefined,
          lineNumber: match.lineNumber,
          matchedSnippet: match.matchedSnippet,
          confidence: match.confidence,
          fullHtmlContent: match.fullHtmlContent,
          fullScssContent: match.fullScssContent
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Batch scan multiple Angular project elements to match template files
  router.post('/scan-elements', async (req: Request, res: Response) => {
    try {
      const { projectPath, elements } = req.body;
      const rootDir = projectPath || state.projectPath;

      if (!rootDir || !fs.existsSync(rootDir)) {
        return res.status(400).json({
          error: `Project directory does not exist: ${rootDir}`
        });
      }

      if (!Array.isArray(elements)) {
        return res.status(400).json({ error: 'elements must be an array' });
      }

      const scanner = new ProjectScanner(rootDir);
      const matches = await Promise.all(
        elements.map(async (el) => {
          const match = await scanner.findMatchingElement(el);
          if (!match) return { element: el, found: false };
          return {
            element: el,
            found: true,
            match: {
              htmlFilePath: match.htmlFilePath,
              scssFilePath: match.scssFilePath,
              relativeHtmlPath: path.relative(rootDir, match.htmlFilePath),
              relativeScssPath: match.scssFilePath ? path.relative(rootDir, match.scssFilePath) : undefined,
              lineNumber: match.lineNumber,
              matchedSnippet: match.matchedSnippet,
              confidence: match.confidence,
              fullHtmlContent: match.fullHtmlContent,
              fullScssContent: match.fullScssContent
            }
          };
        })
      );

      res.json({ matches });
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Generate clipboard prompt (ready for Antigravity or AI chat)
  router.post('/generate-clipboard-prompt', (req: Request, res: Response) => {
    const ctx: PromptContext = req.body;
    const prompt = PromptBuilder.buildClipboardPrompt(ctx);
    res.json({ prompt });
  });

  // LLM Logs endpoints
  router.get('/llm-logs', (req: Request, res: Response) => {
    res.json({ logs: llmLogger.getLogs() });
  });

  router.delete('/llm-logs', (req: Request, res: Response) => {
    llmLogger.clearLogs();
    res.json({ success: true });
  });

  // Call LLM (Gemini or OpenCode) to generate code modifications
  router.post('/generate-patch', async (req: Request, res: Response) => {
    const startTime = Date.now();
    let modelUsed = '';
    const ctx: PromptContext = req.body.context;
    const providerType = req.body.provider || state.llmProvider;

    // Hydrate template/scss if selectedComponents are present
    if ((!ctx.htmlFilePath || !ctx.fullHtmlContent) && ctx.selectedComponents && ctx.selectedComponents.length > 0) {
      const firstWithFile = ctx.selectedComponents.find((c) => c.htmlFilePath);
      if (firstWithFile && firstWithFile.htmlFilePath) {
        ctx.htmlFilePath = firstWithFile.htmlFilePath;
        if (!ctx.fullHtmlContent && fs.existsSync(firstWithFile.htmlFilePath)) {
          ctx.fullHtmlContent = fs.readFileSync(firstWithFile.htmlFilePath, 'utf-8');
        }
      }
    }

    const promptSummary = {
      elementTag: ctx?.selectedComponents?.length 
        ? `${ctx.selectedComponents.length} components: ${ctx.selectedComponents.map(c => `<${c.tagName}>`).slice(0, 3).join(', ')}`
        : ctx?.matchedSnippet ? ctx.matchedSnippet.slice(0, 30) : undefined,
      intent: ctx?.batchFixPrompt || ctx?.userIntent,
      stagedChangesCount: ctx?.visualChanges ? ctx.visualChanges.length : 0,
      selectedComponentsCount: ctx?.selectedComponents ? ctx.selectedComponents.length : 0,
      htmlFile: ctx?.htmlFilePath,
      scssFile: ctx?.scssFilePath
    };

    try {
      let result;

      if (providerType === 'gemini') {
        const apiKey = req.body.geminiApiKey || state.geminiApiKey;
        const model = req.body.geminiModel || state.geminiModel;
        modelUsed = model;

        if (!apiKey) {
          const errMsg = 'Gemini API key is not provided. Please set it in Studio Settings.';
          llmLogger.log({
            provider: 'gemini',
            model: modelUsed || 'gemini-2.5-flash',
            durationMs: Date.now() - startTime,
            status: 'error',
            promptSummary,
            error: errMsg,
            hasHtmlChanges: false,
            hasScssChanges: false
          });
          return res.status(400).json({ error: errMsg });
        }

        const gemini = new GeminiProvider(apiKey, model);
        result = await gemini.generateCodeChanges(ctx);
      } else {
        // OpenCode V2 native REST service
        const config = {
          baseURL: req.body.openCodeBaseUrl || state.openCodeBaseUrl,
          apiKey: req.body.openCodeApiKey || state.openCodeApiKey,
          modelName: req.body.openCodeModel || state.openCodeModel
        };
        modelUsed = config.modelName || 'opencode';

        const openCode = new OpenCodeProvider(config);
        result = await openCode.generateCodeChanges(ctx);
      }

      const durationMs = Date.now() - startTime;

      if (!result.success) {
        const errMsg = result.error || 'Failed to generate code changes.';
        llmLogger.log({
          provider: providerType,
          model: modelUsed,
          durationMs,
          status: 'error',
          promptSummary,
          error: errMsg,
          explanation: result.explanation,
          rawResponse: result.rawResponse,
          hasHtmlChanges: false,
          hasScssChanges: false
        });
        return res.status(500).json({ error: errMsg });
      }

      // Compute diff previews
      let htmlDiff = '';
      if (result.updatedHtmlContent && ctx.htmlFilePath) {
        htmlDiff = FilePatcher.previewDiff(ctx.htmlFilePath, result.updatedHtmlContent);
      }

      let scssDiff = '';
      if (result.updatedScssContent && ctx.scssFilePath) {
        scssDiff = FilePatcher.previewDiff(ctx.scssFilePath, result.updatedScssContent);
      }

      llmLogger.log({
        provider: providerType,
        model: modelUsed,
        durationMs,
        status: 'success',
        promptSummary,
        explanation: result.explanation,
        rawResponse: result.rawResponse,
        hasHtmlChanges: Boolean(result.updatedHtmlContent),
        hasScssChanges: Boolean(result.updatedScssContent)
      });

      res.json({
        success: true,
        explanation: result.explanation,
        updatedHtmlContent: result.updatedHtmlContent,
        updatedScssContent: result.updatedScssContent,
        htmlDiff,
        scssDiff,
        htmlFilePath: ctx.htmlFilePath,
        scssFilePath: ctx.scssFilePath
      });
    } catch (err: any) {
      const errMsg = err.message || String(err);
      llmLogger.log({
        provider: providerType,
        model: modelUsed || 'unknown',
        durationMs: Date.now() - startTime,
        status: 'error',
        promptSummary,
        error: errMsg,
        hasHtmlChanges: false,
        hasScssChanges: false
      });
      res.status(500).json({ error: errMsg });
    }
  });

  // Apply code patch directly to project files on disk
  router.post('/apply-patch', (req: Request, res: Response) => {
    const { htmlFilePath, updatedHtmlContent, scssFilePath, updatedScssContent } = req.body;

    const results: any = {};

    if (htmlFilePath && updatedHtmlContent !== undefined) {
      const htmlResult = FilePatcher.applyPatch({
        filePath: htmlFilePath,
        fullNewContent: updatedHtmlContent
      });
      results.html = htmlResult;
    }

    if (scssFilePath && updatedScssContent !== undefined) {
      const scssResult = FilePatcher.applyPatch({
        filePath: scssFilePath,
        fullNewContent: updatedScssContent
      });
      results.scss = scssResult;
    }

    const hasErrors =
      (results.html && !results.html.success) || (results.scss && !results.scss.success);

    if (hasErrors) {
      return res.status(500).json({
        success: false,
        results,
        error: results.html?.error || results.scss?.error || 'Failed to apply patch'
      });
    }

    res.json({
      success: true,
      message: 'Changes applied successfully to project files.',
      results
    });
  });

  // Canvas State synchronization endpoints
  router.get('/canvas-state', (req: Request, res: Response) => {
    res.json(mcpHub.getCanvasState());
  });

  router.post('/canvas-state', (req: Request, res: Response) => {
    mcpHub.updateCanvasState(req.body);
    res.json({ success: true });
  });

  // MCP Command endpoints
  router.get('/mcp-command/pending', (req: Request, res: Response) => {
    const commands = mcpHub.getPendingCommands();
    res.json({ commands });
  });

  router.post('/mcp-command/result', (req: Request, res: Response) => {
    const { id, result, error } = req.body;
    mcpHub.completeCommand(id, result, error);
    res.json({ success: true });
  });

  router.post('/mcp-command', (req: Request, res: Response) => {
    const { type, payload } = req.body;
    const cmd = mcpHub.queueCommand(type, payload);
    res.json({ success: true, command: cmd });
  });

  // Streamable HTTP MCP JSON-RPC Endpoint (for OpenCode and remote MCP clients)
  router.post('/mcp', async (req: Request, res: Response) => {
    const msg = req.body;
    if (!msg || typeof msg !== 'object') {
      return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: null });
    }

    const { id, method, params } = msg;

    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: params?.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'mobile-layout-mcp', version: '1.0.0' }
        }
      });
    }

    if (method === 'notifications/initialized') {
      return res.status(204).end();
    }

    if (method === 'ping') {
      return res.json({ jsonrpc: '2.0', id, result: {} });
    }

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS_DEFINITIONS
        }
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const proxyStatus = proxyManager.getStatus();
      const result = await handleMcpToolCall(toolName, toolArgs, state.projectPath, state.targetUrl, proxyStatus.port);
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: result.text }],
          isError: !!result.isError
        }
      });
    }

    return res.status(404).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    });
  });

  return router;
}
