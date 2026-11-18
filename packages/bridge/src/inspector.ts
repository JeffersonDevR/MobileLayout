export interface LayoutWarning {
  id: string;
  type: 'touch_target' | 'horizontal_overflow' | 'missing_safe_area' | 'non_ionic_clickable' | 'nested_scroll' | 'typography_small';
  level: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  recommendation: string;
  quickFix?: {
    prop: string;
    value: string;
    label: string;
  };
}

export interface ScreenAuditIssue {
  id: string;
  category: 'touch_target' | 'safe_area' | 'contrast' | 'semantic_ionic' | 'typography' | 'overflow';
  level: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  selector: string;
  tagName: string;
  quickFix?: {
    prop: string;
    value: string;
    label: string;
  };
}

export interface ScreenAuditReport {
  timestamp: string;
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  totalChecked: number;
  issues: ScreenAuditIssue[];
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    touchPass: boolean;
    safeAreaPass: boolean;
    contrastPass: boolean;
    semanticsPass: boolean;
  };
}

export interface ElementDetails {
  tagName: string;
  id: string;
  classList: string[];
  attributes: Record<string, string>;
  computedStyles: Record<string, string>;
  ionicProps: Record<string, string>;
  boxModel: {
    width: number;
    height: number;
    marginTop: string;
    marginRight: string;
    marginBottom: string;
    marginLeft: string;
    paddingTop: string;
    paddingRight: string;
    paddingBottom: string;
    paddingLeft: string;
    borderWidth: string;
    borderRadius: string;
  };
  typography: {
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    textAlign: string;
    color: string;
  };
  layout: {
    display: string;
    flexDirection: string;
    alignItems: string;
    justifyContent: string;
    gap: string;
  };
  textContent: string;
  hierarchy: string[];
  selectorPath: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isPreview?: boolean;
  previewId?: string;
  layoutWarnings?: LayoutWarning[];
}

const IONIC_ATTRIBUTES = [
  'color',
  'fill',
  'expand',
  'size',
  'shape',
  'slot',
  'name',
  'type',
  'lines',
  'translucent',
  'collapse',
  'placeholder',
  'value',
  'disabled'
];

const IONIC_CSS_VARS = [
  '--background',
  '--color',
  '--border-radius',
  '--padding-start',
  '--padding-end',
  '--padding-top',
  '--padding-bottom',
  '--border-color',
  '--box-shadow',
  '--ripple-color'
];

export class MobileLayoutInspector {
  private isInspectMode = true;
  private hoveredElement: HTMLElement | null = null;
  private selectedElement: HTMLElement | null = null;
  private overlayContainer: HTMLElement | null = null;
  private highlightBox: HTMLElement | null = null;
  private selectionBox: HTMLElement | null = null;
  private selectionToolbar: HTMLElement | null = null;
  private tooltipPill: HTMLElement | null = null;
  private resizeBadge: HTMLElement | null = null;
  private dropIndicator: HTMLElement | null = null;

  // Track original styles/attributes for rollback
  private originalStyles: Map<string, string> = new Map();
  private originalAttributes: Map<string, string | null> = new Map();
  private insertedPreviews: HTMLElement[] = [];

  constructor() {
    this.setupOverlay();
    this.attachEventListeners();
    this.setupMessageBridge();
    this.notifyReady();
  }

  private setupOverlay() {
    if (document.getElementById('mobile-layout-inspector-root')) return;

    // Inject mobile safe-area insets CSS variables so Ionic and mobile CSS safely adapt
    if (!document.getElementById('mobile-layout-safe-area-styles')) {
      const safeStyle = document.createElement('style');
      safeStyle.id = 'mobile-layout-safe-area-styles';
      safeStyle.textContent = `
        :root {
          --ion-safe-area-top: 47px;
          --ion-safe-area-bottom: 34px;
          --ion-safe-area-left: 0px;
          --ion-safe-area-right: 0px;
          --safe-area-top: 47px;
          --safe-area-bottom: 34px;
        }
        [data-mobile-layout-modified="true"] {
          outline: 2px dashed #10b981 !important;
          outline-offset: 2px !important;
        }
      `;
      document.head.appendChild(safeStyle);
    }

    this.overlayContainer = document.createElement('div');
    this.overlayContainer.id = 'mobile-layout-inspector-root';
    this.overlayContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // Hover box
    this.highlightBox = document.createElement('div');
    this.highlightBox.style.cssText = `
      position: absolute;
      display: none;
      border: 2px dashed #3b82f6;
      background-color: rgba(59, 130, 246, 0.15);
      pointer-events: none;
      transition: all 0.05s ease-out;
      box-sizing: border-box;
      z-index: 1000000;
    `;

    // Tooltip pill
    this.tooltipPill = document.createElement('div');
    this.tooltipPill.style.cssText = `
      position: absolute;
      top: -26px;
      left: 0;
      background: #1e293b;
      color: #f8fafc;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    this.highlightBox.appendChild(this.tooltipPill);

    // Selection box
    this.selectionBox = document.createElement('div');
    this.selectionBox.style.cssText = `
      position: absolute;
      display: none;
      border: 2px solid #8b5cf6;
      background-color: rgba(139, 92, 246, 0.18);
      pointer-events: none;
      box-sizing: border-box;
      z-index: 1000001;
    `;

    // Floating action toolbar on selection box
    this.selectionToolbar = document.createElement('div');
    this.selectionToolbar.style.cssText = `
      position: absolute;
      top: -30px;
      right: 0;
      display: flex;
      align-items: center;
      gap: 3px;
      background: #0f172a;
      border: 1px solid #6366f1;
      padding: 2px 4px;
      border-radius: 6px;
      pointer-events: auto;
      z-index: 1000005;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    `;

    const createBtn = (label: string, title: string, onClick: () => void) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.title = title;
      btn.style.cssText = `
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 4px;
        padding: 1px 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 2px;
        line-height: 18px;
        transition: background 0.1s;
      `;
      btn.onmouseenter = () => { btn.style.background = '#3b82f6'; };
      btn.onmouseleave = () => { btn.style.background = '#1e293b'; };
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      };
      return btn;
    };

    // Drag to reorder handle button
    const dragBtn = createBtn('⠿ Drag', 'Click and drag to reorder component in DOM', () => {});
    dragBtn.style.cursor = 'grab';
    dragBtn.style.color = '#c084fc';
    this.attachElementDrag(dragBtn);

    // Add to Fix Hub button
    const fixBtn = createBtn('⚡ Fix', 'Add element to Component Fix Hub', () => {
      if (this.selectedElement) {
        this.postToStudio('MOBILE_LAYOUT_ADD_TO_FIX_LIST', this.buildElementDetails(this.selectedElement));
      }
    });
    fixBtn.style.color = '#e879f9';
    fixBtn.style.borderColor = '#c084fc';

    const upBtn = createBtn('▲', 'Move element up (swap with previous sibling)', () => this.moveElement('up'));
    const downBtn = createBtn('▼', 'Move element down (swap with next sibling)', () => this.moveElement('down'));
    
    // Clear / Deselect button
    const deselectBtn = createBtn('✕', 'Deselect element (Esc)', () => {
      this.clearSelection();
      this.postToStudio('MOBILE_LAYOUT_ELEMENT_DESELECTED', {});
    });
    deselectBtn.style.color = '#94a3b8';

    const delBtn = createBtn('🗑️', 'Remove or delete element', () => {
      if (this.selectedElement?.hasAttribute('data-mobile-layout-preview')) {
        this.removeInsertedPreview();
      } else {
        const tag = this.selectedElement?.tagName?.toLowerCase() || 'element';
        const sel = this.selectedElement ? (this.selectedElement.id ? `#${this.selectedElement.id}` : tag) : tag;
        this.hideSelectedElement();
        this.postToStudio('MOBILE_LAYOUT_ELEMENT_REMOVED_FROM_CANVAS', {
          tagName: tag,
          selector: sel
        });
      }
    });
    delBtn.style.color = '#f87171';

    this.selectionToolbar.appendChild(dragBtn);
    this.selectionToolbar.appendChild(fixBtn);
    this.selectionToolbar.appendChild(upBtn);
    this.selectionToolbar.appendChild(downBtn);
    this.selectionToolbar.appendChild(deselectBtn);
    this.selectionToolbar.appendChild(delBtn);
    this.selectionBox.appendChild(this.selectionToolbar);

    // Setup interactive resize handles on selection box in all 8 directions
    this.setupResizeHandles();

    this.overlayContainer.appendChild(this.highlightBox);
    this.overlayContainer.appendChild(this.selectionBox);
    document.body.appendChild(this.overlayContainer);
  }

  private attachElementDrag(dragBtn: HTMLElement) {
    dragBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.selectedElement) return;

      let dropTarget: HTMLElement | null = null;
      let dropIsAfter = true;
      dragBtn.style.cursor = 'grabbing';
      if (this.selectionBox) {
        this.selectionBox.style.opacity = '0.6';
      }

      const onDragMove = (ev: MouseEvent) => {
        ev.preventDefault();
        const target = this.getInspectableElementAt(ev.clientX, ev.clientY);
        if (target && target !== this.selectedElement && !this.selectedElement?.contains(target)) {
          dropTarget = target;
          const rect = target.getBoundingClientRect();
          dropIsAfter = (ev.clientY - rect.top) > (rect.height / 2);
          this.showDropIndicator(target, ev.clientY);
        } else {
          this.hideDropIndicator();
          dropTarget = null;
        }
      };

      const onDragEnd = () => {
        document.removeEventListener('mousemove', onDragMove, true);
        document.removeEventListener('mouseup', onDragEnd, true);
        dragBtn.style.cursor = 'grab';
        if (this.selectionBox) {
          this.selectionBox.style.opacity = '1';
        }
        this.hideDropIndicator();

        if (this.selectedElement && dropTarget) {
          if (dropIsAfter) {
            dropTarget.after(this.selectedElement);
          } else {
            dropTarget.before(this.selectedElement);
          }
          this.updateSelectionBox(this.selectedElement);
          const tag = this.selectedElement.tagName.toLowerCase();
          const targetTag = dropTarget.tagName.toLowerCase();
          this.postToStudio('MOBILE_LAYOUT_ELEMENT_REORDERED', {
            direction: dropIsAfter ? 'after' : 'before',
            tagName: tag,
            targetSelector: this.selectedElement.id ? `#${this.selectedElement.id}` : tag,
            relativeTo: dropTarget.id ? `#${dropTarget.id}` : targetTag
          });
        }
      };

      document.addEventListener('mousemove', onDragMove, true);
      document.addEventListener('mouseup', onDragEnd, true);
    });
  }

  private showDropIndicator(target: HTMLElement, clientY: number) {
    if (!this.dropIndicator) {
      this.dropIndicator = document.createElement('div');
      this.dropIndicator.id = 'mobile-layout-drop-indicator';
      this.dropIndicator.style.cssText = `
        position: absolute;
        height: 3px;
        background: #a855f7;
        box-shadow: 0 0 8px rgba(168, 85, 247, 0.9);
        pointer-events: none;
        z-index: 1000010;
        border-radius: 2px;
        transition: top 0.05s ease-out, left 0.05s ease-out;
      `;
      if (this.overlayContainer) {
        this.overlayContainer.appendChild(this.dropIndicator);
      } else {
        document.body.appendChild(this.dropIndicator);
      }
    }

    const rect = target.getBoundingClientRect();
    const isAfter = (clientY - rect.top) > (rect.height / 2);
    this.dropIndicator.style.display = 'block';
    this.dropIndicator.style.left = `${rect.left}px`;
    this.dropIndicator.style.width = `${rect.width}px`;
    this.dropIndicator.style.top = isAfter ? `${rect.bottom - 1}px` : `${rect.top - 1}px`;
  }

  private hideDropIndicator() {
    if (this.dropIndicator) {
      this.dropIndicator.style.display = 'none';
    }
  }

  private setupResizeHandles() {
    if (!this.selectionBox) return;

    const createHandle = (cursor: string, style: string) => {
      const handle = document.createElement('div');
      handle.style.cssText = `
        position: absolute;
        pointer-events: auto;
        z-index: 1000006;
        box-sizing: border-box;
        ${style}
      `;
      return handle;
    };

    // Right edge handle (Width right)
    const handleE = createHandle('ew-resize', `
      top: 0;
      right: -6px;
      width: 12px;
      height: 100%;
      cursor: ew-resize;
      display: flex;
      align-items: center;
      justify-content: center;
    `);
    const barE = document.createElement('div');
    barE.style.cssText = `
      width: 4px;
      height: 22px;
      background: #8b5cf6;
      border: 1px solid #ffffff;
      border-radius: 2px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.5);
    `;
    handleE.appendChild(barE);

    // Left edge handle (Width left)
    const handleW = createHandle('ew-resize', `
      top: 0;
      left: -6px;
      width: 12px;
      height: 100%;
      cursor: ew-resize;
      display: flex;
      align-items: center;
      justify-content: center;
    `);
    const barW = document.createElement('div');
    barW.style.cssText = `
      width: 4px;
      height: 22px;
      background: #8b5cf6;
      border: 1px solid #ffffff;
      border-radius: 2px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.5);
    `;
    handleW.appendChild(barW);

    // Bottom edge handle (Height down)
    const handleS = createHandle('ns-resize', `
      bottom: -6px;
      left: 0;
      width: 100%;
      height: 12px;
      cursor: ns-resize;
      display: flex;
      align-items: center;
      justify-content: center;
    `);
    const barS = document.createElement('div');
    barS.style.cssText = `
      height: 4px;
      width: 22px;
      background: #8b5cf6;
      border: 1px solid #ffffff;
      border-radius: 2px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.5);
    `;
    handleS.appendChild(barS);

    // Top edge handle (Height up)
    const handleN = createHandle('ns-resize', `
      top: -6px;
      left: 0;
      width: 100%;
      height: 12px;
      cursor: ns-resize;
      display: flex;
      align-items: center;
      justify-content: center;
    `);
    const barN = document.createElement('div');
    barN.style.cssText = `
      height: 4px;
      width: 22px;
      background: #8b5cf6;
      border: 1px solid #ffffff;
      border-radius: 2px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.5);
    `;
    handleN.appendChild(barN);

    // Bottom-right corner handle (Width + Height)
    const handleSE = createHandle('nwse-resize', `
      bottom: -7px;
      right: -7px;
      width: 14px;
      height: 14px;
      background: #8b5cf6;
      border: 2px solid #ffffff;
      border-radius: 3px;
      cursor: nwse-resize;
      box-shadow: 0 2px 5px rgba(0,0,0,0.6);
    `);

    // Bottom-left corner handle
    const handleSW = createHandle('nesw-resize', `
      bottom: -7px;
      left: -7px;
      width: 14px;
      height: 14px;
      background: #8b5cf6;
      border: 2px solid #ffffff;
      border-radius: 3px;
      cursor: nesw-resize;
      box-shadow: 0 2px 5px rgba(0,0,0,0.6);
    `);

    // Top-right corner handle
    const handleNE = createHandle('nesw-resize', `
      top: -7px;
      right: -7px;
      width: 14px;
      height: 14px;
      background: #8b5cf6;
      border: 2px solid #ffffff;
      border-radius: 3px;
      cursor: nesw-resize;
      box-shadow: 0 2px 5px rgba(0,0,0,0.6);
    `);

    // Top-left corner handle
    const handleNW = createHandle('nwse-resize', `
      top: -7px;
      left: -7px;
      width: 14px;
      height: 14px;
      background: #8b5cf6;
      border: 2px solid #ffffff;
      border-radius: 3px;
      cursor: nwse-resize;
      box-shadow: 0 2px 5px rgba(0,0,0,0.6);
    `);

    // Dimensions badge while resizing
    this.resizeBadge = document.createElement('div');
    this.resizeBadge.style.cssText = `
      position: absolute;
      bottom: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      color: #a78bfa;
      font-size: 11px;
      font-family: monospace;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #6366f1;
      white-space: nowrap;
      pointer-events: none;
      display: none;
      box-shadow: 0 4px 6px rgba(0,0,0,0.4);
      z-index: 1000007;
    `;

    const attachDrag = (handle: HTMLElement, direction: 'e' | 'w' | 's' | 'n' | 'se' | 'sw' | 'ne' | 'nw') => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.selectedElement) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = this.selectedElement.getBoundingClientRect();
        const startWidth = startRect.width;
        const startHeight = startRect.height;
        let currentWidth = startWidth;
        let currentHeight = startHeight;

        if (this.resizeBadge) {
          this.resizeBadge.style.display = 'block';
          this.resizeBadge.textContent = `${Math.round(currentWidth)}px × ${Math.round(currentHeight)}px`;
        }

        const onMouseMove = (moveEvent: MouseEvent) => {
          moveEvent.preventDefault();
          if (!this.selectedElement) return;

          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;

          // Width resizing (from right: +dx, from left: -dx)
          if (direction === 'e' || direction === 'se' || direction === 'ne') {
            currentWidth = Math.max(16, Math.round(startWidth + dx));
            this.selectedElement.style.width = `${currentWidth}px`;
          } else if (direction === 'w' || direction === 'sw' || direction === 'nw') {
            currentWidth = Math.max(16, Math.round(startWidth - dx));
            this.selectedElement.style.width = `${currentWidth}px`;
          }

          // Height resizing (from bottom: +dy, from top: -dy)
          if (direction === 's' || direction === 'se' || direction === 'sw') {
            currentHeight = Math.max(16, Math.round(startHeight + dy));
            this.selectedElement.style.height = `${currentHeight}px`;
          } else if (direction === 'n' || direction === 'ne' || direction === 'nw') {
            currentHeight = Math.max(16, Math.round(startHeight - dy));
            this.selectedElement.style.height = `${currentHeight}px`;
          }

          this.updateSelectionBox(this.selectedElement);
          if (this.resizeBadge) {
            this.resizeBadge.textContent = `${Math.round(currentWidth)}px × ${Math.round(currentHeight)}px`;
          }
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove, true);
          document.removeEventListener('mouseup', onMouseUp, true);
          if (this.resizeBadge) {
            this.resizeBadge.style.display = 'none';
          }

          if (this.selectedElement) {
            const tag = this.selectedElement.tagName.toLowerCase();
            const sel = this.selectedElement.id ? `#${this.selectedElement.id}` : tag;
            const isHorizontal = ['e', 'w', 'se', 'sw', 'ne', 'nw'].includes(direction);
            const isVertical = ['s', 'n', 'se', 'sw', 'ne', 'nw'].includes(direction);

            this.postToStudio('MOBILE_LAYOUT_ELEMENT_RESIZED', {
              width: isHorizontal ? `${currentWidth}px` : undefined,
              height: isVertical ? `${currentHeight}px` : undefined,
              tagName: tag,
              selector: sel
            });
            this.updateSelectionBox(this.selectedElement);
          }
        };

        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('mouseup', onMouseUp, true);
      });
    };

    attachDrag(handleE, 'e');
    attachDrag(handleW, 'w');
    attachDrag(handleS, 's');
    attachDrag(handleN, 'n');
    attachDrag(handleSE, 'se');
    attachDrag(handleSW, 'sw');
    attachDrag(handleNE, 'ne');
    attachDrag(handleNW, 'nw');

    this.selectionBox.appendChild(handleE);
    this.selectionBox.appendChild(handleW);
    this.selectionBox.appendChild(handleS);
    this.selectionBox.appendChild(handleN);
    this.selectionBox.appendChild(handleSE);
    this.selectionBox.appendChild(handleSW);
    this.selectionBox.appendChild(handleNE);
    this.selectionBox.appendChild(handleNW);
    this.selectionBox.appendChild(this.resizeBadge);
  }

  private attachEventListeners() {
    // Mouse hover
    document.addEventListener(
      'mousemove',
      (e) => {
        if (!this.isInspectMode) return;
        const target = this.getInspectableElementAt(e.clientX, e.clientY);
        if (target && target !== this.hoveredElement) {
          this.hoveredElement = target;
          this.updateHighlight(target);
        }
      },
      true
    );

    // Mouse leave window
    document.addEventListener(
      'mouseleave',
      () => {
        if (this.highlightBox) this.highlightBox.style.display = 'none';
        this.hoveredElement = null;
      },
      true
    );

    // Click selection
    document.addEventListener(
      'click',
      (e) => {
        if (!this.isInspectMode) return;
        // Don't intercept clicks inside inspector overlay or toolbar
        if (this.overlayContainer && this.overlayContainer.contains(e.target as Node)) {
          return;
        }

        const target = this.getInspectableElementAt(e.clientX, e.clientY);
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          this.selectElement(target);
        } else if (this.selectedElement) {
          // Clicked empty background / body -> deselect
          this.clearSelection();
          this.postToStudio('MOBILE_LAYOUT_ELEMENT_DESELECTED', {});
        }
      },
      true
    );

    // Escape key deselects currently selected element
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && this.selectedElement) {
          e.preventDefault();
          this.clearSelection();
          this.postToStudio('MOBILE_LAYOUT_ELEMENT_DESELECTED', {});
        }
      },
      true
    );

    // Handle scroll/resize
    window.addEventListener(
      'scroll',
      () => {
        if (this.selectedElement) this.updateSelectionBox(this.selectedElement);
        if (this.hoveredElement) this.updateHighlight(this.hoveredElement);
      },
      true
    );

    window.addEventListener(
      'resize',
      () => {
        if (this.selectedElement) this.updateSelectionBox(this.selectedElement);
        if (this.hoveredElement) this.updateHighlight(this.hoveredElement);
      },
      true
    );

    // HTML5 Drag & Drop from Component Palette
    document.addEventListener(
      'dragover',
      (e) => {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
        const target = this.getInspectableElementAt(e.clientX, e.clientY);
        if (target) {
          this.showDropIndicator(target, e.clientY);
        }
      },
      true
    );

    document.addEventListener(
      'dragleave',
      (e) => {
        if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          this.hideDropIndicator();
        }
      },
      true
    );

    document.addEventListener(
      'drop',
      (e) => {
        e.preventDefault();
        this.hideDropIndicator();

        let snippet = '';
        let name = 'Component';
        const jsonStr = e.dataTransfer?.getData('application/json');
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr);
            snippet = parsed.snippet || '';
            name = parsed.name || 'Component';
          } catch (err) {}
        }
        if (!snippet) {
          snippet = e.dataTransfer?.getData('text/plain') || '';
        }
        if (!snippet) return;

        const target = this.getInspectableElementAt(e.clientX, e.clientY) || this.selectedElement || document.body;
        const rect = target.getBoundingClientRect();
        const isAfter = (e.clientY - rect.top) > (rect.height / 2);
        const previewId = 'preview-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

        const template = document.createElement('template');
        template.innerHTML = snippet.trim();
        const newEl = template.content.firstElementChild as HTMLElement;
        if (newEl) {
          newEl.setAttribute('data-mobile-layout-preview', 'true');
          newEl.setAttribute('data-preview-id', previewId);
          newEl.style.outline = '2px dashed #a855f7';
          newEl.style.outlineOffset = '2px';
          newEl.title = 'Live Preview Insertion (Staged for LLM)';

          if (target === document.body) {
            document.body.appendChild(newEl);
          } else if (isAfter) {
            target.insertAdjacentElement('afterend', newEl);
          } else {
            target.insertAdjacentElement('beforebegin', newEl);
          }
          this.insertedPreviews.push(newEl);
          this.selectElement(newEl);

          this.postToStudio('MOBILE_LAYOUT_COMPONENT_DROPPED', {
            snippet,
            name,
            previewId,
            targetSelector: target.id ? `#${target.id}` : target.tagName.toLowerCase(),
            position: isAfter ? 'after' : 'before'
          });
        }
      },
      true
    );
  }

  private getInspectableElementAt(x: number, y: number): HTMLElement | null {
    // temporarily hide overlay to test under
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      if (
        el === this.overlayContainer ||
        this.overlayContainer?.contains(el) ||
        el.tagName === 'HTML' ||
        el.tagName === 'BODY'
      ) {
        continue;
      }
      return el as HTMLElement;
    }
    return null;
  }

  private updateHighlight(el: HTMLElement) {
    if (!this.highlightBox || !this.tooltipPill) return;

    const rect = el.getBoundingClientRect();
    this.highlightBox.style.display = 'block';
    this.highlightBox.style.top = `${rect.top}px`;
    this.highlightBox.style.left = `${rect.left}px`;
    this.highlightBox.style.width = `${rect.width}px`;
    this.highlightBox.style.height = `${rect.height}px`;

    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const firstClass = el.classList.length ? `.${el.classList[0]}` : '';
    this.tooltipPill.textContent = `${tag}${id}${firstClass} (${Math.round(rect.width)}×${Math.round(rect.height)})`;
  }

  private updateSelectionBox(el: HTMLElement) {
    if (!this.selectionBox) return;

    const rect = el.getBoundingClientRect();
    this.selectionBox.style.display = 'block';
    this.selectionBox.style.top = `${rect.top}px`;
    this.selectionBox.style.left = `${rect.left}px`;
    this.selectionBox.style.width = `${rect.width}px`;
    this.selectionBox.style.height = `${rect.height}px`;
  }

  public selectElement(el: HTMLElement) {
    this.selectedElement = el;
    this.updateSelectionBox(el);

    // Save initial state for live overrides
    this.originalStyles.clear();
    this.originalAttributes.clear();

    const details = this.extractElementDetails(el);
    this.postToStudio('MOBILE_LAYOUT_ELEMENT_SELECTED', details);
  }

  private extractElementDetails(el: HTMLElement): ElementDetails {
    const computed = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    // Collect attributes
    const attributes: Record<string, string> = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      attributes[attr.name] = attr.value;
    }

    // Collect Ionic custom properties
    const ionicProps: Record<string, string> = {};
    for (const varName of IONIC_CSS_VARS) {
      const val = computed.getPropertyValue(varName).trim();
      if (val) {
        ionicProps[varName] = val;
      }
    }

    // Build hierarchy
    const hierarchy: string[] = [];
    let curr: HTMLElement | null = el;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      const name = curr.tagName.toLowerCase();
      const cls = curr.classList.length ? `.${curr.classList[0]}` : '';
      hierarchy.unshift(`${name}${cls}`);
      curr = curr.parentElement;
    }

    // Text content preview
    const textContent = (el.innerText || el.textContent || '').trim().slice(0, 100);

    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      classList: Array.from(el.classList),
      attributes,
      computedStyles: {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        display: computed.display,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        width: computed.width,
        height: computed.height,
        opacity: computed.opacity
      },
      ionicProps,
      boxModel: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        marginTop: computed.marginTop,
        marginRight: computed.marginRight,
        marginBottom: computed.marginBottom,
        marginLeft: computed.marginLeft,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        borderWidth: computed.borderWidth,
        borderRadius: computed.borderRadius
      },
      typography: {
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        textAlign: computed.textAlign,
        color: computed.color
      },
      layout: {
        display: computed.display,
        flexDirection: computed.flexDirection,
        alignItems: computed.alignItems,
        justifyContent: computed.justifyContent,
        gap: computed.gap
      },
      textContent,
      hierarchy,
      selectorPath: hierarchy.join(' > '),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      isPreview: el.hasAttribute('data-mobile-layout-preview'),
      previewId: el.getAttribute('data-preview-id') || undefined,
      layoutWarnings: this.detectLayoutPatterns(el, computed, rect)
    };
  }

  private detectLayoutPatterns(el: HTMLElement, computed: CSSStyleDeclaration, rect: DOMRect): LayoutWarning[] {
    const warnings: LayoutWarning[] = [];
    const tag = el.tagName.toLowerCase();
    const isInteractive = 
      ['button', 'a', 'input', 'select', 'textarea'].includes(tag) ||
      tag.startsWith('ion-button') ||
      tag.startsWith('ion-item') ||
      tag.startsWith('ion-checkbox') ||
      tag.startsWith('ion-toggle') ||
      el.getAttribute('role') === 'button' ||
      computed.cursor === 'pointer' ||
      el.hasAttribute('onclick') ||
      el.hasAttribute('(click)');

    // 1. Touch Target Size (< 44x44px for interactive elements)
    if (isInteractive && (rect.width < 44 || rect.height < 44) && rect.width > 0 && rect.height > 0) {
      warnings.push({
        id: 'touch-target-small',
        type: 'touch_target',
        level: 'warning',
        title: `Touch Target Too Small (${Math.round(rect.width)}×${Math.round(rect.height)}px)`,
        message: `Interactive elements on mobile should have a minimum hit area of 44×44px (Apple HIG & Material Design) to prevent mis-taps.`,
        recommendation: `Set min-height: 44px and min-width: 44px or expand touch padding.`,
        quickFix: {
          prop: 'minHeight',
          value: '44px',
          label: 'Set min-height: 44px'
        }
      });
    }

    // 2. Horizontal Viewport Overflow
    const viewportWidth = window.innerWidth;
    if (rect.width > viewportWidth + 2 || rect.right > viewportWidth + 2) {
      warnings.push({
        id: 'horizontal-overflow',
        type: 'horizontal_overflow',
        level: 'error',
        title: `Horizontal Overflow (${Math.round(rect.width)}px > ${viewportWidth}px)`,
        message: `Element overflows screen width, causing unintentional sideways scrolling and layout shifting on mobile.`,
        recommendation: `Set max-width: 100% and ensure box-sizing is border-box.`,
        quickFix: {
          prop: 'maxWidth',
          value: '100%',
          label: 'Set max-width: 100%'
        }
      });
    }

    // 3. Fixed / Absolute Edge Element Missing Safe Area Insets
    const isFixedOrAbsolute = computed.position === 'fixed' || computed.position === 'absolute' || computed.position === 'sticky';
    if (isFixedOrAbsolute) {
      const topPadding = parseFloat(computed.paddingTop || '0');
      const bottomPadding = parseFloat(computed.paddingBottom || '0');

      if (rect.top <= 8 && topPadding < 24) {
        warnings.push({
          id: 'missing-safe-area-top',
          type: 'missing_safe_area',
          level: 'warning',
          title: `Header / Top Bar Missing Safe Area Inset`,
          message: `Element is pinned to the top edge and may be obscured by the notch, Dynamic Island, or status bar on iOS/Android.`,
          recommendation: `Apply safe area inset top padding.`,
          quickFix: {
            prop: 'paddingTop',
            value: 'max(var(--ion-safe-area-top, 0px), env(safe-area-inset-top, 47px))',
            label: 'Add Safe Area Top Padding'
          }
        });
      }

      if (rect.bottom >= window.innerHeight - 8 && bottomPadding < 20) {
        warnings.push({
          id: 'missing-safe-area-bottom',
          type: 'missing_safe_area',
          level: 'warning',
          title: `Footer / Bottom Bar Missing Safe Area Inset`,
          message: `Element is pinned to the bottom edge and may collide with the iOS home indicator bar or navigation gestures.`,
          recommendation: `Apply safe area inset bottom padding.`,
          quickFix: {
            prop: 'paddingBottom',
            value: 'max(var(--ion-safe-area-bottom, 0px), env(safe-area-inset-bottom, 34px))',
            label: 'Add Safe Area Bottom Padding'
          }
        });
      }
    }

    // 4. Non-Ionic Generic Clickable Element
    if (['div', 'span', 'p', 'section', 'article'].includes(tag) && (el.hasAttribute('onclick') || el.hasAttribute('(click)') || computed.cursor === 'pointer')) {
      warnings.push({
        id: 'non-ionic-clickable',
        type: 'non_ionic_clickable',
        level: 'info',
        title: `Non-Ionic Clickable Element (<${tag}>)`,
        message: `Plain HTML click containers lack native mobile ripple feedback, touch active states, and mobile screen reader focus.`,
        recommendation: `Consider replacing with <ion-item button> or <ion-button expand="block"> for native mobile UX.`,
        quickFix: {
          prop: 'cursor',
          value: 'pointer',
          label: 'Ensure cursor: pointer'
        }
      });
    }

    // 5. Nested Vertical Scroll Container
    if (computed.overflowY === 'scroll' || computed.overflowY === 'auto') {
      let ancestor = el.parentElement;
      let hasScrollAncestor = false;
      while (ancestor && ancestor !== document.body) {
        const aStyle = window.getComputedStyle(ancestor);
        if (ancestor.tagName.toLowerCase() === 'ion-content' || aStyle.overflowY === 'scroll' || aStyle.overflowY === 'auto') {
          hasScrollAncestor = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (hasScrollAncestor) {
        warnings.push({
          id: 'nested-scroll',
          type: 'nested_scroll',
          level: 'warning',
          title: `Nested Scroll Container Detected`,
          message: `Vertical scrolling container inside another scrollable parent (like <ion-content>) causes touch gesture trapping on mobile devices.`,
          recommendation: `Allow the parent container to handle scrolling, or set overflow-y: visible.`,
          quickFix: {
            prop: 'overflowY',
            value: 'visible',
            label: 'Set overflow-y: visible'
          }
        });
      }
    }

    // 6. Tiny Typography (< 12px)
    const fontSize = parseFloat(computed.fontSize || '16');
    if (fontSize < 12 && fontSize > 0) {
      warnings.push({
        id: 'typography-small',
        type: 'typography_small',
        level: 'warning',
        title: `Tiny Typography (${computed.fontSize})`,
        message: `Text smaller than 12px is difficult to read on high-density mobile screens and fails accessibility standards.`,
        recommendation: `Increase font size to at least 13px or 14px.`,
        quickFix: {
          prop: 'fontSize',
          value: '14px',
          label: 'Set font-size: 14px'
        }
      });
    }

    return warnings;
  }

  public runScreenAudit(): ScreenAuditReport {
    const issues: ScreenAuditIssue[] = [];
    const allElements = Array.from(document.body.querySelectorAll('*')) as HTMLElement[];
    let totalChecked = 0;

    let touchPass = true;
    let safeAreaPass = true;
    let contrastPass = true;
    let semanticsPass = true;

    const getSelector = (el: HTMLElement): string => {
      if (el.id) return `#${el.id}`;
      const tag = el.tagName.toLowerCase();
      const firstClass = el.classList.length ? `.${el.classList[0]}` : '';
      return `${tag}${firstClass}`;
    };

    const parseRgb = (colorStr: string): [number, number, number] | null => {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      }
      return null;
    };

    const getLuminance = (r: number, g: number, b: number): number => {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const getContrastRatio = (l1: number, l2: number): number => {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const hasIonContent = !!document.querySelector('ion-content');
    if (!hasIonContent && allElements.length > 5) {
      semanticsPass = false;
      issues.push({
        id: 'missing-ion-content',
        category: 'semantic_ionic',
        level: 'warning',
        title: 'Missing <ion-content> Root Container',
        message: 'Ionic mobile screens should wrap scrollable views in <ion-content> to manage inertia scrolling, pull-to-refresh, and keyboard avoidance.',
        selector: 'body',
        tagName: 'body'
      });
    }

    for (const el of allElements) {
      if (el.id === 'mobile-layout-inspector-root' || el.closest('#mobile-layout-inspector-root')) {
        continue;
      }

      totalChecked++;
      const tag = el.tagName.toLowerCase();
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);

      if (rect.width === 0 && rect.height === 0) continue;
      if (computed.display === 'none' || computed.visibility === 'hidden') continue;

      const isInteractive =
        ['button', 'a', 'input', 'select', 'textarea'].includes(tag) ||
        tag.startsWith('ion-button') ||
        tag.startsWith('ion-item') ||
        tag.startsWith('ion-checkbox') ||
        tag.startsWith('ion-toggle') ||
        el.getAttribute('role') === 'button' ||
        computed.cursor === 'pointer' ||
        el.hasAttribute('onclick') ||
        el.hasAttribute('(click)');

      // 1. Touch Target Check (< 44px)
      if (isInteractive && (rect.width < 44 || rect.height < 44) && rect.width > 0 && rect.height > 0) {
        touchPass = false;
        issues.push({
          id: `touch-${issues.length}`,
          category: 'touch_target',
          level: 'warning',
          title: `Touch Target Too Small (${Math.round(rect.width)}×${Math.round(rect.height)}px)`,
          message: `<${tag}> is below 44×44px hit-box guideline. Mis-taps and accessibility issues are common on mobile touchscreens.`,
          selector: getSelector(el),
          tagName: tag,
          quickFix: {
            prop: 'minHeight',
            value: '44px',
            label: 'Set min-height: 44px'
          }
        });
      }

      // 2. Safe Area Inset Check
      const isFixedOrAbsolute = computed.position === 'fixed' || computed.position === 'sticky';
      if (isFixedOrAbsolute) {
        const topPadding = parseFloat(computed.paddingTop || '0');
        const bottomPadding = parseFloat(computed.paddingBottom || '0');

        if (rect.top <= 6 && topPadding < 24) {
          safeAreaPass = false;
          issues.push({
            id: `safe-top-${issues.length}`,
            category: 'safe_area',
            level: 'error',
            title: `Top Bar / Header Missing Safe Area Inset`,
            message: `Fixed element at top edge lacks status bar / notch padding and will be obscured by device hardware.`,
            selector: getSelector(el),
            tagName: tag,
            quickFix: {
              prop: 'paddingTop',
              value: 'max(var(--ion-safe-area-top, 0px), env(safe-area-inset-top, 47px))',
              label: 'Add Safe Area Top Padding'
            }
          });
        }

        if (rect.bottom >= viewportHeight - 6 && bottomPadding < 20) {
          safeAreaPass = false;
          issues.push({
            id: `safe-bottom-${issues.length}`,
            category: 'safe_area',
            level: 'error',
            title: `Bottom Bar / Footer Missing Safe Area Inset`,
            message: `Fixed element at bottom edge lacks home indicator padding and may collide with OS gesture navigation.`,
            selector: getSelector(el),
            tagName: tag,
            quickFix: {
              prop: 'paddingBottom',
              value: 'max(var(--ion-safe-area-bottom, 0px), env(safe-area-inset-bottom, 34px))',
              label: 'Add Safe Area Bottom Padding'
            }
          });
        }
      }

      // 3. Horizontal Overflow
      if (rect.width > viewportWidth + 2 || rect.right > viewportWidth + 2) {
        issues.push({
          id: `overflow-${issues.length}`,
          category: 'overflow',
          level: 'error',
          title: `Horizontal Screen Overflow (${Math.round(rect.width)}px > ${viewportWidth}px)`,
          message: `Element overflows screen width, introducing horizontal scroll bounce on mobile.`,
          selector: getSelector(el),
          tagName: tag,
          quickFix: {
            prop: 'maxWidth',
            value: '100%',
            label: 'Set max-width: 100%'
          }
        });
      }

      // 4. Color Contrast (WCAG AA)
      const text = (el.innerText || '').trim();
      if (text.length > 1 && el.children.length === 0) {
        const fgRgb = parseRgb(computed.color);
        let bgRgb = parseRgb(computed.backgroundColor);
        if (!bgRgb || (bgRgb[0] === 0 && bgRgb[1] === 0 && bgRgb[2] === 0 && computed.backgroundColor.includes('0)'))) {
          let parent = el.parentElement;
          while (parent && parent !== document.documentElement) {
            const pBg = window.getComputedStyle(parent).backgroundColor;
            const parsed = parseRgb(pBg);
            if (parsed && !pBg.includes('rgba(0, 0, 0, 0)')) {
              bgRgb = parsed;
              break;
            }
            parent = parent.parentElement;
          }
        }

        if (fgRgb && bgRgb) {
          const l1 = getLuminance(fgRgb[0], fgRgb[1], fgRgb[2]);
          const l2 = getLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
          const ratio = getContrastRatio(l1, l2);
          const fontSize = parseFloat(computed.fontSize || '16');

          if (ratio < 3.2 && fontSize < 24) {
            contrastPass = false;
            issues.push({
              id: `contrast-${issues.length}`,
              category: 'contrast',
              level: 'warning',
              title: `Low Text Contrast Ratio (${ratio.toFixed(1)}:1)`,
              message: `Text "${text.slice(0, 25)}" fails WCAG AA 4.5:1 ratio. Hard to read outdoors or in direct sunlight.`,
              selector: getSelector(el),
              tagName: tag,
              quickFix: {
                prop: 'color',
                value: 'var(--ion-text-color, #0f172a)',
                label: 'Use High-Contrast Text Color'
              }
            });
          }
        }
      }

      // 5. Typography Size
      const fontSize = parseFloat(computed.fontSize || '16');
      if (fontSize < 12 && fontSize > 0 && text.length > 0) {
        issues.push({
          id: `typo-${issues.length}`,
          category: 'typography',
          level: 'warning',
          title: `Small Font Size (${computed.fontSize})`,
          message: `Text below 12px requires excessive zooming on mobile displays.`,
          selector: getSelector(el),
          tagName: tag,
          quickFix: {
            prop: 'fontSize',
            value: '14px',
            label: 'Set font-size: 14px'
          }
        });
      }

      // 6. Generic Clickable Elements
      if (['div', 'span', 'p'].includes(tag) && (el.hasAttribute('onclick') || el.hasAttribute('(click)') || computed.cursor === 'pointer')) {
        semanticsPass = false;
        issues.push({
          id: `sem-${issues.length}`,
          category: 'semantic_ionic',
          level: 'info',
          title: `Generic Clickable <${tag}> (Non-Ionic)`,
          message: `Missing Ionic touch states, native ripple feedback, and mobile screen reader focus. Replace with <ion-item button> or <ion-button>.`,
          selector: getSelector(el),
          tagName: tag
        });
      }
    }

    const criticalCount = issues.filter(i => i.level === 'error').length;
    const warningCount = issues.filter(i => i.level === 'warning').length;
    const infoCount = issues.filter(i => i.level === 'info').length;

    const deductions = (criticalCount * 12) + (warningCount * 5) + (infoCount * 2);
    const score = Math.max(0, Math.min(100, 100 - deductions));

    const grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 
      score >= 95 ? 'A+' :
      score >= 88 ? 'A' :
      score >= 78 ? 'B' :
      score >= 68 ? 'C' :
      score >= 58 ? 'D' : 'F';

    const report: ScreenAuditReport = {
      timestamp: new Date().toISOString(),
      score,
      grade,
      totalChecked,
      issues,
      summary: {
        criticalCount,
        warningCount,
        infoCount,
        touchPass,
        safeAreaPass,
        contrastPass,
        semanticsPass
      }
    };

    this.postToStudio('MOBILE_LAYOUT_AUDIT_RESULT', report);
    return report;
  }

  public applyAuditFix(selector: string, prop: string, value: string) {
    try {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        el.style.setProperty(prop, value);
        el.setAttribute('data-mobile-layout-modified', 'true');
        this.selectElement(el);
        this.postToStudio('MOBILE_LAYOUT_AUDIT_FIX_APPLIED', { selector, prop, value });
      }
    } catch (err) {}
  }

  // Live visual updates (DOM preview)
  public applyLiveStyle(styles: Record<string, string>, attributes: Record<string, string>) {
    if (!this.selectedElement) return;

    // Apply styles (including CSS custom properties like --background)
    for (const [key, value] of Object.entries(styles)) {
      if (!this.originalStyles.has(key)) {
        this.originalStyles.set(key, this.selectedElement.style.getPropertyValue(key));
      }
      if (value === '') {
        this.selectedElement.style.removeProperty(key);
      } else {
        this.selectedElement.style.setProperty(key, value);
      }
    }

    // Apply attributes (like fill="outline", expand="block", color="primary")
    for (const [name, value] of Object.entries(attributes)) {
      if (!this.originalAttributes.has(name)) {
        this.originalAttributes.set(name, this.selectedElement.getAttribute(name));
      }
      if (value === '' || value === null) {
        this.selectedElement.removeAttribute(name);
      } else {
        this.selectedElement.setAttribute(name, value);
      }
    }

    // Tag element as visually modified in real-time
    this.selectedElement.setAttribute('data-mobile-layout-modified', 'true');

    // Refresh selection box
    this.updateSelectionBox(this.selectedElement);
  }

  public insertLivePreview(snippet: string, position: 'append' | 'prepend' | 'after' = 'append', customPreviewId?: string): string {
    if (!this.selectedElement) return '';

    const template = document.createElement('template');
    template.innerHTML = snippet.trim();
    const newElement = template.content.firstElementChild as HTMLElement;

    if (!newElement) return '';

    const previewId = customPreviewId || 'preview-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    newElement.setAttribute('data-mobile-layout-preview', 'true');
    newElement.setAttribute('data-preview-id', previewId);
    newElement.style.outline = '2px dashed #a855f7';
    newElement.style.outlineOffset = '2px';
    newElement.title = 'Live Preview Insertion (Staged for LLM)';

    const targetTag = this.selectedElement.tagName.toLowerCase();
    const isLeaf = ['ion-button', 'ion-badge', 'ion-chip', 'ion-icon', 'img'].includes(targetTag);

    if (isLeaf || position === 'after') {
      this.selectedElement.insertAdjacentElement('afterend', newElement);
    } else if (position === 'prepend') {
      this.selectedElement.insertAdjacentElement('afterbegin', newElement);
    } else {
      const contentChild = this.selectedElement.querySelector('ion-card-content, [slot="content"]');
      if (contentChild) {
        contentChild.appendChild(newElement);
      } else {
        this.selectedElement.appendChild(newElement);
      }
    }

    this.insertedPreviews.push(newElement);
    this.updateSelectionBox(this.selectedElement);
    return previewId;
  }

  public removeInsertedPreview(previewId?: string) {
    if (previewId) {
      const el = document.querySelector(`[data-preview-id="${previewId}"]`);
      if (el) {
        if (el === this.selectedElement) {
          this.selectedElement = null;
          if (this.selectionBox) this.selectionBox.style.display = 'none';
        }
        el.remove();
      }
      this.insertedPreviews = this.insertedPreviews.filter(
        (p) => p.getAttribute('data-preview-id') !== previewId
      );
    } else if (this.selectedElement && this.selectedElement.hasAttribute('data-mobile-layout-preview')) {
      const el = this.selectedElement;
      const pId = el.getAttribute('data-preview-id');
      this.selectedElement = null;
      if (this.selectionBox) this.selectionBox.style.display = 'none';
      el.remove();
      this.insertedPreviews = this.insertedPreviews.filter((p) => p !== el);
      if (pId) {
        this.postToStudio('MOBILE_LAYOUT_ELEMENT_REMOVED_FROM_CANVAS', { previewId: pId });
      }
    }
  }

  public revertProperty(type: 'style' | 'attribute', name: string, previousValue?: string) {
    if (!this.selectedElement) return;

    if (type === 'style') {
      if (previousValue && previousValue !== '') {
        this.selectedElement.style.setProperty(name, previousValue);
      } else {
        this.selectedElement.style.removeProperty(name);
      }
    } else if (type === 'attribute') {
      if (previousValue && previousValue !== '') {
        this.selectedElement.setAttribute(name, previousValue);
      } else {
        this.selectedElement.removeAttribute(name);
      }
    }

    this.updateSelectionBox(this.selectedElement);
  }

  public hideSelectedElement() {
    if (!this.selectedElement) return;
    const el = this.selectedElement;
    el.style.display = 'none';
    el.setAttribute('data-mobile-layout-hidden', 'true');
    this.selectedElement = null;
    if (this.selectionBox) this.selectionBox.style.display = 'none';
  }

  public unhideElement(selector?: string) {
    if (selector) {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        el.style.display = '';
        el.removeAttribute('data-mobile-layout-hidden');
      }
    } else {
      document.querySelectorAll('[data-mobile-layout-hidden]').forEach((el: any) => {
        el.style.display = '';
        el.removeAttribute('data-mobile-layout-hidden');
      });
    }
  }

  public moveElement(direction: 'up' | 'down') {
    if (!this.selectedElement) return;

    if (direction === 'up') {
      const prev = this.selectedElement.previousElementSibling as HTMLElement;
      if (prev) {
        prev.before(this.selectedElement);
        this.updateSelectionBox(this.selectedElement);
        const tag = this.selectedElement.tagName.toLowerCase();
        const prevTag = prev.tagName.toLowerCase();
        this.postToStudio('MOBILE_LAYOUT_ELEMENT_REORDERED', {
          direction: 'up',
          tagName: tag,
          targetSelector: this.selectedElement.id ? `#${this.selectedElement.id}` : tag,
          relativeTo: prev.id ? `#${prev.id}` : prevTag
        });
      }
    } else if (direction === 'down') {
      const next = this.selectedElement.nextElementSibling as HTMLElement;
      if (next) {
        next.after(this.selectedElement);
        this.updateSelectionBox(this.selectedElement);
        const tag = this.selectedElement.tagName.toLowerCase();
        const nextTag = next.tagName.toLowerCase();
        this.postToStudio('MOBILE_LAYOUT_ELEMENT_REORDERED', {
          direction: 'down',
          tagName: tag,
          targetSelector: this.selectedElement.id ? `#${this.selectedElement.id}` : tag,
          relativeTo: next.id ? `#${next.id}` : nextTag
        });
      }
    }
  }

  public updateTextContent(newText: string) {
    if (!this.selectedElement) return;
    const oldText = (this.selectedElement.innerText || this.selectedElement.textContent || '').trim();
    this.selectedElement.innerText = newText;
    this.updateSelectionBox(this.selectedElement);
    this.postToStudio('MOBILE_LAYOUT_TEXT_UPDATED', {
      newText,
      oldText,
      tagName: this.selectedElement.tagName.toLowerCase()
    });
  }

  public resetLiveStyle() {
    if (!this.selectedElement) return;

    // Remove any inserted preview elements
    this.insertedPreviews.forEach((el) => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    this.insertedPreviews = [];
    document.querySelectorAll('[data-mobile-layout-preview]').forEach((el) => el.remove());

    for (const [key, val] of this.originalStyles.entries()) {
      if (val) {
        this.selectedElement.style.setProperty(key, val);
      } else {
        this.selectedElement.style.removeProperty(key);
      }
    }

    for (const [name, val] of this.originalAttributes.entries()) {
      if (val !== null) {
        this.selectedElement.setAttribute(name, val);
      } else {
        this.selectedElement.removeAttribute(name);
      }
    }

    this.originalStyles.clear();
    this.originalAttributes.clear();
    this.selectedElement.removeAttribute('data-mobile-layout-modified');
    document.querySelectorAll('[data-mobile-layout-modified]').forEach((el) => el.removeAttribute('data-mobile-layout-modified'));
    this.updateSelectionBox(this.selectedElement);
  }

  public clearSelection() {
    this.selectedElement = null;
    if (this.selectionBox) {
      this.selectionBox.style.display = 'none';
    }
  }

  public setSafeAreaInsets(top: number = 47, bottom: number = 34) {
    let safeStyle = document.getElementById('mobile-layout-safe-area-styles');
    if (!safeStyle) {
      safeStyle = document.createElement('style');
      safeStyle.id = 'mobile-layout-safe-area-styles';
      document.head.appendChild(safeStyle);
    }
    safeStyle.textContent = `
      :root {
        --ion-safe-area-top: ${top}px;
        --ion-safe-area-bottom: ${bottom}px;
        --ion-safe-area-left: 0px;
        --ion-safe-area-right: 0px;
        --safe-area-top: ${top}px;
        --safe-area-bottom: ${bottom}px;
      }
    `;
    if (this.selectedElement) {
      this.updateSelectionBox(this.selectedElement);
    }
  }

  public setAccommodateSafeArea(enabled: boolean, top: number = 47, bottom: number = 34) {
    let el = document.getElementById('mobile-layout-accommodate-style');
    if (enabled) {
      if (!el) {
        el = document.createElement('style');
        el.id = 'mobile-layout-accommodate-style';
        document.head.appendChild(el);
      }
      el.textContent = `
        body {
          padding-top: ${top}px !important;
          padding-bottom: ${bottom}px !important;
          box-sizing: border-box !important;
        }
        ion-app, ion-router-outlet, main, #root {
          padding-top: ${top}px !important;
          padding-bottom: ${bottom}px !important;
          box-sizing: border-box !important;
        }
      `;
    } else {
      if (el) el.remove();
    }
    if (this.selectedElement) {
      this.updateSelectionBox(this.selectedElement);
    }
  }

  public resizeSelectedElement(width?: string, height?: string) {
    if (!this.selectedElement) return;
    if (width !== undefined) {
      this.selectedElement.style.width = width;
    }
    if (height !== undefined) {
      this.selectedElement.style.height = height;
    }
    this.updateSelectionBox(this.selectedElement);
  }

  private setupMessageBridge() {
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !data.type) return;

      switch (data.type) {
        case 'MOBILE_LAYOUT_SET_INSPECT_MODE':
          this.isInspectMode = !!data.payload?.enabled;
          if (!this.isInspectMode) {
            if (this.highlightBox) this.highlightBox.style.display = 'none';
          }
          break;

        case 'MOBILE_LAYOUT_APPLY_LIVE_STYLE':
          if (data.payload) {
            this.applyLiveStyle(data.payload.styles || {}, data.payload.attributes || {});
          }
          break;

        case 'MOBILE_LAYOUT_INSERT_PREVIEW':
          if (data.payload?.snippet) {
            this.insertLivePreview(data.payload.snippet, data.payload.position, data.payload.previewId);
          }
          break;

        case 'MOBILE_LAYOUT_REMOVE_INSERTED':
          this.removeInsertedPreview(data.payload?.previewId);
          break;

        case 'MOBILE_LAYOUT_REVERT_PROPERTY':
          if (data.payload) {
            this.revertProperty(data.payload.type, data.payload.name, data.payload.previousValue);
          }
          break;

        case 'MOBILE_LAYOUT_HIDE_SELECTED':
          this.hideSelectedElement();
          break;

        case 'MOBILE_LAYOUT_UNHIDE_ELEMENT':
          this.unhideElement(data.payload?.selector);
          break;

        case 'MOBILE_LAYOUT_MOVE_ELEMENT':
          if (data.payload?.direction) {
            this.moveElement(data.payload.direction);
          }
          break;

        case 'MOBILE_LAYOUT_UPDATE_TEXT':
          if (data.payload?.text !== undefined) {
            this.updateTextContent(data.payload.text);
          }
          break;

        case 'MOBILE_LAYOUT_RESET_LIVE_STYLE':
          this.resetLiveStyle();
          break;

        case 'MOBILE_LAYOUT_CLEAR_SELECTION':
          this.clearSelection();
          break;

        case 'MOBILE_LAYOUT_SET_SAFE_AREA':
          if (data.payload) {
            this.setSafeAreaInsets(data.payload.top, data.payload.bottom);
          }
          break;

        case 'MOBILE_LAYOUT_SET_ACCOMMODATE_SAFE_AREA':
          if (data.payload) {
            this.setAccommodateSafeArea(!!data.payload.enabled, data.payload.top, data.payload.bottom);
          }
          break;

        case 'MOBILE_LAYOUT_RESIZE_ELEMENT':
          if (data.payload) {
            this.resizeSelectedElement(data.payload.width, data.payload.height);
          }
          break;

        case 'MOBILE_LAYOUT_SCROLL_TO_SELECTED':
          if (this.selectedElement) {
            this.selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              if (this.selectedElement) this.updateSelectionBox(this.selectedElement);
            }, 300);
          }
          break;

        case 'MOBILE_LAYOUT_RUN_AUDIT':
          this.runScreenAudit();
          break;

        case 'MOBILE_LAYOUT_APPLY_AUDIT_FIX':
          if (data.payload?.selector && data.payload?.prop && data.payload?.value) {
            this.applyAuditFix(data.payload.selector, data.payload.prop, data.payload.value);
          }
          break;

        case 'MOBILE_LAYOUT_SELECT_BY_SELECTOR':
          if (data.payload?.selector) {
            try {
              const target = document.querySelector(data.payload.selector) as HTMLElement;
              if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                this.selectElement(target);
              }
            } catch (err) {}
          }
          break;
      }
    });
  }

  private postToStudio(type: string, payload: any) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type, payload }, '*');
    }
  }

  private notifyReady() {
    this.postToStudio('MOBILE_LAYOUT_BRIDGE_READY', {
      url: window.location.href,
      title: document.title
    });
  }
}
