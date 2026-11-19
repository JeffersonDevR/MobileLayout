import React, { useState, useEffect, useRef } from 'react';
import { 
  ElementDetails, 
  MatchedSource, 
  UIChangeItem, 
  StudioConfig, 
  DevicePreset,
  ScreenAuditReport,
  SelectedComponentItem,
  ProjectView,
  ProjectFlow,
  TargetGitInfo
} from './types';
import { DEVICE_PRESETS } from './constants/devices';
import { Navbar } from './components/Navbar';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { ComponentPalette } from './components/ComponentPalette';
import { StagingDrawer } from './components/StagingDrawer';
import { DiffModal } from './components/DiffModal';
import { SettingsModal } from './components/SettingsModal';
import { LLMLogsModal } from './components/LLMLogsModal';
import { UIUXAuditModal } from './components/UIUXAuditModal';
import { ReactiveChangesDock } from './components/ReactiveChangesDock';
import { ComponentFixModal } from './components/ComponentFixModal';

export const App: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Viewport state
  const [activeDevice, setActiveDevice] = useState<DevicePreset>(DEVICE_PRESETS[0]);
  const [isLandscape, setIsLandscape] = useState(false);
  const [zoom, setZoom] = useState(0.85);
  const [isInspectMode, setIsInspectMode] = useState(true);
  const [showSafeArea, setShowSafeArea] = useState(true);

  // Inspector & selection state
  const [selectedElement, setSelectedElement] = useState<ElementDetails | null>(null);
  const [matchedSource, setMatchedSource] = useState<MatchedSource | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Component Fix Hub & Multi-Select state
  const [isFixModalOpen, setIsFixModalOpen] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<SelectedComponentItem[]>([]);

  // Discovered Views, Flows, and Target Path state
  const [views, setViews] = useState<ProjectView[]>([]);
  const [flows, setFlows] = useState<ProjectFlow[]>([]);
  const [selectedViewIds, setSelectedViewIds] = useState<string[]>([]);
  const [activePathname, setActivePathname] = useState<string>('/');
  const [activeView, setActiveView] = useState<ProjectView | null>(null);
  const [targetGitInfo, setTargetGitInfo] = useState<TargetGitInfo | null>(null);

  // Staged changes & LLM state
  const [stagedChanges, setStagedChanges] = useState<UIChangeItem[]>([]);
  const [userIntent, setUserIntent] = useState('');
  const [isStagingOpen, setIsStagingOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Diff modal & Apply state
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [diffResult, setDiffResult] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Settings modal & persistence
  const LOCAL_STORAGE_SETTINGS_KEY = 'mobile_layout_studio_settings';
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccommodateSafeArea, setIsAccommodateSafeArea] = useState(false);

  // LLM Logs state
  const [isLLMLogsOpen, setIsLLMLogsOpen] = useState(false);
  const [llmLogsCount, setLlmLogsCount] = useState(0);

  // UI/UX Audit state
  const [isUIUXAuditOpen, setIsUIUXAuditOpen] = useState(false);
  const [auditReport, setAuditReport] = useState<ScreenAuditReport | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  const [config, setConfig] = useState<StudioConfig>(() => {
    const defaults: StudioConfig = {
      projectPath: '',
      projectExists: false,
      targetUrl: 'http://localhost:8100',
      llmProvider: 'gemini',
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',
      openCodeBaseUrl: 'http://localhost:11434/v1',
      openCodeApiKey: 'dummy-key',
      openCodeModel: 'deepseek-coder'
    };

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return defaults;
  });

  // Notification toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchViews = async () => {
    try {
      const res = await fetch('/api/views');
      const data = await res.json();
      if (data.views) setViews(data.views);
      if (data.flows) setFlows(data.flows);
    } catch (e) {}
  };

  const handleCheckoutPath = async (pathname: string) => {
    try {
      const res = await fetch('/api/checkout-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname })
      });
      const data = await res.json();
      if (data.activeView) {
        setActiveView(data.activeView);
      }
      if (data.git) {
        setTargetGitInfo(data.git);
      }
    } catch (e) {}
  };

  // Fetch initial config & status from server and merge with localStorage
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setConfig((prev) => {
            const merged = {
              ...prev,
              ...data.config,
              // Keep non-empty localStorage keys if server returned empty
              geminiApiKey: data.config.geminiApiKey || prev.geminiApiKey,
              openCodeApiKey: data.config.openCodeApiKey || prev.openCodeApiKey
            };
            try {
              localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      })
      .catch((err) => console.log('Could not connect to Studio API server:', err.message));

    fetchViews();
    handleCheckoutPath('/');
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
          fetchViews();
          if (data.payload?.pathname) {
            setActivePathname(data.payload.pathname);
            handleCheckoutPath(data.payload.pathname);
          }
          break;

        case 'MOBILE_LAYOUT_ROUTE_CHANGED':
          const newPath = data.payload?.pathname || data.payload?.href || '/';
          console.log('[Studio] Route changed in target app:', newPath);
          setActivePathname(newPath);
          handleCheckoutPath(newPath);
          break;

        case 'MOBILE_LAYOUT_ELEMENT_SELECTED':
          const elData = data.payload as ElementDetails;
          setSelectedElement(elData);
          // Automatically attempt to scan project to match template
          scanElementInProject(elData);
          break;

        case 'MOBILE_LAYOUT_ADD_TO_FIX_LIST':
          const compData = data.payload as ElementDetails;
          handleAddElementToFixList(compData);
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
              selector: data.payload.selector,
              selectorPath: data.payload.selectorPath
            };
            setStagedChanges((prev) => [...prev, removeChange]);
            showToast(`Removed <${data.payload.tagName}> from canvas (staged for deletion).`, 'info');
          }
          break;

        case 'MOBILE_LAYOUT_ELEMENT_REORDERED':
          const reorderChange: UIChangeItem = {
            type: 'reorder',
            name: `Reorder <${data.payload.tagName}>`,
            value: `Moved ${data.payload.direction} relative to ${data.payload.relativeTo}`,
            selector: data.payload.selector,
            selectorPath: data.payload.selectorPath,
            relativeTo: data.payload.relativeToSelector || data.payload.relativeTo,
            direction: data.payload.direction
          };
          setStagedChanges((prev) => [...prev, reorderChange]);
          showToast(`Moved <${data.payload.tagName}> ${data.payload.direction} in canvas.`, 'success');
          break;

        case 'MOBILE_LAYOUT_ELEMENT_DUPLICATED':
          const duplicateChange: UIChangeItem = {
            type: 'duplicate',
            name: `Duplicate <${data.payload.tagName}>`,
            value: 'Duplicate the element',
            selector: data.payload.selector,
            selectorPath: data.payload.selectorPath,
            previewId: data.payload.previewId
          };
          setStagedChanges((prev) => [...prev, duplicateChange]);
          showToast(`Duplicated <${data.payload.tagName}> on canvas (staged).`, 'success');
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

        case 'MOBILE_LAYOUT_ELEMENT_DESELECTED':
          setSelectedElement(null);
          setMatchedSource(null);
          break;

        case 'MOBILE_LAYOUT_ELEMENT_RESIZED':
          const { width, height, tagName, selector } = data.payload || {};
          const changes: UIChangeItem[] = [];
          if (width) {
            changes.push({
              type: 'style',
              name: `width: <${tagName || 'element'}>`,
              value: width,
              selector
            });
          }
          if (height) {
            changes.push({
              type: 'style',
              name: `height: <${tagName || 'element'}>`,
              value: height,
              selector
            });
          }
          setStagedChanges((prev) => {
            let updated = [...prev];
            for (const ch of changes) {
              updated = updated.filter((c) => !(c.type === ch.type && c.name === ch.name));
              updated.push(ch);
            }
            return updated;
          });
          if (selectedElement) {
            setSelectedElement((prev) => prev ? {
              ...prev,
              boxModel: {
                ...prev.boxModel,
                width: width ? parseInt(width) || prev.boxModel.width : prev.boxModel.width,
                height: height ? parseInt(height) || prev.boxModel.height : prev.boxModel.height
              },
              computedStyles: {
                ...prev.computedStyles,
                width: width || prev.computedStyles.width,
                height: height || prev.computedStyles.height
              }
            } : null);
          }
          showToast(`Resized <${tagName || 'element'}> to ${width || ''} ${height ? '× ' + height : ''}`, 'info');
          break;

        case 'MOBILE_LAYOUT_COMPONENT_DROPPED':
          const { snippet: dropSnippet, name: dropName, previewId: dropPId, position: dropPos } = data.payload || {};
          if (dropSnippet && dropPId) {
            setStagedChanges((prev) => [
              ...prev,
              {
                id: dropPId,
                type: 'insert',
                name: dropName || 'Component',
                value: dropSnippet,
                previewId: dropPId
              }
            ]);
            setIsStagingOpen(true);
            showToast(`Dropped and inserted ${dropName || 'Component'} on canvas!`, 'success');
          }
          break;

        case 'MOBILE_LAYOUT_AUDIT_RESULT':
          setAuditReport(data.payload);
          setIsRunningAudit(false);
          break;

        case 'MOBILE_LAYOUT_AUDIT_FIX_APPLIED':
          const { selector: fixSel, prop: fixProp, value: fixVal } = data.payload || {};
          if (fixProp && fixVal) {
            setStagedChanges((prev) => [
              ...prev,
              {
                type: 'style',
                name: `${fixProp} (${fixSel || 'element'})`,
                value: fixVal,
                selector: fixSel
              }
            ]);
            showToast(`Applied live fix: ${fixProp} = ${fixVal}`, 'success');
          }
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

  // Handle element deselect
  const handleDeselectElement = () => {
    postToIframe('MOBILE_LAYOUT_CLEAR_SELECTION', {});
    setSelectedElement(null);
    setMatchedSource(null);
  };

  // Keyboard shortcut: Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedElement) {
        handleDeselectElement();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement]);

  // Sync device safe area insets & accommodate view to target app iframe
  useEffect(() => {
    if (activeDevice.safeArea) {
      postToIframe('MOBILE_LAYOUT_SET_SAFE_AREA', activeDevice.safeArea);
      postToIframe('MOBILE_LAYOUT_SET_ACCOMMODATE_SAFE_AREA', {
        enabled: isAccommodateSafeArea,
        top: activeDevice.safeArea.top,
        bottom: activeDevice.safeArea.bottom
      });
    }
  }, [activeDevice, isAccommodateSafeArea]);

  const handleToggleAccommodateSafeArea = () => {
    const next = !isAccommodateSafeArea;
    setIsAccommodateSafeArea(next);
    postToIframe('MOBILE_LAYOUT_SET_ACCOMMODATE_SAFE_AREA', {
      enabled: next,
      top: activeDevice.safeArea?.top ?? 47,
      bottom: activeDevice.safeArea?.bottom ?? 34
    });
    showToast(`Accommodate view to safe area: ${next ? 'ON' : 'OFF'}`, 'info');
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
    } else if (change.type === 'duplicate') {
      // Remove the live clone through the same preview-removal mechanism the
      // insert revert uses (bridge removes the [data-preview-id] element).
      if (change.previewId) {
        postToIframe('MOBILE_LAYOUT_REMOVE_INSERTED', { previewId: change.previewId });
      }
    } else if (change.type === 'reorder') {
      // The bridge exposes no inbound message that restores DOM order without
      // echoing a fresh MOBILE_LAYOUT_ELEMENT_REORDERED event (which would
      // restage the change being removed here), so a reorder revert only
      // drops the staged instruction; the canvas keeps its preview position.
    }

    setStagedChanges((prev) => prev.filter((_, i) => i !== idx));
    if (change.type === 'reorder') {
      showToast(`Removed staged reorder "${change.name}" (canvas keeps its preview position).`, 'info');
    } else {
      showToast(`Reverted "${change.name}" on canvas.`, 'info');
    }
  };

  // Revert all visual changes and restore original canvas
  const handleClearAllChanges = () => {
    // Remove staged preview elements (palette inserts + duplicates) from the
    // live canvas, not just their styling overrides.
    stagedChanges.forEach((change) => {
      if ((change.type === 'insert' || change.type === 'duplicate') && change.previewId) {
        postToIframe('MOBILE_LAYOUT_REMOVE_INSERTED', { previewId: change.previewId });
      }
    });
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
    if (!matchedSource && !activeView) {
      showToast('Select an element or view before copying prompt.', 'error');
      return;
    }

    const htmlFile = matchedSource?.htmlFilePath || activeView?.htmlFilePath || '';
    const scssFile = matchedSource?.scssFilePath || activeView?.scssFilePath;
    const fullHtml = matchedSource?.fullHtmlContent || activeView?.fullHtmlContent || '';
    const fullScss = matchedSource?.fullScssContent || activeView?.fullScssContent;

    try {
      const res = await fetch('/api/generate-clipboard-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlFilePath: htmlFile,
          scssFilePath: scssFile,
          matchedSnippet: matchedSource?.matchedSnippet || '',
          fullHtmlContent: fullHtml,
          fullScssContent: fullScss,
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
    if (!matchedSource && !activeView) {
      showToast('Please select a target element or view first.', 'error');
      return;
    }

    const htmlFile = matchedSource?.htmlFilePath || activeView?.htmlFilePath || '';
    const scssFile = matchedSource?.scssFilePath || activeView?.scssFilePath;
    const fullHtml = matchedSource?.fullHtmlContent || activeView?.fullHtmlContent || '';
    const fullScss = matchedSource?.fullScssContent || activeView?.fullScssContent;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.llmProvider,
          geminiApiKey: config.geminiApiKey,
          geminiModel: config.geminiModel,
          openCodeBaseUrl: config.openCodeBaseUrl,
          openCodeApiKey: config.openCodeApiKey,
          openCodeModel: config.openCodeModel,
          context: {
            htmlFilePath: htmlFile,
            scssFilePath: scssFile,
            matchedSnippet: matchedSource?.matchedSnippet || '',
            fullHtmlContent: fullHtml,
            fullScssContent: fullScss,
            visualChanges: stagedChanges,
            userIntent
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate code changes.');
      }

      // Direct-apply mode: skip the Monaco review and write straight to disk.
      if (directApplyMode) {
        if (!data.updatedHtmlContent && !data.updatedScssContent) {
          showToast('Generation returned no file content; opening the diff review instead.', 'error');
        } else {
          const applied = await applyToDisk({
            htmlFilePath: htmlFile,
            updatedHtmlContent: data.updatedHtmlContent,
            scssFilePath: scssFile,
            updatedScssContent: data.updatedScssContent
          });
          if (applied) setIsStagingOpen(false);
          return;
        }
      }

      setDiffResult({
        ...data,
        htmlFilePath: htmlFile,
        scssFilePath: scssFile
      });
      setIsStagingOpen(false);
      setIsDiffOpen(true);
      showToast('Code modifications generated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsGenerating(false);
      fetchLLMLogsCount();
    }
  };

  const fetchLLMLogsCount = async () => {
    try {
      const res = await fetch('/api/llm-logs');
      const data = await res.json();
      if (data.logs) {
        setLlmLogsCount(data.logs.length);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchLLMLogsCount();
  }, []);

  const handleRunAudit = () => {
    setIsRunningAudit(true);
    postToIframe('MOBILE_LAYOUT_RUN_AUDIT', {});
  };

  const handleApplyAuditFix = (selector: string, prop: string, value: string) => {
    postToIframe('MOBILE_LAYOUT_APPLY_AUDIT_FIX', { selector, prop, value });
  };

  const handleSelectBySelector = (selector: string) => {
    postToIframe('MOBILE_LAYOUT_SELECT_BY_SELECTOR', { selector });
  };

  // Multi-Component Fix Hub helpers
  const handleAddElementToFixList = async (el: ElementDetails, matchedSrc?: MatchedSource | null) => {
    const existing = selectedComponents.find((c) => c.selectorPath === el.selectorPath);
    if (existing) {
      showToast(`<${el.tagName}> is already in the Fix Hub!`, 'info');
      setIsFixModalOpen(true);
      return;
    }

    let source = matchedSrc || (el.selectorPath === selectedElement?.selectorPath ? matchedSource : null);

    if (!source && config.projectPath) {
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
        const scanData = await res.json();
        if (scanData.found && scanData.match) {
          source = scanData.match;
        }
      } catch (err) {}
    }

    const newItem: SelectedComponentItem = {
      id: 'fix-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      tagName: el.tagName,
      selectorPath: el.selectorPath,
      elementId: el.id,
      classList: el.classList || [],
      textContent: el.textContent,
      matchedSource: source,
      layoutWarnings: el.layoutWarnings || [],
      rect: el.rect
    };

    setSelectedComponents((prev) => [...prev, newItem]);
    showToast(`Added <${el.tagName}> to Component Fix Hub!`, 'success');
  };

  const handleToggleSelectForFix = () => {
    if (!selectedElement) return;
    const exists = selectedComponents.find((c) => c.selectorPath === selectedElement.selectorPath);
    if (exists) {
      setSelectedComponents((prev) => prev.filter((c) => c.id !== exists.id));
      showToast(`Removed <${selectedElement.tagName}> from Fix Hub.`, 'info');
    } else {
      handleAddElementToFixList(selectedElement, matchedSource);
    }
  };

  const handleRemoveSelectedComponent = (id: string) => {
    setSelectedComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearSelectedComponents = () => {
    setSelectedComponents([]);
    showToast('Cleared all components from Fix Hub.', 'info');
  };

  const handleUpdateComponentNote = (id: string, note: string) => {
    setSelectedComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, fixNote: note } : c))
    );
  };

  const handleAddAuditElementsToFixList = () => {
    if (!auditReport || auditReport.issues.length === 0) return;
    const newItems: SelectedComponentItem[] = [];
    auditReport.issues.forEach((issue) => {
      if (!selectedComponents.some((c) => c.selectorPath === issue.selector)) {
        newItems.push({
          id: 'audit-fix-' + issue.id + '-' + Math.random().toString(36).substr(2, 4),
          tagName: issue.tagName,
          selectorPath: issue.selector,
          classList: [],
          layoutWarnings: [
            {
              id: issue.id,
              type: issue.category as any,
              level: issue.level,
              title: issue.title,
              message: issue.message,
              recommendation: issue.message
            }
          ],
          fixNote: issue.message,
          matchedSource: matchedSource
        });
      }
    });

    if (newItems.length > 0) {
      setSelectedComponents((prev) => [...prev, ...newItems]);
      showToast(`Added ${newItems.length} audit issue element(s) to Fix Hub!`, 'success');
    } else {
      showToast('All audit elements are already in the Fix Hub.', 'info');
    }
  };

  const handleHighlightComponent = (selector: string) => {
    handleSelectBySelector(selector);
  };

  const handleToggleSelectView = (viewId: string) => {
    setSelectedViewIds((prev) =>
      prev.includes(viewId) ? prev.filter((id) => id !== viewId) : [...prev, viewId]
    );
  };

  const handleSelectFlow = (flowId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return;
    setSelectedViewIds((prev) => {
      const allSelected = flow.viewIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !flow.viewIds.includes(id));
      } else {
        return Array.from(new Set([...prev, ...flow.viewIds]));
      }
    });
  };

  const handleClearSelectedViews = () => {
    setSelectedViewIds([]);
  };

  const handleUpdateViewNote = (viewId: string, note: string) => {
    setViews((prev) =>
      prev.map((v) => (v.id === viewId ? { ...v, fixNote: note } : v))
    );
  };

  const handleNavigateToPath = (path: string) => {
    setActivePathname(path);
    postToIframe('MOBILE_LAYOUT_NAVIGATE_TO_PATH', { path });
    handleCheckoutPath(path);
    showToast(`Navigated to ${path}`, 'info');
  };

  const handleGenerateBatchFix = async (
    prompt: string,
    scope: { components: SelectedComponentItem[]; views: ProjectView[]; flowName?: string }
  ) => {
    const { components, views: scopeViews, flowName } = scope;
    if (components.length === 0 && scopeViews.length === 0 && !activeView) {
      showToast('Please select at least one component, view, or flow first.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const primaryComponent = components.find((c) => c.matchedSource) || components[0];
      const targetView = scopeViews[0] || activeView;
      const htmlFile = primaryComponent?.matchedSource?.htmlFilePath || targetView?.htmlFilePath || matchedSource?.htmlFilePath || '';
      const scssFile = primaryComponent?.matchedSource?.scssFilePath || targetView?.scssFilePath || matchedSource?.scssFilePath;
      const fullHtml = primaryComponent?.matchedSource?.fullHtmlContent || targetView?.fullHtmlContent || matchedSource?.fullHtmlContent || '';
      const fullScss = primaryComponent?.matchedSource?.fullScssContent || targetView?.fullScssContent || matchedSource?.fullScssContent;

      const res = await fetch('/api/generate-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.llmProvider,
          geminiApiKey: config.geminiApiKey,
          geminiModel: config.geminiModel,
          openCodeBaseUrl: config.openCodeBaseUrl,
          openCodeApiKey: config.openCodeApiKey,
          openCodeModel: config.openCodeModel,
          context: {
            htmlFilePath: htmlFile,
            scssFilePath: scssFile,
            matchedSnippet: primaryComponent?.matchedSource?.matchedSnippet || '',
            fullHtmlContent: fullHtml,
            fullScssContent: fullScss,
            visualChanges: stagedChanges,
            flowName,
            selectedViews: scopeViews.map((v) => ({
              id: v.id,
              name: v.name,
              route: v.route,
              htmlFilePath: v.htmlFilePath,
              scssFilePath: v.scssFilePath,
              flowName: v.flowName,
              fixNote: v.fixNote
            })),
            selectedComponents: components.map((c) => ({
              id: c.id,
              tagName: c.tagName,
              selector: c.selectorPath,
              matchedSnippet: c.matchedSource?.matchedSnippet,
              htmlFilePath: c.matchedSource?.htmlFilePath,
              lineNumber: c.matchedSource?.lineNumber,
              warnings: c.layoutWarnings?.map((w) => w.title),
              fixNote: c.fixNote
            })),
            batchFixPrompt: prompt,
            userIntent: prompt
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate code changes.');
      }

      setDiffResult({
        ...data,
        htmlFilePath: htmlFile,
        scssFilePath: scssFile
      });
      setIsFixModalOpen(false);
      setIsDiffOpen(true);
      const totalCount = components.length + scopeViews.length;
      showToast(`Generated fixes for ${totalCount > 0 ? totalCount + ' item(s)' : 'active view'}! Review diff now.`, 'success');
    } catch (err: any) {
      showToast('Generation failed: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
      fetchLLMLogsCount();
    }
  };

  const handleCopyBatchPrompt = async (
    prompt: string,
    scope: { components: SelectedComponentItem[]; views: ProjectView[]; flowName?: string }
  ) => {
    const { components, views: scopeViews, flowName } = scope;
    if (components.length === 0 && scopeViews.length === 0 && !activeView) {
      showToast('No components, views, or flows selected to copy.', 'error');
      return;
    }

    try {
      const primaryComponent = components.find((c) => c.matchedSource) || components[0];
      const targetView = scopeViews[0] || activeView;
      const htmlFile = primaryComponent?.matchedSource?.htmlFilePath || targetView?.htmlFilePath || matchedSource?.htmlFilePath || 'template.html';
      const scssFile = primaryComponent?.matchedSource?.scssFilePath || targetView?.scssFilePath || matchedSource?.scssFilePath;
      const fullHtml = primaryComponent?.matchedSource?.fullHtmlContent || targetView?.fullHtmlContent || matchedSource?.fullHtmlContent || '';
      const fullScss = primaryComponent?.matchedSource?.fullScssContent || targetView?.fullScssContent || matchedSource?.fullScssContent;

      const res = await fetch('/api/generate-clipboard-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlFilePath: htmlFile,
          scssFilePath: scssFile,
          matchedSnippet: primaryComponent?.matchedSource?.matchedSnippet || '',
          fullHtmlContent: fullHtml,
          fullScssContent: fullScss,
          visualChanges: stagedChanges,
          flowName,
          selectedViews: scopeViews.map((v) => ({
            id: v.id,
            name: v.name,
            route: v.route,
            htmlFilePath: v.htmlFilePath,
            scssFilePath: v.scssFilePath,
            flowName: v.flowName,
            fixNote: v.fixNote
          })),
          selectedComponents: components.map((c) => ({
            id: c.id,
            tagName: c.tagName,
            selector: c.selectorPath,
            matchedSnippet: c.matchedSource?.matchedSnippet,
            htmlFilePath: c.matchedSource?.htmlFilePath,
            lineNumber: c.matchedSource?.lineNumber,
            warnings: c.layoutWarnings?.map((w) => w.title),
            fixNote: c.fixNote
          })),
          batchFixPrompt: prompt,
          userIntent: prompt
        })
      });

      const data = await res.json();
      if (data.prompt) {
        navigator.clipboard.writeText(data.prompt);
        showToast('Batch prompt copied to clipboard! Ready to paste into Antigravity.', 'success');
      }
    } catch (err: any) {
      showToast('Failed to generate prompt: ' + err.message, 'error');
    }
  };

  // Synchronize live canvas state to backend for OpenCode & MCP
  useEffect(() => {
    fetch('/api/canvas-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedElement,
        auditReport,
        activeDevice,
        stagedChanges,
        safeArea: activeDevice.safeArea
      })
    }).catch(() => {});
  }, [selectedElement, auditReport, activeDevice, stagedChanges]);

  // Poll for commands issued by OpenCode via MCP
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/mcp-command/pending');
        const data = await res.json();
        if (data.commands && data.commands.length > 0) {
          for (const cmd of data.commands) {
            try {
              if (cmd.type === 'apply_style') {
                handleLiveUpdate(cmd.payload.styles || {}, {}, {
                  type: 'style',
                  name: `OpenCode: ${Object.keys(cmd.payload.styles || {}).join(', ')}`,
                  value: Object.values(cmd.payload.styles || {}).join(', '),
                  selector: cmd.payload.selector
                });
                showToast(`OpenCode applied styles: ${Object.keys(cmd.payload.styles || {}).join(', ')}`, 'info');
              } else if (cmd.type === 'apply_attribute') {
                handleLiveUpdate({}, cmd.payload.attributes || {}, {
                  type: 'attribute',
                  name: `OpenCode: ${Object.keys(cmd.payload.attributes || {}).join(', ')}`,
                  value: Object.values(cmd.payload.attributes || {}).join(', '),
                  selector: cmd.payload.selector
                });
                showToast(`OpenCode applied attributes`, 'info');
              } else if (cmd.type === 'update_text') {
                handleUpdateText(cmd.payload.text);
                showToast(`OpenCode updated text: "${cmd.payload.text}"`, 'info');
              } else if (cmd.type === 'insert_component') {
                handleInsertSnippet(cmd.payload.snippet, cmd.payload.name || 'Component');
                showToast(`OpenCode inserted component: ${cmd.payload.name || 'Component'}`, 'info');
              } else if (cmd.type === 'set_device') {
                const found = DEVICE_PRESETS.find((d) => d.id === cmd.payload.deviceId);
                if (found) {
                  setActiveDevice(found);
                  if (cmd.payload.isLandscape !== undefined) setIsLandscape(cmd.payload.isLandscape);
                  showToast(`OpenCode switched device to ${found.name}`, 'info');
                }
              } else if (cmd.type === 'run_audit') {
                handleRunAudit();
              } else if (cmd.type === 'revert_changes') {
                handleClearAllChanges();
              }

              fetch('/api/mcp-command/result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: cmd.id, result: { success: true } })
              }).catch(() => {});
            } catch (err: any) {
              fetch('/api/mcp-command/result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: cmd.id, error: err.message })
              }).catch(() => {});
            }
          }
        }
      } catch (e) {}
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  // Direct-apply mode: skip the Monaco review and write generated content
  // straight to disk (undo restores the per-file backups).
  const [directApplyMode, setDirectApplyMode] = useState(false);
  const [lastApply, setLastApply] = useState<{ htmlFilePath: string; scssFilePath?: string } | null>(null);

  // Write generated content straight to disk via the sandboxed apply endpoint.
  // Shared by the reviewed apply flow (DiffModal) and the direct-apply mode.
  const applyToDisk = async (payload: {
    htmlFilePath: string;
    updatedHtmlContent?: string;
    scssFilePath?: string;
    updatedScssContent?: string;
  }): Promise<boolean> => {
    setIsApplying(true);
    try {
      const res = await fetch('/api/apply-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply changes.');
      }

      showToast('Changes written to disk! HMR updating — Undo available in the Changes panel.', 'success');
      setIsDiffOpen(false);
      setStagedChanges([]);
      setLastApply({ htmlFilePath: payload.htmlFilePath, scssFilePath: payload.scssFilePath });

      // Clear live overrides so target app's real HMR code takes over
      postToIframe('MOBILE_LAYOUT_RESET_LIVE_STYLE', {});

      // Refresh views and target path checkout info
      fetchViews();
      if (activePathname) handleCheckoutPath(activePathname);

      // Rescan after brief delay for HMR
      setTimeout(() => {
        if (selectedElement) scanElementInProject(selectedElement);
      }, 1000);
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setIsApplying(false);
    }
  };

  // Undo the most recent apply by restoring the patcher's per-file backups.
  const handleUndoApply = async () => {
    if (!lastApply) return;
    try {
      const res = await fetch('/api/undo-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lastApply)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to undo the last apply.');
      }

      showToast('Last apply reverted from backup! Angular HMR is updating...', 'success');
      setLastApply(null);

      // Clear live overrides so the restored code takes over cleanly
      postToIframe('MOBILE_LAYOUT_RESET_LIVE_STYLE', {});
      fetchViews();
      if (activePathname) handleCheckoutPath(activePathname);
      setTimeout(() => {
        if (selectedElement) scanElementInProject(selectedElement);
      }, 1000);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Apply code changes (reviewed in the Monaco diff) to files on disk
  const handleApplyChanges = async () => {
    if (!diffResult) return;

    await applyToDisk({
      htmlFilePath: diffResult.htmlFilePath,
      updatedHtmlContent: diffResult.updatedHtmlContent,
      scssFilePath: diffResult.scssFilePath,
      updatedScssContent: diffResult.updatedScssContent
    });
  };

  // Save settings with dual persistence (localStorage + disk)
  const handleSaveConfig = async (updated: Partial<StudioConfig>) => {
    try {
      const merged = { ...config, ...updated };
      setConfig(merged);
      try {
        localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(merged));
      } catch (e) {}

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        const full = { ...merged, ...(data.config || {}) };
        setConfig(full);
        try {
          localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(full));
        } catch (e) {}
        showToast('Settings saved to disk and browser!', 'success');
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
        showSafeArea={showSafeArea}
        onToggleSafeArea={() => setShowSafeArea(!showSafeArea)}
        isAccommodateSafeArea={isAccommodateSafeArea}
        onToggleAccommodateSafeArea={handleToggleAccommodateSafeArea}
        onOpenLLMLogs={() => setIsLLMLogsOpen(true)}
        llmLogsCount={llmLogsCount}
        onOpenUIUXAudit={() => {
          setIsUIUXAuditOpen(true);
          if (!auditReport) handleRunAudit();
        }}
        auditIssuesCount={auditReport?.issues.length || 0}
        auditScore={auditReport?.score}
        onOpenComponentFixer={() => setIsFixModalOpen(true)}
        selectedComponentsCount={selectedComponents.length + selectedViewIds.length}
        activePathname={activePathname}
        onNavigateToPath={handleNavigateToPath}
        views={views}
        targetGitInfo={targetGitInfo}
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
            if (activeDevice.safeArea) {
              postToIframe('MOBILE_LAYOUT_SET_SAFE_AREA', activeDevice.safeArea);
              postToIframe('MOBILE_LAYOUT_SET_ACCOMMODATE_SAFE_AREA', {
                enabled: isAccommodateSafeArea,
                top: activeDevice.safeArea.top,
                bottom: activeDevice.safeArea.bottom
              });
            }
            setTimeout(() => {
              postToIframe('MOBILE_LAYOUT_RUN_AUDIT', {});
            }, 800);
          }}
          onDeselect={handleDeselectElement}
          showSafeArea={showSafeArea}
          onToggleSafeArea={() => setShowSafeArea(!showSafeArea)}
          isAccommodateSafeArea={isAccommodateSafeArea}
          onToggleAccommodateSafeArea={handleToggleAccommodateSafeArea}
          onDropSnippet={handleInsertSnippet}
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
          onDeselect={handleDeselectElement}
          onToggleSelectForFix={handleToggleSelectForFix}
          isAddedToFixList={Boolean(
            selectedElement &&
            selectedComponents.some((c) => c.selectorPath === selectedElement.selectorPath)
          )}
        />

        {/* Floating Reactive Changes Dock */}
        <ReactiveChangesDock
          stagedChanges={stagedChanges}
          matchedSource={matchedSource}
          onRemoveChange={handleRemoveChange}
          onClearAllChanges={handleClearAllChanges}
          onOpenStaging={() => setIsStagingOpen(true)}
          onGenerateWithLLM={handleGenerateWithLLM}
          onCopyPrompt={handleCopyPrompt}
          isGenerating={isGenerating}
          directApplyMode={directApplyMode}
          onToggleDirectApply={() => setDirectApplyMode((v) => !v)}
          canUndoApply={lastApply !== null}
          onUndoApply={handleUndoApply}
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
        activeView={activeView}
        userIntent={userIntent}
        onChangeUserIntent={setUserIntent}
        onGenerateWithLLM={handleGenerateWithLLM}
        onCopyPrompt={handleCopyPrompt}
        isGenerating={isGenerating}
        llmProvider={config.llmProvider}
        directApplyMode={directApplyMode}
        onToggleDirectApply={() => setDirectApplyMode((v) => !v)}
        canUndoApply={lastApply !== null}
        onUndoApply={handleUndoApply}
      />

      {/* Monaco Diff Modal */}
      <DiffModal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        explanation={diffResult?.explanation || ''}
        originalHtml={matchedSource?.fullHtmlContent || activeView?.fullHtmlContent}
        updatedHtml={diffResult?.updatedHtmlContent}
        originalScss={matchedSource?.fullScssContent || activeView?.fullScssContent}
        updatedScss={diffResult?.updatedScssContent}
        htmlFilePath={diffResult?.htmlFilePath || matchedSource?.htmlFilePath || activeView?.htmlFilePath}
        scssFilePath={diffResult?.scssFilePath || matchedSource?.scssFilePath || activeView?.scssFilePath}
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

      {/* LLM Activity Logs Modal */}
      <LLMLogsModal
        isOpen={isLLMLogsOpen}
        onClose={() => setIsLLMLogsOpen(false)}
      />

      {/* Screen-wide Mobile UI/UX Audit Modal */}
      <UIUXAuditModal
        isOpen={isUIUXAuditOpen}
        onClose={() => setIsUIUXAuditOpen(false)}
        report={auditReport}
        onRunAudit={handleRunAudit}
        onApplyFix={handleApplyAuditFix}
        onSelectElement={handleSelectBySelector}
        isRunningAudit={isRunningAudit}
      />

      {/* Multi-Component Fix Hub Modal */}
      <ComponentFixModal
        isOpen={isFixModalOpen}
        onClose={() => setIsFixModalOpen(false)}
        selectedComponents={selectedComponents}
        onRemoveComponent={handleRemoveSelectedComponent}
        onClearComponents={handleClearSelectedComponents}
        onUpdateComponentNote={handleUpdateComponentNote}
        onAddCurrentElement={() => selectedElement && handleAddElementToFixList(selectedElement, matchedSource)}
        onAddAuditElements={handleAddAuditElementsToFixList}
        onHighlightComponent={handleHighlightComponent}
        currentInspectedElement={selectedElement}
        currentMatchedSource={matchedSource}
        auditReport={auditReport}
        views={views}
        flows={flows}
        selectedViewIds={selectedViewIds}
        onToggleSelectView={handleToggleSelectView}
        onSelectAllViewsInFlow={handleSelectFlow}
        onClearSelectedViews={handleClearSelectedViews}
        onUpdateViewNote={handleUpdateViewNote}
        activePathname={activePathname}
        onNavigateToPath={handleNavigateToPath}
        targetGitInfo={targetGitInfo}
        llmProvider={config.llmProvider}
        isGenerating={isGenerating}
        onGenerateBatchFix={handleGenerateBatchFix}
        onCopyBatchPrompt={handleCopyBatchPrompt}
        onOpenSettings={() => {
          setIsFixModalOpen(false);
          setIsSettingsOpen(true);
        }}
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
