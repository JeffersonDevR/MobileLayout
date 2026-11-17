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

    const upBtn = createBtn('▲', 'Move element up (before previous sibling)', () => this.moveElement('up'));
    const downBtn = createBtn('▼', 'Move element down (after next sibling)', () => this.moveElement('down'));
    const delBtn = createBtn('✕', 'Remove or delete element', () => {
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

    this.selectionToolbar.appendChild(upBtn);
    this.selectionToolbar.appendChild(downBtn);
    this.selectionToolbar.appendChild(delBtn);
    this.selectionBox.appendChild(this.selectionToolbar);

    this.overlayContainer.appendChild(this.highlightBox);
    this.overlayContainer.appendChild(this.selectionBox);
    document.body.appendChild(this.overlayContainer);
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
        const target = this.getInspectableElementAt(e.clientX, e.clientY);
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          this.selectElement(target);
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
      previewId: el.getAttribute('data-preview-id') || undefined
    };
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
          this.selectedElement = null;
          if (this.selectionBox) this.selectionBox.style.display = 'none';
          break;

        case 'MOBILE_LAYOUT_SCROLL_TO_SELECTED':
          if (this.selectedElement) {
            this.selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              if (this.selectedElement) this.updateSelectionBox(this.selectedElement);
            }, 300);
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
