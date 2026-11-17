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
  Sliders
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
  onUpdateText
}) => {
  const [activeTab, setActiveTab] = useState<'ionic' | 'box' | 'layout' | 'typography'>('ionic');

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

        {/* TAB 2: BOX MODEL & SPACING */}
        {activeTab === 'box' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
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
