import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { ProjectScanner } from '../packages/server/src/scanner';
import { FilePatcher } from '../packages/server/src/patcher';
import { PromptBuilder, PromptContext } from '../packages/server/src/llm/prompt';

const fixtureRoot = path.resolve(__dirname, 'fixtures/sample-ionic-app');

describe('MobileLayout Studio - Core Engine Tests', () => {
  describe('ProjectScanner (Angular / Ionic Template Matcher)', () => {
    const scanner = new ProjectScanner(fixtureRoot);

    it('should accurately match an ion-button by tag name and ID', async () => {
      const result = await scanner.findMatchingElement({
        tagName: 'ion-button',
        id: 'transferBtn',
        classList: [],
        attributes: { expand: 'block', color: 'primary' },
        textContent: 'Transfer Money'
      });

      assert.ok(result, 'Expected a match result');
      assert.ok(result.htmlFilePath.endsWith('home.page.html'), 'Should match home.page.html');
      assert.ok(result.scssFilePath?.endsWith('home.page.scss'), 'Should find corresponding home.page.scss');
      assert.ok(result.matchedSnippet.includes('id="transferBtn"'), 'Snippet should contain the target element');
      assert.ok(result.lineNumber > 0, 'Line number should be positive');
      assert.ok(result.confidence >= 50, 'Confidence score should be high for ID match');
    });

    it('should match an ion-card by class name and tag', async () => {
      const result = await scanner.findMatchingElement({
        tagName: 'ion-card',
        classList: ['balance-card'],
        textContent: 'Total Balance'
      });

      assert.ok(result, 'Expected match result');
      assert.ok(result.htmlFilePath.endsWith('home.page.html'));
      assert.ok(result.matchedSnippet.includes('balance-card'));
    });

    it('should return null for non-existent elements', async () => {
      const result = await scanner.findMatchingElement({
        tagName: 'non-existent-tag-12345'
      });

      assert.strictEqual(result, null);
    });
  });

  describe('PromptBuilder (Angular / Ionic System & User Prompts)', () => {
    it('should generate system prompt that preserves Angular bindings and enforces Ionic best practices', () => {
      const sysPrompt = PromptBuilder.buildSystemPrompt();
      assert.ok(sysPrompt.includes('Angular'), 'System prompt should mention Angular');
      assert.ok(sysPrompt.includes('Ionic'), 'System prompt should mention Ionic');
      assert.ok(sysPrompt.includes('*ngIf'), 'System prompt should enforce preserving Angular bindings');
      assert.ok(sysPrompt.includes('JSON'), 'System prompt should enforce JSON output schema');
    });

    it('should format clipboard prompt cleanly for Antigravity', () => {
      const ctx: PromptContext = {
        htmlFilePath: 'src/app/home/home.page.html',
        scssFilePath: 'src/app/home/home.page.scss',
        matchedSnippet: '<ion-button color="primary">Transfer</ion-button>',
        fullHtmlContent: '<ion-button color="primary">Transfer</ion-button>',
        fullScssContent: '',
        visualChanges: [
          { type: 'attribute', name: 'fill', value: 'outline' },
          { type: 'attribute', name: 'color', value: 'secondary' }
        ],
        userIntent: 'Make button modern rounded outline'
      };

      const clipPrompt = PromptBuilder.buildClipboardPrompt(ctx);
      assert.ok(clipPrompt.includes('### UI/UX Code Update Request'));
      assert.ok(clipPrompt.includes('home.page.html'));
      assert.ok(clipPrompt.includes('fill'));
      assert.ok(clipPrompt.includes('outline'));
      assert.ok(clipPrompt.includes('Make button modern rounded outline'));
    });
  });

  describe('FilePatcher (Safe Code Modification & Diff Preview)', () => {
    const testFilePath = path.join(__dirname, 'fixtures/sample-ionic-app/src/app/home/home.page.html');
    const originalContent = fs.readFileSync(testFilePath, 'utf-8');

    it('should generate a unified diff without touching the file during preview', () => {
      const modifiedContent = originalContent.replace(
        'expand="block" color="primary"',
        'expand="block" color="secondary" fill="outline"'
      );
      const diff = FilePatcher.previewDiff(testFilePath, modifiedContent);

      assert.ok(diff.includes('color="primary"'), 'Diff should show removed color=primary');
      assert.ok(diff.includes('color="secondary" fill="outline"'), 'Diff should show added attributes');
      assert.ok(diff.includes('transferBtn'), 'Diff should reference the target element');
    });

    it('should safely write updated content and create backup', () => {
      const modifiedContent = originalContent.replace('Banking App', 'Fintech Pro App');
      const result = FilePatcher.applyPatch({
        filePath: testFilePath,
        fullNewContent: modifiedContent
      });

      assert.ok(result.success, 'Patch should apply successfully');
      assert.ok(fs.existsSync(result.backupPath!), 'Backup file should be created');

      // Verify content was updated
      const writtenContent = fs.readFileSync(testFilePath, 'utf-8');
      assert.ok(writtenContent.includes('Fintech Pro App'));

      // Rollback to original content
      fs.writeFileSync(testFilePath, originalContent, 'utf-8');
      if (fs.existsSync(result.backupPath!)) {
        fs.unlinkSync(result.backupPath!);
      }
    });
  });
});
