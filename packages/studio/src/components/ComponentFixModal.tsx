import React, { useState } from 'react';
import { 
  SelectedComponentItem, 
  MatchedSource, 
  ElementDetails, 
  ScreenAuditReport 
} from '../types';
import { 
  Wrench, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  FileCode, 
  AlertTriangle, 
  Loader2, 
  X, 
  Crosshair, 
  ShieldCheck, 
  CheckCircle2,
  Sliders,
  Send,
  Plus,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ComponentFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedComponents: SelectedComponentItem[];
  onRemoveComponent: (id: string) => void;
  onClearComponents: () => void;
  onUpdateComponentNote: (id: string, note: string) => void;
  onAddCurrentElement: () => void;
  onAddAuditElements: () => void;
  onHighlightComponent: (selector: string) => void;
  currentInspectedElement: ElementDetails | null;
  currentMatchedSource: MatchedSource | null;
  auditReport: ScreenAuditReport | null;
  llmProvider: 'gemini' | 'opencode';
  isGenerating: boolean;
  onGenerateBatchFix: (prompt: string, components: SelectedComponentItem[]) => void;
  onCopyBatchPrompt: (prompt: string, components: SelectedComponentItem[]) => void;
  onOpenSettings?: () => void;
}

const QUICK_FIX_PRESETS = [
  {
    id: 'safe-area',
    icon: '📱',
    label: 'Fix Safe Area Insets (Notch & Home Bar)',
    prompt: 'Add safe-area-inset-top padding to the top toolbar/header to avoid the camera notch, and ensure bottom footer buttons/navigation account for the safe-area-inset-bottom home indicator.'
  },
  {
    id: 'touch-target',
    icon: '👆',
    label: 'Apple HIG Touch Targets (≥ 44px)',
    prompt: 'Enlarge all buttons and interactive clickable elements to have a minimum touch hitbox of 48px height conforming to Apple Human Interface Guidelines and Material 3.'
  },
  {
    id: 'ionic-modern',
    icon: '🎨',
    label: 'Ionic Design Tokens & Modern Dark Cards',
    prompt: 'Apply modern Ionic design tokens: color="primary" on main actions, fill="outline" or "clear" on secondary actions, shape="round", and modernize cards with 16px border-radius and subtle borders.'
  },
  {
    id: 'responsive-spacing',
    icon: '⚡',
    label: 'Responsive Spacing & Mobile Gutters',
    prompt: 'Remove hardcoded fixed pixel widths that cause horizontal scrolling, use responsive flexbox layout with 12px gap, and ensure 16px standard mobile edge padding.'
  },
  {
    id: 'accessibility',
    icon: '♿',
    label: 'WCAG Contrast & Accessibility Polish',
    prompt: 'Ensure text and icon colors meet WCAG AA contrast standards, add descriptive aria-labels to icon-only buttons, and increase typography font size to minimum 14px.'
  }
];

export const ComponentFixModal: React.FC<ComponentFixModalProps> = ({
  isOpen,
  onClose,
  selectedComponents,
  onRemoveComponent,
  onClearComponents,
  onUpdateComponentNote,
  onAddCurrentElement,
  onAddAuditElements,
  onHighlightComponent,
  currentInspectedElement,
  currentMatchedSource,
  auditReport,
  llmProvider,
  isGenerating,
  onGenerateBatchFix,
  onCopyBatchPrompt,
  onOpenSettings
}) => {
  const [fixPrompt, setFixPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (presetPrompt: string) => {
    setFixPrompt((prev) => {
      if (!prev.trim()) return presetPrompt;
      return `${prev.trim()}\n\n• ${presetPrompt}`;
    });
  };

  const handleCopy = () => {
    onCopyBatchPrompt(fixPrompt, selectedComponents);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCurrentElementAlreadySelected = currentInspectedElement 
    ? selectedComponents.some((c) => c.selectorPath === currentInspectedElement.selectorPath)
    : false;

  const targetFileSet = new Set<string>();
  selectedComponents.forEach((c) => {
    if (c.matchedSource?.relativeHtmlPath) {
      targetFileSet.add(c.matchedSource.relativeHtmlPath);
    }
  });

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Component Fix Hub</h2>
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 font-mono text-[11px] font-bold">
                  {selectedComponents.length} selected
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  {llmProvider.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Select multiple components, describe the required fixes or pick presets, and generate surgical Angular/Ionic code updates.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Selected Components List (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-800 flex flex-col bg-slate-950/40 overflow-hidden">
            
            {/* Action Bar */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 gap-2 flex-wrap">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-300">Selected Components</span>
                <span className="text-[10px] text-slate-500">({selectedComponents.length})</span>
              </div>

              <div className="flex items-center space-x-1">
                {currentInspectedElement && !isCurrentElementAlreadySelected && (
                  <button
                    onClick={onAddCurrentElement}
                    className="px-2 py-1 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30 text-[11px] font-medium flex items-center space-x-1 transition-all"
                    title={`Add <${currentInspectedElement.tagName}> to fix list`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Inspected</span>
                  </button>
                )}

                {auditReport && auditReport.issues.length > 0 && (
                  <button
                    onClick={onAddAuditElements}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-[11px] font-medium flex items-center space-x-1 transition-all"
                    title="Add all elements flagged with UX issues to fix list"
                  >
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>Add Issues ({auditReport.issues.length})</span>
                  </button>
                )}

                {selectedComponents.length > 0 && (
                  <button
                    onClick={onClearComponents}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Clear all selected components"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Components Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {selectedComponents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800/80 rounded-xl text-slate-500">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-500 mb-3">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-1">No Components Selected Yet</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mb-4">
                    Click elements on the mobile canvas and click <strong>"+ Add to Fix Hub"</strong>, or use the quick buttons below.
                  </p>

                  <div className="space-y-1.5 w-full max-w-xs">
                    {currentInspectedElement ? (
                      <button
                        onClick={onAddCurrentElement}
                        className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add &lt;{currentInspectedElement.tagName}&gt;</span>
                      </button>
                    ) : (
                      <div className="text-[10px] text-slate-600">
                        (Inspect any element on the preview to add it)
                      </div>
                    )}

                    {auditReport && auditReport.issues.length > 0 && (
                      <button
                        onClick={onAddAuditElements}
                        className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition-all"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Add All {auditReport.issues.length} UX Audit Elements</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                selectedComponents.map((comp, idx) => (
                  <div
                    key={comp.id || idx}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-xs space-y-2 group"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="font-mono font-bold text-violet-300 px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[11px]">
                          &lt;{comp.tagName}&gt;
                        </span>
                        {comp.elementId && (
                          <span className="font-mono text-slate-400 text-[11px] truncate">
                            #{comp.elementId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onHighlightComponent(comp.selectorPath)}
                          className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Highlight on mobile canvas"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveComponent(comp.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove from fix list"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Matched Source File */}
                    {comp.matchedSource && (
                      <div className="flex items-center space-x-1.5 font-mono text-[10px] text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 truncate">
                        <FileCode className="w-3 h-3 shrink-0" />
                        <span className="truncate">{comp.matchedSource.relativeHtmlPath}:{comp.matchedSource.lineNumber}</span>
                      </div>
                    )}

                    {/* Warnings/Issues Badges */}
                    {comp.layoutWarnings && comp.layoutWarnings.length > 0 && (
                      <div className="space-y-1">
                        {comp.layoutWarnings.map((w, wIdx) => (
                          <div 
                            key={wIdx} 
                            className="flex items-start space-x-1.5 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded leading-tight"
                          >
                            <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400 mt-0.5" />
                            <span>{w.title}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Snippet preview */}
                    {comp.matchedSource?.matchedSnippet && (
                      <pre className="text-[10px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/80 overflow-x-auto max-h-16 truncate whitespace-pre">
                        {comp.matchedSource.matchedSnippet.trim()}
                      </pre>
                    )}

                    {/* Per-component fix note */}
                    <div>
                      <input
                        type="text"
                        value={comp.fixNote || ''}
                        onChange={(e) => onUpdateComponentNote(comp.id, e.target.value)}
                        placeholder="Specific fix note for this component (optional)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 outline-none focus:border-violet-500 placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {selectedComponents.length > 0 && (
              <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
                <span>{selectedComponents.length} component{selectedComponents.length === 1 ? '' : 's'} staged</span>
                <span>{targetFileSet.size} file{targetFileSet.size === 1 ? '' : 's'} affected</span>
              </div>
            )}
          </div>

          {/* Right Column: Prompt & Presets (7 cols) */}
          <div className="md:col-span-7 flex flex-col bg-slate-900 overflow-hidden">
            
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              
              {/* Presets Header */}
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  1-Click Mobile & Ionic Fix Presets
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_FIX_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleApplyPreset(p.prompt)}
                      className="text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-violet-500/40 transition-all group"
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm">{p.icon}</span>
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-violet-300 transition-colors truncate">
                          {p.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {p.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Prompt Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Specific Fix Prompt for Selected Components
                  </label>
                  {fixPrompt && (
                    <button
                      onClick={() => setFixPrompt('')}
                      className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Clear prompt
                    </button>
                  )}
                </div>

                <textarea
                  value={fixPrompt}
                  onChange={(e) => setFixPrompt(e.target.value)}
                  placeholder="Describe the exact UI/UX fixes to apply to these components (e.g. Ensure toolbar accommodates safe-area-inset-top, make buttons expand='block' with min-height 48px, and add rounded-2xl to cards)..."
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-violet-500 resize-none placeholder:text-slate-600 font-sans leading-relaxed"
                />
              </div>

              {/* Target File Preview */}
              {targetFileSet.size > 0 && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Target Code Files to be Modified
                  </span>
                  <div className="space-y-1">
                    {Array.from(targetFileSet).map((file, i) => (
                      <div key={i} className="flex items-center space-x-2 text-xs font-mono text-emerald-400 truncate">
                        <FileCode className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span>Model:</span>
                <span className="font-mono text-violet-300 font-semibold">{llmProvider.toUpperCase()}</span>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    (Configure)
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {/* Copy Prompt for Antigravity */}
                <button
                  onClick={handleCopy}
                  disabled={selectedComponents.length === 0}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white font-medium text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all"
                  title="Copy formatted markdown prompt ready to paste into Antigravity"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-blue-400" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>

                {/* Generate with LLM */}
                <button
                  onClick={() => onGenerateBatchFix(fixPrompt, selectedComponents)}
                  disabled={isGenerating || selectedComponents.length === 0}
                  className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Fixes with {llmProvider === 'gemini' ? 'Gemini' : 'OpenCode'}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Send Prompt with Fixes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
