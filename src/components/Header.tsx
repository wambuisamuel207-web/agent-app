import React from 'react';
import {
  Terminal,
  Brain,
  Plus,
  Layers,
  Sparkles,
  Server,
  Workflow,
  Wrench,
  ShieldAlert,
  Download,
  Upload,
  BarChart3,
  GitBranch,
  Camera,
  Smartphone,
} from 'lucide-react';
import { TaskSolution, AgentMode } from '../types';

interface HeaderProps {
  onOpenNewTask: () => void;
  tasks: TaskSolution[];
  activeTaskId: string;
  onSelectTask: (taskId: string) => void;
  onOpenImportExport: (tab: 'export' | 'import') => void;
  onQuickExport: () => void;
  onSelectModeFilter?: (mode: AgentMode) => void;
  currentView: 'pipeline' | 'dashboard' | 'surveillance' | 'mobile_remote';
  onViewChange: (view: 'pipeline' | 'dashboard' | 'surveillance' | 'mobile_remote') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewTask,
  tasks,
  activeTaskId,
  onSelectTask,
  onOpenImportExport,
  onQuickExport,
  currentView,
  onViewChange,
}) => {
  return (
    <header className="px-4 sm:px-6 py-3 bg-[#0e131d] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3.5 text-slate-100">
      {/* Brand & Status */}
      <div className="flex items-center space-x-3.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-xs">
          <Terminal className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              DevAgent
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Autonomous Engineer
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Full-Stack Systems • Automation Workflows • DevOps CI/CD • Bug Diagnosis
          </p>
        </div>
      </div>

      {/* Center/Right View Switcher & Actions */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* View Switcher: Pipeline vs Activity Dashboard */}
        <div className="flex items-center p-0.5 rounded-lg bg-[#141924] border border-slate-700/80">
          <button
            id="view-toggle-pipeline-btn"
            onClick={() => onViewChange('pipeline')}
            title="View current task architecture and execution pipeline"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentView === 'pipeline'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Workflow className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pipeline</span>
          </button>

          <button
            id="view-toggle-dashboard-btn"
            onClick={() => onViewChange('dashboard')}
            title="View task activity, mode breakdown, and completion trends"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentView === 'dashboard'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Activity</span>
          </button>

          <button
            id="view-toggle-surveillance-btn"
            onClick={() => onViewChange('surveillance')}
            title="Zero-Trust Surveillance Gateway & Allowed Devices Console"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentView === 'surveillance'
                ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Surveillance</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            id="view-toggle-remote-btn"
            onClick={() => onViewChange('mobile_remote')}
            title="Android Phone Remote Control & Command Gateway"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentView === 'mobile_remote'
                ? 'bg-blue-600/25 text-blue-300 border border-blue-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Phone Remote</span>
            <span className="sm:hidden">Remote</span>
          </button>
        </div>

        {/* Thinking Engine Pill */}
        <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs font-medium">
          <Brain className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>High Thinking:</span>
          <span className="font-mono text-[11px] text-indigo-200">gemini-3.1-pro</span>
        </div>

        {/* Task Switcher Dropdown (when in pipeline view) */}
        {tasks.length > 0 && currentView === 'pipeline' && (
          <div className="relative">
            <select
              id="active-task-switcher"
              value={activeTaskId}
              onChange={(e) => onSelectTask(e.target.value)}
              className="bg-[#141924] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-hidden focus:border-emerald-500/60 max-w-[170px] sm:max-w-[210px] truncate"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#141924] text-slate-200">
                  [{t.mode.toUpperCase()}] {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Export All Tasks Button */}
        <button
          id="header-export-tasks-btn"
          onClick={() => onOpenImportExport('export')}
          title={`Export all ${tasks.length} tasks to JSON backup`}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141a26] hover:bg-[#1b2333] border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Export</span>
          <span className="text-[10px] text-slate-400 font-mono">({tasks.length})</span>
        </button>

        {/* Import Tasks Button */}
        <button
          id="header-import-tasks-btn"
          onClick={() => onOpenImportExport('import')}
          title="Import tasks from JSON file"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141a26] hover:bg-[#1b2333] border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Import</span>
        </button>

        {/* New Autonomous Task Button */}
        <button
          id="open-new-task-modal-btn"
          onClick={onOpenNewTask}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Prompt</span>
        </button>
      </div>
    </header>
  );
};
