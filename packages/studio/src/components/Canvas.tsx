import React, { useState } from 'react';
import { DevicePreset } from '../types';
import { Smartphone, Shield, ShieldCheck, Crosshair, Wifi, Battery } from 'lucide-react';

interface CanvasProps {
  device: DevicePreset;
  isLandscape: boolean;
  zoom: number;
  previewUrl: string;
  isInspectMode: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoaded: () => void;
  onDeselect?: () => void;
  showSafeArea: boolean;
  onToggleSafeArea: () => void;
  isAccommodateSafeArea: boolean;
  onToggleAccommodateSafeArea: () => void;
  onDropSnippet?: (snippet: string, name: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  device,
  isLandscape,
  zoom,
  previewUrl,
  isInspectMode,
  iframeRef,
  onIframeLoaded,
  onDeselect,
  showSafeArea,
  onToggleSafeArea,
  isAccommodateSafeArea,
  onToggleAccommodateSafeArea,
  onDropSnippet
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const width = isLandscape ? device.height : device.width;
  const height = isLandscape ? device.width : device.height;

  const topInset = device.safeArea?.top ?? (device.isMobile ? 47 : 0);
  const bottomInset = device.safeArea?.bottom ?? (device.isMobile ? 34 : 0);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    let snippet = '';
    let name = 'Component';
    const jsonStr = e.dataTransfer.getData('application/json');
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        snippet = parsed.snippet || '';
        name = parsed.name || 'Component';
      } catch (err) {}
    }
    if (!snippet) {
      snippet = e.dataTransfer.getData('text/plain') || '';
    }
    if (snippet && onDropSnippet) {
      onDropSnippet(snippet, name);
    }
  };

  return (
    <div 
      className="flex-1 bg-slate-950/80 overflow-auto flex items-center justify-center p-8 relative select-none cursor-default"
      onClick={(e) => {
        // Deselect if clicking on the canvas background
        if (e.target === e.currentTarget) {
          onDeselect?.();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Background canvas grid dots */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Scaled device container */}
      <div
        className={`transition-all duration-150 ease-out origin-top flex items-center justify-center my-auto ${
          isDragOver ? 'ring-4 ring-purple-500/50 rounded-[52px]' : ''
        }`}
        style={{
          transform: `scale(${zoom})`,
          width: `${width}px`,
          height: `${height}px`
        }}
      >
        {device.hasFrame ? (
          /* Phone/Tablet Bezel Shell */
          <div 
            className={`relative bg-slate-900 border-[10px] border-slate-800 shadow-2xl shadow-black/80 flex flex-col overflow-hidden transition-all duration-200 ${
              device.id.includes('ultra') ? 'rounded-[24px]' : 'rounded-[48px]'
            }`}
            style={{ 
              width: `${width}px`, 
              height: `${height}px`,
              paddingTop: isAccommodateSafeArea && !isLandscape ? `${topInset}px` : undefined,
              paddingBottom: isAccommodateSafeArea && !isLandscape ? `${bottomInset}px` : undefined,
              boxSizing: 'border-box'
            }}
          >
            {/* Top Camera Cutout / Notch / Dynamic Island */}
            {!isLandscape && device.isMobile && (
              <>
                {device.cameraCutout === 'punch-hole-center' && (
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black rounded-full z-40 border border-slate-800 flex items-center justify-center shadow-sm">
                    <div className="w-1 h-1 rounded-full bg-slate-700/80" />
                  </div>
                )}
                {device.cameraCutout === 'punch-hole-right' && (
                  <div className="absolute top-2.5 right-6 w-3.5 h-3.5 bg-black rounded-full z-40 border border-slate-800 flex items-center justify-center shadow-sm">
                    <div className="w-1 h-1 rounded-full bg-slate-700/80" />
                  </div>
                )}
                {device.cameraCutout === 'notch' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-black rounded-b-2xl z-40 flex items-center justify-center shadow-md">
                    <div className="w-12 h-1 bg-slate-800 rounded-full" />
                  </div>
                )}
                {(device.cameraCutout === 'island' || (!device.cameraCutout && device.platform !== 'android')) && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-end px-3 shadow-md">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
                  </div>
                )}
              </>
            )}

            {/* Accommodated Simulated Status Bar when Accommodate View is ON */}
            {isAccommodateSafeArea && !isLandscape && device.isMobile && (
              <div 
                className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 bg-slate-950 text-slate-300 pointer-events-none select-none"
                style={{ height: `${topInset}px` }}
              >
                {device.platform === 'android' ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-medium font-mono text-slate-200">10:00</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Android Notification" />
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-300 font-mono">
                      <span>LTE+</span>
                      <Wifi className="w-3 h-3 text-slate-300" />
                      <div className="flex items-center space-x-0.5">
                        <span className="text-[9px]">98%</span>
                        <Battery className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-semibold tracking-tight">9:41</span>
                    <div className="flex items-center space-x-1.5 text-[10px]">
                      <span>5G</span>
                      <Wifi className="w-3 h-3" />
                      <Battery className="w-3.5 h-3.5" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Target App Iframe */}
            <iframe
              ref={iframeRef as any}
              src={previewUrl}
              onLoad={onIframeLoaded}
              className="w-full h-full bg-white border-0 flex-1"
              title="Target App Preview"
              allow="accelerometer; camera; geolocation; gyroscope; microphone"
            />

            {/* Secure / Safe Area Overlay Insets (when Accommodate is OFF) */}
            {showSafeArea && !isAccommodateSafeArea && topInset > 0 && !isLandscape && (
              <div 
                className="absolute top-0 left-0 right-0 pointer-events-none z-30 bg-rose-500/10 border-b border-rose-500/40 flex items-end justify-center pb-1 text-[9px] font-mono text-rose-300 select-none"
                style={{ height: `${topInset}px` }}
              >
                <span className="bg-slate-950/85 px-1.5 py-0.5 rounded border border-rose-500/40 shadow text-[9px] font-semibold text-rose-300">
                  🛡️ Top Secure Area ({topInset}px)
                </span>
              </div>
            )}

            {showSafeArea && !isAccommodateSafeArea && bottomInset > 0 && !isLandscape && (
              <div 
                className="absolute bottom-0 left-0 right-0 pointer-events-none z-30 bg-rose-500/10 border-t border-rose-500/40 flex items-start justify-center pt-1 text-[9px] font-mono text-rose-300 select-none"
                style={{ height: `${bottomInset}px` }}
              >
                <span className="bg-slate-950/85 px-1.5 py-0.5 rounded border border-rose-500/40 shadow text-[9px] font-semibold text-rose-300">
                  🛡️ Bottom Secure Area ({bottomInset}px)
                </span>
              </div>
            )}

            {/* Accommodated Bottom Bar when Accommodate View is ON */}
            {isAccommodateSafeArea && !isLandscape && device.isMobile && (
              <div 
                className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center bg-slate-950 pointer-events-none select-none"
                style={{ height: `${bottomInset}px` }}
              >
                {device.navBarType === '3-button' ? (
                  <div className="flex items-center justify-around w-full max-w-[200px] text-slate-500 text-xs font-mono font-bold select-none">
                    <span className="hover:text-slate-300 cursor-pointer">◁</span>
                    <span className="hover:text-slate-300 cursor-pointer">○</span>
                    <span className="hover:text-slate-300 cursor-pointer">▢</span>
                  </div>
                ) : (
                  <div className="w-28 h-1 bg-slate-500/70 rounded-full" />
                )}
              </div>
            )}

            {/* Phone Bottom Home Bar / 3-Button Nav */}
            {!isLandscape && !isAccommodateSafeArea && device.isMobile && (
              device.navBarType === '3-button' ? (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-around w-48 text-slate-500/80 text-xs font-mono font-bold pointer-events-none z-40 select-none">
                  <span>◁</span>
                  <span>○</span>
                  <span>▢</span>
                </div>
              ) : (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-600/60 rounded-full pointer-events-none z-40" />
              )
            )}
          </div>
        ) : (
          /* Frameless / Responsive Canvas */
          <div 
            className="relative bg-white border border-slate-800 rounded-lg shadow-xl overflow-hidden transition-all duration-200"
            style={{ 
              width: `${width}px`, 
              height: `${height}px`,
              paddingTop: isAccommodateSafeArea ? `${topInset}px` : undefined,
              paddingBottom: isAccommodateSafeArea ? `${bottomInset}px` : undefined,
              boxSizing: 'border-box'
            }}
          >
            <iframe
              ref={iframeRef as any}
              src={previewUrl}
              onLoad={onIframeLoaded}
              className="w-full h-full bg-white border-0 flex-1"
              title="Target App Preview"
            />

            {/* Responsive Secure Area Guidelines */}
            {showSafeArea && !isAccommodateSafeArea && topInset > 0 && (
              <div 
                className="absolute top-0 left-0 right-0 pointer-events-none z-30 bg-rose-500/10 border-b border-rose-500/40 flex items-center justify-center text-[9px] font-mono text-rose-300 select-none"
                style={{ height: `${topInset}px` }}
              >
                <span className="bg-slate-950/85 px-1.5 py-0.5 rounded border border-rose-500/40 shadow">
                  🛡️ Top Secure Area ({topInset}px)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Canvas Controls (Inspect Mode, Secure Area Guides & Accommodate View) */}
      <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
        {isInspectMode && (
          <div className="bg-slate-900/90 backdrop-blur border border-blue-500/40 text-blue-300 px-3 py-1.5 rounded-full text-xs flex items-center space-x-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>Click to inspect • Drag handles to resize • Drag ⠿ to reorder • Esc to deselect</span>
          </div>
        )}

        <button
          onClick={onToggleSafeArea}
          className={`backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-1.5 shadow-lg border transition-all ${
            showSafeArea
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="Toggle Mobile Secure / Safe Area boundary guides"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Guides: {showSafeArea ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={onToggleAccommodateSafeArea}
          className={`backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-1.5 shadow-lg border transition-all ${
            isAccommodateSafeArea
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="Accommodate and fit entire view inside device safe area bounds"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Accommodate Safe Area: {isAccommodateSafeArea ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
};
