import React, { useRef, useEffect } from 'react';
import { DevicePreset } from '../types';
import { Smartphone, AlertTriangle, ExternalLink } from 'lucide-react';

interface CanvasProps {
  device: DevicePreset;
  isLandscape: boolean;
  zoom: number;
  previewUrl: string;
  isInspectMode: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoaded: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  device,
  isLandscape,
  zoom,
  previewUrl,
  isInspectMode,
  iframeRef,
  onIframeLoaded
}) => {
  const width = isLandscape ? device.height : device.width;
  const height = isLandscape ? device.width : device.height;

  return (
    <div className="flex-1 bg-slate-950/80 overflow-auto flex items-center justify-center p-8 relative select-none">
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
        className="transition-transform duration-150 ease-out origin-top flex items-center justify-center my-auto"
        style={{
          transform: `scale(${zoom})`,
          width: `${width}px`,
          height: `${height}px`
        }}
      >
        {device.hasFrame ? (
          /* Phone/Tablet Bezel Shell */
          <div 
            className="relative bg-slate-900 border-[10px] border-slate-800 rounded-[48px] shadow-2xl shadow-black/80 flex flex-col overflow-hidden"
            style={{ width: `${width}px`, height: `${height}px` }}
          >
            {/* Phone Top Notch / Dynamic Island */}
            {!isLandscape && device.isMobile && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-end px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
              </div>
            )}

            {/* Target App Iframe */}
            <iframe
              ref={iframeRef as any}
              src={previewUrl}
              onLoad={onIframeLoaded}
              className="w-full h-full bg-white border-0"
              title="Target App Preview"
              allow="accelerometer; camera; geolocation; gyroscope; microphone"
            />

            {/* Phone Bottom Home Bar */}
            {!isLandscape && device.isMobile && (
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-600/60 rounded-full pointer-events-none z-40" />
            )}
          </div>
        ) : (
          /* Frameless / Responsive Canvas */
          <div 
            className="relative bg-white border border-slate-800 rounded-lg shadow-xl overflow-hidden"
            style={{ width: `${width}px`, height: `${height}px` }}
          >
            <iframe
              ref={iframeRef as any}
              src={previewUrl}
              onLoad={onIframeLoaded}
              className="w-full h-full bg-white border-0"
              title="Target App Preview"
            />
          </div>
        )}
      </div>

      {/* Floating Inspect Mode Indicator */}
      {isInspectMode && (
        <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-blue-500/40 text-blue-300 px-3 py-1.5 rounded-full text-xs flex items-center space-x-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>Click any UI element to inspect & tweak</span>
        </div>
      )}
    </div>
  );
};
