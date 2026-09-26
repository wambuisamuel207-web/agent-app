import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Play, RotateCcw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { TerminalCommand, TerminalExecutionResult } from '../types';

interface TerminalSimulatorProps {
  commands: TerminalCommand[];
}

export const TerminalSimulator: React.FC<TerminalSimulatorProps> = ({ commands }) => {
  const [history, setHistory] = useState<TerminalExecutionResult[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [activeRunningCommand, setActiveRunningCommand] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, activeRunningCommand]);

  const executeCommand = async (cmd: string): Promise<TerminalExecutionResult> => {
    setActiveRunningCommand(cmd);
    try {
      const res = await fetch('/api/devagent/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      return data;
    } catch {
      return {
        command: cmd,
        status: 'failed',
        stdout: [],
        stderr: ['Execution error: Failed to communicate with sandbox runner process'],
        durationMs: 300,
        exitCode: 1,
      };
    } finally {
      setActiveRunningCommand(null);
    }
  };

  const handleRunSingle = async (cmd: string) => {
    const result = await executeCommand(cmd);
    setHistory((prev) => [...prev, result]);
  };

  const handleRunAll = async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);
    for (const cmdObj of commands) {
      const result = await executeCommand(cmdObj.command);
      setHistory((prev) => [...prev, result]);
      // Small pause between commands for realistic progression
      await new Promise((r) => setTimeout(r, 200));
    }
    setIsRunningAll(false);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const cmd = customInput.trim();
    setCustomInput('');
    if (cmd === 'clear') {
      setHistory([]);
      return;
    }
    const result = await executeCommand(cmd);
    setHistory((prev) => [...prev, result]);
  };

  const clearTerminal = () => {
    setHistory([]);
  };

  return (
    <div id="terminal-simulator-container" className="flex flex-col h-full bg-[#0a0d13] border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#121721] border-b border-slate-800 text-slate-300">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <span className="pl-2 font-medium text-slate-300 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            DevAgent Interactive Shell Sandbox
          </span>
          <span className="text-[10px] text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
            Isolated Sandbox
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            id="run-all-step4-commands-btn"
            onClick={handleRunAll}
            disabled={isRunningAll || commands.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-sans text-xs font-medium transition-all shadow-sm"
          >
            {isRunningAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run All ({commands.length})</span>
          </button>
          <button
            id="clear-terminal-btn"
            onClick={clearTerminal}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Clear terminal logs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Content Screen */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[280px]">
        {/* Welcome Banner */}
        <div className="text-slate-500 text-[11px] leading-relaxed pb-2 border-b border-slate-900">
          <div>DevAgent Execution Subsystem v2.4 (Ubuntu 24.04 LTS / x86_64)</div>
          <div>All commands execute within an automated container boundary. Type commands below or click &quot;Run&quot;.</div>
        </div>

        {/* Suggested Quick Commands */}
        {history.length === 0 && !activeRunningCommand && (
          <div className="py-2">
            <div className="text-slate-400 mb-2 font-sans font-medium text-xs">
              Step 4 Execution Commands:
            </div>
            <div className="space-y-1.5">
              {commands.map((cmd, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors gap-2"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-slate-500 font-mono text-[11px]">#{idx + 1}</span>
                    <code className="text-emerald-300 font-mono text-xs">{cmd.command}</code>
                    <span className="text-slate-400 font-sans text-[11px] hidden md:inline truncate">
                      — {cmd.description}
                    </span>
                  </div>
                  <button
                    id={`execute-command-btn-${idx}`}
                    onClick={() => handleRunSingle(cmd.command)}
                    className="self-end sm:self-auto flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors shrink-0"
                  >
                    <Play className="w-3 h-3 text-emerald-400 fill-current" />
                    <span>Run</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History stream */}
        {history.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="text-emerald-400 font-bold">$</span>
              <span className="font-semibold text-slate-100">{item.command}</span>
              <span className="text-slate-500 text-[10px] ml-auto">
                {item.durationMs}ms
              </span>
              {item.status === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>

            {item.stdout && item.stdout.length > 0 && (
              <div className="pl-4 text-slate-300 space-y-0.5 border-l border-slate-800">
                {item.stdout.map((line, lIdx) => (
                  <div
                    key={lIdx}
                    className={`whitespace-pre-wrap ${
                      line.includes('PASS') || line.includes('SUCCESS') || line.includes('OK')
                        ? 'text-emerald-400 font-medium'
                        : line.includes('WARN')
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}

            {item.stderr && item.stderr.length > 0 && (
              <div className="pl-4 text-rose-300 space-y-0.5 border-l border-rose-800/60">
                {item.stderr.map((line, lIdx) => (
                  <div key={lIdx} className="whitespace-pre-wrap">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Active running loader */}
        {activeRunningCommand && (
          <div className="flex items-center space-x-2 text-slate-400 animate-pulse">
            <span className="text-emerald-400 font-bold">$</span>
            <span>{activeRunningCommand}</span>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <form onSubmit={handleCustomSubmit} className="flex items-center px-4 py-2 bg-[#121721] border-t border-slate-800">
        <span className="text-emerald-400 font-bold pr-2">$</span>
        <input
          id="terminal-interactive-input"
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Type shell command (e.g. npm test, ls -la, clear)..."
          className="flex-1 bg-transparent text-slate-200 outline-none placeholder:text-slate-600 font-mono text-xs"
        />
        <button
          type="submit"
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
};
