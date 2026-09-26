export type AgentMode = 'fullstack' | 'automation' | 'devops' | 'debugger';

export interface CodeFile {
  filename: string;
  language: string;
  description?: string;
  content: string;
}

export interface TerminalCommand {
  command: string;
  description: string;
  expectedOutput?: string;
}

export interface BugDiagnostic {
  rootCause: string;
  offendingFile?: string;
  offendingSnippet?: string;
  fixedSnippet?: string;
  explanation: string;
}

export interface TaskSolution {
  id: string;
  title: string;
  mode: AgentMode;
  createdAt: number;
  prompt: string;
  modelUsed: string;
  thinkingEnabled: boolean;
  thinkingProcess?: string;
  step1_architecture: {
    overview: string;
    folderStructure: string;
    designDecisions: string[];
  };
  step2_dependencies: {
    packageManager: string;
    files: CodeFile[];
  };
  step3_implementation: {
    files: CodeFile[];
  };
  step4_execution: {
    prerequisites?: string[];
    commands: TerminalCommand[];
  };
  diagnostics?: BugDiagnostic;
}

export interface GenerateTaskRequest {
  prompt: string;
  mode: AgentMode;
  thinkingEnabled?: boolean;
  stackTrace?: string;
  targetEnvironment?: string;
}

export interface TerminalExecutionResult {
  command: string;
  status: 'running' | 'success' | 'failed';
  stdout: string[];
  stderr?: string[];
  durationMs: number;
  exitCode: number;
}

export interface TaskExportBundle {
  version: string;
  exportedAt: string;
  source: string;
  taskCount: number;
  tasks: TaskSolution[];
}
