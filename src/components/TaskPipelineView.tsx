import React, { useState } from 'react';
import {
  Layers,
  FolderTree,
  FileCode,
  Terminal,
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  Brain,
  Download,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Camera,
} from 'lucide-react';
import { TaskSolution, CodeFile } from '../types';
import { CodeViewer } from './CodeViewer';
import { TerminalSimulator } from './TerminalSimulator';

interface TaskPipelineViewProps {
  task: TaskSolution;
  onOpenSurveillancePanel?: () => void;
}

export const TaskPipelineView: React.FC<TaskPipelineViewProps> = ({ task, onOpenSurveillancePanel }) => {
  const [activeStep, setActiveStep] = useState<number>(3); // Default to Step 3 (Core Implementation) for immediate code view
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [selectedDepFileIndex, setSelectedDepFileIndex] = useState<number>(0);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const [showThinkingDrawer, setShowThinkingDrawer] = useState(true);

  // All files from step 3
  const coreFiles: CodeFile[] = task.step3_implementation.files || [];
  const depFiles: CodeFile[] = task.step2_dependencies.files || [];

  const activeFile = coreFiles[selectedFileIndex] || coreFiles[0];
  const activeDepFile = depFiles[selectedDepFileIndex] || depFiles[0];

  const handleCopyAllCommands = () => {
    const text = task.step4_execution.commands.map((c) => c.command).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 2000);
  };

  const handleExportBundle = () => {
    // Generate JSON bundle containing all files and manifests
    const bundleData = {
      title: task.title,
      mode: task.mode,
      generatedAt: new Date(task.createdAt).toISOString(),
      model: task.modelUsed,
      architecture: task.step1_architecture,
      dependencies: task.step2_dependencies,
      sourceFiles: task.step3_implementation.files,
      executionCommands: task.step4_execution.commands,
    };
    const blob = new Blob([JSON.stringify(bundleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="devagent-task-pipeline-view" className="flex flex-col h-full bg-[#0b0e14] text-slate-100 overflow-hidden">
      {/* Top Meta Bar */}
      <div className="px-6 py-4 bg-[#111620] border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {task.mode}
            </span>
            {task.thinkingEnabled && (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gemini 3.1 Pro (High Thinking)</span>
              </span>
            )}
            <span className="text-xs text-slate-500">
              {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-100 mt-1 tracking-tight">
            {task.title}
          </h2>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {(task.id === 'preset_surveillance_device_auth' || task.title.toLowerCase().includes('surveillance')) && onOpenSurveillancePanel && (
            <button
              id="open-live-surveillance-btn"
              onClick={onOpenSurveillancePanel}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
              title="Launch interactive zero-trust surveillance feeds and device authorization panel"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Surveillance Panel</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            </button>
          )}

          <button
            id="export-bundle-btn"
            onClick={handleExportBundle}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Solution</span>
          </button>
        </div>
      </div>

      {/* High Thinking Insights Banner (Collapsible) */}
      {task.thinkingProcess && (
        <div className="border-b border-slate-800 bg-[#0e131d]">
          <button
            id="toggle-thinking-drawer-btn"
            onClick={() => setShowThinkingDrawer(!showThinkingDrawer)}
            className="w-full px-6 py-2 flex items-center justify-between text-xs text-indigo-300 hover:bg-indigo-950/20 transition-colors font-medium"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="font-semibold text-indigo-200">DevAgent High Thinking & Architectural Rationale</span>
            </div>
            {showThinkingDrawer ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showThinkingDrawer && (
            <div className="px-6 py-3 text-xs leading-relaxed text-slate-300 bg-indigo-950/10 border-t border-indigo-900/20 font-mono">
              <p className="whitespace-pre-wrap">{task.thinkingProcess}</p>
            </div>
          )}
        </div>
      )}

      {/* Bug Diagnosis Diff Panel (If Diagnostic Mode Active) */}
      {task.diagnostics && (
        <div id="bug-diagnostics-panel" className="px-6 py-4 bg-amber-950/15 border-b border-amber-900/30">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1 text-xs">
              <div className="font-semibold text-amber-300 text-sm">
                Root-Cause Failure Diagnosis
              </div>
              <p className="text-slate-300 leading-relaxed">
                {task.diagnostics.rootCause}
              </p>

              {task.diagnostics.offendingSnippet && task.diagnostics.fixedSnippet && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="bg-rose-950/30 border border-rose-800/40 rounded p-2.5">
                    <div className="text-rose-400 font-mono font-semibold text-[11px] mb-1">
                      Offending Vulnerable / Broken Segment:
                    </div>
                    <pre className="font-mono text-[11px] text-rose-200 whitespace-pre-wrap overflow-x-auto leading-5">
                      {task.diagnostics.offendingSnippet}
                    </pre>
                  </div>
                  <div className="bg-emerald-950/30 border border-emerald-800/40 rounded p-2.5">
                    <div className="text-emerald-400 font-mono font-semibold text-[11px] mb-1">
                      Production Hardened Fix:
                    </div>
                    <pre className="font-mono text-[11px] text-emerald-200 whitespace-pre-wrap overflow-x-auto leading-5">
                      {task.diagnostics.fixedSnippet}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4-Step Architecture Navigation Bar */}
      <div className="px-6 py-2.5 bg-[#141924] border-b border-slate-800 flex items-center space-x-2 overflow-x-auto">
        <button
          id="pipeline-tab-step1"
          onClick={() => setActiveStep(1)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
            activeStep === 1
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
          <span>Step 1: Architecture</span>
        </button>

        <button
          id="pipeline-tab-step2"
          onClick={() => setActiveStep(2)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
            activeStep === 2
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Step 2: Dependencies ({depFiles.length})</span>
        </button>

        <button
          id="pipeline-tab-step3"
          onClick={() => setActiveStep(3)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
            activeStep === 3
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-emerald-400" />
          <span>Step 3: Core Implementation ({coreFiles.length} files)</span>
        </button>

        <button
          id="pipeline-tab-step4"
          onClick={() => setActiveStep(4)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
            activeStep === 4
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Step 4: Terminal Commands & Shell</span>
        </button>
      </div>

      {/* Main Content Area Based on Active Step */}
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        {/* STEP 1: ARCHITECTURE */}
        {activeStep === 1 && (
          <div id="step-1-architecture-content" className="h-full overflow-y-auto space-y-6 max-w-5xl mx-auto">
            {/* Overview */}
            <div className="p-5 rounded-lg bg-[#111622] border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                System Overview & Layered Architecture
              </h3>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                {task.step1_architecture.overview}
              </p>
            </div>

            {/* Folder Structure */}
            <div className="p-5 rounded-lg bg-[#111622] border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-emerald-400" />
                File & Directory Layout
              </h3>
              <pre className="p-4 rounded bg-[#0a0d14] border border-slate-800/80 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                {task.step1_architecture.folderStructure}
              </pre>
            </div>

            {/* Design Decisions */}
            <div className="p-5 rounded-lg bg-[#111622] border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Core Engineering Decisions & Boundary Conditions
              </h3>
              <ul className="space-y-2 text-xs md:text-sm text-slate-300">
                {task.step1_architecture.designDecisions.map((decision, dIdx) => (
                  <li key={dIdx} className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: DEPENDENCIES */}
        {activeStep === 2 && (
          <div id="step-2-dependencies-content" className="h-full flex flex-col md:flex-row gap-4">
            {/* Dep File List Sidebar */}
            <div className="w-full md:w-64 bg-[#111622] border border-slate-800 rounded-lg p-3 flex md:flex-col gap-1.5 shrink-0 overflow-x-auto md:overflow-y-auto">
              <div className="text-xs font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider hidden md:block">
                Manifests ({task.step2_dependencies.packageManager})
              </div>
              {depFiles.map((file, fIdx) => (
                <button
                  key={fIdx}
                  onClick={() => setSelectedDepFileIndex(fIdx)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-xs font-mono w-full text-left transition-colors ${
                    selectedDepFileIndex === fIdx
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{file.filename}</span>
                </button>
              ))}
            </div>

            {/* Code Viewer */}
            <div className="flex-1 h-full min-h-[350px]">
              {activeDepFile ? (
                <CodeViewer
                  filename={activeDepFile.filename}
                  language={activeDepFile.language}
                  content={activeDepFile.content}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  No dependency files specified.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: CORE IMPLEMENTATION */}
        {activeStep === 3 && (
          <div id="step-3-implementation-content" className="h-full flex flex-col md:flex-row gap-4">
            {/* Multi-file Explorer Sidebar */}
            <div className="w-full md:w-72 bg-[#111622] border border-slate-800 rounded-lg p-3 flex md:flex-col gap-1 shrink-0 overflow-x-auto md:overflow-y-auto max-h-48 md:max-h-full">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:flex">
                <span>Modules ({coreFiles.length})</span>
                <span className="text-[10px] text-emerald-400 font-mono">100% Implemented</span>
              </div>
              {coreFiles.map((file, fIdx) => (
                <button
                  key={fIdx}
                  id={`file-tree-item-${fIdx}`}
                  onClick={() => setSelectedFileIndex(fIdx)}
                  className={`flex items-start space-x-2 px-3 py-2 rounded text-xs font-mono w-full text-left transition-colors ${
                    selectedFileIndex === fIdx
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <FileCode className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="truncate flex-1">
                    <div className="truncate font-semibold">{file.filename}</div>
                    {file.description && (
                      <div className="text-[10px] text-slate-500 truncate font-sans">
                        {file.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Code Viewer Panel */}
            <div className="flex-1 h-full min-h-[400px]">
              {activeFile ? (
                <CodeViewer
                  filename={activeFile.filename}
                  language={activeFile.language}
                  content={activeFile.content}
                  description={activeFile.description}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  No source files found in step 3.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: TERMINAL EXECUTION & VERIFICATION */}
        {activeStep === 4 && (
          <div id="step-4-execution-content" className="h-full flex flex-col lg:flex-row gap-5">
            {/* Commands Reference List */}
            <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto">
              <div className="p-4 rounded-lg bg-[#111622] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    Setup & Test Protocol
                  </h3>
                  <button
                    id="copy-all-terminal-commands-btn"
                    onClick={handleCopyAllCommands}
                    className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    {copiedCommands ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                </div>

                {task.step4_execution.prerequisites && task.step4_execution.prerequisites.length > 0 && (
                  <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                    <div className="font-semibold text-slate-300">Prerequisites:</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                      {task.step4_execution.prerequisites.map((p, pIdx) => (
                        <li key={pIdx}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2">
                  {task.step4_execution.commands.map((cmd, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-2.5 rounded bg-[#0a0d14] border border-slate-800/80 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-400 text-[11px]">
                          Stage {cIdx + 1}: {cmd.description}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-emerald-300 font-mono text-xs break-all">
                          {cmd.command}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(cmd.command)}
                          className="text-slate-500 hover:text-slate-300 p-1"
                          title="Copy command"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      {cmd.expectedOutput && (
                        <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
                          Expected: {cmd.expectedOutput}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Interactive Shell Sandbox */}
            <div className="flex-1 h-full min-h-[350px]">
              <TerminalSimulator commands={task.step4_execution.commands} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
