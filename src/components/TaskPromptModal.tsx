import React, { useState } from 'react';
import {
  Brain,
  Wrench,
  Workflow,
  Server,
  ShieldAlert,
  Loader2,
  X,
  Sparkles,
  Code2,
} from 'lucide-react';
import { AgentMode, GenerateTaskRequest } from '../types';

interface TaskPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: GenerateTaskRequest) => Promise<void>;
  isLoading: boolean;
  initialMode?: AgentMode;
}

export const TaskPromptModal: React.FC<TaskPromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialMode = 'fullstack',
}) => {
  const [mode, setMode] = useState<AgentMode>(initialMode);
  const [prompt, setPrompt] = useState('');
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [stackTrace, setStackTrace] = useState('');
  const [showStackTraceField, setShowStackTraceField] = useState(initialMode === 'debugger');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    await onSubmit({
      prompt: prompt.trim(),
      mode,
      thinkingEnabled,
      stackTrace: stackTrace.trim() ? stackTrace.trim() : undefined,
    });
  };

  const samplePrompts: Record<AgentMode, string[]> = {
    fullstack: [
      'Build a multi-tenant SaaS REST API with Express, PostgreSQL via Prisma, tenant schema isolation, and Stripe webhook handling',
      'Create a React 19 + TypeScript Kanban board with offline optimistic updates, drag-and-drop, and localStorage sync',
      'Production FastAPI Python service with JWT authentication, rate limiting, and OpenAPI schemas'
    ],
    automation: [
      'Write a Playwright web scraper that navigates through paginated catalog items with human-like mouse trajectories and proxy rotation',
      'Build a resilient webhook dispatcher in Node.js that executes retries with exponential backoff and dead-letter queues',
      'Create an automated GitHub repo auditor script in Python to verify branch protection rules and secret leak policies'
    ],
    devops: [
      'Generate a multi-stage Dockerfile for a Next.js 15 application with standalone output, Alpine base, and non-root security',
      'Create a GitHub Actions CI/CD workflow that runs linting, unit tests, Docker build, and deploys to Kubernetes via Helm',
      'Write a Cloudflare Worker script that performs dynamic edge geo-routing and caching with JWT validation'
    ],
    debugger: [
      'Diagnose: Error: listen EADDRINUSE: address already in use :::3000 during hot reloading in Node.js',
      'Fix: UnhandledPromiseRejection: MongoServerError: E11000 duplicate key error collection during concurrent upserts',
      'Diagnose: FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory'
    ]
  };

  return (
    <div id="task-prompt-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        id="task-prompt-modal"
        className="w-full max-w-3xl bg-[#0f131c] border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#141a26] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                New DevAgent Autonomous Engineering Run
              </h2>
              <p className="text-xs text-slate-400">
                Specify your technical requirements, architecture constraints, or paste stack traces
              </p>
            </div>
          </div>
          <button
            id="close-task-modal-btn"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Competency Engine
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <button
                type="button"
                id="mode-fullstack-btn"
                onClick={() => {
                  setMode('fullstack');
                  setShowStackTraceField(false);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  mode === 'fullstack'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-[#141924] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Server className="w-4 h-4 mb-1.5 text-emerald-400" />
                <div className="text-xs font-semibold">Full-Stack</div>
                <div className="text-[10px] text-slate-400">Web, APIs & DB</div>
              </button>

              <button
                type="button"
                id="mode-automation-btn"
                onClick={() => {
                  setMode('automation');
                  setShowStackTraceField(false);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  mode === 'automation'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-[#141924] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Workflow className="w-4 h-4 mb-1.5 text-emerald-400" />
                <div className="text-xs font-semibold">Automation</div>
                <div className="text-[10px] text-slate-400">Scraping & Scripts</div>
              </button>

              <button
                type="button"
                id="mode-devops-btn"
                onClick={() => {
                  setMode('devops');
                  setShowStackTraceField(false);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  mode === 'devops'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-[#141924] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Wrench className="w-4 h-4 mb-1.5 text-emerald-400" />
                <div className="text-xs font-semibold">DevOps</div>
                <div className="text-[10px] text-slate-400">Docker & CI/CD</div>
              </button>

              <button
                type="button"
                id="mode-debugger-btn"
                onClick={() => {
                  setMode('debugger');
                  setShowStackTraceField(true);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  mode === 'debugger'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-[#141924] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <ShieldAlert className="w-4 h-4 mb-1.5 text-amber-400" />
                <div className="text-xs font-semibold">Bug Diagnosis</div>
                <div className="text-[10px] text-slate-400">Stack Trace Fix</div>
              </button>
            </div>
          </div>

          {/* High Thinking Level Control */}
          <div className="p-3.5 rounded-lg bg-[#141a26] border border-indigo-900/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  High Thinking Mode
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    gemini-3.1-pro-preview
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Enables deep architectural reasoning, boundary checks, and complete implementation files.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="toggle-thinking-level-input"
                type="checkbox"
                checked={thinkingEnabled}
                onChange={(e) => setThinkingEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Prompt Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Specification / Technical Prompt
              </label>
              <button
                type="button"
                onClick={() => setShowStackTraceField(!showStackTraceField)}
                className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {showStackTraceField ? '- Remove Stack Trace' : '+ Attach Stack Trace / Logs'}
              </button>
            </div>
            <textarea
              id="task-prompt-textarea"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Build an autonomous queue worker in Node.js that processes video transcoding jobs with FFmpeg, Redis streams, and S3 upload hooks..."
              className="w-full p-3 rounded-lg bg-[#0a0d14] border border-slate-800 text-slate-200 text-xs font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500/60 leading-relaxed"
              required
            />
          </div>

          {/* Stack Trace / Error Logs Field (Optional) */}
          {showStackTraceField && (
            <div>
              <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                Stack Trace / Crash Logs / Offending Code
              </label>
              <textarea
                id="task-stacktrace-textarea"
                rows={4}
                value={stackTrace}
                onChange={(e) => setStackTrace(e.target.value)}
                placeholder="Paste runtime error stack trace (e.g., Uncaught TypeError, MongoNetworkError, Docker OOM 137)..."
                className="w-full p-3 rounded-lg bg-[#0a0d14] border border-amber-900/40 text-amber-200 text-xs font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500/60 leading-relaxed"
              />
            </div>
          )}

          {/* Quick Examples */}
          <div>
            <div className="text-[11px] text-slate-500 mb-2 font-medium">Quick Template Prompts:</div>
            <div className="space-y-1.5">
              {samplePrompts[mode].map((sample, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => setPrompt(sample)}
                  className="w-full text-left p-2 rounded bg-[#141924] hover:bg-[#192130] text-slate-400 hover:text-slate-200 text-xs transition-colors border border-slate-800/80 truncate"
                >
                  <span className="text-emerald-400 font-bold mr-1.5">›</span>
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#141a26] border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            {thinkingEnabled ? 'Model: gemini-3.1-pro-preview (ThinkingLevel.HIGH)' : 'Model: gemini-3.8-flash (Fast Mode)'}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              id="execute-autonomous-run-btn"
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !prompt.trim()}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Architecture...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Autonomous Run</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
