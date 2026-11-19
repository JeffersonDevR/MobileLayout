import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PromptBuilder, PromptContext, UIChangeItem } from '../packages/server/src/llm/prompt';
import { MCP_TOOLS_DEFINITIONS } from '../packages/server/src/mcp-handler';

function ctxWith(changes: UIChangeItem[]): PromptContext {
  return {
    htmlFilePath: 'src/app/home/home.page.html',
    matchedSnippet: '<ion-card class="balance-card">Total Balance</ion-card>',
    fullHtmlContent: '<ion-card class="balance-card">Total Balance</ion-card>',
    visualChanges: changes,
    userIntent: 'Tighten the balance card layout'
  };
}

describe('Structural change rendering (reorder / duplicate / remove)', () => {
  it('renders reorder as an explicit move instruction, not a style line', () => {
    const prompt = PromptBuilder.buildUserPrompt(
      ctxWith([
        {
          type: 'reorder',
          name: 'Reorder <ion-card>',
          value: 'Moved up relative to <ion-list>',
          selector: 'ion-card.balance-card',
          selectorPath: 'ion-content > div > ion-card.balance-card',
          relativeTo: '<ion-list>',
          direction: 'up'
        }
      ])
    );

    assert.ok(prompt.includes('[REORDER]'), 'reorder changes must be tagged [REORDER]');
    assert.ok(prompt.includes('move this exact element'), 'reorder must read as a move instruction');
    assert.ok(prompt.includes('BEFORE'), "direction 'up' must map to BEFORE");
    assert.ok(prompt.includes('ion-card.balance-card'), 'must identify the target by selector');
    assert.ok(!/"\(none\)" -> "Moved up/.test(prompt), 'reorder must not render as a generic style line');
  });

  it('renders duplicate as an explicit copy-insert instruction', () => {
    const prompt = PromptBuilder.buildUserPrompt(
      ctxWith([
        {
          type: 'duplicate',
          name: 'Duplicate <ion-button>',
          value: 'Copy of the transfer button',
          selector: 'ion-button#transferBtn',
          selectorPath: 'ion-content > ion-button#transferBtn'
        }
      ])
    );

    assert.ok(prompt.includes('[DUPLICATE]'), 'duplicate changes must be tagged [DUPLICATE]');
    assert.ok(prompt.includes('insert an exact copy'), 'duplicate must read as a copy-insert instruction');
    assert.ok(prompt.includes('ion-button#transferBtn'), 'must identify the target by selector');
  });

  it('renders remove as an explicit delete instruction', () => {
    const prompt = PromptBuilder.buildUserPrompt(
      ctxWith([{ type: 'remove', name: '<ion-badge>', value: 'ion-badge.notify', selector: 'ion-badge.notify' }])
    );

    assert.ok(prompt.includes('[REMOVE]'), 'remove changes must be tagged [REMOVE]');
    assert.ok(prompt.includes('delete this exact element'), 'remove must read as a delete instruction');
  });

  it('keeps non-structural changes in the existing generic format', () => {
    const prompt = PromptBuilder.buildUserPrompt(
      ctxWith([{ type: 'attribute', name: 'fill', value: 'outline', previousValue: 'solid' }])
    );

    assert.ok(prompt.includes('[ATTRIBUTE] fill: "solid" -> "outline"'), 'generic format must be preserved');
  });

  it('renders structural changes explicitly in the clipboard prompt', () => {
    const clip = PromptBuilder.buildClipboardPrompt(
      ctxWith([
        {
          type: 'reorder',
          name: 'Reorder <ion-card>',
          value: 'Moved down',
          selector: 'ion-card.balance-card',
          direction: 'down',
          relativeTo: '<ion-item>'
        }
      ])
    );

    assert.ok(clip.includes('REORDER'), 'clipboard prompt must mark the reorder explicitly');
    assert.ok(clip.includes('AFTER'), "direction 'down' must map to AFTER");
  });

  it('declares reorder and duplicate in the MCP generate_patch schema', () => {
    const def = MCP_TOOLS_DEFINITIONS.find((tool: any) => tool.name === 'mobile_layout_generate_patch') as any;
    assert.ok(def, 'generate_patch tool definition should exist');
    const changeType = def.inputSchema.properties.visualChanges.items.properties.type;
    assert.ok(changeType.enum.includes('reorder'), 'schema enum must include reorder');
    assert.ok(changeType.enum.includes('duplicate'), 'schema enum must include duplicate');
  });
});
