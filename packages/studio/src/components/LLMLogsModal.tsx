import React, { useState, useEffect } from 'react';
import { 
  X, 
  Terminal, 
  RefreshCw, 
  Trash2, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Cpu,
  FileCode
} from 'lucide-react';

export interface LLMLogEntry {
  id: string;
  timestamp: string;
  provider: 'gemini' | 'opencode';
  model: string;
  durationMs: number;
  status: 'success' | 'error';
  promptSummary: {
    elementTag?: string;
    intent?: string;
    stagedChangesCount: number;
    htmlFile?: string;
    scssFile?: string;
  };
  rawPrompt?: string;
  rawResponse?: string;
  explanation?: string;
  hasHtmlChanges: boolean;
  hasScssChanges: boolean;
  error?: string;
}

interface LLMLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LLMLogsModal: React.FC<LLMLogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LLMLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/llm-logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch LLM logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const handleClearLogs = async () => {
    try {
      await fetch('/api/llm-logs', { method: 'DELETE' });
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterStatus === 'success' && log.status !== 'success') return false;
    if (filterStatus === 'error' && log.status !== 'error') return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const modelMatch = log.model?.toLowerCase().includes(query);
      const intentMatch = log.promptSummary?.intent?.toLowerCase().includes(query);
      const fileMatch = log.promptSummary?.htmlFile?.toLowerCase().includes(query);
      const tagMatch = log.promptSummary?.elementTag?.toLowerCase().includes(query);
      return modelMatch || intentMatch || fileMatch || tagMatch;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">LLM Call Logs & Activity</h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {logs.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detailed telemetry for code generation calls to Gemini and OpenCode
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center space-x-1"
              title="Refresh logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 text-slate-300 transition-all text-xs flex items-center space-x-1"
                title="Clear all logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Filters & Search */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilterStatus('success')}
              className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                filterStatus === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>Success ({logs.filter(l => l.status === 'success').length})</span>
            </button>
            <button
              onClick={() => setFilterStatus('error')}
              className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                filterStatus === 'error'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>Errors ({logs.filter(l => l.status === 'error').length})</span>
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by model, intent, file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
              <Terminal className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-medium text-slate-400">No LLM Call Logs Found</p>
              <p className="text-xs text-slate-600 max-w-sm mt-1">
                When you generate code modifications using Gemini or OpenCode, all prompts, latencies, responses, and diffs will appear here in real-time.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={log.id}
                  className={`border rounded-xl transition-all ${
                    log.status === 'success'
                      ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      : 'border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50'
                  }`}
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-3">
                      {log.status === 'success' ? (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-slate-200">
                            {log.promptSummary.intent || 'Visual UI Modification'}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded border bg-slate-800 text-slate-400 border-slate-700">
                            {log.provider}
                          </span>
                          <span className="text-[10px] font-mono text-purple-300">
                            {log.model}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-600" />
                            <span>{dateStr}</span>
                          </span>
                          <span>&bull;</span>
                          <span className="font-mono text-slate-400">{log.durationMs}ms</span>
                          {log.promptSummary.htmlFile && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono text-slate-400 truncate max-w-xs">
                                {log.promptSummary.htmlFile.split(/[/\\]/).slice(-2).join('/')}
                              </span>
                            </>
                          )}
                          <span>&bull;</span>
                          <span className="text-slate-400">
                            {log.promptSummary.stagedChangesCount} changes
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {log.status === 'success' ? (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Applied
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          Error
                        </span>
                      )}

                      <button className="text-slate-400 hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-3 text-xs bg-slate-950/60">
                      {log.error && (
                        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 space-y-1">
                          <span className="font-semibold block text-[11px]">Error Description:</span>
                          <p className="font-mono text-[11px] whitespace-pre-wrap">{log.error}</p>
                        </div>
                      )}

                      {log.explanation && (
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                          <span className="font-semibold text-purple-300 block text-[11px]">LLM Explanation:</span>
                          <p className="text-slate-300 text-xs leading-relaxed">{log.explanation}</p>
                        </div>
                      )}

                      {/* Code changes indicator */}
                      <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <FileCode className="w-3.5 h-3.5 text-blue-400" />
                          <span>HTML Modified: {log.hasHtmlChanges ? 'Yes' : 'No'}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <FileCode className="w-3.5 h-3.5 text-pink-400" />
                          <span>SCSS Modified: {log.hasScssChanges ? 'Yes' : 'No'}</span>
                        </span>
                      </div>

                      {/* Raw Response snippet */}
                      {log.rawResponse && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Raw LLM Output</span>
                            <button
                              onClick={() => handleCopy(log.rawResponse!, log.id)}
                              className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1"
                            >
                              {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === log.id ? 'Copied' : 'Copy Response'}</span>
                            </button>
                          </div>
                          <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px] max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {log.rawResponse}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
