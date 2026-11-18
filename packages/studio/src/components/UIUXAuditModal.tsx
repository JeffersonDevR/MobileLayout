import React, { useState } from 'react';
import { ScreenAuditReport, ScreenAuditIssue } from '../types';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  Search, 
  Target, 
  Eye, 
  Layers, 
  Type, 
  Maximize2 
} from 'lucide-react';

interface UIUXAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ScreenAuditReport | null;
  onRunAudit: () => void;
  onApplyFix: (selector: string, prop: string, value: string) => void;
  onSelectElement: (selector: string) => void;
  isRunningAudit: boolean;
}

export const UIUXAuditModal: React.FC<UIUXAuditModalProps> = ({
  isOpen,
  onClose,
  report,
  onRunAudit,
  onApplyFix,
  onSelectElement,
  isRunningAudit
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [fixedIssueIds, setFixedIssueIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleFix = (issue: ScreenAuditIssue) => {
    if (!issue.quickFix) return;
    onApplyFix(issue.selector, issue.quickFix.prop, issue.quickFix.value);
    setFixedIssueIds((prev) => new Set(prev).add(issue.id));
  };

  const handleHighlight = (selector: string) => {
    onSelectElement(selector);
    onClose();
  };

  const filteredIssues = (report?.issues || []).filter((issue) => {
    if (activeCategory === 'all') return true;
    return issue.category === activeCategory;
  });

  const remainingIssues = filteredIssues.filter((i) => !fixedIssueIds.has(i.id));

  // Determine score color
  const score = report?.score ?? 100;
  const scoreColor = 
    score >= 90 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' :
    score >= 75 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
    'text-rose-400 border-rose-500/40 bg-rose-500/10';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Mobile UI/UX Audit & Best Practices</h2>
                {report && (
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${scoreColor}`}>
                    Grade {report.grade} &bull; {report.score}/100
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Automated mobile heuristics: Touch targets (Apple HIG), Notch & Safe Area, WCAG contrast, Ionic semantics
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRunAudit}
              disabled={isRunningAudit}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
              <span>{isRunningAudit ? 'Scanning DOM...' : 'Re-run Audit'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Health Cards */}
        {report && (
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/30 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {/* Touch Target */}
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                report.summary.touchPass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Touch Hitboxes</span>
                <span className={`font-semibold text-xs ${report.summary.touchPass ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {report.summary.touchPass ? 'All ≥ 44px' : 'Needs Expansion'}
                </span>
              </div>
            </div>

            {/* Safe Area */}
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                report.summary.safeAreaPass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Safe Area Insets</span>
                <span className={`font-semibold text-xs ${report.summary.safeAreaPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {report.summary.safeAreaPass ? 'Protected' : 'Missing Insets'}
                </span>
              </div>
            </div>

            {/* Contrast */}
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                report.summary.contrastPass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">WCAG Contrast</span>
                <span className={`font-semibold text-xs ${report.summary.contrastPass ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {report.summary.contrastPass ? 'Passed (≥ 4.5:1)' : 'Low Contrast'}
                </span>
              </div>
            </div>

            {/* Ionic Semantics */}
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                report.summary.semanticsPass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
              }`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Ionic Semantics</span>
                <span className={`font-semibold text-xs ${report.summary.semanticsPass ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {report.summary.semanticsPass ? 'Native UI' : 'Non-Ionic Divs'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-900/60 flex items-center space-x-1.5 text-xs overflow-x-auto">
          {[
            { id: 'all', label: 'All Issues' },
            { id: 'touch_target', label: '🎯 Touch Hitboxes' },
            { id: 'safe_area', label: '🛡️ Safe Area' },
            { id: 'contrast', label: '👁️ Contrast' },
            { id: 'semantic_ionic', label: '⚡ Ionic Semantics' },
            { id: 'typography', label: '🔤 Typography' },
            { id: 'overflow', label: '↔️ Overflow' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Issues List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {!report ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
              <ShieldCheck className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-medium text-slate-400">Ready to audit mobile UI/UX</p>
              <p className="text-xs text-slate-600 max-w-sm mt-1">
                Click "Run Full Audit" to inspect all components on the active mobile screen against Apple and Google UX standards.
              </p>
              <button
                onClick={onRunAudit}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Start Audit
              </button>
            </div>
          ) : remainingIssues.length === 0 ? (
            <div className="py-16 text-center text-emerald-400 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
              <p className="text-sm font-bold text-slate-200">
                {fixedIssueIds.size > 0 
                  ? 'All Selected Issues Resolved!' 
                  : 'Zero UX Violations Detected!'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                The layout conforms to Apple Human Interface Guidelines and Google Material Design for mobile apps.
              </p>
            </div>
          ) : (
            remainingIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                  issue.level === 'error'
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : issue.level === 'warning'
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-blue-950/20 border-blue-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {issue.level === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : issue.level === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                    <h4 className="font-semibold text-slate-200 text-xs">{issue.title}</h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      {issue.selector}
                    </span>
                  </div>

                  <span className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded ${
                    issue.level === 'error' ? 'bg-rose-500/20 text-rose-300' :
                    issue.level === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {issue.level}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                  {issue.message}
                </p>

                <div className="flex items-center justify-between pt-1 pl-6">
                  <button
                    onClick={() => handleHighlight(issue.selector)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1"
                  >
                    <Search className="w-3 h-3 text-blue-400" />
                    <span>Select on Canvas</span>
                  </button>

                  {issue.quickFix && (
                    <button
                      onClick={() => handleFix(issue)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 shadow-sm transition-all"
                    >
                      <Zap className="w-3 h-3 text-emerald-200" />
                      <span>⚡ Quick Fix: {issue.quickFix.label}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
