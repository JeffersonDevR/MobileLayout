import React, { useState, useMemo } from 'react';
import { 
  SelectedComponentItem, 
  MatchedSource, 
  ElementDetails, 
  ScreenAuditReport,
  ProjectView,
  ProjectFlow,
  TargetGitInfo
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
  ArrowRight,
  GitBranch,
  Compass,
  ExternalLink,
  Search,
  CheckSquare,
  Square,
  Workflow
} from 'lucide-react';

interface ComponentFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Components scope
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
  // Views & Flows scope
  views: ProjectView[];
  flows: ProjectFlow[];
  selectedViewIds: string[];
  onToggleSelectView: (viewId: string) => void;
  onSelectAllViewsInFlow: (flowId: string) => void;
  onClearSelectedViews: () => void;
  onUpdateViewNote: (viewId: string, note: string) => void;
  activePathname: string;
  onNavigateToPath?: (path: string) => void;
  targetGitInfo?: TargetGitInfo | null;
  // Generation & Actions
  llmProvider: 'gemini' | 'opencode';
  isGenerating: boolean;
  onGenerateBatchFix: (prompt: string, scope: { components: SelectedComponentItem[]; views: ProjectView[]; flowName?: string }) => void;
  onCopyBatchPrompt: (prompt: string, scope: { components: SelectedComponentItem[]; views: ProjectView[]; flowName?: string }) => void;
  onOpenSettings?: () => void;
}

const QUICK_FIX_PRESETS = [
  {
    id: 'safe-area',
    icon: '📱',
    label: 'Fix Safe Area Insets (Notch & Home Bar)',
    prompt: 'Add safe-area-inset-top padding to top toolbars and headers to avoid the camera notch, and safe-area-inset-bottom to bottom navigation and footer buttons for the home indicator.'
  },
  {
    id: 'touch-target',
    icon: '👆',
    label: 'Apple HIG Touch Targets (≥ 44px)',
    prompt: 'Enlarge all buttons and clickable touch targets to have a minimum touch hitbox of 48px height conforming to Apple Human Interface Guidelines and Material 3.'
  },
  {
    id: 'ionic-modern',
    icon: '🎨',
    label: 'Ionic Design Tokens & Dark Cards',
    prompt: 'Apply modern Ionic design tokens: color="primary" on main actions, fill="outline" or "clear" on secondary actions, shape="round", and modernize cards with 16px border-radius.'
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
  views,
  flows,
  selectedViewIds,
  onToggleSelectView,
  onSelectAllViewsInFlow,
  onClearSelectedViews,
  onUpdateViewNote,
  activePathname,
  onNavigateToPath,
  targetGitInfo,
  llmProvider,
  isGenerating,
  onGenerateBatchFix,
  onCopyBatchPrompt,
  onOpenSettings
}) => {
  const [activeTab, setActiveTab] = useState<'components' | 'views' | 'flows'>('components');
  const [viewSearch, setViewSearch] = useState('');
  const [fixPrompt, setFixPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredViews = useMemo(() => {
    if (!viewSearch.trim()) return views;
    const q = viewSearch.toLowerCase();
    return views.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.route.toLowerCase().includes(q) ||
        v.relativeHtmlPath.toLowerCase().includes(q) ||
        v.flowName.toLowerCase().includes(q)
    );
  }, [views, viewSearch]);

  const selectedViewsList = useMemo(() => {
    return views.filter((v) => selectedViewIds.includes(v.id));
  }, [views, selectedViewIds]);

  const handleApplyPreset = (presetPrompt: string) => {
    setFixPrompt((prev) => {
      if (!prev.trim()) return presetPrompt;
      return `${prev.trim()}\n\n• ${presetPrompt}`;
    });
  };

  const currentFlow = flows.find((f) => f.id === activeFlowId);

  const handleSendFix = () => {
    onGenerateBatchFix(fixPrompt, {
      components: selectedComponents,
      views: selectedViewsList,
      flowName: currentFlow?.name
    });
  };

  const handleCopy = () => {
    onCopyBatchPrompt(fixPrompt, {
      components: selectedComponents,
      views: selectedViewsList,
      flowName: currentFlow?.name
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCurrentElementAlreadySelected = currentInspectedElement 
    ? selectedComponents.some((c) => c.selectorPath === currentInspectedElement.selectorPath)
    : false;

  const totalScopeCount = selectedComponents.length + selectedViewsList.length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[94vh] max-h-[880px] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header with Target App Path Checkout info */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white">Fix Hub: Components, Views & Flows</h2>
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 font-mono text-[11px] font-bold">
                  {totalScopeCount} targeted
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  {llmProvider.toUpperCase()}
                </span>
              </div>
              
              {/* Target App Path Checkout badge */}
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                <span className="flex items-center space-x-1 text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/20">
                  <Compass className="w-3 h-3" />
                  <span>Path: {activePathname || '/'}</span>
                </span>

                {targetGitInfo && (
                  <span className="flex items-center space-x-1 text-slate-400 font-mono bg-slate-800/80 px-2 py-0.2 rounded border border-slate-700">
                    <GitBranch className="w-3 h-3 text-purple-400" />
                    <span>{targetGitInfo.branch} ({targetGitInfo.commit})</span>
                    {targetGitInfo.clean && <span className="text-emerald-400">✓</span>}
                  </span>
                )}

                <span className="text-slate-500 text-[10px]">
                  Target components, full views, or multi-screen flows
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Mode Switcher Tabs */}
        <div className="px-6 py-2 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('components')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === 'components'
                  ? 'bg-violet-600 text-white border-violet-500 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Components</span>
              {selectedComponents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  {selectedComponents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('views')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === 'views'
                  ? 'bg-violet-600 text-white border-violet-500 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Views / Screens</span>
              {selectedViewsList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  {selectedViewsList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('flows')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === 'flows'
                  ? 'bg-violet-600 text-white border-violet-500 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>User Flows</span>
              {currentFlow && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  {currentFlow.name.split(' ')[0]}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-400 hidden sm:block">
            {totalScopeCount === 0 ? (
              <span className="text-amber-400">No components or views selected yet</span>
            ) : (
              <span>Targeting {selectedComponents.length} component(s) + {selectedViewsList.length} view(s)</span>
            )}
          </div>
        </div>

        {/* Content Split Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Scope Selector (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-800 flex flex-col bg-slate-950/40 overflow-hidden">
            
            {/* TAB 1: COMPONENTS */}
            {activeTab === 'components' && (
              <>
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
                      <h4 className="text-xs font-semibold text-slate-300 mb-1">No Individual Components Selected</h4>
                      <p className="text-[11px] text-slate-500 max-w-xs mb-3">
                        You can select individual elements, or switch to the <strong>Views / Screens</strong> tab to apply fixes across the entire page!
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
                        ) : null}

                        <button
                          onClick={() => setActiveTab('views')}
                          className="w-full py-2 px-3 rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/40 hover:bg-violet-600/30 text-xs font-medium flex items-center justify-center space-x-1.5 transition-all"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Select Entire View / Screen Instead →</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    selectedComponents.map((comp, idx) => (
                      <div
                        key={comp.id || idx}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-xs space-y-2 group"
                      >
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

                        {comp.matchedSource && (
                          <div className="flex items-center space-x-1.5 font-mono text-[10px] text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 truncate">
                            <FileCode className="w-3 h-3 shrink-0" />
                            <span className="truncate">{comp.matchedSource.relativeHtmlPath}:{comp.matchedSource.lineNumber}</span>
                          </div>
                        )}

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

                        <input
                          type="text"
                          value={comp.fixNote || ''}
                          onChange={(e) => onUpdateComponentNote(comp.id, e.target.value)}
                          placeholder="Specific fix note for this component (optional)..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 outline-none focus:border-violet-500 placeholder:text-slate-600"
                        />
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* TAB 2: VIEWS / SCREENS */}
            {activeTab === 'views' && (
              <>
                <div className="p-3 border-b border-slate-800 bg-slate-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Project Views / Screens</span>
                    {selectedViewIds.length > 0 && (
                      <button
                        onClick={onClearSelectedViews}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        Clear views ({selectedViewIds.length})
                      </button>
                    )}
                  </div>

                  {/* Search Views */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                    <input
                      type="text"
                      value={viewSearch}
                      onChange={(e) => setViewSearch(e.target.value)}
                      placeholder="Search views by name or route..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 outline-none focus:border-violet-500 placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredViews.map((v) => {
                    const isSelected = selectedViewIds.includes(v.id);
                    const isActiveRoute = activePathname && (activePathname.toLowerCase() === v.route.toLowerCase() || activePathname.toLowerCase().includes(v.id));

                    return (
                      <div
                        key={v.id}
                        className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                          isSelected
                            ? 'bg-violet-950/30 border-violet-500/50 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onToggleSelectView(v.id)}
                            className="flex items-center space-x-2 text-left truncate flex-1"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-violet-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                            <span className="font-semibold text-xs truncate">{v.name}</span>
                            {isActiveRoute && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                Active in canvas
                              </span>
                            )}
                          </button>

                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              {v.route}
                            </span>
                            {onNavigateToPath && (
                              <button
                                onClick={() => onNavigateToPath(v.route)}
                                className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                title={`Navigate canvas to ${v.route}`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 font-mono text-[10px] text-slate-400 truncate">
                          <FileCode className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{v.relativeHtmlPath}</span>
                        </div>

                        {isSelected && (
                          <input
                            type="text"
                            value={v.fixNote || ''}
                            onChange={(e) => onUpdateViewNote(v.id, e.target.value)}
                            placeholder="Specific fix note for this view (optional)..."
                            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 outline-none focus:border-violet-500 placeholder:text-slate-600"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 3: USER FLOWS */}
            {activeTab === 'flows' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <span className="text-xs font-bold text-slate-300 block mb-1">
                  Pre-configured Multi-Screen Flows
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Select an entire user journey flow to apply coordinated fixes, consistent safe areas, and unified Ionic styles across all screens in that flow.
                </p>

                <div className="space-y-2.5 pt-1">
                  {flows.map((f) => {
                    const isFlowSelected = activeFlowId === f.id;
                    const matchingViews = views.filter((v) => f.viewIds.includes(v.id));

                    return (
                      <div
                        key={f.id}
                        className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                          isFlowSelected
                            ? 'bg-violet-950/40 border-violet-500 text-white shadow-md shadow-violet-900/20'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-base">{f.icon}</span>
                            <span className="font-bold text-xs">{f.name}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px]">
                            {f.viewIds.length} screens
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400">{f.description}</p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {matchingViews.map((v) => (
                            <span
                              key={v.id}
                              className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-[10px] border border-slate-800"
                            >
                              {v.name}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            setActiveFlowId(f.id);
                            onSelectAllViewsInFlow(f.id);
                          }}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                            isFlowSelected
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isFlowSelected ? 'Flow Selected' : `Select All ${f.viewIds.length} Screens in Flow`}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scope Summary Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{selectedComponents.length} components + {selectedViewsList.length} views</span>
              <span>Total: {totalScopeCount} targeted</span>
            </div>
          </div>

          {/* Right Column: Prompt, Presets & Actions (7 cols) */}
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
                    Specific Fix Prompt (for Components, Views, or Flow)
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
                  placeholder="Describe the exact UI/UX fixes to apply across your selected components or views (e.g. Ensure toolbar accommodates safe-area-inset-top, make buttons expand='block' with min-height 48px, and add rounded-2xl to cards)..."
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-violet-500 resize-none placeholder:text-slate-600 font-sans leading-relaxed"
                />
              </div>

              {/* Scope Target Summary */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Active Execution Scope
                </span>
                
                {totalScopeCount === 0 ? (
                  <div className="text-[11px] text-amber-400 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>No scope selected. Fix will apply to current active view ({activePathname || '/login'}).</span>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    {selectedViewsList.length > 0 && (
                      <div className="text-violet-300 text-[11px]">
                        <strong>Target Views:</strong> {selectedViewsList.map((v) => v.name).join(', ')}
                      </div>
                    )}
                    {selectedComponents.length > 0 && (
                      <div className="text-blue-300 text-[11px]">
                        <strong>Target Components:</strong> {selectedComponents.map((c) => `<${c.tagName}>`).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all"
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
                  onClick={handleSendFix}
                  disabled={isGenerating}
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
