import fs from 'fs';
import path from 'path';
import * as diff from 'diff';

export interface PatchRequest {
  filePath: string;
  originalSnippet?: string;
  newSnippet?: string;
  fullNewContent?: string;
  /**
   * Optional project root for write sandboxing. When provided (non-empty),
   * any target path that resolves outside this root is refused before a
   * single byte is written. Omit it to keep the legacy unsandboxed behavior.
   */
  projectRoot?: string;
}

export interface PatchResult {
  success: boolean;
  filePath: string;
  unifiedDiff: string;
  backupPath?: string;
  error?: string;
}

/**
 * Normalizes a path for containment comparison: absolute, separators
 * normalized, and lowercased on Windows where drive/path comparison is
 * case-insensitive.
 */
function normalizeForComparison(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/**
 * Write-sandbox check, self-contained in the patcher.
 *
 * Returns true only when `candidatePath` resolves to `projectRoot` itself or
 * to a path strictly inside it. Both sides are resolved (so `.`, `..` and
 * mixed separators are normalized), compared case-insensitively on Windows,
 * and checked via `path.relative` for a path-segment boundary: a root of
 * "D:\root" can never admit "D:\root-evil" because the relative path starts
 * with ".." — a partial-segment prefix match is impossible by construction.
 */
function isPathWithinProject(projectRoot: string, candidatePath: string): boolean {
  const root = normalizeForComparison(projectRoot);
  const candidate = normalizeForComparison(candidatePath);
  if (!root || !candidate) return false;

  const rel = path.relative(root, candidate);
  if (rel === '') return true; // The candidate is the root itself.
  // A different Windows drive letter makes path.relative return the
  // candidate unchanged (absolute), which counts as an escape.
  if (path.isAbsolute(rel)) return false;
  // ".." or "..<sep>..." escapes the root; the separator-aware prefix check
  // still admits in-root files whose names merely start with ".." (e.g.
  // "..draft.html").
  return rel !== '..' && !rel.startsWith(`..${path.sep}`);
}

export class FilePatcher {
  /**
   * Applies the code change to the target file safely
   */
  public static applyPatch(req: PatchRequest): PatchResult {
    try {
      // Write sandbox: when a project root is configured, refuse any target
      // that resolves outside it before touching the filesystem.
      if (req.projectRoot) {
        if (!isPathWithinProject(req.projectRoot, req.filePath)) {
          return {
            success: false,
            filePath: req.filePath,
            unifiedDiff: '',
            error: `Refusing to apply patch: "${req.filePath}" resolves outside the project root "${path.resolve(req.projectRoot)}". No file was written.`
          };
        }
      }

      if (!fs.existsSync(req.filePath)) {
        return {
          success: false,
          filePath: req.filePath,
          unifiedDiff: '',
          error: `File not found: ${req.filePath}`
        };
      }

      const originalContent = fs.readFileSync(req.filePath, 'utf-8');
      let updatedContent = originalContent;

      if (req.fullNewContent !== undefined) {
        updatedContent = req.fullNewContent;
      } else if (req.originalSnippet && req.newSnippet) {
        // Targeted replacement
        if (!originalContent.includes(req.originalSnippet)) {
          // Try fuzzy whitespace normalization
          const normalizedOriginal = originalContent.replace(/\r\n/g, '\n');
          const normalizedSnippet = req.originalSnippet.replace(/\r\n/g, '\n');

          if (normalizedOriginal.includes(normalizedSnippet)) {
            updatedContent = normalizedOriginal.replace(normalizedSnippet, req.newSnippet);
          } else {
            return {
              success: false,
              filePath: req.filePath,
              unifiedDiff: '',
              error: `Could not locate original snippet in file for replacement.`
            };
          }
        } else {
          updatedContent = originalContent.replace(req.originalSnippet, req.newSnippet);
        }
      } else {
        return {
          success: false,
          filePath: req.filePath,
          unifiedDiff: '',
          error: 'Neither fullNewContent nor (originalSnippet + newSnippet) provided'
        };
      }

      // Per-file backup: named <originalFileName>.mobile-layout.bak next to
      // the target file, holding the pre-patch content of this exact file.
      const backupPath = `${req.filePath}.mobile-layout.bak`;
      fs.writeFileSync(backupPath, originalContent, 'utf-8');

      // Write updated content
      fs.writeFileSync(req.filePath, updatedContent, 'utf-8');

      // Generate unified diff
      const patchDiff = diff.createTwoFilesPatch(
        path.basename(req.filePath),
        path.basename(req.filePath),
        originalContent,
        updatedContent,
        'Original',
        'MobileLayout Studio Update'
      );

      return {
        success: true,
        filePath: req.filePath,
        unifiedDiff: patchDiff,
        backupPath
      };
    } catch (err: any) {
      return {
        success: false,
        filePath: req.filePath,
        unifiedDiff: '',
        error: err.message || String(err)
      };
    }
  }

  /**
   * Generates diff without writing to disk (for preview)
   */
  public static previewDiff(filePath: string, updatedContent: string): string {
    if (!fs.existsSync(filePath)) return '';
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    return diff.createTwoFilesPatch(
      path.basename(filePath),
      path.basename(filePath),
      originalContent,
      updatedContent,
      'Original',
      'Proposed Changes'
    );
  }
}
