import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileJson,
  X,
  Check,
  AlertCircle,
  Copy,
  Layers,
  Server,
  Workflow,
  Wrench,
  ShieldAlert,
  FileUp,
  FileDown,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { TaskSolution, AgentMode } from '../types';
import {
  exportAllTasksToJson,
  createExportBundle,
  validateAndParseTasksJson,
  mergeTasks,
} from '../utils/taskStorage';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskSolution[];
  onImport: (newTasks: TaskSolution[], strategy: 'merge' | 'replace') => void;
  initialTab?: 'export' | 'import';
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onImport,
  initialTab = 'export',
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [importInputMode, setImportInputMode] = useState<'file' | 'text'>('file');
  const [pastedJson, setPastedJson] = useState('');
  const [strategy, setStrategy] = useState<'merge' | 'replace'>('merge');
  const [dragActive, setDragActive] = useState(false);
  const [importedFileTasks, setImportedFileTasks] = useState<TaskSolution[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const exportBundle = createExportBundle(tasks);
  const jsonExportString = JSON.stringify(exportBundle, null, 2);

  // Group counts by mode
  const modeCounts = tasks.reduce(
    (acc, t) => {
      acc[t.mode] = (acc[t.mode] || 0) + 1;
      return acc;
    },
    {} as Record<AgentMode, number>
  );

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonExportString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    exportAllTasksToJson(tasks);
    setSuccessMessage('Backup JSON downloaded successfully');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const processJsonContent = (content: string, fileName?: string) => {
    setImportError(null);
    setSuccessMessage(null);
    const result = validateAndParseTasksJson(content);
    if (!result.valid) {
      setImportError(result.error || 'Failed to parse JSON file.');
      setImportedFileTasks(null);
      setImportFileName(null);
    } else {
      setImportedFileTasks(result.tasks);
      if (fileName) setImportFileName(fileName);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processJsonContent(content, file.name);
    };
    reader.onerror = () => {
      setImportError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        setImportError('Please drop a valid .json file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processJsonContent(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleApplyImport = () => {
    if (!importedFileTasks || importedFileTasks.length === 0) return;
    onImport(importedFileTasks, strategy);
    onClose();
  };

  const getModeBadge = (mode: AgentMode) => {
    switch (mode) {
      case 'fullstack':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
            <Server className="w-2.5 h-2.5" /> Full-Stack
          </span>
        );
      case 'automation':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
            <Workflow className="w-2.5 h-2.5" /> Automation
          </span>
        );
      case 'devops':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
            <Wrench className="w-2.5 h-2.5" /> DevOps
          </span>
        );
      case 'debugger':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono">
            <ShieldAlert className="w-2.5 h-2.5" /> Debugger
          </span>
        );
    }
  };

  return (
    <div
      id="import-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
    >
      <div
        id="import-export-modal"
        className="w-full max-w-2xl bg-[#0f131c] border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#141a26] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Data Portability & Task Storage
              </h2>
              <p className="text-xs text-slate-400">
                Export and import all engineered solutions in standard JSON format
              </p>
            </div>
          </div>
          <button
            id="close-import-export-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#0c1017] px-6">
          <button
            id="tab-export-btn"
            onClick={() => setActiveTab('export')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileDown className="w-4 h-4" />
            <span>Export All Tasks ({tasks.length})</span>
          </button>
          <button
            id="tab-import-btn"
            onClick={() => setActiveTab('import')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>Import Tasks from JSON</span>
          </button>
        </div>

        {/* Success / Info Message */}
        {successMessage && (
          <div className="px-6 py-2 bg-emerald-950/60 border-b border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'export' ? (
            /* =================== EXPORT TAB =================== */
            <div className="space-y-5">
              {/* Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg bg-[#141924] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Total Tasks
                  </div>
                  <div className="text-xl font-bold text-slate-100 mt-0.5">
                    {tasks.length}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#141924] border border-slate-800">
                  <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
                    Full-Stack
                  </div>
                  <div className="text-xl font-bold text-emerald-300 mt-0.5">
                    {modeCounts.fullstack || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#141924] border border-slate-800">
                  <div className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">
                    Automation
                  </div>
                  <div className="text-xl font-bold text-blue-300 mt-0.5">
                    {modeCounts.automation || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#141924] border border-slate-800">
                  <div className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">
                    DevOps / Debug
                  </div>
                  <div className="text-xl font-bold text-amber-300 mt-0.5">
                    {(modeCounts.devops || 0) + (modeCounts.debugger || 0)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="modal-download-json-btn"
                  onClick={handleDownload}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON File</span>
                </button>

                <button
                  id="modal-copy-json-btn"
                  onClick={handleCopyJson}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Raw JSON</span>
                    </>
                  )}
                </button>
              </div>

              {/* JSON Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[11px]">Bundle Preview: devagent-tasks-export.json</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {(jsonExportString.length / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#090c10] border border-slate-800 max-h-56 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre">
                  {jsonExportString.slice(0, 3500)}
                  {jsonExportString.length > 3500 && '\n\n... (truncated preview)'}
                </div>
              </div>
            </div>
          ) : (
            /* =================== IMPORT TAB =================== */
            <div className="space-y-5">
              {/* Input Mode Toggle (File Dropzone vs Text Paste) */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Import Source
                </span>
                <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-[#141924] border border-slate-800 text-xs">
                  <button
                    onClick={() => setImportInputMode('file')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      importInputMode === 'file'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    JSON File
                  </button>
                  <button
                    onClick={() => setImportInputMode('text')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      importInputMode === 'text'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Paste JSON Text
                  </button>
                </div>
              </div>

              {importInputMode === 'file' ? (
                /* Drag & Drop File Zone */
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragActive
                        ? 'border-emerald-500 bg-emerald-950/20'
                        : 'border-slate-700 hover:border-slate-600 bg-[#121722]/50 hover:bg-[#121722]'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-semibold text-slate-200">
                        {importFileName ? (
                          <span className="text-emerald-400">Selected: {importFileName}</span>
                        ) : (
                          <span>Click to browse or drag & drop a .json task export file</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Accepts DevAgent backup bundles or raw task JSON arrays
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Raw Textarea */
                <div>
                  <textarea
                    rows={6}
                    value={pastedJson}
                    onChange={(e) => {
                      setPastedJson(e.target.value);
                      if (e.target.value.trim()) {
                        processJsonContent(e.target.value, 'Pasted JSON');
                      } else {
                        setImportedFileTasks(null);
                        setImportError(null);
                      }
                    }}
                    placeholder="Paste valid JSON backup content here..."
                    className="w-full p-3 rounded-lg bg-[#090c10] border border-slate-800 text-slate-200 text-xs font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500/60 leading-relaxed"
                  />
                </div>
              )}

              {/* Error Banner */}
              {importError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Parsed Tasks Preview */}
              {importedFileTasks && importedFileTasks.length > 0 && (
                <div className="space-y-3 p-4 rounded-lg bg-[#141a26] border border-emerald-500/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{importedFileTasks.length} Valid Tasks Detected</span>
                    </div>
                    {importFileName && (
                      <span className="text-[11px] font-mono text-slate-400">
                        File: {importFileName}
                      </span>
                    )}
                  </div>

                  {/* List of imported task summaries */}
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {importedFileTasks.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-[#0b0e14] border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {getModeBadge(t.mode)}
                          <span className="truncate text-slate-200 font-medium">{t.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                          {t.step3_implementation.files.length} files
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Merge Strategy Options */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Import Strategy
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label
                        className={`flex items-start space-x-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          strategy === 'merge'
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-slate-200'
                            : 'bg-[#0f141f] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="import-strategy"
                          checked={strategy === 'merge'}
                          onChange={() => setStrategy('merge')}
                          className="mt-0.5 text-emerald-500 focus:ring-0"
                        />
                        <div>
                          <div className="font-semibold text-emerald-300">Merge & Append</div>
                          <div className="text-[10px] text-slate-400">
                            Keep existing {tasks.length} tasks and add imported tasks
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex items-start space-x-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          strategy === 'replace'
                            ? 'bg-amber-500/10 border-amber-500/50 text-slate-200'
                            : 'bg-[#0f141f] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="import-strategy"
                          checked={strategy === 'replace'}
                          onChange={() => setStrategy('replace')}
                          className="mt-0.5 text-amber-500 focus:ring-0"
                        />
                        <div>
                          <div className="font-semibold text-amber-300">Replace All</div>
                          <div className="text-[10px] text-slate-400">
                            Clear current list and load only imported tasks
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#141a26] border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            {activeTab === 'export' ? (
              <span>Format: Standard JSON • Schema v1.0.0</span>
            ) : importedFileTasks ? (
              <span>Ready to import {importedFileTasks.length} solutions</span>
            ) : (
              <span>Select or drop a JSON backup file</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            {activeTab === 'import' && (
              <button
                id="modal-confirm-import-btn"
                type="button"
                onClick={handleApplyImport}
                disabled={!importedFileTasks || importedFileTasks.length === 0}
                className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md"
              >
                <Upload className="w-4 h-4" />
                <span>
                  Confirm Import ({importedFileTasks ? importedFileTasks.length : 0} Tasks)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
