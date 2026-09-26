import React, { useState, useMemo } from 'react';
import {
  Server,
  Workflow,
  Wrench,
  ShieldAlert,
  Brain,
  Layers,
  Sparkles,
  ChevronRight,
  Terminal,
  Clock,
  Download,
  Upload,
  Search,
  X,
  BarChart3,
  Camera,
  Smartphone,
} from 'lucide-react';
import { TaskSolution, AgentMode } from '../types';

interface TaskSidebarProps {
  tasks: TaskSolution[];
  activeTaskId: string;
  onSelectTask: (taskId: string) => void;
  onNewTaskClick: (mode?: AgentMode) => void;
  selectedFilter: AgentMode | 'all';
  onSelectFilter: (filter: AgentMode | 'all') => void;
  onOpenImportExport?: (tab: 'export' | 'import') => void;
  currentView?: 'pipeline' | 'dashboard' | 'surveillance' | 'mobile_remote';
  onViewChange?: (view: 'pipeline' | 'dashboard' | 'surveillance' | 'mobile_remote') => void;
}

export const TaskSidebar: React.FC<TaskSidebarProps> = ({
  tasks,
  activeTaskId,
  onSelectTask,
  onNewTaskClick,
  selectedFilter,
  onSelectFilter,
  onOpenImportExport,
  currentView,
  onViewChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((t) => {
      // Competency filter check
      if (selectedFilter !== 'all' && t.mode !== selectedFilter) {
        return false;
      }

      // If no search query, match domain filter
      if (!query) {
        return true;
      }

      // Match title & prompt
      if (t.title?.toLowerCase().includes(query)) return true;
      if (t.prompt?.toLowerCase().includes(query)) return true;

      // Match step 1 architecture
      if (t.step1_architecture?.overview?.toLowerCase().includes(query)) return true;
      if (t.step1_architecture?.designDecisions?.some((d) => d.toLowerCase().includes(query))) return true;

      // Match step 2 dependencies
      if (
        t.step2_dependencies?.files?.some(
          (f) => f.filename.toLowerCase().includes(query) || f.content.toLowerCase().includes(query)
        )
      ) {
        return true;
      }

      // Match step 3 implementation files & content
      if (
        t.step3_implementation?.files?.some(
          (f) =>
            f.filename.toLowerCase().includes(query) ||
            (f.description && f.description.toLowerCase().includes(query)) ||
            f.content.toLowerCase().includes(query)
        )
      ) {
        return true;
      }

      // Match step 4 execution commands
      if (
        t.step4_execution?.commands?.some(
          (c) => c.command.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)
        )
      ) {
        return true;
      }

      // Match diagnostics if bug diagnosis task
      if (
        t.diagnostics &&
        (t.diagnostics.rootCause?.toLowerCase().includes(query) ||
          t.diagnostics.explanation?.toLowerCase().includes(query) ||
          t.diagnostics.offendingFile?.toLowerCase().includes(query))
      ) {
        return true;
      }

      return false;
    });
  }, [tasks, selectedFilter, searchQuery]);

  const getModeIcon = (mode: AgentMode) => {
    switch (mode) {
      case 'fullstack':
        return <Server className="w-3.5 h-3.5 text-emerald-400" />;
      case 'automation':
        return <Workflow className="w-3.5 h-3.5 text-blue-400" />;
      case 'devops':
        return <Wrench className="w-3.5 h-3.5 text-amber-400" />;
      case 'debugger':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  return (
    <aside className="w-full md:w-80 bg-[#0e131d] border-r border-slate-800 flex flex-col h-full text-slate-200">
      {/* Search Bar at the Top */}
      <div className="p-3 border-b border-slate-800 bg-[#0c1017]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            id="task-sidebar-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, code, commands..."
            aria-label="Search tasks"
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#141924] border border-slate-700/80 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-hidden focus:border-emerald-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              id="clear-task-search-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
              className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between mt-1.5 px-0.5 text-[10px] text-slate-400">
            <span>
              Matches for &ldquo;<span className="text-emerald-400">{searchQuery}</span>&rdquo;
            </span>
            <span className="font-mono text-slate-500">
              {filteredTasks.length} of {tasks.length}
            </span>
          </div>
        )}
      </div>

      {/* Quick Navigation: Dashboard & Surveillance */}
      {onViewChange && (
        <div className="p-2.5 border-b border-slate-800 bg-[#0b0f16] space-y-1.5">
          <button
            id="sidebar-toggle-surveillance-btn"
            onClick={() => onViewChange(currentView === 'surveillance' ? 'pipeline' : 'surveillance')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
              currentView === 'surveillance'
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-[#141924] text-slate-300 hover:text-white hover:bg-[#182030] border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentView === 'surveillance' ? 'Back to Pipeline' : 'Surveillance Console'}</span>
            </div>
            <span className="flex items-center space-x-1 text-[10px] font-mono uppercase tracking-wider text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live</span>
            </span>
          </button>

          <button
            id="sidebar-toggle-dashboard-btn"
            onClick={() => onViewChange(currentView === 'dashboard' ? 'pipeline' : 'dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
              currentView === 'dashboard'
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-xs'
                : 'bg-[#141924] text-slate-300 hover:text-white hover:bg-[#182030] border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentView === 'dashboard' ? 'Back to Pipeline' : 'Activity Dashboard'}</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80">
              {currentView === 'dashboard' ? 'Active' : 'Metrics'}
            </span>
          </button>

          <button
            id="sidebar-toggle-remote-btn"
            onClick={() => onViewChange(currentView === 'mobile_remote' ? 'pipeline' : 'mobile_remote')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
              currentView === 'mobile_remote'
                ? 'bg-blue-600/25 text-blue-300 border-blue-500/40 shadow-xs'
                : 'bg-[#141924] text-slate-300 hover:text-white hover:bg-[#182030] border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentView === 'mobile_remote' ? 'Back to Pipeline' : 'Android Remote'}</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/60">
              Handheld
            </span>
          </button>
        </div>
      )}

      {/* Competency Filter Chips */}
      <div className="p-4 border-b border-slate-800 space-y-2">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Competency Domains
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            onClick={() => onSelectFilter('all')}
            className={`px-2.5 py-1.5 rounded text-left transition-colors font-medium flex items-center justify-between ${
              selectedFilter === 'all'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <span>All Domains</span>
            <span className="text-[10px] text-slate-500 font-mono">{tasks.length}</span>
          </button>

          <button
            onClick={() => onSelectFilter('fullstack')}
            className={`px-2.5 py-1.5 rounded text-left transition-colors font-medium flex items-center space-x-1.5 ${
              selectedFilter === 'fullstack'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">Full-Stack</span>
          </button>

          <button
            onClick={() => onSelectFilter('automation')}
            className={`px-2.5 py-1.5 rounded text-left transition-colors font-medium flex items-center space-x-1.5 ${
              selectedFilter === 'automation'
                ? 'bg-blue-950/40 text-blue-300 border border-blue-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Workflow className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="truncate">Automation</span>
          </button>

          <button
            onClick={() => onSelectFilter('devops')}
            className={`px-2.5 py-1.5 rounded text-left transition-colors font-medium flex items-center space-x-1.5 ${
              selectedFilter === 'devops'
                ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">DevOps</span>
          </button>

          <button
            onClick={() => onSelectFilter('debugger')}
            className={`col-span-2 px-2.5 py-1.5 rounded text-left transition-colors font-medium flex items-center space-x-1.5 ${
              selectedFilter === 'debugger'
                ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
            <span className="truncate">Bug Diagnosis & Root Cause</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <div className="flex items-center space-x-1.5">
            <span>Engineered Systems</span>
            <span className="text-[10px] text-slate-500 font-mono">({filteredTasks.length})</span>
          </div>

          {/* Quick Export & Import Icons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onOpenImportExport?.('export')}
              title="Export all tasks as JSON"
              className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onOpenImportExport?.('import')}
              title="Import tasks from JSON"
              className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-8 px-4 text-center text-slate-400 space-y-2">
            <Search className="w-6 h-6 mx-auto text-slate-600 mb-1" />
            <div className="text-xs font-semibold text-slate-300">No matching solutions</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {searchQuery
                ? `No tasks match "${searchQuery}" in ${selectedFilter === 'all' ? 'any domain' : selectedFilter}.`
                : 'No tasks found for this domain.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="inline-block mt-1 text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium"
              >
                Clear search filter
              </button>
            )}
          </div>
        ) : (
          filteredTasks.map((t) => {
            const isActive = t.id === activeTaskId;
            return (
              <button
                key={t.id}
                id={`task-sidebar-item-${t.id}`}
                onClick={() => onSelectTask(t.id)}
                className={`w-full p-3 rounded-lg text-left transition-all border ${
                  isActive
                    ? 'bg-[#151c28] border-emerald-500/40 text-slate-100 shadow-sm'
                    : 'bg-[#111622]/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-[#141a26]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center space-x-1.5 truncate">
                    {getModeIcon(t.mode)}
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-400">
                      {t.mode}
                    </span>
                  </div>
                  {t.thinkingEnabled && (
                    <span title="High Thinking Enabled">
                      <Brain className="w-3 h-3 text-indigo-400" />
                    </span>
                  )}
                </div>

                <div className="text-xs font-semibold line-clamp-2 leading-snug">
                  {t.title}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                  <span>{t.step3_implementation.files.length} modules</span>
                  <span>{t.step4_execution.commands.length} commands</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Engine Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-[#0c1018] space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px]">Reasoning Engine:</span>
          <span className="text-indigo-300 font-mono text-[11px] font-medium">Gemini 3.1 Pro</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px]">Thinking Level:</span>
          <span className="text-emerald-400 font-mono text-[11px] font-semibold">HIGH</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px]">Production Standard:</span>
          <span className="text-slate-300 font-mono text-[11px]">No Placeholders</span>
        </div>

        <button
          onClick={() => onOpenImportExport?.('export')}
          className="w-full mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-center space-x-1.5 py-1.5 rounded bg-[#131926] hover:bg-[#182030] text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700/60 transition-colors"
        >
          <Download className="w-3 h-3 text-emerald-400" />
          <span>JSON Backup & Portability</span>
        </button>
      </div>
    </aside>
  );
};
