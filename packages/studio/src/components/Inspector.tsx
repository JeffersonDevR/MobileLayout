import React, { useState } from 'react';
import { 
  ElementDetails, 
  MatchedSource, 
  UIChangeItem 
} from '../types';
import { 
  FileCode, 
  Palette, 
  Box, 
  Layout, 
  Type, 
  Sparkles, 
  Check, 
  X,
  Search,
  Sliders,
  Shield,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Wrench
} from 'lucide-react';

interface InspectorProps {
  element: ElementDetails | null;
  matchedSource: MatchedSource | null;
  isScanning: boolean;
  onScanElement: () => void;
  onLiveUpdate: (styles: Record<string, string>, attributes: Record<string, string>, change: UIChangeItem) => void;
  onResetElementStyles: () => void;
  onInsertSnippet?: (snippet: string, name: string) => void;
  onDeleteElement?: () => void;
  onMoveElement?: (direction: 'up' | 'down') => void;
  onUpdateText?: (text: string) => void;
  onDeselect?: () => void;
  onToggleSelectForFix?: () => void;
  isAddedToFixList?: boolean;
}

const IONIC_COLORS = [
  { name: 'primary', color: '#3880ff' },
  { name: 'secondary', color: '#3dc2ff' },
  { name: 'tertiary', color: '#5260ff' },
  { name: 'success', color: '#2dd36f' },
  { name: 'warning', color: '#ffc409' },
  { name: 'danger', color: '#eb445a' },
  { name: 'dark', color: '#222428' },
  { name: 'medium', color: '#92949c' },
  { name: 'light', color: '#f4f5f8' }
];

export const Inspector: React.FC<InspectorProps> = ({
  element,
  matchedSource,
  isScanning,
  onScanElement,
  onLiveUpdate,
  onResetElementStyles,
  onInsertSnippet,
  onDeleteElement,
  onMoveElement,
  onUpdateText,
  onDeselect,
  onToggleSelectForFix,
  isAddedToFixList
}) => {
  const [activeTab, setActiveTab] = useState<'ionic' | 'box' | 'layout' | 'typography'>('ionic');
  const [showMinMax, setShowMinMax] = useState(false);

  if (!element) {
    return (
      <aside className="w-80 border-l border-slate-800 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
          <Sliders className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300 mb-1">No Element Selected</h3>
        <p className="text-xs text-slate-500 max-w-xs">
          Click any button, card, header, or element in the mobile preview to inspect and visually tweak its UI.
        </p>
      </aside>
    );
  }

  const isIonicElement = element.tagName.startsWith('ion-');

  // Helpers to fire live update
  const handleAttrChange = (name: string, value: string) => {
    onLiveUpdate({}, { [name]: value }, {
      type: 'attribute',
      name,
      value,
      previousValue: element.attributes[name] || ''
    });
  };

  const handleStyleChange = (prop: string, value: string) => {
    onLiveUpdate({ [prop]: value }, {}, {
      type: 'style',
      name: prop,
      value,
      previousValue: element.computedStyles[prop] || ''
    });
  };

  return (
    <aside className="w-84 border-l border-slate-800 bg-slate-900 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden select-none">
      {/* Element Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
            element.isPreview 
              ? 'text-purple-300 bg-purple-500/10 border-purple-500/30' 
              : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
          }`}>
            &lt;{element.tagName}&gt; {element.isPreview ? '(Preview)' : ''}
          </span>

          <div className="flex items-center space-x-1.5">
            {onDeselect && (
              <button
                onClick={onDeselect}
                className="text-[11px] px-2 py-0.5 rounded border font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700 flex items-center space-x-1 transition-all"
                title="Deselect active element (Esc)"
              >
                <X className="w-3 h-3 text-slate-400" />
                <span>Deselect</span>
              </button>
            )}

            {onDeleteElement && (
              <button
                onClick={onDeleteElement}
                className={`text-[11px] px-2 py-0.5 rounded border font-medium transition-all ${
                  element.isPreview
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-rose-400 border-slate-700 hover:border-rose-500/30'
                }`}
                title={element.isPreview ? "Remove added element from mobile canvas" : "Delete element from UI (hide & stage for LLM)"}
              >
                {element.isPreview ? '🗑️ Remove' : '🗑️ Delete'}
              </button>
            )}
            <button
              onClick={onResetElementStyles}
              className="text-[11px] text-slate-400 hover:text-amber-400 transition-colors"
              title="Reset live styling preview"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Source File Location */}
        <div className="mt-2 text-xs">
          {matchedSource ? (
            <div className="flex items-start space-x-1.5 p-1.5 rounded bg-slate-800/80 border border-slate-700/80 text-slate-300">
              <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="truncate">
                <span className="font-mono text-[11px] text-emerald-300 block truncate">
                  {matchedSource.relativeHtmlPath}:{matchedSource.lineNumber}
                </span>
                {matchedSource.relativeScssPath && (
                  <span className="font-mono text-[10px] text-slate-400 block truncate">
                    {matchedSource.relativeScssPath}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={onScanElement}
              disabled={isScanning}
              className="w-full flex items-center justify-center space-x-1.5 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 transition-all"
            >
              <Search className="w-3 h-3 text-blue-400" />
              <span>{isScanning ? 'Locating in project...' : 'Locate in Angular files'}</span>
            </button>
          )}
        </div>

        {/* Add to Component Fix Hub */}
        {onToggleSelectForFix && (
          <button
            onClick={onToggleSelectForFix}
            className={`w-full mt-2 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              isAddedToFixList
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50 hover:bg-violet-600/40 shadow-sm'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-md shadow-violet-600/20'
            }`}
          >
            {isAddedToFixList ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                <span>Selected in Fix Hub</span>
              </>
            ) : (
              <>
                <Wrench className="w-3.5 h-3.5 text-white" />
                <span>+ Add to Component Fix Hub</span>
              </>
            )}
          </button>
        )}

        {/* Move & Position Controls */}
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Layout Order</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onMoveElement?.('up')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-200 hover:text-white flex items-center space-x-1 transition-all"
              title="Move element up (swap with previous sibling)"
            >
              <span>▲ Move Up</span>
            </button>
            <button
              onClick={() => onMoveElement?.('down')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-200 hover:text-white flex items-center space-x-1 transition-all"
              title="Move element down (swap with next sibling)"
            >
              <span>▼ Move Down</span>
            </button>
          </div>
        </div>

        {/* Live Text / Label Content Editor */}
        <div className="mt-2">
          <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Text / Label Content
          </label>
          <input
            type="text"
            defaultValue={element.textContent}
            key={element.id || element.tagName + element.textContent}
            onChange={(e) => onUpdateText?.(e.target.value)}
            placeholder="Edit text content..."
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs outline-none focus:border-blue-500 font-medium"
          />
        </div>
      </div>

      {/* Mobile Layout Pattern Warnings / Best Practice Linter */}
      {element.layoutWarnings && element.layoutWarnings.length > 0 ? (
        <div className="p-3 border-b border-amber-500/20 bg-amber-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Layout Warnings ({element.layoutWarnings.length})</span>
            </div>
            <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
              Pattern Linter
            </span>
          </div>

          <div className="space-y-1.5">
            {element.layoutWarnings.map((warning) => (
              <div
                key={warning.id}
                className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                  warning.level === 'error'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : warning.level === 'warning'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-blue-950/40 border-blue-500/40 text-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-semibold text-[11px] leading-tight">{warning.title}</span>
                  <span className="uppercase text-[9px] px-1 py-0.2 rounded font-mono font-bold tracking-wider shrink-0 opacity-80">
                    {warning.level}
                  </span>
                </div>
                <p className="text-[10px] opacity-90 leading-relaxed">{warning.message}</p>
                {warning.quickFix && (
                  <button
                    onClick={() => handleStyleChange(warning.quickFix!.prop, warning.quickFix!.value)}
                    className="mt-1 w-full flex items-center justify-center space-x-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-semibold text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 transition-all shadow-sm"
                  >
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Quick Fix: {warning.quickFix.label}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-3 py-1.5 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium text-slate-300">Layout Pattern: Valid</span>
          </div>
          <span className="text-[9px] text-slate-500">Apple HIG & Material OK</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/80 text-xs">
        <button
          onClick={() => setActiveTab('ionic')}
          className={`flex-1 py-2 font-medium flex items-center justify-center space-x-1 border-b-2 transition-all ${
            activeTab === 'ionic'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Ionic</span>
        </button>

        <button
          onClick={() => setActiveTab('box')}
          className={`flex-1 py-2 font-medium flex items-center justify-center space-x-1 border-b-2 transition-all ${
            activeTab === 'box'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Box</span>
        </button>

        <button
          onClick={() => setActiveTab('layout')}
          className={`flex-1 py-2 font-medium flex items-center justify-center space-x-1 border-b-2 transition-all ${
            activeTab === 'layout'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Layout</span>
        </button>

        <button
          onClick={() => setActiveTab('typography')}
          className={`flex-1 py-2 font-medium flex items-center justify-center space-x-1 border-b-2 transition-all ${
            activeTab === 'typography'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Style</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
        {/* TAB 1: IONIC CONTROLS */}
        {activeTab === 'ionic' && (
          <div className="space-y-4">
            {/* Ionic Color Tokens */}
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Ionic Color Token</label>
              <div className="grid grid-cols-3 gap-1.5">
                {IONIC_COLORS.map((c) => {
                  const isCurrent = element.attributes.color === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => handleAttrChange('color', isCurrent ? '' : c.name)}
                      className={`flex items-center space-x-1.5 px-2 py-1.5 rounded border transition-all text-[11px] ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-500/10 text-white font-semibold'
                          : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="capitalize">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Button Specific: Fill & Expand */}
            {element.tagName === 'ion-button' && (
              <>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Fill Variant</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                    {['solid', 'outline', 'clear'].map((variant) => (
                      <button
                        key={variant}
                        onClick={() => handleAttrChange('fill', variant)}
                        className={`py-1 text-center rounded capitalize font-medium transition-all ${
                          element.attributes.fill === variant
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Expand Mode</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                    {['', 'block', 'full'].map((exp) => (
                      <button
                        key={exp || 'default'}
                        onClick={() => handleAttrChange('expand', exp)}
                        className={`py-1 text-center rounded capitalize font-medium transition-all ${
                          (element.attributes.expand || '') === exp
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {exp || 'inline'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Shape</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                    {['', 'round'].map((sh) => (
                      <button
                        key={sh || 'standard'}
                        onClick={() => handleAttrChange('shape', sh)}
                        className={`py-1 text-center rounded capitalize font-medium transition-all ${
                          (element.attributes.shape || '') === sh
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sh || 'standard'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Slot Placement */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Ionic Slot Placement</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                {['', 'start', 'end'].map((slotName) => (
                  <button
                    key={slotName || 'content'}
                    onClick={() => handleAttrChange('slot', slotName)}
                    className={`py-1 text-center rounded capitalize font-medium transition-all ${
                      (element.attributes.slot || '') === slotName
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {slotName || 'default'}
                  </button>
                ))}
              </div>
            </div>

            {/* Ionic Custom Properties */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-slate-300 font-semibold mb-2">Ionic CSS Custom Properties</label>
              
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 text-[11px] font-mono">--border-radius</span>
                  <input
                    type="text"
                    placeholder="e.g. 16px, 9999px"
                    defaultValue={element.ionicProps['--border-radius'] || ''}
                    onBlur={(e) => handleStyleChange('--border-radius', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs mt-0.5 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] font-mono">--background</span>
                  <input
                    type="text"
                    placeholder="e.g. #1e293b, var(--ion-color-light)"
                    defaultValue={element.ionicProps['--background'] || ''}
                    onBlur={(e) => handleStyleChange('--background', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs mt-0.5 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] font-mono">--color (text color)</span>
                  <input
                    type="text"
                    placeholder="e.g. #ffffff"
                    defaultValue={element.ionicProps['--color'] || ''}
                    onBlur={(e) => handleStyleChange('--color', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs mt-0.5 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Live Insert Section (Chip / Badge / Button / Icon) */}
            {onInsertSnippet && (
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                  <span>Insert Live Element (Preview)</span>
                  <span className="text-[10px] text-purple-400 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">live canvas</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onInsertSnippet('<ion-chip color="tertiary"><ion-label>Active Tag</ion-label></ion-chip>', 'IonChip')}
                    className="flex items-center space-x-1.5 px-2 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-purple-500/30 text-purple-300 font-medium text-[11px] transition-all"
                  >
                    <span>🏷️ + Add Chip</span>
                  </button>

                  <button
                    onClick={() => onInsertSnippet('<ion-badge color="success">New</ion-badge>', 'IonBadge')}
                    className="flex items-center space-x-1.5 px-2 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 font-medium text-[11px] transition-all"
                  >
                    <span>🔴 + Add Badge</span>
                  </button>

                  <button
                    onClick={() => onInsertSnippet('<ion-button size="small" fill="outline" color="secondary">Action</ion-button>', 'IonButton')}
                    className="flex items-center space-x-1.5 px-2 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-blue-500/30 text-blue-300 font-medium text-[11px] transition-all"
                  >
                    <span>🔘 + Add Button</span>
                  </button>

                  <button
                    onClick={() => onInsertSnippet('<ion-icon name="sparkles" slot="start" color="warning"></ion-icon>', 'IonIcon')}
                    className="flex items-center space-x-1.5 px-2 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-amber-500/30 text-amber-300 font-medium text-[11px] transition-all"
                  >
                    <span>✨ + Add Icon</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BOX MODEL, RESIZE & SECURE AREA */}
        {activeTab === 'box' && (
          <div className="space-y-4">
            {/* Dimensions & Resizing Section */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center space-x-1">
                  <Maximize2 className="w-3 h-3 text-blue-400" />
                  <span>Size & Dimensions</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {element.boxModel.width} × {element.boxModel.height} px
                </span>
              </div>

              {/* Width Control */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-300 font-medium">Width</label>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        const newW = Math.max(20, element.boxModel.width - 10);
                        handleStyleChange('width', `${newW}px`);
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700"
                      title="Decrease width by 10px"
                    >
                      -10px
                    </button>
                    <button
                      onClick={() => {
                        const newW = element.boxModel.width + 10;
                        handleStyleChange('width', `${newW}px`);
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700"
                      title="Increase width by 10px"
                    >
                      +10px
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    defaultValue={element.computedStyles.width || `${element.boxModel.width}px`}
                    key={`w-${element.id || element.tagName}-${element.boxModel.width}`}
                    onBlur={(e) => handleStyleChange('width', e.target.value)}
                    placeholder="e.g. 100%, 300px, auto"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs outline-none focus:border-blue-500"
                  />
                  <div className="flex space-x-1">
                    {['auto', '100%', '50%'].map((wPreset) => (
                      <button
                        key={wPreset}
                        onClick={() => handleStyleChange('width', wPreset)}
                        className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-700"
                      >
                        {wPreset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Height Control */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-300 font-medium">Height</label>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        const newH = Math.max(16, element.boxModel.height - 10);
                        handleStyleChange('height', `${newH}px`);
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700"
                      title="Decrease height by 10px"
                    >
                      -10px
                    </button>
                    <button
                      onClick={() => {
                        const newH = element.boxModel.height + 10;
                        handleStyleChange('height', `${newH}px`);
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700"
                      title="Increase height by 10px"
                    >
                      +10px
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    defaultValue={element.computedStyles.height || `${element.boxModel.height}px`}
                    key={`h-${element.id || element.tagName}-${element.boxModel.height}`}
                    onBlur={(e) => handleStyleChange('height', e.target.value)}
                    placeholder="e.g. auto, 48px, 100%"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs outline-none focus:border-blue-500"
                  />
                  <div className="flex space-x-1">
                    {['auto', '44px', '48px', '100%'].map((hPreset) => (
                      <button
                        key={hPreset}
                        onClick={() => handleStyleChange('height', hPreset)}
                        className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-700"
                        title={hPreset === '44px' ? '44px iOS standard touch target' : undefined}
                      >
                        {hPreset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Min/Max Constraints toggle */}
              <div>
                <button
                  onClick={() => setShowMinMax(!showMinMax)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
                >
                  <span>{showMinMax ? '▼ Hide min/max limits' : '▶ Advanced min/max constraints'}</span>
                </button>

                {showMinMax && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">min-width</span>
                      <input
                        type="text"
                        placeholder="e.g. 100px"
                        onBlur={(e) => handleStyleChange('min-width', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-200 font-mono text-[11px] outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">max-width</span>
                      <input
                        type="text"
                        placeholder="e.g. 480px"
                        onBlur={(e) => handleStyleChange('max-width', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-200 font-mono text-[11px] outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">min-height</span>
                      <input
                        type="text"
                        placeholder="e.g. 44px"
                        onBlur={(e) => handleStyleChange('min-height', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-200 font-mono text-[11px] outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">max-height</span>
                      <input
                        type="text"
                        placeholder="e.g. 600px"
                        onBlur={(e) => handleStyleChange('max-height', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-200 font-mono text-[11px] outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECURE AREA / SAFE AREA CARD */}
            <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-rose-300 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  <span>Secure Area (Safe Area)</span>
                </span>
                <span className="text-[9px] bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 font-mono">
                  env(safe-area-inset)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Add safe area padding to prevent UI from being cut off by the phone notch, dynamic island, or home indicator.
              </p>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => {
                    onLiveUpdate(
                      { 'padding-top': 'max(var(--ion-safe-area-top, 0px), env(safe-area-inset-top, 47px))' },
                      {},
                      {
                        type: 'style',
                        name: 'padding-top',
                        value: 'max(var(--ion-safe-area-top, 0px), env(safe-area-inset-top, 47px))'
                      }
                    );
                  }}
                  className="px-2 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-all text-left flex items-center space-x-1.5"
                  title="Apply top safe-area padding for notch/status bar"
                >
                  <span>🛡️ Top Safe Area</span>
                </button>

                <button
                  onClick={() => {
                    onLiveUpdate(
                      { 'padding-bottom': 'max(var(--ion-safe-area-bottom, 0px), env(safe-area-inset-bottom, 34px))' },
                      {},
                      {
                        type: 'style',
                        name: 'padding-bottom',
                        value: 'max(var(--ion-safe-area-bottom, 0px), env(safe-area-inset-bottom, 34px))'
                      }
                    );
                  }}
                  className="px-2 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-all text-left flex items-center space-x-1.5"
                  title="Apply bottom safe-area padding for home indicator bar"
                >
                  <span>🛡️ Bottom Safe Area</span>
                </button>

                <button
                  onClick={() => {
                    onLiveUpdate(
                      { 
                        'padding-top': 'max(var(--ion-safe-area-top, 0px), env(safe-area-inset-top, 47px))',
                        'padding-bottom': 'max(var(--ion-safe-area-bottom, 0px), env(safe-area-inset-bottom, 34px))'
                      },
                      {},
                      {
                        type: 'style',
                        name: 'safe-area (both)',
                        value: 'padding-top: 47px; padding-bottom: 34px;'
                      }
                    );
                  }}
                  className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium transition-all text-left flex items-center space-x-1.5"
                  title="Apply both top and bottom safe-area insets"
                >
                  <span>🛡️ Top + Bottom</span>
                </button>

                <button
                  onClick={() => {
                    onLiveUpdate(
                      { 'padding-top': '', 'padding-bottom': '' },
                      {},
                      {
                        type: 'style',
                        name: 'clear-safe-area',
                        value: 'reset safe-area padding'
                      }
                    );
                  }}
                  className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition-all text-left flex items-center space-x-1.5"
                  title="Remove safe area padding"
                >
                  <span>✕ Clear Safe Area</span>
                </button>
              </div>
            </div>

            {/* Visual Box Model Diagram */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-1">
                <span className="text-[10px] text-amber-500/80 font-bold tracking-wider uppercase">Box Model Spacing</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      const cur = parseInt(element.boxModel.paddingTop) || 0;
                      const next = `${cur + 4}px`;
                      onLiveUpdate(
                        { 'padding': next },
                        {},
                        { type: 'style', name: 'padding', value: next }
                      );
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono border border-slate-700"
                    title="Nudge padding +4px"
                  >
                    +4px All
                  </button>
                  <button
                    onClick={() => {
                      onLiveUpdate(
                        { 'padding': '0px', 'margin': '0px' },
                        {},
                        { type: 'style', name: 'spacing', value: '0px' }
                      );
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-slate-200 font-mono border border-slate-700"
                    title="Reset margin and padding to 0"
                  >
                    Clear 0
                  </button>
                </div>
              </div>
              
              <span className="text-[10px] text-amber-500/80 font-bold tracking-wider uppercase mb-1">Margin</span>
              
              {/* Margin Top */}
              <input
                type="text"
                defaultValue={element.boxModel.marginTop}
                onBlur={(e) => handleStyleChange('margin-top', e.target.value)}
                className="w-14 text-center bg-slate-800 border border-amber-500/30 rounded text-xs py-0.5 text-amber-400 font-mono mb-1"
              />

              <div className="w-full flex items-center justify-between">
                {/* Margin Left */}
                <input
                  type="text"
                  defaultValue={element.boxModel.marginLeft}
                  onBlur={(e) => handleStyleChange('margin-left', e.target.value)}
                  className="w-12 text-center bg-slate-800 border border-amber-500/30 rounded text-xs py-0.5 text-amber-400 font-mono"
                />

                {/* Inner Padding Container */}
                <div className="bg-slate-900 border border-emerald-500/40 rounded-lg p-2.5 flex flex-col items-center mx-2 flex-1">
                  <span className="text-[10px] text-emerald-400/80 font-bold uppercase mb-1">Padding</span>
                  
                  {/* Padding Top */}
                  <input
                    type="text"
                    defaultValue={element.boxModel.paddingTop}
                    onBlur={(e) => handleStyleChange('padding-top', e.target.value)}
                    className="w-14 text-center bg-slate-800 border border-emerald-500/30 rounded text-xs py-0.5 text-emerald-300 font-mono mb-1"
                  />

                  <div className="w-full flex items-center justify-between">
                    {/* Padding Left */}
                    <input
                      type="text"
                      defaultValue={element.boxModel.paddingLeft}
                      onBlur={(e) => handleStyleChange('padding-left', e.target.value)}
                      className="w-10 text-center bg-slate-800 border border-emerald-500/30 rounded text-xs py-0.5 text-emerald-300 font-mono"
                    />

                    {/* Dimensions */}
                    <div className="px-2 py-1 bg-slate-800/80 rounded text-[11px] font-mono text-slate-300">
                      {element.boxModel.width} × {element.boxModel.height}
                    </div>

                    {/* Padding Right */}
                    <input
                      type="text"
                      defaultValue={element.boxModel.paddingRight}
                      onBlur={(e) => handleStyleChange('padding-right', e.target.value)}
                      className="w-10 text-center bg-slate-800 border border-emerald-500/30 rounded text-xs py-0.5 text-emerald-300 font-mono"
                    />
                  </div>

                  {/* Padding Bottom */}
                  <input
                    type="text"
                    defaultValue={element.boxModel.paddingBottom}
                    onBlur={(e) => handleStyleChange('padding-bottom', e.target.value)}
                    className="w-14 text-center bg-slate-800 border border-emerald-500/30 rounded text-xs py-0.5 text-emerald-300 font-mono mt-1"
                  />
                </div>

                {/* Margin Right */}
                <input
                  type="text"
                  defaultValue={element.boxModel.marginRight}
                  onBlur={(e) => handleStyleChange('margin-right', e.target.value)}
                  className="w-12 text-center bg-slate-800 border border-amber-500/30 rounded text-xs py-0.5 text-amber-400 font-mono"
                />
              </div>

              {/* Margin Bottom */}
              <input
                type="text"
                defaultValue={element.boxModel.marginBottom}
                onBlur={(e) => handleStyleChange('margin-bottom', e.target.value)}
                className="w-14 text-center bg-slate-800 border border-amber-500/30 rounded text-xs py-0.5 text-amber-400 font-mono mt-1"
              />
            </div>
          </div>
        )}

        {/* TAB 3: LAYOUT & FLEXBOX */}
        {activeTab === 'layout' && (
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 mb-1">Display</label>
              <select
                defaultValue={element.layout.display}
                onChange={(e) => handleStyleChange('display', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="block">block</option>
                <option value="flex">flex</option>
                <option value="grid">grid</option>
                <option value="inline-block">inline-block</option>
                <option value="none">none</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Flex Direction</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                {['row', 'column'].map((dir) => (
                  <button
                    key={dir}
                    onClick={() => handleStyleChange('flex-direction', dir)}
                    className={`py-1 text-center rounded capitalize font-medium transition-all ${
                      element.layout.flexDirection === dir
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Align Items</label>
              <select
                defaultValue={element.layout.alignItems}
                onChange={(e) => handleStyleChange('align-items', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="stretch">stretch</option>
                <option value="center">center</option>
                <option value="flex-start">flex-start</option>
                <option value="flex-end">flex-end</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Justify Content</label>
              <select
                defaultValue={element.layout.justifyContent}
                onChange={(e) => handleStyleChange('justify-content', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="flex-start">flex-start</option>
                <option value="center">center</option>
                <option value="flex-end">flex-end</option>
                <option value="space-between">space-between</option>
                <option value="space-around">space-around</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Gap (Spacing between children)</label>
              <input
                type="text"
                placeholder="e.g. 12px, 1rem"
                defaultValue={element.layout.gap}
                onBlur={(e) => handleStyleChange('gap', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* TAB 4: TYPOGRAPHY & STYLES */}
        {activeTab === 'typography' && (
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 mb-1">Font Size</label>
              <input
                type="text"
                defaultValue={element.typography.fontSize}
                onBlur={(e) => handleStyleChange('font-size', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Font Weight</label>
              <select
                defaultValue={element.typography.fontWeight}
                onChange={(e) => handleStyleChange('font-weight', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semibold (600)</option>
                <option value="700">Bold (700)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Text Align</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                {['left', 'center', 'right'].map((align) => (
                  <button
                    key={align}
                    onClick={() => handleStyleChange('text-align', align)}
                    className={`py-1 text-center rounded capitalize font-medium transition-all ${
                      element.typography.textAlign === align
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Border Radius</label>
              <input
                type="text"
                placeholder="e.g. 8px, 16px, 9999px"
                defaultValue={element.boxModel.borderRadius}
                onBlur={(e) => handleStyleChange('border-radius', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
