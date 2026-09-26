import { useState, useEffect } from 'react';
import { TaskSolution, AgentMode, GenerateTaskRequest } from './types';
import { PRESET_TASKS } from './presets';
import { Header } from './components/Header';
import { TaskSidebar } from './components/TaskSidebar';
import { TaskPipelineView } from './components/TaskPipelineView';
import { TaskActivityDashboard } from './components/TaskActivityDashboard';
import { SurveillancePanel } from './components/SurveillancePanel';
import { AndroidPhoneRemoteControl } from './components/AndroidPhoneRemoteControl';
import { TaskPromptModal } from './components/TaskPromptModal';
import { ImportExportModal } from './components/ImportExportModal';
import { exportAllTasksToJson, mergeTasks } from './utils/taskStorage';
import { Loader2, Sparkles, Brain, AlertCircle, Menu, X, CheckCircle2 } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'devagent_tasks_v1';

export default function App() {
  const [tasks, setTasks] = useState<TaskSolution[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((p: any) => p.id));
          const missingPresets = PRESET_TASKS.filter((preset) => !existingIds.has(preset.id));
          if (missingPresets.length > 0) {
            return [...parsed, ...missingPresets];
          }
          return parsed;
        }
      }
    } catch {
      // Fallback to presets
    }
    return PRESET_TASKS;
  });

  const [activeTaskId, setActiveTaskId] = useState<string>(() => {
    return tasks[0]?.id || PRESET_TASKS[0].id;
  });

  const [currentView, setCurrentView] = useState<'pipeline' | 'dashboard' | 'surveillance' | 'mobile_remote'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('view') === 'remote' || window.location.hash === '#remote') {
        return 'mobile_remote';
      }
    }
    return 'pipeline';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState<AgentMode>('fullstack');
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [importExportInitialTab, setImportExportInitialTab] = useState<'export' | 'import'>('export');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('DevAgent synthesizing architecture...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<AgentMode | 'all'>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn('Failed to save tasks to localStorage:', e);
    }
  }, [tasks]);

  const activeTask = tasks.find((t) => t.id === activeTaskId) || tasks[0] || PRESET_TASKS[0];

  const handleOpenModal = (mode: AgentMode = 'fullstack') => {
    setModalInitialMode(mode);
    setIsModalOpen(true);
    setErrorMessage(null);
  };

  const handleOpenImportExport = (tab: 'export' | 'import') => {
    setImportExportInitialTab(tab);
    setIsImportExportModalOpen(true);
  };

  const handleQuickExport = () => {
    try {
      exportAllTasksToJson(tasks);
      setSuccessNotification(`Exported ${tasks.length} tasks to JSON backup file.`);
      setTimeout(() => setSuccessNotification(null), 4000);
    } catch (e: any) {
      setErrorMessage(`Failed to export tasks: ${e.message}`);
    }
  };

  const handleImportTasks = (importedList: TaskSolution[], strategy: 'merge' | 'replace') => {
    const updated = mergeTasks(tasks, importedList, strategy);
    setTasks(updated);

    if (importedList.length > 0) {
      // Find the ID of the first imported task in the updated list
      setActiveTaskId(updated[0].id);
    }

    setSuccessNotification(
      `Successfully imported ${importedList.length} task${
        importedList.length > 1 ? 's' : ''
      }! Strategy: ${strategy === 'replace' ? 'Replaced task list' : 'Merged with existing tasks'}.`
    );
    setTimeout(() => setSuccessNotification(null), 4500);
  };

  const handleGenerateTask = async (request: GenerateTaskRequest) => {
    setIsLoading(true);
    setErrorMessage(null);

    // Staged status messages for High Thinking reassurance
    const statusSequence = [
      'DevAgent activating High Thinking engine (gemini-3.1-pro-preview)...',
      'Step 1: Architecting directory topology & boundary condition rules...',
      'Step 2: Resolving production dependency manifests & package scripts...',
      'Step 3: Writing 100% complete, fully implemented source code...',
      'Step 4: Compiling exact terminal testing & deployment commands...',
    ];

    let statusIndex = 0;
    const interval = setInterval(() => {
      statusIndex = (statusIndex + 1) % statusSequence.length;
      setLoadingStatus(statusSequence[statusIndex]);
    }, 2800);

    try {
      const response = await fetch('/api/devagent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const newTask: TaskSolution = await response.json();
      setTasks((prev) => [newTask, ...prev]);
      setActiveTaskId(newTask.id);
      setCurrentView('pipeline');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Task generation failed:', err);
      setErrorMessage(
        err.message || 'Failed to complete autonomous engineering run. Please verify your prompt and try again.'
      );
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  return (
    <div id="devagent-app-root" className="flex flex-col h-screen w-screen bg-[#090c10] text-slate-100 font-sans overflow-hidden">
      {/* Top Header */}
      <Header
        onOpenNewTask={() => handleOpenModal('fullstack')}
        tasks={tasks}
        activeTaskId={activeTaskId}
        onSelectTask={(id) => {
          setActiveTaskId(id);
          setIsMobileSidebarOpen(false);
        }}
        onOpenImportExport={handleOpenImportExport}
        onQuickExport={handleQuickExport}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Success Notification Bar */}
      {successNotification && (
        <div id="devagent-success-alert" className="px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-800 text-emerald-200 text-xs flex items-center justify-between transition-all">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotification}</span>
          </div>
          <button
            onClick={() => setSuccessNotification(null)}
            className="text-emerald-400 hover:text-emerald-100 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert Bar */}
      {errorMessage && (
        <div id="devagent-error-alert" className="px-6 py-2.5 bg-rose-950/70 border-b border-rose-800 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-100 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobile Drawer Toggle */}
      <div className="md:hidden px-4 py-2 bg-[#0e131d] border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="flex items-center space-x-2 text-xs text-slate-300 font-medium px-2 py-1 rounded bg-slate-800"
        >
          {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>{isMobileSidebarOpen ? 'Close Menu' : 'Browse Tasks & Domains'}</span>
        </button>
        <span className="text-[11px] text-slate-400 font-mono">
          [{activeTask.mode}] {activeTask.title.slice(0, 24)}...
        </span>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full">
          <TaskSidebar
            tasks={tasks}
            activeTaskId={activeTaskId}
            onSelectTask={setActiveTaskId}
            onNewTaskClick={handleOpenModal}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            onOpenImportExport={handleOpenImportExport}
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        </div>

        {/* Mobile Slide-over Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/70"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative z-50 w-80 max-w-[85vw] h-full bg-[#0e131d]">
              <TaskSidebar
                tasks={tasks}
                activeTaskId={activeTaskId}
                onSelectTask={(id) => {
                  setActiveTaskId(id);
                  setIsMobileSidebarOpen(false);
                }}
                onNewTaskClick={(m) => {
                  handleOpenModal(m);
                  setIsMobileSidebarOpen(false);
                }}
                selectedFilter={selectedFilter}
                onSelectFilter={setSelectedFilter}
                onOpenImportExport={handleOpenImportExport}
                currentView={currentView}
                onViewChange={(v) => {
                  setCurrentView(v);
                  setIsMobileSidebarOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Central Pipeline View OR Activity Dashboard OR Surveillance Console OR Android Remote */}
        <main className="flex-1 h-full overflow-hidden">
          {currentView === 'mobile_remote' ? (
            <AndroidPhoneRemoteControl
              onBackToCommandPost={() => setCurrentView('pipeline')}
            />
          ) : currentView === 'surveillance' ? (
            <SurveillancePanel
              onSwitchToPipelineWithTask={(taskId) => {
                setActiveTaskId(taskId);
                setCurrentView('pipeline');
              }}
              onOpenPhoneRemote={() => setCurrentView('mobile_remote')}
            />
          ) : currentView === 'dashboard' ? (
            <TaskActivityDashboard
              tasks={tasks}
              onSelectTask={(id) => {
                setActiveTaskId(id);
                setCurrentView('pipeline');
              }}
              onSwitchToPipeline={() => setCurrentView('pipeline')}
              onOpenNewTaskModal={handleOpenModal}
            />
          ) : activeTask ? (
            <TaskPipelineView
              task={activeTask}
              onOpenSurveillancePanel={() => setCurrentView('surveillance')}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
              <Sparkles className="w-12 h-12 text-emerald-400 mb-3" />
              <h3 className="text-lg font-bold text-slate-200">No Task Active</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Initiate a new prompt or select a preset task from the sidebar.
              </p>
              <button
                onClick={() => handleOpenModal('fullstack')}
                className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
              >
                Create New Solution
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Prompt / Requirements Generator Modal */}
      <TaskPromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleGenerateTask}
        isLoading={isLoading}
        initialMode={modalInitialMode}
      />

      {/* Import / Export JSON Portability Modal */}
      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        tasks={tasks}
        onImport={handleImportTasks}
        initialTab={importExportInitialTab}
      />

      {/* Global Full-Screen Autonomous Thinking Overlay */}
      {isLoading && (
        <div id="autonomous-thinking-overlay" className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-slate-100">
          <div className="flex flex-col items-center max-w-md w-full text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10">
                <Brain className="w-8 h-8 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-black">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">
                  DevAgent Autonomous Execution
                </h3>
              </div>
              <p className="text-xs text-indigo-300 font-mono">
                Model: gemini-3.1-pro-preview • ThinkingLevel.HIGH
              </p>
            </div>

            <div className="w-full bg-[#111624] border border-slate-800 rounded-lg p-3.5 text-xs font-mono text-slate-300 text-left">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold mb-1">
                <span>›</span>
                <span>Active Process:</span>
              </div>
              <div className="text-slate-200 animate-pulse">{loadingStatus}</div>
            </div>

            <p className="text-[11px] text-slate-500">
              Generating complete 4-step architectural blueprints, dependency manifests, and zero-placeholder code files.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
