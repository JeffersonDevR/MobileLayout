import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { FilePatcher } from '../packages/server/src/patcher';

const fixtureRoot = path.resolve(__dirname, 'fixtures/sample-ionic-app');
const fixtureHomePage = path.join(fixtureRoot, 'src/app/home/home.page.html');
const originalHomePageContent = fs.readFileSync(fixtureHomePage, 'utf-8');

/** Scratch directory outside the worktree for escape-target victims. */
function makeScratchDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ml-patcher-safety-'));
}

function writeVictim(dir: string, content: string): string {
  const victim = path.join(dir, 'victim.html');
  fs.writeFileSync(victim, content, 'utf-8');
  return victim;
}

/** Restores the fixture exactly like tests/run-tests.ts does after an apply. */
function restoreFixture(): void {
  fs.writeFileSync(fixtureHomePage, originalHomePageContent, 'utf-8');
  const backupPath = `${fixtureHomePage}.mobile-layout.bak`;
  if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
}

describe('FilePatcher write sandbox (projectRoot containment + per-file backup)', () => {
  it('applies an in-root path and creates a per-file backup next to the target', () => {
    const modifiedContent = originalHomePageContent.replace('Banking App', 'Fintech Pro App');
    try {
      const result = FilePatcher.applyPatch({
        filePath: fixtureHomePage,
        fullNewContent: modifiedContent,
        projectRoot: fixtureRoot
      });

      assert.ok(result.success, `In-root patch should apply, got error: ${result.error}`);
      // Per-file backup: named <originalFileName>.mobile-layout.bak next to the target.
      assert.strictEqual(result.backupPath, `${fixtureHomePage}.mobile-layout.bak`);
      assert.ok(fs.existsSync(result.backupPath!), 'Per-file backup should exist next to the target');
      assert.strictEqual(
        fs.readFileSync(result.backupPath!, 'utf-8'),
        originalHomePageContent,
        'Backup must hold the pre-patch content of this exact file'
      );
      assert.ok(
        fs.readFileSync(fixtureHomePage, 'utf-8').includes('Fintech Pro App'),
        'Target file should contain the updated content'
      );
    } finally {
      restoreFixture();
    }
  });

  it('refuses a ../ traversal escape and writes nothing', () => {
    const scratch = makeScratchDir();
    try {
      const projectRoot = path.join(scratch, 'proj');
      fs.mkdirSync(projectRoot);
      const victim = writeVictim(scratch, 'VICTIM ORIGINAL');
      const escapingPath = path.join(projectRoot, '..', 'victim.html');

      const result = FilePatcher.applyPatch({
        filePath: escapingPath,
        fullNewContent: 'ESCAPED CONTENT',
        projectRoot
      });

      assert.ok(!result.success, 'Traversal escape must be refused');
      assert.ok(
        result.error && result.error.toLowerCase().includes('outside'),
        `Refusal must name the containment violation, got: ${result.error}`
      );
      assert.strictEqual(
        fs.readFileSync(victim, 'utf-8'),
        'VICTIM ORIGINAL',
        'Refused patch must not write the escaping target'
      );
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });

  it('refuses an absolute path outside the root and writes nothing', () => {
    const scratch = makeScratchDir();
    try {
      const victim = writeVictim(scratch, 'VICTIM ORIGINAL');

      const result = FilePatcher.applyPatch({
        filePath: victim,
        fullNewContent: 'ESCAPED CONTENT',
        projectRoot: fixtureRoot
      });

      assert.ok(!result.success, 'Absolute path outside the root must be refused');
      assert.ok(
        result.error && result.error.toLowerCase().includes('outside'),
        `Refusal must name the containment violation, got: ${result.error}`
      );
      assert.strictEqual(
        fs.readFileSync(victim, 'utf-8'),
        'VICTIM ORIGINAL',
        'Refused patch must not write the outside target'
      );
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });

  it('refuses a sibling-prefix path (root-evil) and writes nothing', () => {
    const scratch = makeScratchDir();
    try {
      const projectRoot = path.join(scratch, 'proj');
      fs.mkdirSync(projectRoot);
      const evilSibling = `${projectRoot}-evil`;
      fs.mkdirSync(evilSibling);
      const victim = writeVictim(evilSibling, 'VICTIM ORIGINAL');

      const result = FilePatcher.applyPatch({
        filePath: victim,
        fullNewContent: 'ESCAPED CONTENT',
        projectRoot
      });

      assert.ok(!result.success, 'Sibling-prefix path must be refused (path-segment boundary)');
      assert.ok(
        result.error && result.error.toLowerCase().includes('outside'),
        `Refusal must name the containment violation, got: ${result.error}`
      );
      assert.strictEqual(
        fs.readFileSync(victim, 'utf-8'),
        'VICTIM ORIGINAL',
        'Refused patch must not write the sibling-prefix target'
      );
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });

  it('keeps legacy behavior when projectRoot is omitted', () => {
    const modifiedContent = originalHomePageContent.replace('Banking App', 'Fintech Pro App');
    try {
      const result = FilePatcher.applyPatch({
        filePath: fixtureHomePage,
        fullNewContent: modifiedContent
      });

      assert.ok(result.success, `Patch without a project root should apply, got error: ${result.error}`);
      assert.ok(fs.existsSync(result.backupPath!), 'Legacy backup should be created');
      assert.ok(
        fs.readFileSync(fixtureHomePage, 'utf-8').includes('Fintech Pro App'),
        'Target file should contain the updated content'
      );
    } finally {
      restoreFixture();
    }
  });
});
