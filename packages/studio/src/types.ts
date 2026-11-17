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

export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  isMobile: boolean;
  hasFrame: boolean;
}
