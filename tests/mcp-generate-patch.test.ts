import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  handleMcpToolCall,
  MCP_TOOLS_DEFINITIONS,
  McpGenerateConfig
} from '../packages/server/src/mcp-handler';

const fixtureRoot = path.resolve(__dirname, 'fixtures/sample-ionic-app');
const htmlRelativePath = 'src/app/home/home.page.html';
const htmlFixturePath = path.join(fixtureRoot, htmlRelativePath);
const originalHtml = fs.readFileSync(htmlFixturePath, 'utf-8');

const config: McpGenerateConfig = {
  llmProvider: 'opencode',
  openCodeBaseUrl: 'http://localhost:4096',
  openCodeApiKey: 'test-key',
  openCodeModel: 'anthropic/claude-sonnet-4',
  projectPath: fixtureRoot
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function baseArgs(overrides: Record<string, unknown> = {}) {
  return {
    userIntent: 'Make the transfer button an outline secondary button',
    htmlFilePath: htmlRelativePath,
    scssFilePath: 'src/app/home/home.page.scss',
    matchedSnippet: '<ion-button id="transferBtn">Transfer Money</ion-button>',
    visualChanges: [{ type: 'attribute', name: 'fill', value: 'outline' }],
    ...overrides
  };
}

function call(args: Record<string, unknown>) {
  return handleMcpToolCall(
    'mobile_layout_generate_patch',
    args,
    fixtureRoot,
    'http://localhost:4200',
    3301,
    config
  );
}

/** Tracks every synchronous and asynchronous fs write API so tests can prove none are used. */
function watchWrites(t: any) {
  return [
    t.mock.method(fs, 'writeFileSync', () => undefined),
    t.mock.method(fs, 'writeFile', () => undefined),
    t.mock.method(fs, 'appendFileSync', () => undefined)
  ];
}

function assertNoWrites(writes: any[]) {
  for (const write of writes) {
    assert.strictEqual(write.mock.calls.length, 0, 'generate_patch must never write to disk');
  }
}

describe('MCP mobile_layout_generate_patch', () => {
  it('is declared on the server surface with userIntent required', () => {
    const def = MCP_TOOLS_DEFINITIONS.find((tool) => tool.name === 'mobile_layout_generate_patch');
    assert.ok(def, 'tool definition should be present');
    assert.deepStrictEqual((def as any).inputSchema.required, ['userIntent']);
  });

  it('generates a diff from disk content without writing any file', async (t) => {
    const writes = watchWrites(t);
    const updatedHtml = originalHtml.replace(
      'expand="block" color="primary"',
      'expand="block" color="secondary" fill="outline"'
    );
    t.mock.method(globalThis, 'fetch', async () =>
      jsonResponse({
        data: {
          text: JSON.stringify({ explanation: 'Restyled the transfer button', updatedHtmlContent: updatedHtml })
        }
      })
    );

    const result = await call(baseArgs());

    assert.ok(!result.isError, result.text);
    const payload = JSON.parse(result.text);
    assert.strictEqual(payload.success, true);
    assert.strictEqual(payload.explanation, 'Restyled the transfer button');
    assert.match(payload.htmlDiff, /color="secondary" fill="outline"/);
    assert.match(payload.htmlDiff, /Proposed Changes/);
    assert.strictEqual(fs.readFileSync(htmlFixturePath, 'utf-8'), originalHtml, 'fixture must remain unchanged');
    assertNoWrites(writes);
  });

  it('accepts a JSON object wrapped in markdown fences', async (t) => {
    const writes = watchWrites(t);
    const text =
      'Here is the patch:\n```json\n{"explanation":"Fenced patch","updatedHtmlContent":"<ion-button>ok</ion-button>"}\n```';
    t.mock.method(globalThis, 'fetch', async () => jsonResponse({ data: { text } }));

    const result = await call(
      baseArgs({
        fullHtmlContent: '<ion-button>original</ion-button>',
        scssFilePath: undefined
      })
    );

    assert.ok(!result.isError, result.text);
    const payload = JSON.parse(result.text);
    assert.strictEqual(payload.success, true);
    assert.strictEqual(payload.explanation, 'Fenced patch');
    assert.strictEqual(payload.updatedHtmlContent, '<ion-button>ok</ion-button>');
    assertNoWrites(writes);
  });

  it('surfaces provider/upstream errors as MCP error content', async (t) => {
    const writes = watchWrites(t);
    t.mock.method(
      globalThis,
      'fetch',
      async () => jsonResponse({ message: 'unsupported model: foo/bar' }, 422)
    );

    const result = await call(
      baseArgs({ fullHtmlContent: '<ion-button>original</ion-button>', scssFilePath: undefined })
    );

    assert.strictEqual(result.isError, true);
    assert.match(result.text, /422/);
    assert.match(result.text, /unsupported model: foo\/bar/);
    assertNoWrites(writes);
  });

  it('refuses source paths that escape the project root without calling the provider', async (t) => {
    const writes = watchWrites(t);
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => jsonResponse({ data: { text: '{}' } }));

    const result = await call(
      baseArgs({
        htmlFilePath: path.join('..', '..', '..', 'outside.html'),
        scssFilePath: undefined
      })
    );

    assert.strictEqual(result.isError, true);
    assert.match(result.text, /escape/i);
    assert.ok(!result.text.includes(fixtureRoot), 'response must not expose absolute project paths');
    assert.strictEqual(fetchMock.mock.calls.length, 0, 'provider must not be contacted on an escape refusal');
    assertNoWrites(writes);
  });
});
