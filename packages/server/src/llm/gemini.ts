import { PromptBuilder, PromptContext } from './prompt';

export interface LLMResponse {
  success: boolean;
  explanation: string;
  updatedHtmlContent?: string;
  updatedScssContent?: string;
  rawResponse?: string;
  error?: string;
}

export class GeminiProvider {
  constructor(
    private apiKey: string,
    private modelName: string = 'gemini-2.5-flash'
  ) {}

  public async generateCodeChanges(ctx: PromptContext): Promise<LLMResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          explanation: '',
          error: 'Gemini API key is not configured.'
        };
      }

      const systemPrompt = PromptBuilder.buildSystemPrompt();
      const userPrompt = PromptBuilder.buildUserPrompt(ctx);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        this.modelName
      )}:generateContent?key=${this.apiKey}`;

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          explanation: '',
          error: `Gemini API returned ${response.status}: ${errorText}`
        };
      }

      const data = (await response.json()) as any;
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        return {
          success: false,
          explanation: '',
          error: 'Gemini did not return any content.'
        };
      }

      // Parse JSON from output
      let parsed: any;
      try {
        parsed = JSON.parse(textOutput);
      } catch (err) {
        // Strip markdown backticks if present
        const cleaned = textOutput.replace(/```json\n?|```/g, '').trim();
        parsed = JSON.parse(cleaned);
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
