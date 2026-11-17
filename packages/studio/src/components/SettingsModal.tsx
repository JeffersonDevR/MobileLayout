import React, { useState } from 'react';
import { StudioConfig } from '../types';
import { 
  X, 
  Settings, 
  Check, 
  Folder, 
  Globe, 
  Cpu, 
  Key, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StudioConfig;
  onSaveConfig: (updated: Partial<StudioConfig>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig
}) => {
  const [targetUrl, setTargetUrl] = useState(config.targetUrl || 'http://localhost:8100');
  const [projectPath, setProjectPath] = useState(config.projectPath || '');
  const [llmProvider, setLlmProvider] = useState<'gemini' | 'opencode'>(config.llmProvider || 'gemini');
  
  // Gemini settings
  const [geminiApiKey, setGeminiApiKey] = useState(config.geminiApiKey || '');
  const [geminiModel, setGeminiModel] = useState(config.geminiModel || 'gemini-2.5-flash');

  // OpenCode settings
  const [openCodeBaseUrl, setOpenCodeBaseUrl] = useState(config.openCodeBaseUrl || 'http://localhost:4096');
  const [openCodeApiKey, setOpenCodeApiKey] = useState(config.openCodeApiKey || '');
  const [openCodeModel, setOpenCodeModel] = useState(config.openCodeModel || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      targetUrl,
      projectPath,
      llmProvider,
      geminiApiKey,
      geminiModel,
      openCodeBaseUrl,
      openCodeApiKey,
      openCodeModel
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Project & LLM Settings</h2>
              <p className="text-xs text-slate-400">Configure connection to your project and AI engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Target URL */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Target Dev Server URL</span>
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="e.g. http://localhost:8100 or http://localhost:4200"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              The URL where your Angular/Ionic project is currently running (<code className="text-slate-400">ionic serve</code>).
            </p>
          </div>

          {/* Project Directory Path */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center space-x-1.5">
              <Folder className="w-3.5 h-3.5 text-emerald-400" />
              <span>Project Source Folder (Absolute Path)</span>
            </label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="e.g. C:\Users\SENA\my-ionic-app"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Path to your project root where <code className="text-slate-400">src/app</code> and <code className="text-slate-400">package.json</code> live.
            </p>
          </div>

          {/* LLM Provider Selection */}
          <div className="pt-3 border-t border-slate-800">
            <label className="block text-slate-300 font-semibold mb-2 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>LLM Code Generation Engine</span>
            </label>

            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-3">
              <button
                type="button"
                onClick={() => setLlmProvider('gemini')}
                className={`py-2 px-3 rounded-lg font-medium text-xs transition-all flex items-center justify-center space-x-2 ${
                  llmProvider === 'gemini'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Google Gemini API</span>
              </button>

              <button
                type="button"
                onClick={() => setLlmProvider('opencode')}
                className={`py-2 px-3 rounded-lg font-medium text-xs transition-all flex items-center justify-center space-x-2 ${
                  llmProvider === 'opencode'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>OpenCode / Local LLM</span>
              </button>
            </div>

            {/* Gemini Config */}
            {llmProvider === 'gemini' && (
              <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <label className="block text-slate-400 mb-1 flex items-center space-x-1">
                    <Key className="w-3 h-3 text-amber-400" />
                    <span>Gemini API Key</span>
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Model Name</label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Recommended)</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (High Reasoning)</option>
                  </select>
                </div>
              </div>
            )}

            {/* OpenCode Config */}
            {llmProvider === 'opencode' && (
              <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <label className="block text-slate-400 mb-1">OpenCode Service URL</label>
                  <input
                    type="text"
                    value={openCodeBaseUrl}
                    onChange={(e) => setOpenCodeBaseUrl(e.target.value)}
                    placeholder="http://localhost:4096"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Root URL of the running OpenCode service (default <code className="text-slate-400">http://localhost:4096</code>).
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Model Name</label>
                  <input
                    type="text"
                    value={openCodeModel}
                    onChange={(e) => setOpenCodeModel(e.target.value)}
                    placeholder="providerID/model, e.g. anthropic/claude-sonnet-4"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Use <code className="text-slate-400">providerID/model</code> format. Leave blank to use OpenCode's configured default model.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">API Key (Optional Bearer Token)</label>
                  <input
                    type="password"
                    value={openCodeApiKey}
                    onChange={(e) => setOpenCodeApiKey(e.target.value)}
                    placeholder="Optional Bearer token for a remote service"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Save */}
          <div className="pt-4 border-t border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save & Connect</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
