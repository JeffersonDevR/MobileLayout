import React from 'react';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCw, 
  Crosshair, 
  Layers, 
  Settings, 
  RefreshCw,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { DevicePreset } from '../types';

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
  onRefreshIframe
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between z-50">
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
                Angular & Ionic
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-2" />

        {/* Connected target */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-slate-300 truncate max-w-[150px]">{targetUrl}</span>
          <button
            onClick={onRefreshIframe}
            title="Reload target project"
            className="hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport & Device Controls */}
      <div className="flex items-center space-x-2">
        {/* Device Switcher */}
        <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          {devices.map((device) => {
            const Icon = device.id.includes('pad') ? Tablet : device.isMobile ? Smartphone : Monitor;
            const isSelected = activeDevice.id === device.id;
            return (
              <button
                key={device.id}
                onClick={() => onSelectDevice(device)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
                title={`${device.name} (${device.width}x${device.height})`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{device.name}</span>
              </button>
            );
          })}
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
          <span>{isInspectMode ? 'Inspect Active' : 'Inspect UI'}</span>
        </button>

        {/* Changes / Staging Drawer Button */}
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
