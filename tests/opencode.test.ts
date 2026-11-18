import { describe, it } from 'node:test';
import assert from 'node:assert';
import { OpenCodeProvider, OpenCodeConfig } from '../packages/server/src/llm/opencode';
import { PromptContext } from '../packages/server/src/llm/prompt';

const ctx: PromptContext = {
  htmlFilePath: 'src/app/home/home.page.html',
  matchedSnippet: '<ion-button>Go</ion-button>',
  fullHtmlContent: '<ion-button>Go</ion-button>',
  visualChanges: []
};

const baseConfig: OpenCodeConfig = {
  baseURL: 'http://localhost:4096',
  modelName: ''
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('OpenCodeProvider (native REST text generation)', () => {
  it('posts the combined prompt to the generate endpoint and maps plain JSON', async (t) => {
    const text = JSON.stringify({
      explanation: 'Restyled the button',
      updatedHtmlContent: '<ion-button fill="outline">Go</ion-button>',
      updatedScssContent: '.button { --background: transparent; }'
    });
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => jsonResponse({ data: { text } }));

    const result = await new OpenCodeProvider(baseConfig).generateCodeChanges(ctx);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.explanation, 'Restyled the button');
    assert.strictEqual(result.updatedHtmlContent, '<ion-button fill="outline">Go</ion-button>');
    assert.strictEqual(result.updatedScssContent, '.button { --background: transparent; }');
    assert.strictEqual(result.rawResponse, text);

    const [url, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.strictEqual(url, 'http://localhost:4096/api/experimental/generate/text');
    assert.strictEqual(init.method, 'POST');
    const body = JSON.parse(init.body as string);
    assert.ok(body.prompt.includes('Senior Frontend Engineer'), 'prompt should include the system prompt');
    assert.ok(body.prompt.includes('src/app/home/home.page.html'), 'prompt should include the user prompt');
    assert.strictEqual(body.model, undefined, 'blank model ref should be omitted');
  });

  it('extracts a JSON object wrapped in prose and markdown fences', async (t) => {
    const text = 'Sure!\n```json\n{"explanation":"Fenced response","updatedHtmlContent":"<p>ok</p>"}\n```';
    t.mock.method(globalThis, 'fetch', async () => jsonResponse({ data: { text } }));

    const result = await new OpenCodeProvider(baseConfig).generateCodeChanges(ctx);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.explanation, 'Fenced response');
    assert.strictEqual(result.updatedHtmlContent, '<p>ok</p>');
    assert.strictEqual(result.rawResponse, text);
  });

  it('returns a failure when data.text is empty', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => jsonResponse({ data: { text: '' } }));

    const result = await new OpenCodeProvider(baseConfig).generateCodeChanges(ctx);

    assert.strictEqual(result.success, false);
    assert.match(result.error!, /empty content/i);
  });

  it('returns the upstream message on an HTTP error', async (t) => {
    t.mock.method(
      globalThis,
      'fetch',
      async () => jsonResponse({ message: 'unsupported model: foo/bar' }, 422)
    );

    const result = await new OpenCodeProvider(baseConfig).generateCodeChanges(ctx);

    assert.strictEqual(result.success, false);
    assert.match(result.error!, /422/);
    assert.match(result.error!, /unsupported model: foo\/bar/);
  });

  it('sends an HTTP Basic header when an API key is provided and no header otherwise', async (t) => {
    const withKey = t.mock.method(globalThis, 'fetch', async () =>
      jsonResponse({ data: { text: '{"explanation":"ok"}' } })
    );
    await new OpenCodeProvider({ ...baseConfig, apiKey: 'test-password' }).generateCodeChanges(ctx);
    let init = withKey.mock.calls[0].arguments[1] as RequestInit;
    let headers = init.headers as Record<string, string>;
    const expectedCredentials = Buffer.from('opencode:test-password').toString('base64');
    assert.strictEqual(headers['Authorization'], `Basic ${expectedCredentials}`);

    withKey.mock.restore();

    const withoutKey = t.mock.method(globalThis, 'fetch', async () =>
      jsonResponse({ data: { text: '{"explanation":"ok"}' } })
    );
    await new OpenCodeProvider({ ...baseConfig, apiKey: '' }).generateCodeChanges(ctx);
    init = withoutKey.mock.calls[0].arguments[1] as RequestInit;
    headers = init.headers as Record<string, string>;
    assert.strictEqual(headers['Authorization'], undefined);
  });

  it('parses a providerID/model ref on the first slash and ignores invalid refs', async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
      jsonResponse({ data: { text: '{"explanation":"ok"}' } })
    );

    await new OpenCodeProvider({ ...baseConfig, modelName: '  anthropic/claude-sonnet-4:fast ' }).generateCodeChanges(ctx);
    let body = JSON.parse((fetchMock.mock.calls[0].arguments[1] as RequestInit).body as string);
    assert.deepStrictEqual(body.model, { providerID: 'anthropic', id: 'claude-sonnet-4:fast' });

    fetchMock.mock.resetCalls();

    await new OpenCodeProvider({ ...baseConfig, modelName: 'deepseek-coder' }).generateCodeChanges(ctx);
    body = JSON.parse((fetchMock.mock.calls[0].arguments[1] as RequestInit).body as string);
    assert.strictEqual(body.model, undefined);
  });
});
