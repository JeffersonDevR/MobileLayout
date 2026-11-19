export interface LLMPromptSummary {
  elementTag?: string;
  intent?: string;
  stagedChangesCount: number;
  htmlFile?: string;
  scssFile?: string;
}

export interface LLMLogEntry {
  id: string;
  timestamp: string;
  provider: 'gemini' | 'opencode';
  model: string;
  durationMs: number;
  status: 'success' | 'error';
  promptSummary: LLMPromptSummary;
  rawPrompt?: string;
  rawResponse?: string;
  explanation?: string;
  hasHtmlChanges: boolean;
  hasScssChanges: boolean;
  error?: string;
}

class LLMLoggerService {
  private logs: LLMLogEntry[] = [];
  private readonly maxLogs = 100;

  public log(entry: Omit<LLMLogEntry, 'id' | 'timestamp'>): LLMLogEntry {
    const fullEntry: LLMLogEntry = {
      ...entry,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      timestamp: new Date().toISOString()
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    return fullEntry;
  }

  public getLogs(): LLMLogEntry[] {
    return this.logs;
  }

  public clearLogs(): void {
    this.logs = [];
  }
}

export const llmLogger = new LLMLoggerService();
