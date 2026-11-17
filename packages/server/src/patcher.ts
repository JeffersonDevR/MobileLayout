import fs from 'fs';
import path from 'path';
import * as diff from 'diff';

export interface PatchRequest {
  filePath: string;
  originalSnippet?: string;
  newSnippet?: string;
  fullNewContent?: string;
}

export interface PatchResult {
  success: boolean;
  filePath: string;
  unifiedDiff: string;
  backupPath?: string;
  error?: string;
}

export class FilePatcher {
  /**
   * Applies the code change to the target file safely
   */
  public static applyPatch(req: PatchRequest): PatchResult {
    try {
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

      // Create backup file
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
