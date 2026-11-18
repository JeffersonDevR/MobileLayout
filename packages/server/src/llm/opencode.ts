import { PromptBuilder, PromptContext } from './prompt';
import { LLMResponse } from './gemini';

export interface OpenCodeConfig {
  baseURL: string;
  apiKey?: string;
  modelName: string;
}

interface OpenCodeModelRef {
  providerID: string;
  id: string;
}

const DEFAULT_BASE_URL = 'http://localhost:4096';
const GENERATE_PATH = '/api/experimental/generate/text';

/**
 * Splits a "providerID/id" reference on the first slash. Values without a
 * slash are ignored so OpenCode falls back to its configured default model.
 */
function parseModelRef(modelName?: string): OpenCodeModelRef | undefined {
  const value = (modelName || '').trim();
  const slashIndex = value.indexOf('/');
  if (slashIndex <= 0 || slashIndex === value.length - 1) {
    return undefined;
  }
  const providerID = value.slice(0, slashIndex).trim();
  const id = value.slice(slashIndex + 1).trim();
  if (!providerID || !id) {
    return undefined;
  }
  return { providerID, id };
}

/** Extracts a human-readable message from an OpenCode error response body. */
function extractErrorMessage(status: number, body: string): string {
  let message = '';
  if (body) {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.message === 'string') {
          message = parsed.message;
        } else if (typeof parsed.error === 'string') {
          message = parsed.error;
        } else if (parsed.error && typeof parsed.error.message === 'string') {
          message = parsed.error.message;
        }
      }
    } catch {
      message = body;
    }
  }
  if (!message) {
    message = body || `HTTP ${status}`;
  }
  return `OpenCode API returned ${status}: ${message}`;
}

export class OpenCodeProvider {
  constructor(private config: OpenCodeConfig) {}

  public async generateCodeChanges(ctx: PromptContext): Promise<LLMResponse> {
    try {
      const systemPrompt = PromptBuilder.buildSystemPrompt();
      const userPrompt = PromptBuilder.buildUserPrompt(ctx);
      const prompt = `${systemPrompt}\n\n${userPrompt}`;

      const root = (this.config.baseURL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
      const url = `${root}${GENERATE_PATH}`;

      const requestBody: { prompt: string; model?: OpenCodeModelRef } = { prompt };
      const model = parseModelRef(this.config.modelName);
      if (model) {
        requestBody.model = model;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const apiKey = (this.config.apiKey || '').trim();
      if (apiKey) {
        // OpenCode serve uses HTTP Basic with the fixed username "opencode";
        // the configured apiKey is the server password sent as the Basic password.
        const credentials = Buffer.from(`opencode:${apiKey}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          explanation: '',
          error: extractErrorMessage(response.status, errorText)
        };
      }

      const data = (await response.json()) as any;
      const textOutput = data?.data?.text;

      if (!textOutput || typeof textOutput !== 'string') {
        return {
          success: false,
          explanation: '',
          error: 'OpenCode returned empty content.'
        };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(textOutput);
      } catch {
        // Fall back to the first {...} block so prose or markdown fences are tolerated.
        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Could not parse valid JSON from model response.');
        }
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Could not parse valid JSON from model response.');
        }
      }

      return {
        success: true,
        explanation: parsed.explanation || 'Applied visual UI changes.',
        updatedHtmlContent: parsed.updatedHtmlContent || undefined,
        updatedScssContent: parsed.updatedScssContent || undefined,
        rawResponse: textOutput
      };
    } catch (err: any) {
      return {
        success: false,
        explanation: '',
        error: err.message || String(err)
      };
    }
  }
}
