import React, { useState, useRef, useEffect } from 'react';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCw, 
  Crosshair, 
  Settings, 
  RefreshCw, 
  Sparkles, 
  Shield, 
  ShieldCheck,
  ChevronDown,
  Terminal,
  Check,
  Wrench,
  Compass,
  GitBranch
} from 'lucide-react';
import { DevicePreset, ProjectView, TargetGitInfo } from '../types';

interface NavbarProps {
  devices: DevicePreset[];
  activeDevice: DevicePreset;
  onSelectDevice: (d: DevicePreset) => void;
  isLandscape: boolean;
  onToggleOrientation: () => void;
  zoom: number;
  onChangeZoom: (z: number) => void;
  isInspectMode: boolean;
  onToggleInspect: () => void;
  stagedChangesCount: number;
  onOpenStaging: () => void;
  onOpenSettings: () => void;
  targetUrl: string;
  onRefreshIframe: () => void;
  showSafeArea?: boolean;
  onToggleSafeArea?: () => void;
  isAccommodateSafeArea?: boolean;
  onToggleAccommodateSafeArea?: () => void;
  onOpenLLMLogs?: () => void;
  llmLogsCount?: number;
  onOpenUIUXAudit?: () => void;
  auditIssuesCount?: number;
  auditScore?: number;
  onOpenComponentFixer?: () => void;
  selectedComponentsCount?: number;
  activePathname?: string;
  onNavigateToPath?: (path: string) => void;
  views?: ProjectView[];
  targetGitInfo?: TargetGitInfo | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  devices,
  activeDevice,
  onSelectDevice,
  isLandscape,
  onToggleOrientation,
  zoom,
  onChangeZoom,
  isInspectMode,
  onToggleInspect,
  stagedChangesCount,
  onOpenStaging,
  onOpenSettings,
  targetUrl,
  onRefreshIframe,
  showSafeArea,
  onToggleSafeArea,
  isAccommodateSafeArea,
  onToggleAccommodateSafeArea,
  onOpenLLMLogs,
  llmLogsCount = 0,
  onOpenUIUXAudit,
  auditIssuesCount = 0,
  auditScore,
  onOpenComponentFixer,
  selectedComponentsCount = 0,
  activePathname = '/',
  onNavigateToPath,
  views = [],
  targetGitInfo
}) => {
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const routeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDeviceMenuOpen(false);
      }
      if (routeDropdownRef.current && !routeDropdownRef.current.contains(e.target as Node)) {
        setIsRouteMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const androidDevices = devices.filter((d) => d.platform === 'android');
  const iosDevices = devices.filter((d) => d.platform === 'ios');
  const otherDevices = devices.filter((d) => d.platform !== 'android' && d.platform !== 'ios');

  const ActiveIcon = activeDevice.id.includes('tab') || activeDevice.id.includes('pad') 
    ? Tablet 
    : activeDevice.isMobile 
    ? Smartphone 
    : Monitor;

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between z-50 select-none">
      {/* Brand & Target info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-tight text-white">MobileLayout</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Ionic & Angular
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-2" />

        {/* Connected target */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-slate-300 truncate max-w-[140px]">{targetUrl}</span>
          <button
            onClick={onRefreshIframe}
            title="Reload target project"
            className="hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Route & Target Path Checkout */}
        <div className="relative" ref={routeDropdownRef}>
          <button
            onClick={() => setIsRouteMenuOpen(!isRouteMenuOpen)}
            className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition-all"
            title="Active Path / Route Checkout"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-xs max-w-[140px] truncate text-indigo-200">
              {activePathname || '/'}
            </span>
            {targetGitInfo && (
              <span className="hidden xl:flex items-center space-x-1 px-1.5 py-0.2 rounded bg-slate-700/50 text-[10px] text-slate-400 font-mono">
                <GitBranch className="w-2.5 h-2.5 text-slate-400" />
                <span>{targetGitInfo.branch}</span>
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isRouteMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-2 text-xs max-h-[75vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Header with Git Status */}
              <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-semibold text-slate-200">Target App Routes</span>
                </div>
                {targetGitInfo && (
                  <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
                    <GitBranch className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">{targetGitInfo.branch}</span>
                    <span className="text-slate-500">({targetGitInfo.commit})</span>
                  </div>
                )}
              </div>

              {/* Quick Checkout Path input */}
              <div className="p-2 border-b border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = (e.currentTarget.elements.namedItem('customPath') as HTMLInputElement)?.value;
                    if (input && onNavigateToPath) {
                      onNavigateToPath(input.startsWith('/') ? input : '/' + input);
                      setIsRouteMenuOpen(false);
                    }
                  }}
                  className="flex items-center space-x-1"
                >
                  <input
                    name="customPath"
                    defaultValue={activePathname}
                    placeholder="/path/to/view"
                    className="flex-1 bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2 py-1 rounded focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-xs transition-colors"
                  >
                    Go
                  </button>
                </form>
              </div>

              {/* Discovered Views by Flow */}
              <div className="py-1">
                {views.length === 0 ? (
                  <div className="px-3 py-4 text-center text-slate-500 text-xs">
                    No Ionic page routes detected yet
                  </div>
                ) : (
                  ['auth', 'cliente', 'tecnico', 'proveedor', 'general'].map((flowKey) => {
                    const flowViews = views.filter((v) => v.flow === flowKey);
                    if (flowViews.length === 0) return null;
                    const flowTitles: Record<string, string> = {
                      auth: '🔐 Auth & Ingreso',
                      cliente: '👤 Cliente Flow',
                      tecnico: '🔧 Técnico Flow',
                      proveedor: '📦 Proveedor Flow',
                      general: '⚙️ General & Config'
                    };
                    return (
                      <div key={flowKey} className="mb-2">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                          {flowTitles[flowKey] || flowKey} ({flowViews.length})
                        </div>
                        <div className="space-y-0.5 px-1 mt-0.5">
                          {flowViews.map((v) => {
                            const isCurrent = activePathname === v.route;
                            return (
                              <button
                                key={v.id}
                                onClick={() => {
                                  if (onNavigateToPath) onNavigateToPath(v.route);
                                  setIsRouteMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all ${
                                  isCurrent
                                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-medium truncate">{v.name}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono block truncate">
                                    {v.route}
                                  </span>
                                </div>
                                {isCurrent && (
                                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewport & Device Controls */}
      <div className="flex items-center space-x-2">
        {/* Categorized Device Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <ActiveIcon className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold">{activeDevice.name}</span>
            <span className="text-[10px] text-slate-500 font-mono">({activeDevice.width}×{activeDevice.height})</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isDeviceMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-2 text-xs max-h-[75vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Android Devices Section */}
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                <span>🤖 Android Devices ({androidDevices.length})</span>
                <span className="font-mono lowercase text-[9px] text-slate-500">Material UI</span>
              </div>
              <div className="space-y-0.5 px-1 mb-2">
                {androidDevices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onSelectDevice(d);
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                      activeDevice.id === d.id
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="block truncate">{d.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {d.width}×{d.height} &bull; {d.cameraCutout || 'cutout'}
                      </span>
                    </div>
                    {activeDevice.id === d.id && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="h-px bg-slate-800 my-1 mx-2" />

              {/* iOS Devices Section */}
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center justify-between">
                <span>🍎 Apple iOS Devices ({iosDevices.length})</span>
                <span className="font-mono lowercase text-[9px] text-slate-500">Cupertino</span>
              </div>
              <div className="space-y-0.5 px-1 mb-2">
                {iosDevices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onSelectDevice(d);
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                      activeDevice.id === d.id
                        ? 'bg-blue-500/20 text-blue-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="block truncate">{d.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {d.width}×{d.height} &bull; {d.cameraCutout || 'screen'}
                      </span>
                    </div>
                    {activeDevice.id === d.id && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="h-px bg-slate-800 my-1 mx-2" />

              {/* Responsive / Other */}
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>🖥️ Custom & Responsive</span>
              </div>
              <div className="space-y-0.5 px-1">
                {otherDevices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onSelectDevice(d);
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                      activeDevice.id === d.id
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="block">{d.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">{d.width}×{d.height}</span>
                    </div>
                    {activeDevice.id === d.id && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Orientation Toggle */}
        {activeDevice.isMobile && (
          <button
            onClick={onToggleOrientation}
            className={`p-1.5 rounded-lg border transition-all text-xs flex items-center space-x-1 ${
              isLandscape
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Rotate Orientation"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}

        {/* Zoom Selector */}
        <select
          value={zoom}
          onChange={(e) => onChangeZoom(parseFloat(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value={0.75}>75%</option>
          <option value={0.85}>85%</option>
          <option value={1}>100%</option>
          <option value={1.15}>115%</option>
        </select>

        {/* Secure Area Guides Toggle */}
        {onToggleSafeArea && (
          <button
            onClick={onToggleSafeArea}
            className={`p-1.5 rounded-lg border transition-all text-xs flex items-center space-x-1 ${
              showSafeArea
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Mobile Secure / Safe Area Inset guides"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}

        {/* Accommodate View to Safe Area Toggle */}
        {onToggleAccommodateSafeArea && (
          <button
            onClick={onToggleAccommodateSafeArea}
            className={`p-1.5 rounded-lg border transition-all text-xs flex items-center space-x-1 ${
              isAccommodateSafeArea
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Accommodate entire view inside device safe area bounds"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2">
        {/* Inspect Mode Toggle */}
        <button
          onClick={onToggleInspect}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isInspectMode
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <Crosshair className={`w-3.5 h-3.5 ${isInspectMode ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">{isInspectMode ? 'Inspect Active' : 'Inspect UI'}</span>
        </button>

        {/* UI/UX Audit Button */}
        {onOpenUIUXAudit && (
          <button
            onClick={onOpenUIUXAudit}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              auditScore !== undefined && auditScore < 80
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title="Run screen-wide UI/UX Audit and quality checks"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">UX Audit</span>
            {auditScore !== undefined ? (
              <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                auditScore >= 88 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {auditScore}
              </span>
            ) : auditIssuesCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                {auditIssuesCount}
              </span>
            ) : null}
          </button>
        )}

        {/* LLM Logs Button */}
        {onOpenLLMLogs && (
          <button
            onClick={onOpenLLMLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
            title="View LLM call telemetry, logs, and raw outputs"
          >
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">LLM Logs</span>
            {llmLogsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                {llmLogsCount}
              </span>
            )}
          </button>
        )}

        {/* Component Fix Hub Button */}
        {onOpenComponentFixer && (
          <button
            onClick={onOpenComponentFixer}
            className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              selectedComponentsCount > 0
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-fuchsia-500 shadow-md shadow-fuchsia-500/25 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title="Select components and send specific AI prompts with fixes"
          >
            <Wrench className={`w-3.5 h-3.5 ${selectedComponentsCount > 0 ? 'text-white' : 'text-fuchsia-400'}`} />
            <span className="hidden sm:inline">Fix Hub</span>
            {selectedComponentsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white text-fuchsia-700 font-bold text-[10px]">
                {selectedComponentsCount}
              </span>
            )}
          </button>
        )}

        {/* Staging / Changes Drawer Button */}
        <button
          onClick={onOpenStaging}
          className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            stagedChangesCount > 0
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Changes</span>
          {stagedChangesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white text-purple-700 font-bold text-[10px]">
              {stagedChangesCount}
            </span>
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Project & LLM Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
