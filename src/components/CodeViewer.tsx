import React, { useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';

interface CodeViewerProps {
  filename: string;
  language: string;
  content: string;
  description?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  filename,
  language,
  content,
  description,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split('\n');

  return (
    <div id={`code-viewer-${filename.replace(/[^a-zA-Z0-9]/g, '-')}`} className="flex flex-col h-full bg-[#0d1117] rounded-lg border border-slate-800 overflow-hidden text-sm">
      {/* File Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-slate-800 text-slate-300">
        <div className="flex items-center space-x-2 truncate">
          <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-mono text-xs font-semibold text-slate-200 truncate">{filename}</span>
          <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
            {language}
          </span>
          {description && (
            <span className="hidden md:inline text-xs text-slate-400 truncate max-w-md pl-2 border-l border-slate-700">
              {description}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            {lines.length} lines
          </span>
          <button
            id={`copy-file-btn-${filename.replace(/[^a-zA-Z0-9]/g, '-')}`}
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            title="Copy file contents"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content with Line Numbers */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed select-text">
        <div className="flex">
          <div className="select-none pr-4 text-right text-slate-600 font-mono text-xs min-w-[2.5rem] border-r border-slate-800/80">
            {lines.map((_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>
          <pre className="pl-4 text-slate-200 overflow-x-auto whitespace-pre font-mono leading-6 flex-1">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
