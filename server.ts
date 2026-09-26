import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/devagent/health", (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    hasApiKey: hasKey,
    supportedModels: ["gemini-3.1-pro-preview", "gemini-3.8-flash"],
    highThinkingSupported: true,
  });
});

// DevAgent Generation Endpoint
app.post("/api/devagent/generate", async (req, res) => {
  try {
    const { prompt, mode = "fullstack", thinkingEnabled = true, stackTrace } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "A valid prompt or requirement is required." });
      return;
    }

    const ai = getGeminiClient();

    // Model selection based on requirements:
    // Complex queries & high thinking mandate: gemini-3.1-pro-preview with thinkingLevel: HIGH, no maxOutputTokens
    const model = thinkingEnabled ? "gemini-3.1-pro-preview" : "gemini-3.8-flash";

    const systemInstruction = `You are "DevAgent", an elite Autonomous Software Engineer and Automation Specialist.
Your purpose is to write production-grade code, build automated workflows, execute terminal scripts, debug errors, and generate fully functional software systems with minimal human intervention.

CORE COMPETENCIES:
1. Full-Stack Web & Mobile Development: React, Next.js, Node.js, Python, TypeScript, REST/GraphQL APIs, Databases.
2. Automation & Scripting: Web scraping (Playwright/Selenium), API integrations, webhooks, task scheduling, bash/powershell scripting.
3. DevOps & Deployment: Docker, CI/CD pipelines, Cloudflare Workers/Pages, Serverless functions, environment configuration.
4. Bug Diagnosis & Refactoring: Root-cause analysis from stack traces, automated unit testing, security hardening, performance optimization.

OPERATIONAL EXECUTION RULES:
1. Production-Grade Standards: Write clean, self-documented, type-safe code. Always include error handling, input validation, and boundary conditions.
2. Complete File Deliverables: NEVER output placeholders like '// TODO: implement later' or '// rest of code here'. Provide 100% complete, runnable, fully implemented files.
3. Environment Safety: Never expose or hardcode private keys, passwords, or API secrets. Always read credentials from environment variables (.env).
4. Step-by-Step Architecture:
   - Step 1: Analyze requirements and plan file/folder structure.
   - Step 2: Define dependencies (package.json, requirements.txt, Dockerfile, etc.).
   - Step 3: Implement core modules and logic with full source code.
   - Step 4: Provide exact terminal execution commands for testing and deployment.
5. In bug diagnosis mode (or when a stack trace is supplied): Identify the exact root cause, explain the failure mechanism, provide the offending snippet vs the fixed snippet, and write verified test commands.

Always return strict JSON conforming to the requested schema.`;

    const userPromptContent = `
Task Mode: ${mode}
High Thinking Enabled: ${thinkingEnabled}
User Specification / Problem Statement:
${prompt}
${stackTrace ? `\n\n[ATTACHED STACK TRACE / RUNTIME ERROR LOGS]:\n${stackTrace}` : ""}

Please execute the complete DevAgent 4-Step Protocol:
Step 1: Architecture & Directory Layout Analysis
Step 2: Complete Dependency Manifests
Step 3: 100% Fully Implemented Core Code Files (NO placeholders, full implementation)
Step 4: Copyable Terminal Setup, Test & Deployment Commands
${mode === "debugger" || stackTrace ? "Include comprehensive Root-Cause Bug Diagnosis and precise fix diff." : ""}
`;

    // Configure thinking
    const config: any = {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Concise technical title of the software system or task",
          },
          thinkingProcess: {
            type: Type.STRING,
            description: "DevAgent high-level architectural rationale, technical trade-offs, and verification approach",
          },
          step1_architecture: {
            type: Type.OBJECT,
            properties: {
              overview: { type: Type.STRING, description: "Detailed architectural breakdown and component interaction description" },
              folderStructure: { type: Type.STRING, description: "ASCII tree of complete directory structure" },
              designDecisions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key architectural and engineering design choices",
              },
            },
            required: ["overview", "folderStructure", "designDecisions"],
          },
          step2_dependencies: {
            type: Type.OBJECT,
            properties: {
              packageManager: { type: Type.STRING, description: "e.g., npm, yarn, pnpm, pip, poetry, docker" },
              files: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    filename: { type: Type.STRING, description: "e.g., package.json, requirements.txt, pyproject.toml, Dockerfile" },
                    language: { type: Type.STRING, description: "e.g., json, dockerfile, toml, text" },
                    content: { type: Type.STRING, description: "Complete file contents" },
                  },
                  required: ["filename", "language", "content"],
                },
              },
            },
            required: ["packageManager", "files"],
          },
          step3_implementation: {
            type: Type.OBJECT,
            properties: {
              files: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    filename: { type: Type.STRING, description: "Relative path e.g. src/index.ts, src/controllers/auth.ts" },
                    language: { type: Type.STRING, description: "e.g. typescript, python, javascript, sql, yaml" },
                    description: { type: Type.STRING, description: "Role of this module in the system" },
                    content: { type: Type.STRING, description: "100% complete runnable code without placeholders" },
                  },
                  required: ["filename", "language", "description", "content"],
                },
              },
            },
            required: ["files"],
          },
          step4_execution: {
            type: Type.OBJECT,
            properties: {
              prerequisites: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "System dependencies or env requirements",
              },
              commands: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    command: { type: Type.STRING, description: "Exact bash command to execute" },
                    description: { type: Type.STRING, description: "What this command does (e.g., install dependencies, run linter, execute tests)" },
                    expectedOutput: { type: Type.STRING, description: "Sample expected stdout or success indicator" },
                  },
                  required: ["command", "description"],
                },
              },
            },
            required: ["commands"],
          },
          diagnostics: {
            type: Type.OBJECT,
            properties: {
              rootCause: { type: Type.STRING, description: "Root cause diagnosis of the issue" },
              offendingFile: { type: Type.STRING, description: "Filename where bug originated" },
              offendingSnippet: { type: Type.STRING, description: "Original broken code segment" },
              fixedSnippet: { type: Type.STRING, description: "Repaired code segment" },
              explanation: { type: Type.STRING, description: "Detailed explanation of why the bug occurred and how the fix resolves it" },
            },
          },
        },
        required: [
          "title",
          "thinkingProcess",
          "step1_architecture",
          "step2_dependencies",
          "step3_implementation",
          "step4_execution",
        ],
      },
    };

    if (thinkingEnabled) {
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH,
      };
      // Note: do not set maxOutputTokens per instructions
    }

    const response = await ai.models.generateContent({
      model,
      contents: userPromptContent,
      config,
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Model returned empty text response");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText.trim());
    } catch (parseErr) {
      // Fallback: extract JSON from markdown if needed
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Unable to parse model response into JSON format");
      }
    }

    res.json({
      id: "task_" + Date.now(),
      mode,
      modelUsed: model,
      thinkingEnabled,
      createdAt: Date.now(),
      prompt,
      ...parsedResult,
    });
  } catch (err: any) {
    console.error("DevAgent generation error:", err);
    res.status(500).json({
      error: err.message || "Failed to generate solution with DevAgent",
      details: err.stack,
    });
  }
});

// Simulated Terminal Command Runner Endpoint
app.post("/api/devagent/run-command", (req, res) => {
  const { command } = req.body;
  if (!command) {
    res.status(400).json({ error: "Command is required" });
    return;
  }

  const trimmed = command.trim();
  let durationMs = Math.floor(Math.random() * 400) + 150;
  let stdout: string[] = [];
  let stderr: string[] = [];
  let exitCode = 0;

  if (trimmed.startsWith("npm install") || trimmed.startsWith("pnpm install") || trimmed.startsWith("yarn")) {
    durationMs = 1200;
    stdout = [
      "added 142 packages, and audited 143 packages in 1.18s",
      "found 0 vulnerabilities",
      "verified engine requirements: node >= 20.0.0",
    ];
  } else if (trimmed.startsWith("npm test") || trimmed.includes("jest") || trimmed.includes("vitest") || trimmed.includes("pytest")) {
    durationMs = 1500;
    stdout = [
      "PASS src/__tests__/auth.test.ts",
      "  ✓ should securely issue JWT with signed claim (34 ms)",
      "  ✓ should reject tampered authorization headers with 401 (18 ms)",
      "  ✓ should enforce rate limit bucket on burst requests (42 ms)",
      "PASS src/__tests__/workflow.test.ts",
      "  ✓ should handle webhook idempotency key collisions gracefully (29 ms)",
      "",
      "Test Suites: 2 passed, 2 total",
      "Tests:       4 passed, 4 total",
      "Snapshots:   0 total",
      "Time:        1.42 s",
      "Ran all test suites.",
    ];
  } else if (trimmed.startsWith("docker build") || trimmed.includes("docker-compose")) {
    durationMs = 2100;
    stdout = [
      "[+] Building 2.1s (12/12) FINISHED",
      " => [internal] load build definition from Dockerfile",
      " => [stage-0 1/4] FROM node:20-alpine AS base",
      " => [stage-0 2/4] WORKDIR /app",
      " => [stage-0 3/4] COPY package*.json ./",
      " => [stage-0 4/4] RUN npm ci --omit=dev",
      " => exporting to image",
      " => naming to docker.io/library/devagent-service:latest",
      "Successfully tagged devagent-service:latest",
    ];
  } else if (trimmed.startsWith("python") || trimmed.startsWith("node")) {
    durationMs = 600;
    stdout = [
      "[DevAgent Runner] Execution initialized in isolated sandbox environment",
      "[INFO] Config loaded from .env.local",
      "[INFO] Connection pool established (max_connections=20)",
      "[READY] Server listening on http://0.0.0.0:8080 (PID 4821)",
      "[HEALTHCHECK] Probe succeeded: 200 OK (latency: 1.2ms)",
    ];
  } else if (trimmed.startsWith("git ") || trimmed.startsWith("curl") || trimmed.startsWith("export")) {
    durationMs = 300;
    stdout = [`Executed: ${trimmed}`, "Command finished with exit code 0."];
  } else if (trimmed === "facility-lockdown" || trimmed.includes("lockdown")) {
    durationMs = 800;
    stdout = [
      "[ALERT] 🚨 INITIATING FACILITY-WIDE ZERO-TRUST LOCKDOWN",
      "[AUTH] Command authenticated from Android Remote Control Unit",
      "[STEP 1/4] Severing external egress ports (8080, 554 RTSP, 8000 WebRTC)",
      "[STEP 2/4] Isolating VLAN 30 (Surveillance Grid) to WireGuard mesh only",
      "[STEP 3/4] Activating physical perimeter electronic maglocks (ZONES A-F: ENGAGED)",
      "[STEP 4/4] Sirens & visual strobe alarms armed on sectors 1-4",
      "[STATUS] LOCKDOWN CONFIRMED. All unauthenticated peer sessions dropped.",
    ];
  } else if (trimmed === "cctv-health-check" || trimmed.includes("cctv-health")) {
    durationMs = 950;
    stdout = [
      "[DIAG] Probing all connected CCTV streams across local & mesh subnets...",
      " CAM-DEVICE (Operator Device Cam): 1080p @ 30fps | Latency: 4ms | Packet Drop: 0.0%",
      " WIFI-CAM-01 (Gate 1 High-Res 4K): 3840x2160 @ 30fps | 9.8 Mbps | RTSP OK",
      " WIFI-CAM-02 (Server Room IR Dome): 1920x1080 @ 60fps | 4.2 Mbps | RTSP OK",
      " CAM-02 (Vault Access Control): 1920x1080 @ 30fps | 4.1 Mbps | WebRTC OK",
      " CAM-03 (Loading Bay North Perimeter): 1920x1080 @ 30fps | 3.9 Mbps | HLS OK",
      "[SUMMARY] 5/5 Video sensors healthy. Overall grid throughput: 28.6 Mbps.",
    ];
  } else if (trimmed === "audit-mesh" || trimmed.includes("audit-mesh") || trimmed.startsWith("wg show")) {
    durationMs = 600;
    stdout = [
      "interface: wg-secops0 (public key: 9yKz+...V4xQ=, listen port: 51820)",
      "peer: secops-workstation-01 (10.13.13.2/32)",
      "  endpoint: 198.51.100.22:51820",
      "  latest handshake: 14 seconds ago",
      "  transfer: 4.81 MiB received, 18.29 MiB sent",
      "peer: android-operator-phone (10.13.13.5/32)",
      "  endpoint: dynamic (mobile LTE/Wi-Fi roaming)",
      "  latest handshake: 2 seconds ago",
      "  transfer: 1.12 MiB received, 8.44 MiB sent",
      "  mTLS certificate: CN=android-remote-control, serial: 0x9AF24B",
      "[AUDIT] Zero untrusted routes detected. AllowedIPs strictly enforced.",
    ];
  } else if (trimmed === "snapshot-all" || trimmed.includes("snapshot")) {
    durationMs = 700;
    stdout = [
      "[MEDIA] Triggering synchronized frame capture across all authorized cameras...",
      "  CAM-DEVICE: Snapshot frame captured -> /var/secops/snapshots/cam-device-snap.jpg",
      "  WIFI-CAM-01: Snapshot frame captured -> /var/secops/snapshots/wifi-01-snap.jpg",
      "  WIFI-CAM-02: Snapshot frame captured -> /var/secops/snapshots/wifi-02-snap.jpg",
      "[SUCCESS] 3 snapshots written to encrypted audit storage with SHA-256 seal.",
    ];
  } else if (trimmed.includes("motion") && (trimmed.includes("arm") || trimmed.includes("enable"))) {
    durationMs = 350;
    stdout = [
      "[SENSOR] Motion Detection Armed across active surveillance streams.",
      "[CONFIG] Sensitivity: Medium (3.5% delta threshold) | Optical diff interval: 150ms",
      "[STATUS] Armed. Frame deviation will dispatch acoustic alert chime and SIEM event.",
    ];
  } else if (trimmed.includes("motion") && (trimmed.includes("disarm") || trimmed.includes("disable") || trimmed.includes("off"))) {
    durationMs = 350;
    stdout = [
      "[SENSOR] Motion Detection Disarmed.",
      "[STATUS] Intrusion alarms silenced. Background optical diffing paused.",
    ];
  } else if (trimmed === "uptime" || trimmed.startsWith("uptime")) {
    durationMs = 200;
    stdout = [
      " 14:28:19 up 14 days, 3:42, 2 users, load average: 0.18, 0.22, 0.19",
      " DevAgent Core Engine: RUNNING (PID 1024, Node.js v20.18)",
      " Zero-Trust Media Proxy: RUNNING (Nginx mTLS reverse proxy)",
    ];
  } else if (trimmed === "free -m" || trimmed.includes("free")) {
    durationMs = 200;
    stdout = [
      "               total        used        free      shared  buff/cache   available",
      "Mem:           16384        4210       10124         248        2050       11926",
      "Swap:           4096           0        4096",
    ];
  } else if (trimmed === "df -h" || trimmed.includes("df")) {
    durationMs = 200;
    stdout = [
      "Filesystem      Size  Used Avail Use% Mounted on",
      "/dev/root        50G   14G   34G  30% /",
      "/dev/nvme0n1    200G   42G  148G  23% /var/secops/recordings",
      "tmpfs           7.8G  1.2M  7.8G   1% /dev/shm",
    ];
  } else {
    durationMs = 400;
    stdout = [
      `$ ${trimmed}`,
      `[EXEC] Command processed by DevAgent Mobile Gateway (${new Date().toLocaleTimeString()} UTC)`,
      "Execution output streamed successfully.",
      "Exit status: 0 (OK)",
    ];
  }

  res.json({
    command: trimmed,
    status: exitCode === 0 ? "success" : "failed",
    stdout,
    stderr,
    durationMs,
    exitCode,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DevAgent Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
