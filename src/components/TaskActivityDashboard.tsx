import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  Activity,
  Server,
  Workflow,
  Wrench,
  ShieldAlert,
  Brain,
  Code2,
  Terminal,
  Calendar,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Layers,
  Clock,
} from 'lucide-react';
import { TaskSolution, AgentMode } from '../types';

interface TaskActivityDashboardProps {
  tasks: TaskSolution[];
  onSelectTask: (taskId: string) => void;
  onSwitchToPipeline: () => void;
  onOpenNewTaskModal: (mode?: AgentMode) => void;
}

const MODE_CONFIG: Record<
  AgentMode,
  { label: string; color: string; bgBadge: string; borderBadge: string; icon: React.ComponentType<{ className?: string }> }
> = {
  fullstack: {
    label: 'Full-Stack Systems',
    color: '#10b981', // Emerald 500
    bgBadge: 'bg-emerald-950/40 text-emerald-300',
    borderBadge: 'border-emerald-800/50',
    icon: Server,
  },
  automation: {
    label: 'Automation & Scripts',
    color: '#3b82f6', // Blue 500
    bgBadge: 'bg-blue-950/40 text-blue-300',
    borderBadge: 'border-blue-800/50',
    icon: Workflow,
  },
  devops: {
    label: 'DevOps & Infra',
    color: '#f59e0b', // Amber 500
    bgBadge: 'bg-amber-950/40 text-amber-300',
    borderBadge: 'border-amber-800/50',
    icon: Wrench,
  },
  debugger: {
    label: 'Bug Diagnosis',
    color: '#f43f5e', // Rose 500
    bgBadge: 'bg-rose-950/40 text-rose-300',
    borderBadge: 'border-rose-800/50',
    icon: ShieldAlert,
  },
};

export const TaskActivityDashboard: React.FC<TaskActivityDashboardProps> = ({
  tasks,
  onSelectTask,
  onSwitchToPipeline,
  onOpenNewTaskModal,
}) => {
  const [timeRange, setTimeRange] = useState<'all' | 'recent'>('all');

  // 1. High-level aggregates
  const stats = useMemo(() => {
    let totalFiles = 0;
    let totalCommands = 0;
    let thinkingTasks = 0;

    tasks.forEach((t) => {
      totalFiles += t.step3_implementation?.files?.length || 0;
      totalCommands += t.step4_execution?.commands?.length || 0;
      if (t.thinkingEnabled) thinkingTasks++;
    });

    const thinkingRatio = tasks.length > 0 ? Math.round((thinkingTasks / tasks.length) * 100) : 100;

    return {
      totalTasks: tasks.length,
      totalFiles,
      totalCommands,
      thinkingRatio,
    };
  }, [tasks]);

  // 2. Mode Distribution Data for Donut Chart
  const modeData = useMemo(() => {
    const counts: Record<AgentMode, number> = {
      fullstack: 0,
      automation: 0,
      devops: 0,
      debugger: 0,
    };

    tasks.forEach((t) => {
      if (counts[t.mode] !== undefined) {
        counts[t.mode]++;
      }
    });

    return (Object.keys(counts) as AgentMode[]).map((mode) => ({
      name: MODE_CONFIG[mode].label,
      rawMode: mode,
      value: counts[mode],
      percentage: tasks.length > 0 ? Math.round((counts[mode] / tasks.length) * 100) : 0,
      color: MODE_CONFIG[mode].color,
    }));
  }, [tasks]);

  // 3. Trends Over Time (Chronological accumulation)
  const timelineData = useMemo(() => {
    if (tasks.length === 0) return [];

    // Sort tasks chronologically
    const sorted = [...tasks].sort((a, b) => a.createdAt - b.createdAt);

    let cumulativeTasks = 0;
    let cumulativeFiles = 0;
    let cumulativeCommands = 0;

    return sorted.map((task, idx) => {
      cumulativeTasks += 1;
      cumulativeFiles += task.step3_implementation?.files?.length || 0;
      cumulativeCommands += task.step4_execution?.commands?.length || 0;

      const dateObj = new Date(task.createdAt);
      // Clean readable date label
      const dateLabel = dateObj.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });

      return {
        id: task.id,
        index: idx + 1,
        title: task.title,
        date: dateLabel,
        fullDate: dateObj.toLocaleString(),
        mode: task.mode,
        completedTasks: cumulativeTasks,
        modulesGenerated: cumulativeFiles,
        commandsBuilt: cumulativeCommands,
      };
    });
  }, [tasks]);

  // 4. Mode Complexity Comparison (Files vs Commands per Mode)
  const complexityByMode = useMemo(() => {
    const map: Record<AgentMode, { modules: number; commands: number; count: number }> = {
      fullstack: { modules: 0, commands: 0, count: 0 },
      automation: { modules: 0, commands: 0, count: 0 },
      devops: { modules: 0, commands: 0, count: 0 },
      debugger: { modules: 0, commands: 0, count: 0 },
    };

    tasks.forEach((t) => {
      map[t.mode].modules += t.step3_implementation?.files?.length || 0;
      map[t.mode].commands += t.step4_execution?.commands?.length || 0;
      map[t.mode].count += 1;
    });

    return (Object.keys(map) as AgentMode[]).map((mode) => ({
      mode: MODE_CONFIG[mode].label.split(' ')[0], // Short name for axis
      fullName: MODE_CONFIG[mode].label,
      rawMode: mode,
      color: MODE_CONFIG[mode].color,
      tasks: map[mode].count,
      totalModules: map[mode].modules,
      totalCommands: map[mode].commands,
      avgModules: map[mode].count > 0 ? Number((map[mode].modules / map[mode].count).toFixed(1)) : 0,
      avgCommands: map[mode].count > 0 ? Number((map[mode].commands / map[mode].count).toFixed(1)) : 0,
    }));
  }, [tasks]);

  // Custom Tooltip for dark mode aesthetics
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#10141e] border border-slate-700/80 rounded-lg p-3 text-xs shadow-xl space-y-1.5 min-w-[170px]">
          <p className="font-semibold text-slate-200 border-b border-slate-800 pb-1 font-mono">
            {label || payload[0]?.payload?.name || payload[0]?.name}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-item-${index}`} className="flex items-center justify-between space-x-3 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-xs"
                  style={{ backgroundColor: entry.color || entry.payload?.color || '#10b981' }}
                />
                <span className="text-slate-300">{entry.name}:</span>
              </div>
              <span className="font-mono font-bold text-slate-100">
                {entry.value}
                {entry.unit ? ` ${entry.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="task-activity-dashboard" className="h-full overflow-y-auto bg-[#090c10] text-slate-200 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Task Activity & Engineering Metrics
              </h2>
              <p className="text-xs text-slate-400">
                Live visualization of project modes, zero-placeholder code production, and execution trends
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onSwitchToPipeline}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141a26] hover:bg-[#1c2436] border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <span>Open Pipeline View</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          <button
            onClick={() => onOpenNewTaskModal('fullstack')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Autonomous Task</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0e131d] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Engineered Systems</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {stats.totalTasks}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
            <span className="text-emerald-400">100%</span> active local persistence
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0e131d] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Code Modules Built</span>
            <Code2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {stats.totalFiles}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Zero placeholders / full files
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0e131d] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>Terminal Commands</span>
            <Terminal className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {stats.totalCommands}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Automated execution steps
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0e131d] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span>High-Thinking Ratio</span>
            <Brain className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 tracking-tight">
            {stats.thinkingRatio}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono truncate">
            gemini-3.1-pro-preview
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Project Modes Breakdown (Donut Chart) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#0e131d] border border-slate-800 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Project Modes Breakdown</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {tasks.length} total tasks
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Distribution across Full-Stack, Automation, DevOps, and Bug Diagnosis
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {modeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0e131d" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Mode Legend with percentage pills */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 mt-2">
            {modeData.map((m) => {
              const config = MODE_CONFIG[m.rawMode];
              const Icon = config.icon;
              return (
                <div
                  key={m.rawMode}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#141924] border border-slate-800 text-xs"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-slate-300 font-medium truncate">{m.name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-400 shrink-0">
                    <span className="text-slate-200 font-bold">{m.value}</span>
                    <span className="text-slate-500">({m.percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Task Completion Trends Over Time (Area Chart) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-[#0e131d] border border-slate-800 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Task Completion Trends Over Time</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Cumulative Pipeline Output
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Growth trajectory of completed tasks, authored modules, and executable terminal commands
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradientModules" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="completedTasks"
                  name="Tasks Completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradientTasks)"
                />
                <Area
                  type="monotone"
                  dataKey="modulesGenerated"
                  name="Code Modules Built"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradientModules)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Timeline Summary Bar */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 mt-2">
            <span className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Span: {timelineData[0]?.date || 'Recent'} – {timelineData[timelineData.length - 1]?.date || 'Present'}</span>
            </span>
            <span className="font-mono text-emerald-400 font-medium">
              +{stats.totalFiles} code modules generated total
            </span>
          </div>
        </div>
      </div>

      {/* Chart 3: Mode Output Depth & Complexity Comparison */}
      <div className="p-5 rounded-xl bg-[#0e131d] border border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BarChart className="w-4 h-4 text-indigo-400" />
              Architectural Output Comparison by Project Mode
            </h3>
            <p className="text-xs text-slate-400">
              Total modules authored and terminal execution commands configured per domain
            </p>
          </div>
          <div className="text-[11px] font-mono text-slate-400 bg-[#141924] px-2.5 py-1 rounded border border-slate-800">
            Average: {(stats.totalFiles / (tasks.length || 1)).toFixed(1)} files / task
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={complexityByMode} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
              <XAxis
                dataKey="mode"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                iconType="rect"
              />
              <Bar
                dataKey="totalModules"
                name="Total Code Modules"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="totalCommands"
                name="Terminal Commands"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Task Execution Log & Quick Jump */}
      <div className="p-5 rounded-xl bg-[#0e131d] border border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Project History Log</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {tasks.length} recorded items
          </span>
        </div>

        <div className="space-y-2">
          {tasks.map((task) => {
            const config = MODE_CONFIG[task.mode];
            const Icon = config.icon;
            const dateStr = new Date(task.createdAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={task.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-[#141924] border border-slate-800/80 hover:border-slate-700 transition-colors gap-3"
              >
                <div className="flex items-center space-x-3 truncate">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${config.color}20`, color: config.color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {task.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${config.bgBadge} ${config.borderBadge} border`}>
                        {task.mode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-3 mt-0.5 font-mono">
                      <span>{task.step3_implementation.files.length} modules</span>
                      <span>•</span>
                      <span>{task.step4_execution.commands.length} execution commands</span>
                      <span>•</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectTask(task.id);
                    onSwitchToPipeline();
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium shrink-0 transition-colors"
                >
                  <span>Inspect Solution</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
