import { TaskSolution, TaskExportBundle } from '../types';

/**
 * Generates an export bundle object with metadata and tasks.
 */
export function createExportBundle(tasks: TaskSolution[]): TaskExportBundle {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    source: 'DevAgent Autonomous Engineering Platform',
    taskCount: tasks.length,
    tasks,
  };
}

/**
 * Downloads all tasks as a formatted JSON file.
 */
export function exportAllTasksToJson(tasks: TaskSolution[], filename?: string): void {
  const bundle = createExportBundle(tasks);
  const jsonString = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = filename || `devagent-tasks-export-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and normalizes parsed data into valid TaskSolution objects.
 */
export function validateAndParseTasksJson(jsonString: string): {
  valid: boolean;
  tasks: TaskSolution[];
  error?: string;
  sourceVersion?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);

    let rawList: any[] = [];
    let sourceVersion: string | undefined;

    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.tasks)) {
        rawList = parsed.tasks;
        sourceVersion = parsed.version;
      } else if (parsed.id && parsed.title && parsed.step1_architecture) {
        // Single TaskSolution exported directly
        rawList = [parsed];
      } else {
        return {
          valid: false,
          tasks: [],
          error: 'Invalid format: JSON does not contain a "tasks" array or task collection.',
        };
      }
    } else {
      return {
        valid: false,
        tasks: [],
        error: 'Provided file is not a valid JSON object or array.',
      };
    }

    if (rawList.length === 0) {
      return {
        valid: false,
        tasks: [],
        error: 'JSON contains an empty list of tasks.',
      };
    }

    // Validate each task structure
    const validTasks: TaskSolution[] = [];
    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      if (!item || typeof item !== 'object') continue;

      // Check required minimum fields
      const id = typeof item.id === 'string' && item.id.trim() ? item.id : `imported-${Date.now()}-${i}`;
      const title = typeof item.title === 'string' && item.title.trim() ? item.title : `Imported Task #${i + 1}`;
      const mode = ['fullstack', 'automation', 'devops', 'debugger'].includes(item.mode)
        ? item.mode
        : 'fullstack';

      const task: TaskSolution = {
        id,
        title,
        mode,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        prompt: typeof item.prompt === 'string' ? item.prompt : title,
        modelUsed: typeof item.modelUsed === 'string' ? item.modelUsed : 'gemini-3.1-pro-preview',
        thinkingEnabled: Boolean(item.thinkingEnabled),
        thinkingProcess: item.thinkingProcess || undefined,
        step1_architecture: {
          overview: item.step1_architecture?.overview || 'Imported architecture specification.',
          folderStructure: item.step1_architecture?.folderStructure || './\n└── src/',
          designDecisions: Array.isArray(item.step1_architecture?.designDecisions)
            ? item.step1_architecture.designDecisions
            : ['Imported design decisions'],
        },
        step2_dependencies: {
          packageManager: item.step2_dependencies?.packageManager || 'npm',
          files: Array.isArray(item.step2_dependencies?.files) ? item.step2_dependencies.files : [],
        },
        step3_implementation: {
          files: Array.isArray(item.step3_implementation?.files) ? item.step3_implementation.files : [],
        },
        step4_execution: {
          prerequisites: Array.isArray(item.step4_execution?.prerequisites)
            ? item.step4_execution.prerequisites
            : [],
          commands: Array.isArray(item.step4_execution?.commands)
            ? item.step4_execution.commands
            : [],
        },
        diagnostics: item.diagnostics || undefined,
      };

      validTasks.push(task);
    }

    if (validTasks.length === 0) {
      return {
        valid: false,
        tasks: [],
        error: 'None of the items in the file matched the Task schema.',
      };
    }

    return {
      valid: true,
      tasks: validTasks,
      sourceVersion,
    };
  } catch (err: any) {
    return {
      valid: false,
      tasks: [],
      error: `Failed to parse JSON file: ${err.message || 'Syntax error'}`,
    };
  }
}

/**
 * Merges imported tasks with existing tasks according to strategy.
 */
export function mergeTasks(
  existingTasks: TaskSolution[],
  importedTasks: TaskSolution[],
  strategy: 'merge' | 'replace'
): TaskSolution[] {
  if (strategy === 'replace') {
    return [...importedTasks];
  }

  // Merge strategy:
  // Add new tasks to the beginning, avoid duplicate IDs by regenerating new IDs for duplicates
  const existingIds = new Set(existingTasks.map((t) => t.id));
  const sanitizedImported = importedTasks.map((t) => {
    if (existingIds.has(t.id)) {
      // Assign unique ID to avoid collision
      return {
        ...t,
        id: `${t.id}-imported-${Date.now().toString(36)}`,
      };
    }
    return t;
  });

  return [...sanitizedImported, ...existingTasks];
}
