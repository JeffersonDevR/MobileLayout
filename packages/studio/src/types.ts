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

export interface SelectedComponentItem {
  id: string; // unique item id
  tagName: string;
  selectorPath: string;
  elementId?: string;
  classList: string[];
  textContent?: string;
  matchedSource?: MatchedSource | null;
  layoutWarnings?: LayoutWarning[];
  fixNote?: string;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ProjectView {
  id: string;
  name: string;
  route: string;
  htmlFilePath: string;
  scssFilePath?: string;
  relativeHtmlPath: string;
  relativeScssPath?: string;
  flow: 'auth' | 'cliente' | 'tecnico' | 'proveedor' | 'general';
  flowName: string;
  title: string;
  fullHtmlContent?: string;
  fullScssContent?: string;
  fixNote?: string;
}

export interface ProjectFlow {
  id: string;
  name: string;
  description: string;
  icon: string;
  viewIds: string[];
}

export interface TargetGitInfo {
  branch: string;
  commit: string;
  clean: boolean;
}

export interface UIChangeItem {
  id?: string;
  type: 'style' | 'attribute' | 'class' | 'insert' | 'remove';
  name: string;
  value: string;
  previousValue?: string;
  previewId?: string;
  selector?: string;
}

export interface MatchedSource {
  htmlFilePath: string;
  scssFilePath?: string;
  relativeHtmlPath: string;
  relativeScssPath?: string;
  lineNumber: number;
  matchedSnippet: string;
  confidence: number;
  fullHtmlContent: string;
  fullScssContent?: string;
}

export interface StudioConfig {
  projectPath: string;
  projectExists: boolean;
  targetUrl: string;
  llmProvider: 'gemini' | 'opencode';
  geminiApiKey: string;
  geminiModel: string;
  openCodeBaseUrl: string;
  openCodeApiKey: string;
  openCodeModel: string;
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

export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  isMobile: boolean;
  hasFrame: boolean;
  platform?: 'ios' | 'android' | 'generic';
  brand?: 'apple' | 'google' | 'samsung' | 'xiaomi' | 'generic';
  cameraCutout?: 'island' | 'notch' | 'punch-hole-center' | 'punch-hole-left' | 'punch-hole-right' | 'none';
  navBarType?: 'gesture' | '3-button';
  safeArea?: {
    top: number;
    bottom: number;
    left?: number;
    right?: number;
  };
}
