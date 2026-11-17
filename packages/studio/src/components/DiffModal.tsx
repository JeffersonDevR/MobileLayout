import React, { useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { 
  X, 
  Check, 
  FileCode, 
  Sparkles, 
  AlertTriangle,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  explanation: string;
  originalHtml?: string;
  updatedHtml?: string;
  originalScss?: string;
  updatedScss?: string;
  htmlFilePath?: string;
  scssFilePath?: string;
  onApplyChanges: () => void;
  isApplying: boolean;
}

export const DiffModal: React.FC<DiffModalProps> = ({
  isOpen,
  onClose,
  explanation,
  originalHtml = '',
  updatedHtml = '',
  originalScss = '',
  updatedScss = '',
  htmlFilePath = '',
  scssFilePath = '',
  onApplyChanges,
  isApplying
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'scss'>('html');

  if (!isOpen) return null;

  const hasHtmlChanges = originalHtml !== updatedHtml && !!updatedHtml;
  const hasScssChanges = originalScss !== updatedScss && !!updatedScss;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Review Generated Code Diffs</h2>
              <p className="text-xs text-slate-400">{explanation || 'Review changes before applying to your project'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (HTML vs SCSS) */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 text-xs">
          {updatedHtml && (
            <button
              onClick={() => setActiveTab('html')}
              className={`py-2.5 px-4 font-medium flex items-center space-x-2 border-b-2 transition-all ${
                activeTab === 'html'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Template ({htmlFilePath.split(/[\\/]/).pop()})</span>
              {hasHtmlChanges && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
          )}

          {updatedScss && (
            <button
              onClick={() => setActiveTab('scss')}
              className={`py-2.5 px-4 font-medium flex items-center space-x-2 border-b-2 transition-all ${
                activeTab === 'scss'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Styles ({scssFilePath.split(/[\\/]/).pop()})</span>
              {hasScssChanges && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
          )}
        </div>

        {/* Monaco Diff Viewer */}
        <div className="flex-1 bg-[#1e1e1e]">
          {activeTab === 'html' && (
            <DiffEditor
              original={originalHtml}
              modified={updatedHtml}
              language="html"
              theme="vs-dark"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12
              }}
            />
          )}

          {activeTab === 'scss' && (
            <DiffEditor
              original={originalScss}
              modified={updatedScss}
              language="scss"
              theme="vs-dark"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12
              }}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <span>Left: Original Code</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-emerald-400 font-semibold">Right: New Code with Visual Changes</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Discard
            </button>

            <button
              onClick={onApplyChanges}
              disabled={isApplying}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Writing Changes to Project...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply Changes to Project</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
