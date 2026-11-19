import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { execSync } from 'child_process';

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
}

export interface ProjectFlow {
  id: string;
  name: string;
  description: string;
  icon: string;
  viewIds: string[];
}

export class ViewsManager {
  /**
   * Discover all pages / views and logical user flows in the target project
   */
  public static async discover(projectRoot: string): Promise<{ views: ProjectView[]; flows: ProjectFlow[] }> {
    if (!projectRoot || !fs.existsSync(projectRoot)) {
      return { views: [], flows: [] };
    }

    // Determine app search roots (e.g. projects/mobile/src/app or src/app)
    const possibleRoots = [
      path.join(projectRoot, 'projects', 'mobile', 'src', 'app'),
      path.join(path.dirname(projectRoot), 'projects', 'mobile', 'src', 'app'),
      path.join(projectRoot, 'src', 'app'),
      path.join(projectRoot, 'app'),
      projectRoot
    ];

    let searchRoot = projectRoot;
    let effectiveProjectRoot = projectRoot;

    for (const p of possibleRoots) {
      if (fs.existsSync(p)) {
        searchRoot = p;
        if (p.includes(path.join('projects', 'mobile', 'src', 'app'))) {
          // If we found the mobile app via parent, update effectiveProjectRoot
          if (fs.existsSync(path.join(path.dirname(projectRoot), 'projects', 'mobile'))) {
            effectiveProjectRoot = path.dirname(projectRoot);
          }
        }
        break;
      }
    }

    // Scan for all page template files (*.page.html, *.component.html)
    const pageFiles = await fg('**/*.{page.html,component.html}', {
      cwd: searchRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.angular/**', '**/tests/**', '**/*.spec.*']
    });

    const views: ProjectView[] = [];

    for (const htmlFile of pageFiles) {
      const fileName = path.basename(htmlFile);
      const dirName = path.basename(path.dirname(htmlFile));
      
      // Determine page ID from directory or filename
      let id = dirName;
      if (id === 'app' || id === 'pages') {
        id = fileName.replace(/\.(page|component)\.html$/, '');
      }

      // Check for corresponding scss
      const scssCandidate = htmlFile.replace(/\.html$/, '.scss');
      const scssFile = fs.existsSync(scssCandidate) ? scssCandidate : undefined;

      const relHtml = path.relative(effectiveProjectRoot, htmlFile).replace(/\\/g, '/');
      const relScss = scssFile ? path.relative(effectiveProjectRoot, scssFile).replace(/\\/g, '/') : undefined;

      // Infer flow and route from directory structure & ID
      const { flow, flowName, route, title, name } = this.categorizeView(id, relHtml);

      views.push({
        id,
        name,
        route,
        htmlFilePath: htmlFile,
        scssFilePath: scssFile,
        relativeHtmlPath: relHtml,
        relativeScssPath: relScss,
        flow,
        flowName,
        title
      });
    }

    // Sort views alphabetically by flow and name
    views.sort((a, b) => a.flow.localeCompare(b.flow) || a.name.localeCompare(b.name));

    // Build pre-configured flows
    const flows: ProjectFlow[] = [
      {
        id: 'auth-flow',
        name: 'Auth & Onboarding Flow',
        description: 'Authentication, registration, recovery, and onboarding screens.',
        icon: '🔐',
        viewIds: views.filter((v) => v.flow === 'auth').map((v) => v.id)
      },
      {
        id: 'cliente-flow',
        name: 'Client Journey Flow',
        description: 'Customer panel, service request, order tracking, and rating.',
        icon: '👤',
        viewIds: views.filter((v) => v.flow === 'cliente').map((v) => v.id)
      },
      {
        id: 'tecnico-flow',
        name: 'Technician Execution Flow',
        description: 'Offer radar, work order execution, diagnosis, and technician settlements.',
        icon: '🔧',
        viewIds: views.filter((v) => v.flow === 'tecnico').map((v) => v.id)
      },
      {
        id: 'proveedor-flow',
        name: 'Supplier & Parts Flow',
        description: 'Supplies, requests, quotes, and documentation validation.',
        icon: '📦',
        viewIds: views.filter((v) => v.flow === 'proveedor').map((v) => v.id)
      },
      {
        id: 'general-flow',
        name: 'Account & Settings Flow',
        description: 'Profile management, tabs container, and account settings.',
        icon: '⚙️',
        viewIds: views.filter((v) => v.flow === 'general').map((v) => v.id)
      }
    ].filter((f) => f.viewIds.length > 0);

    return { views, flows };
  }

  /**
   * Resolve a browser/canvas URL pathname to a discovered view in the project
   */
  public static async resolvePathToView(
    pathname: string, 
    projectRoot: string
  ): Promise<ProjectView | null> {
    const { views } = await this.discover(projectRoot);
    if (views.length === 0) return null;

    const cleanPath = pathname.toLowerCase().replace(/\/$/, '') || '/';

    // 1. Exact route match
    let match = views.find((v) => v.route.toLowerCase() === cleanPath);
    if (match) return match;

    // 2. Segment match (e.g. /cliente/panel matches panel-cliente or /login matches login)
    const segments = cleanPath.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      match = views.find((v) => 
        v.id.toLowerCase() === lastSegment || 
        v.id.toLowerCase().includes(lastSegment) ||
        v.route.toLowerCase().endsWith(lastSegment)
      );
      if (match) return match;

      const firstSegment = segments[0];
      match = views.find((v) => v.id.toLowerCase().includes(firstSegment));
      if (match) return match;
    }

    // 3. Fallback: default to login or first view
    return views.find((v) => v.id === 'login') || views[0];
  }

  /**
   * Checkout path details: view, template code, scss, and target project git metadata
   */
  public static async checkoutPath(
    pathname: string,
    projectRoot: string
  ): Promise<{
    found: boolean;
    pathname: string;
    view: ProjectView | null;
    targetGitInfo?: {
      branch: string;
      commit: string;
      clean: boolean;
    };
  }> {
    const view = await this.resolvePathToView(pathname, projectRoot);

    let targetGitInfo;
    try {
      let gitDir = projectRoot;
      while (gitDir && gitDir !== path.dirname(gitDir)) {
        if (fs.existsSync(path.join(gitDir, '.git'))) {
          break;
        }
        gitDir = path.dirname(gitDir);
      }
      if (fs.existsSync(path.join(gitDir, '.git'))) {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: gitDir, encoding: 'utf-8' }).trim();
        const commit = execSync('git rev-parse --short HEAD', { cwd: gitDir, encoding: 'utf-8' }).trim();
        const status = execSync('git status --porcelain', { cwd: gitDir, encoding: 'utf-8' }).trim();
        targetGitInfo = {
          branch,
          commit,
          clean: status.length === 0
        };
      }
    } catch (e) {
      // Git command optional
    }

    if (!view) {
      return { found: false, pathname, view: null, targetGitInfo };
    }

    // Read full contents if not already loaded
    try {
      view.fullHtmlContent = fs.readFileSync(view.htmlFilePath, 'utf-8');
      if (view.scssFilePath && fs.existsSync(view.scssFilePath)) {
        view.fullScssContent = fs.readFileSync(view.scssFilePath, 'utf-8');
      }
    } catch (e) {}

    return {
      found: true,
      pathname,
      view,
      targetGitInfo
    };
  }

  private static categorizeView(
    id: string, 
    relHtml: string
  ): {
    flow: 'auth' | 'cliente' | 'tecnico' | 'proveedor' | 'general';
    flowName: string;
    route: string;
    title: string;
    name: string;
  } {
    const cleanId = id.toLowerCase();
    const cleanPath = relHtml.toLowerCase();

    const titleize = (str: string) =>
      str
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    const name = titleize(id.replace(/\.page$/, ''));

    // Auth flow
    if (
      cleanId.includes('login') ||
      cleanId.includes('registro') ||
      cleanId.includes('recuperar') ||
      cleanId.includes('auth') ||
      cleanPath.includes('/auth')
    ) {
      let route = `/${cleanId}`;
      if (cleanId === 'login') route = '/login';
      return { flow: 'auth', flowName: 'Auth & Onboarding', route, title: name, name };
    }

    // Cliente flow
    if (
      cleanId.includes('cliente') ||
      cleanId.includes('solicitar') ||
      cleanId.includes('seguimiento') ||
      cleanId.includes('calificar') ||
      cleanId.includes('diagnostico') ||
      cleanId.includes('pago-acta') ||
      cleanPath.includes('/cliente')
    ) {
      let subRoute = cleanId.replace('panel-', '').replace('-page', '');
      return { flow: 'cliente', flowName: 'Cliente Journey', route: `/cliente/${subRoute}`, title: name, name };
    }

    // Técnico flow
    if (
      cleanId.includes('tecnico') ||
      cleanId.includes('radar') ||
      cleanId.includes('ofertas') ||
      cleanId.includes('ejecucion') ||
      cleanId.includes('liquidaciones') ||
      cleanPath.includes('/tecnico')
    ) {
      let subRoute = cleanId.replace('panel-', '').replace('-tecnico', '');
      return { flow: 'tecnico', flowName: 'Técnico Execution', route: `/tecnico/${subRoute}`, title: name, name };
    }

    // Proveedor flow
    if (
      cleanId.includes('proveedor') ||
      cleanId.includes('insumos') ||
      cleanId.includes('documentos') ||
      cleanPath.includes('/proveedor')
    ) {
      let subRoute = cleanId.replace('-proveedor', '');
      return { flow: 'proveedor', flowName: 'Proveedor Workflow', route: `/proveedor/${subRoute}`, title: name, name };
    }

    // General / Account
    return {
      flow: 'general',
      flowName: 'General & Account',
      route: `/${cleanId.replace('-page', '')}`,
      title: name,
      name
    };
  }
}
