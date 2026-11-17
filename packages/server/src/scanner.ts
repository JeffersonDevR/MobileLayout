import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import * as cheerio from 'cheerio';

export interface ElementQuery {
  tagName: string;
  id?: string;
  classList?: string[];
  attributes?: Record<string, string>;
  textContent?: string;
  selectorPath?: string;
}

export interface MatchResult {
  htmlFilePath: string;
  scssFilePath?: string;
  lineNumber: number;
  matchedSnippet: string;
  fullHtmlContent: string;
  fullScssContent?: string;
  confidence: number;
}

export class ProjectScanner {
  constructor(private projectRoot: string) {}

  /**
   * Find the Angular/Ionic template file that best matches the inspected element
   */
  public async findMatchingElement(query: ElementQuery): Promise<MatchResult | null> {
    const srcDir = path.join(this.projectRoot, 'src', 'app');
    const searchRoot = fs.existsSync(srcDir) ? srcDir : this.projectRoot;

    // Find all HTML template files
    const htmlFiles = await fg('**/*.{html,component.html,page.html}', {
      cwd: searchRoot,
      absolute: true,
      ignore: ['node_modules/**', 'dist/**', '.git/**']
    });

    if (htmlFiles.length === 0) {
      return null;
    }

    let bestMatch: MatchResult | null = null;
    let highestScore = -1;

    for (const filePath of htmlFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const scoreResult = this.scoreTemplate(content, query, filePath);

        if (scoreResult && scoreResult.score > highestScore) {
          highestScore = scoreResult.score;

          // Find corresponding scss / css file
          const scssPath = this.findMatchingStyleFile(filePath);
          let fullScssContent = '';
          if (scssPath && fs.existsSync(scssPath)) {
            fullScssContent = fs.readFileSync(scssPath, 'utf-8');
          }

          bestMatch = {
            htmlFilePath: filePath,
            scssFilePath: scssPath,
            lineNumber: scoreResult.line,
            matchedSnippet: scoreResult.snippet,
            fullHtmlContent: content,
            fullScssContent,
            confidence: scoreResult.score
          };
        }
      } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
      }
    }

    return bestMatch;
  }

  private scoreTemplate(
    content: string,
    query: ElementQuery,
    filePath: string
  ): { score: number; line: number; snippet: string } | null {
    const tag = query.tagName.toLowerCase();
    if (!content.toLowerCase().includes(`<${tag}`)) {
      return null;
    }

    const $ = cheerio.load(content, { xmlMode: true });
    const candidates = $(tag);
    if (candidates.length === 0) return null;

    let bestScore = 0;
    let bestSnippet = '';
    let bestIndex = -1;

    candidates.each((i, el) => {
      let score = 10; // base score for tag match
      const element = $(el);

      // Match ID
      if (query.id && element.attr('id') === query.id) {
        score += 50;
      }

      // Match Classes
      if (query.classList && query.classList.length > 0) {
        const elClasses = (element.attr('class') || '').split(/\s+/);
        for (const cls of query.classList) {
          if (cls && elClasses.includes(cls)) {
            score += 15;
          }
        }
      }

      // Match Attributes (e.g. fill, expand, color, slot, name)
      if (query.attributes) {
        for (const [attrName, attrVal] of Object.entries(query.attributes)) {
          if (['id', 'class', 'style'].includes(attrName)) continue;
          const currentVal = element.attr(attrName);
          if (currentVal !== undefined) {
            if (currentVal === attrVal) {
              score += 20;
            } else {
              score += 5;
            }
          }
        }
      }

      // Match text content
      if (query.textContent && query.textContent.trim().length > 3) {
        const text = element.text().trim();
        const searchSample = query.textContent.trim().slice(0, 30);
        if (text.includes(searchSample)) {
          score += 30;
        }
      }

      // Match parent tag if available
      if (query.selectorPath) {
        const parent = element.parent();
        if (parent && parent.length > 0) {
          const parentTag = (parent[0] as any).tagName?.toLowerCase();
          if (parentTag && query.selectorPath.toLowerCase().includes(parentTag)) {
            score += 10;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestSnippet = $.html(element);
        bestIndex = content.indexOf(bestSnippet.slice(0, 40));
      }
    });

    if (bestScore === 0) return null;

    // Approximate line number
    const line = bestIndex >= 0 ? content.substring(0, bestIndex).split('\n').length : 1;

    return {
      score: bestScore,
      line,
      snippet: bestSnippet
    };
  }

  private findMatchingStyleFile(htmlFilePath: string): string | undefined {
    const dir = path.dirname(htmlFilePath);
    const baseName = path.basename(htmlFilePath).replace(/\.html$/, '');

    // Common Angular naming:
    // home.page.html -> home.page.scss / home.page.css
    // header.component.html -> header.component.scss / header.component.css
    const candidates = [
      path.join(dir, `${baseName}.scss`),
      path.join(dir, `${baseName}.css`),
      path.join(dir, `${baseName}.sass`),
      path.join(dir, `${baseName}.less`)
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }

    return undefined;
  }
}
