import React, { useState } from 'react';
import { UIChangeItem, MatchedSource } from '../types';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  FileCode, 
  AlertCircle,
  Loader2,
  Send
} from 'lucide-react';

interface StagingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stagedChanges: UIChangeItem[];
  onRemoveChange: (index: number) => void;
  onClearChanges: () => void;
  matchedSource: MatchedSource | null;
  userIntent: string;
  onChangeUserIntent: (intent: string) => void;
  onGenerateWithLLM: () => void;
  onCopyPrompt: () => void;
  isGenerating: boolean;
  llmProvider: 'gemini' | 'opencode';
}

export const StagingDrawer: React.FC<StagingDrawerProps> = ({
  isOpen,
  onClose,
  stagedChanges,
  onRemoveChange,
  onClearChanges,
  matchedSource,
  userIntent,
  onChangeUserIntent,
  onGenerateWithLLM,
  onCopyPrompt,
  isGenerating,
  llmProvider
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    onCopyPrompt();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col select-none animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Staged Changes & LLM Hub</h2>
            <span className="text-[10px] text-slate-400">
              {stagedChanges.length} visual change{stagedChanges.length === 1 ? '' : 's'} staged
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Target File Context */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800 text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
          Target Component
        </span>
        {matchedSource ? (
          <div className="flex items-center space-x-2 text-emerald-400 font-mono text-[11px] truncate">
            <FileCode className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{matchedSource.relativeHtmlPath}:{matchedSource.lineNumber}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-amber-400 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Select an element to target its Angular template</span>
          </div>
        )}
      </div>

      {/* Changes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-300">Visual Delta Queue</span>
          {stagedChanges.length > 0 && (
            <button
              onClick={onClearChanges}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {stagedChanges.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            No visual changes recorded yet. Click an element and tweak styles or attributes in the Inspector panel!
          </div>
        ) : (
          stagedChanges.map((change, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-800/40 text-xs"
            >
              <div className="truncate mr-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300 mr-1.5">
                  {change.type}
                </span>
                <span className="font-mono text-purple-300">{change.name}</span>
                <span className="text-slate-400 mx-1">→</span>
                <span className="font-mono text-slate-200 font-medium">"{change.value}"</span>
              </div>

              <button
                onClick={() => onRemoveChange(idx)}
                className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}

        {/* User Prompt & Intent */}
        <div className="pt-4 border-t border-slate-800 mt-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Design Intent Note (Optional)
          </label>
          <textarea
            value={userIntent}
            onChange={(e) => onChangeUserIntent(e.target.value)}
            placeholder="e.g. Modernize this card with subtle borders, secondary color outline, and ensure mobile padding..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-purple-500 resize-none placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Drawer Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-2">
        {/* Main Generate Button */}
        <button
          onClick={onGenerateWithLLM}
          disabled={isGenerating || !matchedSource}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Code with {llmProvider === 'gemini' ? 'Gemini' : 'OpenCode'}...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Code Changes ({llmProvider.toUpperCase()})</span>
            </>
          )}
        </button>

        {/* Copy Prompt for Antigravity */}
        <button
          onClick={handleCopy}
          disabled={!matchedSource}
          className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-blue-400" />
              <span>Copy Prompt for Antigravity</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
