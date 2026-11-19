import React, { useState } from 'react';
import { UIChangeItem, MatchedSource } from '../types';
import { 
  Sparkles, 
  RotateCcw, 
  FileCode, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Copy, 
  ArrowRight,
  ArrowUpDown,
  Layers,
  Wand2
} from 'lucide-react';

interface ReactiveChangesDockProps {
  stagedChanges: UIChangeItem[];
  matchedSource: MatchedSource | null;
  onRemoveChange: (index: number) => void;
  onClearAllChanges: () => void;
  onOpenStaging: () => void;
  onGenerateWithLLM: () => void;
  onCopyPrompt: () => void;
  isGenerating: boolean;
  /** Direct-apply mode: skip the Monaco review and write generated changes straight to disk. */
  directApplyMode: boolean;
  onToggleDirectApply: () => void;
  /** True while a recent apply's backups can still be restored. */
  canUndoApply: boolean;
  onUndoApply: () => void;
}

// Presentation metadata for structural change types; existing types keep
// their original chips and no icon.
const STRUCTURAL_CHANGE_META: Partial<
  Record<UIChangeItem['type'], { icon: JSX.Element; chipClass: string }>
> = {
  reorder: {
    icon: <ArrowUpDown className="w-2.5 h-2.5" />,
    chipClass: 'bg-violet-500/20 text-violet-300'
  },
  duplicate: {
    icon: <Copy className="w-2.5 h-2.5" />,
    chipClass: 'bg-cyan-500/20 text-cyan-300'
  }
};

export const ReactiveChangesDock: React.FC<ReactiveChangesDockProps> = ({
  stagedChanges,
  matchedSource,
  onRemoveChange,
  onClearAllChanges,
  onOpenStaging,
  onGenerateWithLLM,
  onCopyPrompt,
  isGenerating,
  directApplyMode,
  onToggleDirectApply,
  canUndoApply,
  onUndoApply
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // Keep the dock mounted after an apply so the undo affordance stays
  // reachable even when the staged-changes list is now empty.
  if (stagedChanges.length === 0 && !canUndoApply) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-full px-4 animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-slate-900/95 backdrop-blur-md border border-purple-500/40 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header Strip */}
        <div className="px-4 py-2 bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border-b border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>Modifying App Live</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {stagedChanges.length} {stagedChanges.length === 1 ? 'change' : 'changes'}
              </span>
            </span>
            {matchedSource && (
              <span className="hidden sm:flex items-center space-x-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <FileCode className="w-3 h-3" />
                <span>{matchedSource.relativeHtmlPath}:{matchedSource.lineNumber}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              title={isMinimized ? "Expand changes dock" : "Minimize"}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Content Body (when not minimized) */}
        {!isMinimized && (
          <div className="p-3 space-y-2.5">
            {/* Horizontal scrollable changes list */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {stagedChanges.map((change, idx) => {
                const structural = STRUCTURAL_CHANGE_META[change.type];
                const chipClass = structural
                  ? `inline-flex items-center gap-0.5 ${structural.chipClass}`
                  : change.type === 'style'
                  ? 'bg-blue-500/20 text-blue-300'
                  : change.type === 'attribute'
                  ? 'bg-amber-500/20 text-amber-300'
                  : change.type === 'insert'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300';
                return (
                <div
                  key={idx}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] shrink-0 hover:border-slate-700 transition-all"
                >
                  <span className={`text-[9px] uppercase font-mono font-bold px-1 rounded ${chipClass}`}>
                    {structural?.icon}
                    {change.type}
                  </span>
                  <span className="font-semibold text-slate-300">{change.name}</span>
                  {change.value && (
                    <span className="text-slate-500 font-mono text-[10px] truncate max-w-[120px]">
                      &rarr; {change.value}
                    </span>
                  )}
                  <button
                    onClick={() => onRemoveChange(idx)}
                    className="ml-1 text-slate-500 hover:text-rose-400 transition-colors p-0.5 rounded hover:bg-slate-800"
                    title="Revert this change"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClearAllChanges}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Revert All</span>
                </button>
                <label
                  className="flex items-center gap-1 cursor-pointer select-none"
                  title="Direct apply: skip the diff review and write generated changes straight to disk"
                >
                  <input
                    type="checkbox"
                    checked={directApplyMode}
                    onChange={onToggleDirectApply}
                    className="accent-purple-500 w-3 h-3 cursor-pointer"
                  />
                  <span
                    className={
                      directApplyMode
                        ? 'text-purple-300 font-semibold text-[11px]'
                        : 'text-slate-500 text-[11px]'
                    }
                  >
                    Direct
                  </span>
                </label>
              </div>

              <div className="flex items-center space-x-2">
                {canUndoApply && (
                  <button
                    onClick={onUndoApply}
                    className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center space-x-1 transition-all"
                    title="Restore the pre-apply backups of the last applied change"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                )}
                <button
                  onClick={onCopyPrompt}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1 transition-all"
                  title="Copy formatted prompt for Antigravity"
                >
                  <Copy className="w-3 h-3" />
                  <span className="hidden sm:inline">Copy Prompt</span>
                </button>

                <button
                  onClick={onGenerateWithLLM}
                  disabled={isGenerating}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
                >
                  <Wand2 className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Writing Code...' : directApplyMode ? 'Apply Directly' : 'Apply with LLM'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
