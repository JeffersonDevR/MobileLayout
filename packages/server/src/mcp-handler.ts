import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ProjectScanner } from './scanner';
import { FilePatcher } from './patcher';
import { OpenCodeProvider } from './llm/opencode';
import { PromptContext, UIChangeItem } from './llm/prompt';
import { llmLogger } from './llm/logger';

/** Configuration used by the MCP generate-patch tool, sourced from the running server state. */
export interface McpGenerateConfig {
  llmProvider?: 'gemini' | 'opencode';
  openCodeBaseUrl?: string;
  openCodeApiKey?: string;
  openCodeModel?: string;
  projectPath?: string;
}

const SETTINGS_FILE = path.resolve(__dirname, '../../mobile-layout-settings.json');

/** Reads persisted Studio settings so the MCP route can reuse the server's LLM configuration. */
function readPersistedGenerateConfig(): McpGenerateConfig {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return {
        llmProvider: data.llmProvider,
        openCodeBaseUrl: data.openCodeBaseUrl,
        openCodeApiKey: data.openCodeApiKey,
        openCodeModel: data.openCodeModel,
        projectPath: data.projectPath
      };
    }
  } catch {
    // Settings are optional; generation falls back to safe defaults.
  }
  return {};
}

/** Resolves a project-relative file path and refuses anything that escapes the project root. */
function resolveWithinProject(projectRoot: string, relativePath: string): string | null {
  if (!projectRoot || !relativePath) return null;
  const root = path.resolve(projectRoot);
  const target = path.resolve(root, relativePath);
  const rel = path.relative(root, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return target;
}

export interface CanvasState {
  selectedElement: any | null;
  auditReport: any | null;
  activeDevice: any | null;
  stagedChanges: any[];
  safeArea: any | null;
  lastUpdated: string;
}

export interface McpCommand {
  id: string;
  type: 'apply_style' | 'apply_attribute' | 'update_text' | 'insert_component' | 'set_device' | 'run_audit' | 'revert_changes' | 'select_element';
  payload: any;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  result?: any;
}

class McpHubService {
  private canvasState: CanvasState = {
    selectedElement: null,
    auditReport: null,
    activeDevice: null,
    stagedChanges: [],
    safeArea: null,
    lastUpdated: new Date().toISOString()
  };

  private pendingCommands: McpCommand[] = [];
  private commandHistory: Map<string, McpCommand> = new Map();

  public getCanvasState(): CanvasState {
    return this.canvasState;
  }

  public updateCanvasState(partial: Partial<CanvasState>): void {
    this.canvasState = {
      ...this.canvasState,
      ...partial,
      lastUpdated: new Date().toISOString()
    };
  }

  public queueCommand(type: McpCommand['type'], payload: any): McpCommand {
    const cmd: McpCommand = {
      id: 'cmd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      type,
      payload,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    this.pendingCommands.push(cmd);
    this.commandHistory.set(cmd.id, cmd);
    return cmd;
  }

  public getPendingCommands(): McpCommand[] {
    const cmds = [...this.pendingCommands];
    this.pendingCommands = [];
    return cmds;
  }

  public completeCommand(id: string, result: any, error?: string): void {
    const cmd = this.commandHistory.get(id);
    if (cmd) {
      cmd.status = error ? 'failed' : 'completed';
      cmd.result = error ? { error } : result;
    }
  }

  public getCommandStatus(id: string): McpCommand | undefined {
    return this.commandHistory.get(id);
  }
}

export const mcpHub = new McpHubService();

/**
 * MCP Tools Definitions exposed to OpenCode and AI clients
 */
export const MCP_TOOLS_DEFINITIONS = [
  {
    name: 'mobile_layout_status',
    description: 'Get live status of MobileLayout Studio, connected target Angular/Ionic app, active device, and proxy state.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'mobile_layout_get_element',
    description: 'Get details of the currently inspected element or find an element by selector in the mobile canvas (tag, attributes, computed styles, box model, safe area insets, and layout warnings).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector (e.g. "ion-button#login-btn"). If omitted, returns the currently selected element.'
        }
      }
    }
  },
  {
    name: 'mobile_layout_apply_style',
    description: 'Apply live CSS styles to an element in the mobile preview canvas (e.g. minHeight="48px", paddingTop="47px", backgroundColor="#3880ff"). Renders immediately in the viewport.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to modify.'
        },
        styles: {
          type: 'object',
          description: 'Key-value map of CSS properties to apply.',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['styles']
    }
  },
  {
    name: 'mobile_layout_apply_attribute',
    description: 'Apply or update HTML attributes on an element in the mobile preview canvas (e.g. color="primary", fill="outline", expand="block", shape="round").',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to modify.'
        },
        attributes: {
          type: 'object',
          description: 'Key-value map of HTML attributes to apply.',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['attributes']
    }
  },
  {
    name: 'mobile_layout_update_text',
    description: 'Update the text content of an element in the live mobile preview (e.g. button labels, card titles, headlines).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element.'
        },
        text: {
          type: 'string',
          description: 'The new text content.'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'mobile_layout_insert_component',
    description: 'Insert an Ionic component or mobile template snippet into the live mobile canvas (e.g. buttons, cards, searchbars, login templates, or profile templates).',
    inputSchema: {
      type: 'object',
      properties: {
        snippet: {
          type: 'string',
          description: 'HTML markup snippet to insert.'
        },
        name: {
          type: 'string',
          description: 'Descriptive name of the inserted component.'
        },
        targetSelector: {
          type: 'string',
          description: 'CSS selector of element to insert near (defaults to active element or body).'
        },
        position: {
          type: 'string',
          enum: ['after', 'before', 'prepend', 'append'],
          description: 'Placement relative to target element (default: "after").'
        }
      },
      required: ['snippet']
    }
  },
  {
    name: 'mobile_layout_scan_source',
    description: 'Scan the Angular/Ionic project files on disk to locate the exact template (.html) and stylesheet (.scss) file and line number corresponding to an inspected mobile element.',
    inputSchema: {
      type: 'object',
      properties: {
        tagName: {
          type: 'string',
          description: 'Tag name of the element (e.g. "ion-button", "ion-card").'
        },
        id: {
          type: 'string',
          description: 'Element ID attribute if any.'
        },
        classList: {
          type: 'array',
          items: { type: 'string' },
          description: 'Class list array.'
        },
        textContent: {
          type: 'string',
          description: 'Text content snippet of the element.'
        },
        projectPath: {
          type: 'string',
          description: 'Optional custom Angular project root directory.'
        }
      },
      required: ['tagName']
    }
  },
  {
    name: 'mobile_layout_apply_source_patch',
    description: 'Write verified code changes directly to the Angular/Ionic component (.html and/or .scss) files on disk, triggering Angular HMR live reload with automatic backup.',
    inputSchema: {
      type: 'object',
      properties: {
        htmlFilePath: {
          type: 'string',
          description: 'Path to Angular template HTML file.'
        },
        updatedHtmlContent: {
          type: 'string',
          description: 'Full new HTML file content.'
        },
        scssFilePath: {
          type: 'string',
          description: 'Optional path to SCSS stylesheet file.'
        },
        updatedScssContent: {
          type: 'string',
          description: 'Optional new SCSS stylesheet content.'
        }
      }
    }
  },
  {
    name: 'mobile_layout_run_uiux_audit',
    description: 'Run a screen-wide mobile UI/UX and accessibility audit on the active mobile screen. Checks touch target hitboxes (Apple HIG 44px min), notch & home indicator safe area insets, WCAG AA color contrast, and Ionic component best practices.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'mobile_layout_set_device',
    description: 'Switch the active mobile viewport preset in MobileLayout (e.g. "pixel-8-pro", "galaxy-s24-ultra", "galaxy-s23", "iphone-15", "z-fold-5-open", "galaxy-tab-s9", "responsive").',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device preset ID (e.g. "pixel-8-pro", "galaxy-s24-ultra", "iphone-15").'
        },
        isLandscape: {
          type: 'boolean',
          description: 'Toggle landscape orientation.'
        }
      },
      required: ['deviceId']
    }
  },
  {
    name: 'mobile_layout_get_llm_logs',
    description: 'Retrieve the recent LLM telemetry logs recorded by MobileLayout Studio (prompts sent, model used, latency, generated patches, errors).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of log entries to return (default: 20).'
        }
      }
    }
  },
  {
    name: 'mobile_layout_generate_patch',
    description: 'Send a natural-language UI intent to the configured OpenCode service and return an HTML/SCSS diff for review. Never writes to disk; apply changes with mobile_layout_apply_source_patch after review.',
    inputSchema: {
      type: 'object',
      properties: {
        userIntent: {
          type: 'string',
          description: 'Natural-language description of the UI/UX change to generate.'
        },
        htmlFilePath: {
          type: 'string',
          description: 'Project-relative path to the Angular template (.html) being changed.'
        },
        scssFilePath: {
          type: 'string',
          description: 'Optional project-relative path to the stylesheet (.scss) being changed.'
        },
        matchedSnippet: {
          type: 'string',
          description: 'The exact template snippet of the selected element.'
        },
        fullHtmlContent: {
          type: 'string',
          description: 'Full current HTML content. If omitted, it is read from disk at htmlFilePath.'
        },
        fullScssContent: {
          type: 'string',
          description: 'Full current SCSS content. If omitted, it is read from disk at scssFilePath.'
        },
        visualChanges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['style', 'attribute', 'class', 'insert', 'remove', 'reorder', 'duplicate'] },
              name: { type: 'string' },
              value: { type: 'string' },
              previousValue: { type: 'string' },
              selector: { type: 'string', description: 'CSS selector identifying the element for structural changes.' },
              selectorPath: { type: 'string', description: 'Full selector path from the canvas root for unambiguous targeting.' },
              relativeTo: { type: 'string', description: 'reorder: the sibling element (selector or tag) the element moves relative to.' },
              direction: { type: 'string', enum: ['up', 'down'], description: 'reorder: movement direction relative to the sibling.' }
            },
            required: ['type', 'name', 'value']
          },
          description: 'Staged visual changes to apply. Structural types (reorder/duplicate/remove) identify elements by selector/selectorPath.'
        }
      },
      required: ['userIntent']
    }
  }
];

/**
 * Handle execution of an MCP tool call
 */
export async function handleMcpToolCall(
  name: string, 
  args: any, 
  projectPath: string, 
  targetUrl: string, 
  proxyPort: number,
  config?: McpGenerateConfig
): Promise<{ text: string; isError?: boolean }> {
  try {
    switch (name) {
      case 'mobile_layout_status': {
        const state = mcpHub.getCanvasState();
        const statusData = {
          studio: 'running',
          studioUrl: 'http://localhost:3300',
          proxyUrl: `http://localhost:${proxyPort}`,
          targetUrl,
          activeDevice: state.activeDevice?.name || 'iPhone 15 Pro',
          activeDeviceId: state.activeDevice?.id || 'iphone-15',
          platform: state.activeDevice?.platform || 'ios',
          selectedElement: state.selectedElement ? `<${state.selectedElement.tagName}>` : null,
          stagedChangesCount: state.stagedChanges?.length || 0,
          latestAuditScore: state.auditReport?.score ?? 'Not run yet',
          timestamp: new Date().toISOString()
        };
        return { text: JSON.stringify(statusData, null, 2) };
      }

      case 'mobile_layout_get_element': {
        const state = mcpHub.getCanvasState();
        if (state.selectedElement) {
          return { text: JSON.stringify(state.selectedElement, null, 2) };
        }
        return { 
          text: JSON.stringify({
            message: 'No element currently selected in MobileLayout canvas. Click any component in MobileLayout Studio or use mobile_layout_apply_style with a selector.',
            activeDevice: state.activeDevice
          }, null, 2)
        };
      }

      case 'mobile_layout_apply_style': {
        const { selector, styles } = args;
        const cmd = mcpHub.queueCommand('apply_style', { selector, styles });
        return {
          text: JSON.stringify({
            success: true,
            commandId: cmd.id,
            message: `Dispatched live CSS styles to MobileLayout canvas for element "${selector || 'selected'}"`,
            stylesApplied: styles
          }, null, 2)
        };
      }

      case 'mobile_layout_apply_attribute': {
        const { selector, attributes } = args;
        const cmd = mcpHub.queueCommand('apply_attribute', { selector, attributes });
        return {
          text: JSON.stringify({
            success: true,
            commandId: cmd.id,
            message: `Dispatched HTML attributes to MobileLayout canvas for element "${selector || 'selected'}"`,
            attributesApplied: attributes
          }, null, 2)
        };
      }

      case 'mobile_layout_update_text': {
        const { selector, text } = args;
        const cmd = mcpHub.queueCommand('update_text', { selector, text });
        return {
          text: JSON.stringify({
            success: true,
            commandId: cmd.id,
            message: `Dispatched text update to MobileLayout canvas: "${text}"`
          }, null, 2)
        };
      }

      case 'mobile_layout_insert_component': {
        const { snippet, name: compName, targetSelector, position } = args;
        const cmd = mcpHub.queueCommand('insert_component', {
          snippet,
          name: compName || 'Inserted Component',
          targetSelector,
          position: position || 'after'
        });
        return {
          text: JSON.stringify({
            success: true,
            commandId: cmd.id,
            message: `Dispatched component insertion to MobileLayout canvas: ${compName || 'Component'}`,
            snippetSnippet: snippet.slice(0, 80) + '...'
          }, null, 2)
        };
      }

      case 'mobile_layout_scan_source': {
        const pRoot = args.projectPath || projectPath;
        if (!pRoot) {
          return {
            isError: true,
            text: 'Project path is not configured. Please supply "projectPath" argument or set it in MobileLayout Studio settings.'
          };
        }
        const scanner = new ProjectScanner(pRoot);
        const match = await scanner.findMatchingElement({
          tagName: args.tagName,
          id: args.id,
          classList: args.classList,
          textContent: args.textContent
        });
        if (!match) {
          return {
            text: JSON.stringify({
              found: false,
              message: `No matching Angular template found in ${pRoot} for <${args.tagName}>`
            }, null, 2)
          };
        }
        return {
          text: JSON.stringify({
            found: true,
            htmlFilePath: match.htmlFilePath,
            scssFilePath: match.scssFilePath,
            lineNumber: match.lineNumber,
            confidence: match.confidence,
            matchedSnippet: match.matchedSnippet
          }, null, 2)
        };
      }

      case 'mobile_layout_apply_source_patch': {
        const { htmlFilePath, updatedHtmlContent, scssFilePath, updatedScssContent } = args;
        const results: any = {};

        if (htmlFilePath && updatedHtmlContent !== undefined) {
          results.html = FilePatcher.applyPatch({
            filePath: htmlFilePath,
            fullNewContent: updatedHtmlContent
          });
        }

        if (scssFilePath && updatedScssContent !== undefined) {
          results.scss = FilePatcher.applyPatch({
            filePath: scssFilePath,
            fullNewContent: updatedScssContent
          });
        }

        return {
          text: JSON.stringify({
            success: true,
            message: 'Source files written to disk. Angular hot reload (HMR) is triggering.',
            results
          }, null, 2)
        };
      }

      case 'mobile_layout_run_uiux_audit': {
        const state = mcpHub.getCanvasState();
        if (state.auditReport) {
          return {
            text: JSON.stringify(state.auditReport, null, 2)
          };
        }
        // Queue command to studio to run audit
        mcpHub.queueCommand('run_audit', {});
        return {
          text: JSON.stringify({
            message: 'Screen audit dispatched to MobileLayout Studio. Check back in a moment or view in Studio UX Audit panel.',
            status: 'queued'
          }, null, 2)
        };
      }

      case 'mobile_layout_set_device': {
        const { deviceId, isLandscape } = args;
        const cmd = mcpHub.queueCommand('set_device', { deviceId, isLandscape });
        return {
          text: JSON.stringify({
            success: true,
            commandId: cmd.id,
            message: `Dispatched device preset switch to "${deviceId}" (landscape: ${!!isLandscape})`
          }, null, 2)
        };
      }

      case 'mobile_layout_get_llm_logs': {
        const limit = args.limit || 20;
        const logs = llmLogger.getLogs().slice(0, limit);
        return {
          text: JSON.stringify({
            totalLogs: logs.length,
            logs
          }, null, 2)
        };
      }

      case 'mobile_layout_generate_patch': {
        const startTime = Date.now();
        const {
          userIntent,
          htmlFilePath,
          scssFilePath,
          matchedSnippet,
          fullHtmlContent,
          fullScssContent,
          visualChanges
        } = args || {};

        if (!userIntent || typeof userIntent !== 'string') {
          return {
            isError: true,
            text: 'Missing required "userIntent" string argument.'
          };
        }

        // Explicit injection wins; otherwise reuse the persisted Studio settings.
        const resolvedConfig: McpGenerateConfig = config || readPersistedGenerateConfig();
        const projectRoot = resolvedConfig.projectPath || projectPath;
        const modelUsed = resolvedConfig.openCodeModel || 'opencode';

        const promptSummary = {
          intent: userIntent,
          stagedChangesCount: Array.isArray(visualChanges) ? visualChanges.length : 0,
          htmlFile: htmlFilePath,
          scssFile: scssFilePath,
          elementTag: matchedSnippet ? String(matchedSnippet).slice(0, 30) : undefined
        };

        const fail = (message: string): { isError: true; text: string } => {
          llmLogger.log({
            provider: 'opencode',
            model: modelUsed,
            durationMs: Date.now() - startTime,
            status: 'error',
            promptSummary,
            error: message,
            hasHtmlChanges: false,
            hasScssChanges: false
          });
          return { isError: true, text: message };
        };

        if (!projectRoot) {
          return fail('Project path is not configured. Set it in MobileLayout Studio settings.');
        }

        const needsHtmlDisk = fullHtmlContent === undefined && !!htmlFilePath;
        const needsScssDisk = fullScssContent === undefined && !!scssFilePath;
        const safeHtmlPath = htmlFilePath ? resolveWithinProject(projectRoot, htmlFilePath) : null;
        const safeScssPath = scssFilePath ? resolveWithinProject(projectRoot, scssFilePath) : null;

        if (needsHtmlDisk && !safeHtmlPath) {
          return fail('Refused to read the HTML file: the path escapes the configured project root.');
        }
        if (needsScssDisk && !safeScssPath) {
          return fail('Refused to read the SCSS file: the path escapes the configured project root.');
        }

        let htmlContent: string | undefined = fullHtmlContent;
        let scssContent: string | undefined = fullScssContent;

        try {
          if (htmlContent === undefined) {
            if (!safeHtmlPath) {
              return fail('htmlFilePath is required when fullHtmlContent is not supplied.');
            }
            htmlContent = fs.readFileSync(safeHtmlPath, 'utf-8');
          }
          if (scssContent === undefined && safeScssPath && fs.existsSync(safeScssPath)) {
            scssContent = fs.readFileSync(safeScssPath, 'utf-8');
          }
        } catch (err: any) {
          return fail(`Could not read source files: ${err.message || String(err)}`);
        }

        const ctx: PromptContext = {
          htmlFilePath: htmlFilePath || '',
          scssFilePath: scssFilePath || undefined,
          matchedSnippet: matchedSnippet || '',
          fullHtmlContent: htmlContent || '',
          fullScssContent: scssContent,
          visualChanges: (Array.isArray(visualChanges) ? visualChanges : []) as UIChangeItem[],
          userIntent
        };

        try {
          const provider = new OpenCodeProvider({
            baseURL: resolvedConfig.openCodeBaseUrl || 'http://localhost:4096',
            apiKey: resolvedConfig.openCodeApiKey || '',
            modelName: resolvedConfig.openCodeModel || ''
          });
          const result = await provider.generateCodeChanges(ctx);

          if (!result.success) {
            return fail(result.error || 'Failed to generate code changes.');
          }

          const htmlDiff = result.updatedHtmlContent && safeHtmlPath
            ? FilePatcher.previewDiff(safeHtmlPath, result.updatedHtmlContent)
            : '';
          const scssDiff = result.updatedScssContent && safeScssPath
            ? FilePatcher.previewDiff(safeScssPath, result.updatedScssContent)
            : '';

          llmLogger.log({
            provider: 'opencode',
            model: modelUsed,
            durationMs: Date.now() - startTime,
            status: 'success',
            promptSummary,
            explanation: result.explanation,
            rawResponse: result.rawResponse,
            hasHtmlChanges: Boolean(result.updatedHtmlContent),
            hasScssChanges: Boolean(result.updatedScssContent)
          });

          // Diff and explanation only: no project file is ever written by this tool.
          return {
            text: JSON.stringify({
              success: true,
              explanation: result.explanation,
              htmlDiff,
              scssDiff,
              updatedHtmlContent: result.updatedHtmlContent,
              updatedScssContent: result.updatedScssContent,
              message: 'Diff generated for review. No files were written. Apply with mobile_layout_apply_source_patch after review.'
            }, null, 2)
          };
        } catch (err: any) {
          return fail(err.message || String(err));
        }
      }

      default:
        return {
          isError: true,
          text: `Unknown tool name: ${name}`
        };
    }
  } catch (err: any) {
    return {
      isError: true,
      text: `Error executing tool ${name}: ${err.message || String(err)}`
    };
  }
}
