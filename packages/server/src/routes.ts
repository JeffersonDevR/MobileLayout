import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DevProxyManager } from './proxy';
import { ProjectScanner } from './scanner';
import { FilePatcher } from './patcher';
import { GeminiProvider } from './llm/gemini';
import { OpenCodeProvider } from './llm/opencode';
import { PromptBuilder, PromptContext } from './llm/prompt';

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

export function createApiRouter(proxyManager: DevProxyManager, state: AppState): Router {
  const router = Router();

  // Status & current config
  router.get('/status', (req: Request, res: Response) => {
    res.json({
      proxy: proxyManager.getStatus(),
      config: {
        projectPath: state.projectPath,
        projectExists: fs.existsSync(state.projectPath),
        targetUrl: state.targetUrl,
        llmProvider: state.llmProvider,
        geminiConfigured: !!state.geminiApiKey,
        geminiModel: state.geminiModel,
        openCodeBaseUrl: state.openCodeBaseUrl,
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

    res.json({
      success: true,
      config: {
        targetUrl: state.targetUrl,
        projectPath: state.projectPath,
        projectExists: fs.existsSync(state.projectPath),
        llmProvider: state.llmProvider
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

  // Generate clipboard prompt (ready for Antigravity or AI chat)
  router.post('/generate-clipboard-prompt', (req: Request, res: Response) => {
    const ctx: PromptContext = req.body;
    const prompt = PromptBuilder.buildClipboardPrompt(ctx);
    res.json({ prompt });
  });

  // Call LLM (Gemini or OpenCode) to generate code modifications
  router.post('/generate-patch', async (req: Request, res: Response) => {
    try {
      const ctx: PromptContext = req.body.context;
      const providerType = req.body.provider || state.llmProvider;

      let result;

      if (providerType === 'gemini') {
        const apiKey = req.body.geminiApiKey || state.geminiApiKey;
        const model = req.body.geminiModel || state.geminiModel;

        if (!apiKey) {
          return res.status(400).json({
            error: 'Gemini API key is not provided. Please set it in Studio Settings.'
          });
        }

        const gemini = new GeminiProvider(apiKey, model);
        result = await gemini.generateCodeChanges(ctx);
      } else {
        // OpenCode V2 native REST service (service root, Bearer token, providerID/id model ref)
        const config = {
          baseURL: req.body.openCodeBaseUrl || state.openCodeBaseUrl,
          apiKey: req.body.openCodeApiKey || state.openCodeApiKey,
          modelName: req.body.openCodeModel || state.openCodeModel
        };

        const openCode = new OpenCodeProvider(config);
        result = await openCode.generateCodeChanges(ctx);
      }

      if (!result.success) {
        return res.status(500).json({ error: result.error || 'Failed to generate code changes.' });
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
      res.status(500).json({ error: err.message || String(err) });
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

  return router;
}
