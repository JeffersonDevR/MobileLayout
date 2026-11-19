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

describe('FilePatcher write sandbox — adversarial containment probes (S3)', () => {
  function scratch(): { dir: string; root: string; outside: string } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-patcher-adv-'));
    const root = path.join(dir, 'proj');
    const outside = path.join(dir, 'outside');
    fs.mkdirSync(root);
    fs.mkdirSync(outside);
    return { dir, root, outside };
  }
  const victim = (dir: string, name = 'victim.html'): string => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, 'VICTIM ORIGINAL', 'utf-8');
    return p;
  };

  it('treats empty-string projectRoot as omitted (legacy)', () => {
    const s = scratch();
    try {
      const v = victim(s.outside);
      const result = FilePatcher.applyPatch({ filePath: v, fullNewContent: 'LEGACY', projectRoot: '' });
      assert.ok(result.success, `empty-string projectRoot must behave as omitted, got: ${result.error}`);
      assert.strictEqual(fs.readFileSync(v, 'utf-8'), 'LEGACY');
    } finally { fs.rmSync(s.dir, { recursive: true, force: true }); }
  });

  it('admits mixed separators, uppercase roots, and trailing separators', () => {
    const s = scratch();
    try {
      const v = victim(s.root);
      const result = FilePatcher.applyPatch({
        filePath: v.split(path.sep).join('/'),
        fullNewContent: 'NEW',
        projectRoot: s.root.toUpperCase() + path.sep
      });
      assert.ok(result.success, `normalized root/target must be admitted, got: ${result.error}`);
    } finally { fs.rmSync(s.dir, { recursive: true, force: true }); }
  });

  it('admits .. segments that resolve back inside the root', () => {
    const s = scratch();
    try {
      fs.mkdirSync(path.join(s.root, 'sub'));
      const v = victim(s.root);
      const tricky = path.join(s.root, 'sub', '..', '..', 'proj', 'victim.html');
      const result = FilePatcher.applyPatch({ filePath: tricky, fullNewContent: 'NEW', projectRoot: s.root });
      assert.ok(result.success, `paths normalizing back inside must be admitted, got: ${result.error}`);
      assert.strictEqual(fs.readFileSync(v, 'utf-8'), 'NEW');
    } finally { fs.rmSync(s.dir, { recursive: true, force: true }); }
  });

  it('admits an in-root filename that merely starts with ".."', () => {
    const s = scratch();
    try {
      const v = victim(s.root, '..draft.html');
      const result = FilePatcher.applyPatch({ filePath: v, fullNewContent: 'NEW', projectRoot: s.root });
      assert.ok(result.success, `in-root dotdot-prefixed filename must be admitted, got: ${result.error}`);
    } finally { fs.rmSync(s.dir, { recursive: true, force: true }); }
  });

  it('refuses before any fs access: a nonexistent outside target gets the containment error', () => {
    const s = scratch();
    try {
      const result = FilePatcher.applyPatch({
        filePath: path.join(s.outside, 'nope-missing.html'),
        fullNewContent: 'X',
        projectRoot: s.root
      });
      assert.ok(!result.success, 'outside target must be refused');
      assert.ok(result.error!.toLowerCase().includes('outside'), `got: ${result.error}`);
      assert.ok(!/not found/i.test(result.error!), 'containment must run before the file-exists check');
    } finally { fs.rmSync(s.dir, { recursive: true, force: true }); }
  });

  it('refuses an outside apply without leaving a backup next to the target', () => {
    const s = scratch();
    try {
      const v = victim(s.outside);
      const bak = `${v}.mobile-layout.bak`;
      const result = FilePatcher.applyPatch({ filePath: v, fullNewContent: 'ESCAPED', projectRoot: s.root });
      assert.ok(!result.success && result.error!.toLowerCase().includes('outside'));
      assert.strictEqual(fs.readFileSync(v, 'utf-8'), 'VICTIM ORIGINAL');
      assert.ok(!fs.existsSync(bak), 'refusal must precede every fs write, including backups');
    } finally { fs.rmSync(s.dir, { recursive: true, force: true }); }
  });

  it('fails safely when the candidate is the project root itself', () => {
    const s = scratch();
    try {
      const bak = `${s.root}.mobile-layout.bak`;
      const result = FilePatcher.applyPatch({ filePath: s.root, fullNewContent: 'X', projectRoot: s.root });
      assert.ok(!result.success, 'applying to a directory must fail');
      assert.ok(!result.error!.toLowerCase().includes('outside'), 'the root itself is inside the sandbox');
      assert.ok(!fs.existsSync(bak), 'no backup may be written when nothing was patched');
    } finally { fs.rmSync(s.dir, { recursive: true, force: true }); }
  });

  it('drive-root projectRoot admits same-drive and refuses cross-drive absolutes', () => {
    if (process.platform !== 'win32') return;
    const s = scratch();
    try {
      const driveRoot = path.parse(s.root).root;
      const v = victim(s.root);
      const inDrive = FilePatcher.applyPatch({ filePath: v, fullNewContent: 'NEW', projectRoot: driveRoot });
      assert.ok(inDrive.success, `drive root must admit same-drive targets, got: ${inDrive.error}`);
      const otherDrive = driveRoot === 'C:\\' ? 'D:\\nonexistent-target.html' : 'C:\\nonexistent-target.html';
      const cross = FilePatcher.applyPatch({ filePath: otherDrive, fullNewContent: 'X', projectRoot: driveRoot });
      assert.ok(!cross.success && cross.error!.toLowerCase().includes('outside'), `got: ${cross.error}`);
    } finally { fs.rmSync(s.dir, { recursive: true, force: true }); }
  });

  it('refuses a relative filePath that escapes the root from the current cwd', () => {
    const s = scratch();
    const cwd = process.cwd();
    process.chdir(s.root);
    try {
      const v = victim(s.outside);
      const result = FilePatcher.applyPatch({
        filePath: path.join('..', 'outside', 'victim.html'),
        fullNewContent: 'ESCAPED',
        projectRoot: s.root
      });
      assert.ok(!result.success && result.error!.toLowerCase().includes('outside'));
      assert.strictEqual(fs.readFileSync(v, 'utf-8'), 'VICTIM ORIGINAL');
    } finally {
      process.chdir(cwd);
      fs.rmSync(s.dir, { recursive: true, force: true });
    }
  });
});

describe('FilePatcher restoreBackup (undo for direct-apply)', () => {
  it('restores the pre-apply content from the per-file backup and removes it', () => {
    const scratch = makeScratchDir();
    try {
      const target = writeVictim(scratch, 'BEFORE APPLY');
      const applyResult = FilePatcher.applyPatch({
        filePath: target,
        fullNewContent: 'AFTER APPLY',
        projectRoot: scratch
      });
      assert.ok(applyResult.success, applyResult.error);

      const restore = FilePatcher.restoreBackup({ filePath: target, projectRoot: scratch });
      assert.ok(restore.success, restore.error);
      assert.strictEqual(fs.readFileSync(target, 'utf-8'), 'BEFORE APPLY');
      assert.ok(!fs.existsSync(`${target}.mobile-layout.bak`), 'backup must be removed after restore');
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });

  it('refuses to restore a path outside the configured project root', () => {
    const scratch = makeScratchDir();
    try {
      const victimFile = writeVictim(scratch, 'UNTOUCHED');
      const restore = FilePatcher.restoreBackup({
        filePath: victimFile,
        projectRoot: path.join(scratch, 'not-the-root')
      });
      assert.ok(!restore.success, 'restore must refuse paths outside the root');
      assert.strictEqual(fs.readFileSync(victimFile, 'utf-8'), 'UNTOUCHED');
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });

  it('fails cleanly when no backup exists', () => {
    const scratch = makeScratchDir();
    try {
      const target = writeVictim(scratch, 'NO BACKUP');
      const restore = FilePatcher.restoreBackup({ filePath: target, projectRoot: scratch });
      assert.ok(!restore.success, 'restore must fail when no backup exists');
      assert.strictEqual(fs.readFileSync(target, 'utf-8'), 'NO BACKUP');
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });
});
