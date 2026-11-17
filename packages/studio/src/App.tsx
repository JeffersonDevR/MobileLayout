import React, { useState, useEffect, useRef } from 'react';
import { 
  ElementDetails, 
  MatchedSource, 
  UIChangeItem, 
  StudioConfig, 
  DevicePreset 
} from './types';
import { Navbar } from './components/Navbar';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { ComponentPalette } from './components/ComponentPalette';
import { StagingDrawer } from './components/StagingDrawer';
import { DiffModal } from './components/DiffModal';
import { SettingsModal } from './components/SettingsModal';

const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'iphone-15', name: 'iPhone 15 Pro', width: 393, height: 852, isMobile: true, hasFrame: true },
  { id: 'pixel-8', name: 'Pixel 8', width: 412, height: 915, isMobile: true, hasFrame: true },
  { id: 'ipad-mini', name: 'iPad Mini', width: 744, height: 1133, isMobile: true, hasFrame: true },
  { id: 'responsive', name: 'Responsive', width: 430, height: 800, isMobile: false, hasFrame: false }
];

export const App: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Viewport state
  const [activeDevice, setActiveDevice] = useState<DevicePreset>(DEVICE_PRESETS[0]);
  const [isLandscape, setIsLandscape] = useState(false);
  const [zoom, setZoom] = useState(0.85);
  const [isInspectMode, setIsInspectMode] = useState(true);

  // Inspector & selection state
  const [selectedElement, setSelectedElement] = useState<ElementDetails | null>(null);
  const [matchedSource, setMatchedSource] = useState<MatchedSource | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Staged changes & LLM state
  const [stagedChanges, setStagedChanges] = useState<UIChangeItem[]>([]);
  const [userIntent, setUserIntent] = useState('');
  const [isStagingOpen, setIsStagingOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Diff modal & Apply state
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [diffResult, setDiffResult] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<StudioConfig>({
    projectPath: '',
    projectExists: false,
    targetUrl: 'http://localhost:8100',
    llmProvider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openCodeBaseUrl: 'http://localhost:11434/v1',
    openCodeApiKey: 'dummy-key',
    openCodeModel: 'deepseek-coder'
  });

  // Notification toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial config & status from server
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setConfig((prev) => ({
            ...prev,
            ...data.config
          }));
        }
      })
      .catch((err) => console.log('Could not connect to Studio API server:', err.message));
  }, []);

  // PostMessage communication with injected bridge in iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !data.type) return;

      switch (data.type) {
        case 'MOBILE_LAYOUT_BRIDGE_READY':
          console.log('[Studio] Bridge connected from target app:', data.payload?.url);
          showToast('Inspector Bridge connected to target app!', 'success');
          // Sync current inspect mode
          postToIframe('MOBILE_LAYOUT_SET_INSPECT_MODE', { enabled: isInspectMode });
          break;

        case 'MOBILE_LAYOUT_ELEMENT_SELECTED':
          const elData = data.payload as ElementDetails;
          setSelectedElement(elData);
          // Automatically attempt to scan project to match template
          scanElementInProject(elData);
          break;

        case 'MOBILE_LAYOUT_ELEMENT_REMOVED_FROM_CANVAS':
          if (data.payload?.previewId) {
            setStagedChanges((prev) => prev.filter((c) => c.previewId !== data.payload.previewId));
            showToast('Element removed from canvas.', 'info');
          } else if (data.payload?.tagName) {
            const removeChange: UIChangeItem = {
              type: 'remove',
              name: `<${data.payload.tagName}>`,
              value: data.payload.selector || data.payload.tagName,
              selector: data.payload.selector
            };
            setStagedChanges((prev) => [...prev, removeChange]);
            showToast(`Removed <${data.payload.tagName}> from canvas (staged for deletion).`, 'info');
          }
          break;

        case 'MOBILE_LAYOUT_ELEMENT_REORDERED':
          const reorderChange: UIChangeItem = {
            type: 'style',
            name: `Reorder <${data.payload.tagName}>`,
            value: `Moved ${data.payload.direction} relative to ${data.payload.relativeTo}`
          };
          setStagedChanges((prev) => [...prev, reorderChange]);
          showToast(`Moved <${data.payload.tagName}> ${data.payload.direction} in canvas.`, 'success');
          break;

        case 'MOBILE_LAYOUT_TEXT_UPDATED':
          setStagedChanges((prev) => {
            const filtered = prev.filter((c) => c.name !== `Text: <${data.payload.tagName}>`);
            return [
              ...filtered,
              {
                type: 'style',
                name: `Text: <${data.payload.tagName}>`,
                value: data.payload.newText,
                previousValue: data.payload.oldText
              }
            ];
          });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isInspectMode, config.projectPath]);

  const postToIframe = (type: string, payload: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type, payload }, '*');
    }
  };

  const handleToggleInspect = () => {
    const next = !isInspectMode;
    setIsInspectMode(next);
    postToIframe('MOBILE_LAYOUT_SET_INSPECT_MODE', { enabled: next });
  };

  const handleRefreshIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      showToast('Reloading target app...', 'info');
    }
  };

  // Scan Angular project to find matching template file
  const scanElementInProject = async (el: ElementDetails) => {
    if (!config.projectPath) {
      // If project path not set, prompt user to set it
      return;
    }

    setIsScanning(true);
    try {
      const res = await fetch('/api/scan-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: config.projectPath,
          element: {
            tagName: el.tagName,
            id: el.id,
            classList: el.classList,
            attributes: el.attributes,
            textContent: el.textContent,
            selectorPath: el.selectorPath
          }
        })
      });

      const data = await res.json();
      if (data.found && data.match) {
        setMatchedSource(data.match);
      } else {
        setMatchedSource(null);
      }
    } catch (err: any) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Live styling update handler
  const handleLiveUpdate = (
    styles: Record<string, string>,
    attributes: Record<string, string>,
    change: UIChangeItem
  ) => {
    // 1. Post to iframe for immediate visual change in DOM
    postToIframe('MOBILE_LAYOUT_APPLY_LIVE_STYLE', { styles, attributes });

    // 2. Queue in staged changes
    setStagedChanges((prev) => {
      // Replace existing change with same name if present
      const filtered = prev.filter((c) => !(c.type === change.type && c.name === change.name));
      return [...filtered, change];
    });
  };

  const handleResetElementStyles = () => {
    postToIframe('MOBILE_LAYOUT_RESET_LIVE_STYLE', {});
    postToIframe('MOBILE_LAYOUT_UNHIDE_ELEMENT', {});
    setStagedChanges([]);
    showToast('Reset preview styles for element.', 'info');
  };

  // Insert component snippet from palette or inspector
  const handleInsertSnippet = (snippet: string, name: string) => {
    const previewId = 'preview-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    // 1. Post to iframe for immediate visual rendering of the added component (chip/badge/button)
    postToIframe('MOBILE_LAYOUT_INSERT_PREVIEW', { snippet, name, previewId });

    // 2. Queue in staged changes
    setStagedChanges((prev) => [
      ...prev,
      {
        id: previewId,
        type: 'insert',
        name,
        value: snippet,
        previewId
      }
    ]);
    setIsStagingOpen(true);
    showToast(`Added ${name} live on mobile canvas!`, 'success');
  };

  // Revert a single visual change immediately from the live UI without LLM
  const handleRemoveChange = (idx: number) => {
    const change = stagedChanges[idx];
    if (!change) return;

    if (change.type === 'insert' && change.previewId) {
      // Instantly remove inserted element from live canvas
      postToIframe('MOBILE_LAYOUT_REMOVE_INSERTED', { previewId: change.previewId });
    } else if (change.type === 'style') {
      // Instantly revert style property in live canvas
      postToIframe('MOBILE_LAYOUT_REVERT_PROPERTY', {
        type: 'style',
        name: change.name,
        previousValue: change.previousValue
      });
    } else if (change.type === 'attribute') {
      // Instantly revert attribute in live canvas
      postToIframe('MOBILE_LAYOUT_REVERT_PROPERTY', {
        type: 'attribute',
        name: change.name,
        previousValue: change.previousValue
      });
    } else if (change.type === 'remove') {
      // Unhide element in live canvas
      postToIframe('MOBILE_LAYOUT_UNHIDE_ELEMENT', { selector: change.selector });
    }

    setStagedChanges((prev) => prev.filter((_, i) => i !== idx));
    showToast(`Reverted "${change.name}" on canvas.`, 'info');
  };

  // Revert all visual changes and restore original canvas
  const handleClearAllChanges = () => {
    postToIframe('MOBILE_LAYOUT_RESET_LIVE_STYLE', {});
    postToIframe('MOBILE_LAYOUT_UNHIDE_ELEMENT', {});
    setStagedChanges([]);
    showToast('Reverted all visual changes on canvas.', 'info');
  };

  // Delete/remove currently selected element directly from UI
  const handleDeleteCurrentElement = () => {
    if (!selectedElement) return;

    if (selectedElement.isPreview) {
      // If it's an added preview element, delete from canvas and remove from queue
      postToIframe('MOBILE_LAYOUT_REMOVE_INSERTED', { previewId: selectedElement.previewId });
      setStagedChanges((prev) => prev.filter((c) => c.previewId !== selectedElement.previewId));
      setSelectedElement(null);
      showToast('Removed added element from mobile canvas.', 'info');
    } else {
      // If it's an existing project element, visually hide it from canvas and stage for LLM deletion
      postToIframe('MOBILE_LAYOUT_HIDE_SELECTED', {});
      const removeChange: UIChangeItem = {
        type: 'remove',
        name: `<${selectedElement.tagName}>`,
        value: selectedElement.textContent || selectedElement.tagName,
        selector: selectedElement.selectorPath
      };
      setStagedChanges((prev) => [...prev, removeChange]);
      setSelectedElement(null);
      showToast(`Removed <${selectedElement.tagName}> from canvas (staged for deletion).`, 'info');
    }
  };

  const handleMoveElement = (direction: 'up' | 'down') => {
    postToIframe('MOBILE_LAYOUT_MOVE_ELEMENT', { direction });
  };

  const handleUpdateText = (text: string) => {
    postToIframe('MOBILE_LAYOUT_UPDATE_TEXT', { text });
  };

  // Copy prompt for Antigravity / AI chat
  const handleCopyPrompt = async () => {
    if (!matchedSource) {
      showToast('Select an element before copying prompt.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/generate-clipboard-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlFilePath: matchedSource.htmlFilePath,
          scssFilePath: matchedSource.scssFilePath,
          matchedSnippet: matchedSource.matchedSnippet,
          fullHtmlContent: matchedSource.fullHtmlContent,
          fullScssContent: matchedSource.fullScssContent,
          visualChanges: stagedChanges,
          userIntent
        })
      });

      const data = await res.json();
      if (data.prompt) {
        navigator.clipboard.writeText(data.prompt);
        showToast('Prompt copied to clipboard! Ready to paste into Antigravity.', 'success');
      }
    } catch (err: any) {
      showToast('Failed to generate prompt: ' + err.message, 'error');
    }
  };

  // Generate code changes using LLM (Gemini or OpenCode)
  const handleGenerateWithLLM = async () => {
    if (!matchedSource) {
      showToast('Please select a target element first.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.llmProvider,
          context: {
            htmlFilePath: matchedSource.htmlFilePath,
            scssFilePath: matchedSource.scssFilePath,
            matchedSnippet: matchedSource.matchedSnippet,
            fullHtmlContent: matchedSource.fullHtmlContent,
            fullScssContent: matchedSource.fullScssContent,
            visualChanges: stagedChanges,
            userIntent
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate code changes.');
      }

      setDiffResult(data);
      setIsStagingOpen(false);
      setIsDiffOpen(true);
      showToast('Code modifications generated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply code changes to files on disk
  const handleApplyChanges = async () => {
    if (!diffResult) return;

    setIsApplying(true);
    try {
      const res = await fetch('/api/apply-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlFilePath: diffResult.htmlFilePath,
          updatedHtmlContent: diffResult.updatedHtmlContent,
          scssFilePath: diffResult.scssFilePath,
          updatedScssContent: diffResult.updatedScssContent
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply changes.');
      }

      showToast('Changes written to disk! Angular HMR is updating...', 'success');
      setIsDiffOpen(false);
      setStagedChanges([]);
      
      // Clear live overrides so target app's real HMR code takes over
      postToIframe('MOBILE_LAYOUT_RESET_LIVE_STYLE', {});
      
      // Rescan after brief delay for HMR
      setTimeout(() => {
        if (selectedElement) scanElementInProject(selectedElement);
      }, 1000);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // Save settings
  const handleSaveConfig = async (updated: Partial<StudioConfig>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        setConfig((prev) => ({ ...prev, ...updated }));
        showToast('Configuration updated!', 'success');
        if (selectedElement && updated.projectPath) {
          scanElementInProject(selectedElement);
        }
      }
    } catch (err: any) {
      showToast('Error saving settings: ' + err.message, 'error');
    }
  };

  // Target app preview URL through proxy (port 3301)
  const proxyPreviewUrl = `http://localhost:3301`;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Navbar
        devices={DEVICE_PRESETS}
        activeDevice={activeDevice}
        onSelectDevice={setActiveDevice}
        isLandscape={isLandscape}
        onToggleOrientation={() => setIsLandscape(!isLandscape)}
        zoom={zoom}
        onChangeZoom={setZoom}
        isInspectMode={isInspectMode}
        onToggleInspect={handleToggleInspect}
        stagedChangesCount={stagedChanges.length}
        onOpenStaging={() => setIsStagingOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        targetUrl={config.targetUrl}
        onRefreshIframe={handleRefreshIframe}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Ionic Component Palette */}
        <ComponentPalette onInsertSnippet={handleInsertSnippet} />

        {/* Center: Mobile Device Canvas */}
        <Canvas
          device={activeDevice}
          isLandscape={isLandscape}
          zoom={zoom}
          previewUrl={proxyPreviewUrl}
          isInspectMode={isInspectMode}
          iframeRef={iframeRef}
          onIframeLoaded={() => {
            console.log('[Studio] Target iframe loaded.');
          }}
        />

        {/* Right: Visual Property Inspector */}
        <Inspector
          element={selectedElement}
          matchedSource={matchedSource}
          isScanning={isScanning}
          onScanElement={() => selectedElement && scanElementInProject(selectedElement)}
          onLiveUpdate={handleLiveUpdate}
          onResetElementStyles={handleResetElementStyles}
          onInsertSnippet={handleInsertSnippet}
          onDeleteElement={handleDeleteCurrentElement}
          onMoveElement={handleMoveElement}
          onUpdateText={handleUpdateText}
        />
      </div>

      {/* Slide-out Staging Drawer */}
      <StagingDrawer
        isOpen={isStagingOpen}
        onClose={() => setIsStagingOpen(false)}
        stagedChanges={stagedChanges}
        onRemoveChange={handleRemoveChange}
        onClearChanges={handleClearAllChanges}
        matchedSource={matchedSource}
        userIntent={userIntent}
        onChangeUserIntent={setUserIntent}
        onGenerateWithLLM={handleGenerateWithLLM}
        onCopyPrompt={handleCopyPrompt}
        isGenerating={isGenerating}
        llmProvider={config.llmProvider}
      />

      {/* Monaco Diff Modal */}
      <DiffModal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        explanation={diffResult?.explanation || ''}
        originalHtml={matchedSource?.fullHtmlContent}
        updatedHtml={diffResult?.updatedHtmlContent}
        originalScss={matchedSource?.fullScssContent}
        updatedScss={diffResult?.updatedScssContent}
        htmlFilePath={diffResult?.htmlFilePath || matchedSource?.htmlFilePath}
        scssFilePath={diffResult?.scssFilePath || matchedSource?.scssFilePath}
        onApplyChanges={handleApplyChanges}
        isApplying={isApplying}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
      />

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md bg-slate-900/95 border-slate-700 text-slate-100">
          <span
            className={`w-2 h-2 rounded-full ${
              toast.type === 'success'
                ? 'bg-emerald-400'
                : toast.type === 'error'
                ? 'bg-rose-500'
                : 'bg-blue-400'
            }`}
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
export default App;
