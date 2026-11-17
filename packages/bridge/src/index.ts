import { MobileLayoutInspector } from './inspector';

// Auto-initialize when loaded inside an iframe or when query param is present
if (typeof window !== 'undefined') {
  const isEmbedded = window.parent && window.parent !== window;
  const urlParams = new URLSearchParams(window.location.search);
  const forceInspect = urlParams.get('mobile-layout-inspect') === 'true';

  if (isEmbedded || forceInspect) {
    console.log('[MobileLayout Bridge] Initializing visual inspector...');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        (window as any).__mobileLayoutInspector = new MobileLayoutInspector();
      });
    } else {
      (window as any).__mobileLayoutInspector = new MobileLayoutInspector();
    }
  }
}

export { MobileLayoutInspector };
