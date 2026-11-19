export interface UIChangeItem {
  type: 'style' | 'attribute' | 'class' | 'insert' | 'remove' | 'reorder' | 'duplicate';
  name: string;
  value: string;
  previousValue?: string;
  selector?: string;
  /** Structural ops: selector path from the canvas root for unambiguous targeting. */
  selectorPath?: string;
  /** reorder: the sibling element (selector or tag) the element moves relative to. */
  relativeTo?: string;
  /** reorder: movement direction relative to the sibling. */
  direction?: 'up' | 'down';
}

export interface SelectedComponentItem {
  id?: string;
  tagName: string;
  selector?: string;
  matchedSnippet?: string;
  htmlFilePath?: string;
  lineNumber?: number;
  warnings?: string[];
  fixNote?: string;
}

export interface SelectedViewItem {
  id: string;
  name: string;
  route?: string;
  htmlFilePath: string;
  scssFilePath?: string;
  relativeHtmlPath?: string;
  fullHtmlContent?: string;
  fullScssContent?: string;
  flowName?: string;
  fixNote?: string;
}

export interface PromptContext {
  htmlFilePath: string;
  scssFilePath?: string;
  matchedSnippet: string;
  fullHtmlContent: string;
  fullScssContent?: string;
  visualChanges: UIChangeItem[];
  userIntent?: string;
  elementDetails?: any;
  selectedComponents?: SelectedComponentItem[];
  selectedViews?: SelectedViewItem[];
  flowName?: string;
  batchFixPrompt?: string;
}

export class PromptBuilder {
  public static buildSystemPrompt(): string {
    return `You are an expert Senior Frontend Engineer specialized in Angular and Ionic Framework (Mobile & Responsive Web).
Your task is to take visual UI/UX modifications created in a visual designer and produce clean, production-grade code updates for the project's Angular template (.html) and stylesheet (.scss).

CRITICAL GUIDELINES:
1. ALWAYS preserve existing Angular bindings, structural directives, and logic (e.g. *ngIf, *ngFor, @if, @for, [prop]="...", (click)="..." [(ngModel)]="..."). DO NOT delete or alter functionality unless requested.
2. Adhere to Ionic best practices:
   - Use Ionic component properties (e.g. fill="outline", expand="block", shape="round", color="primary", slot="start") where appropriate.
   - For custom styling of Ionic components, prefer Ionic CSS custom properties (e.g. --background, --color, --border-radius, --padding-start) inside the .scss file rather than inline styles.
   - For regular layout spacing, use clean CSS / SCSS classes or Ionic utility classes.
3. Keep changes surgical: only change what is required to achieve the visual design and user intent.
4. STRUCTURAL CHANGES: when the change list contains [REORDER], [DUPLICATE], or [REMOVE] entries, perform exactly that structural edit on the element identified by its target selector (move it BEFORE/AFTER the named sibling, insert an identical copy directly after it, or remove it entirely), preserving every Angular binding and structural directive on the affected elements.
5. Output your response ONLY as a strict JSON object with this exact schema:
{
  "explanation": "Brief explanation of the changes made",
  "updatedHtmlContent": "The entire updated content of the .html file",
  "updatedScssContent": "The entire updated content of the .scss file (or empty string if no scss change is needed)"
}
Do not wrap the JSON in extra markdown fences or explanations outside the JSON object.`;
  }

  /**
   * Renders one staged change as an explicit instruction line. Structural edits
   * (reorder/duplicate/remove) read as unambiguous commands for the LLM instead
   * of the generic "previous -> new" property format.
   */
  private static formatChangeLine(c: UIChangeItem): string {
    const target = c.selectorPath || c.selector || c.name;
    const structural = PromptBuilder.structuralInstruction(c);
    if (structural) {
      return `- [${c.type.toUpperCase()}] ${c.name} (target: ${target}): ${structural}`;
    }
    return `- [${c.type.toUpperCase()}] ${c.name}: "${c.previousValue || '(none)'}" -> "${c.value}"`;
  }

  /**
   * Explicit instruction text for structural change types; null for
   * property-style changes, which keep the generic format.
   */
  private static structuralInstruction(c: UIChangeItem): string | null {
    switch (c.type) {
      case 'reorder': {
        const sibling = c.relativeTo || c.value || 'the adjacent element';
        return `move this exact element ${c.direction === 'down' ? 'AFTER' : 'BEFORE'} its sibling ${sibling}. Preserve all Angular bindings and structural directives on the moved element.`;
      }
      case 'duplicate':
        return 'insert an exact copy of this element immediately after the original. Preserve all Angular bindings and structural directives on the copy.';
      case 'remove':
        return 'delete this exact element from the template.';
      default:
        return null;
    }
  }

  public static buildUserPrompt(ctx: PromptContext): string {
    const changesFormatted = (ctx.visualChanges || []).map((c) => PromptBuilder.formatChangeLine(c)).join('\n');

    let prompt = `I made visual design changes / requested fixes to element(s) in my Angular/Ionic project.

TARGET FILES:
- Template: ${ctx.htmlFilePath}
${ctx.scssFilePath ? `- Stylesheet: ${ctx.scssFilePath}` : ''}
`;

    if (ctx.selectedViews && ctx.selectedViews.length > 0) {
      prompt += `\nSELECTED TARGET VIEWS / SCREENS (${ctx.selectedViews.length} views${ctx.flowName ? ` in flow: "${ctx.flowName}"` : ''}):\n`;
      ctx.selectedViews.forEach((v, idx) => {
        prompt += `- [View ${idx + 1}] ${v.name} (${v.route || v.id}): ${v.relativeHtmlPath || v.htmlFilePath}\n`;
        if (v.fixNote) prompt += `  Note: ${v.fixNote}\n`;
      });
    }

    if (ctx.selectedComponents && ctx.selectedComponents.length > 0) {
      prompt += `\nSELECTED COMPONENTS TO FIX (${ctx.selectedComponents.length} items):\n`;
      ctx.selectedComponents.forEach((comp, idx) => {
        prompt += `\n--- Component #${idx + 1}: <${comp.tagName}> ---\n`;
        prompt += `- Selector: ${comp.selector || comp.tagName}\n`;
        if (comp.lineNumber) prompt += `- Template Line: ${comp.lineNumber}\n`;
        if (comp.warnings && comp.warnings.length > 0) {
          prompt += `- Identified Issues/Warnings:\n${comp.warnings.map((w) => `  * ${w}`).join('\n')}\n`;
        }
        if (comp.fixNote) {
          prompt += `- Component Fix Requirement: "${comp.fixNote}"\n`;
        }
        if (comp.matchedSnippet) {
          prompt += `- Template Snippet:\n\`\`\`html\n${comp.matchedSnippet}\n\`\`\`\n`;
        }
      });
    } else if (ctx.matchedSnippet) {
      prompt += `\nTARGET ELEMENT IN TEMPLATE:
\`\`\`html
${ctx.matchedSnippet}
\`\`\`
`;
    }

    if (changesFormatted) {
      prompt += `\nVISUAL CHANGES APPLIED IN DESIGNER:
${changesFormatted}
`;
    }

    const effectiveIntent = ctx.batchFixPrompt || ctx.userIntent;
    if (effectiveIntent) {
      prompt += `\nSPECIFIC USER FIX PROMPT / INSTRUCTIONS:
"${effectiveIntent}"
`;
    }

    prompt += `\nCURRENT FULL HTML TEMPLATE:
\`\`\`html
${ctx.fullHtmlContent}
\`\`\`
`;

    if (ctx.fullScssContent !== undefined) {
      prompt += `\nCURRENT FULL SCSS FILE:
\`\`\`scss
${ctx.fullScssContent || '/* Empty or new scss file */'}
\`\`\`
`;
    }

    prompt += `\nPlease apply all requested component fixes and return the updated files in the specified JSON format.`;

    return prompt;
  }

  /**
   * Generates a markdown prompt ready to copy-paste into Antigravity or any chat
   */
  public static buildClipboardPrompt(ctx: PromptContext): string {
    const changesFormatted = (ctx.visualChanges || [])
      .map((c) => {
        const target = c.selectorPath || c.selector || c.name;
        const structural = PromptBuilder.structuralInstruction(c);
        if (structural) {
          return `- **${c.type.toUpperCase()}** \`${c.name}\` (target: \`${target}\`): ${structural}`;
        }
        return `- **${c.type}** \`${c.name}\`: \`${c.value}\``;
      })
      .join('\n');

    let prompt = `### UI/UX Code Update Request (from MobileLayout Studio)

**Target Component / View:** \`${ctx.htmlFilePath || 'Primary View'}\`
${ctx.scssFilePath ? `**Stylesheet:** \`${ctx.scssFilePath}\`\n` : ''}
`;

    if (ctx.selectedViews && ctx.selectedViews.length > 0) {
      prompt += `\n**Target Views / Flow (${ctx.selectedViews.length} screens${ctx.flowName ? ` - ${ctx.flowName}` : ''}):**\n`;
      ctx.selectedViews.forEach((v, idx) => {
        prompt += `${idx + 1}. **${v.name}** (\`${v.route || v.id}\`) - \`${v.relativeHtmlPath || v.htmlFilePath}\`\n`;
        if (v.fixNote) prompt += `   *Note:* ${v.fixNote}\n`;
      });
    }

    if (ctx.selectedComponents && ctx.selectedComponents.length > 0) {
      prompt += `\n**Selected Components to Fix (${ctx.selectedComponents.length}):**\n`;
      ctx.selectedComponents.forEach((comp, idx) => {
        prompt += `\n${idx + 1}. **\`<${comp.tagName}>\`** ${comp.selector ? `(\`${comp.selector}\`)` : ''}${comp.lineNumber ? ` - Line ${comp.lineNumber}` : ''}\n`;
        if (comp.matchedSnippet) {
          prompt += `\`\`\`html\n${comp.matchedSnippet}\n\`\`\`\n`;
        }
        if (comp.warnings && comp.warnings.length > 0) {
          prompt += `*Issues / Warnings:* ${comp.warnings.join(', ')}\n`;
        }
        if (comp.fixNote) {
          prompt += `*Fix Note:* ${comp.fixNote}\n`;
        }
      });
    } else if (ctx.matchedSnippet) {
      prompt += `\n**Selected Element Snippet:**
\`\`\`html
${ctx.matchedSnippet}
\`\`\`
`;
    }

    if (changesFormatted) {
      prompt += `\n**Visual Adjustments Made in Studio:**
${changesFormatted}
`;
    }

    const effectiveIntent = ctx.batchFixPrompt || ctx.userIntent;
    if (effectiveIntent) {
      prompt += `\n**Fix Prompt & Instructions:**
${effectiveIntent}
`;
    }

    prompt += `\nPlease update \`${ctx.htmlFilePath}\`${ctx.scssFilePath ? ` and \`${ctx.scssFilePath}\`` : ''} to apply these changes. Preserve all Angular bindings, use Ionic best practices (attributes like \`fill\`, \`expand\`, \`color\`, \`slot\`, and CSS variables like \`--border-radius\`), and output the updated code.`;

    return prompt;
  }
}
