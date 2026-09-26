import { TaskSolution } from './types';

export const PRESET_TASKS: TaskSolution[] = [
  {
    id: 'preset_auth_microservice',
    title: 'Production JWT Auth Microservice with Refresh Token Rotation & Docker',
    mode: 'fullstack',
    createdAt: 1774200000000,
    prompt: 'Build a production-grade authentication microservice in TypeScript with Node.js, Express, JWT access tokens, argon2 password hashing, secure refresh token rotation in Redis, rate limiting, and multi-stage Docker deployment.',
    modelUsed: 'gemini-3.1-pro-preview',
    thinkingEnabled: true,
    thinkingProcess: 'Analyzing production-grade requirements: 1. Password hashing requires Argon2id to resist GPU/ASIC attacks. 2. Refresh token rotation prevents replay attacks by invalidating token family upon reused token detection. 3. Architectural separation between route handlers, domain services, and Redis repository ensures high testability. 4. Multi-stage Dockerfile minimizes final image size to <120MB and runs as a non-privileged user.',
    step1_architecture: {
      overview: 'Modular clean architecture with layered separation of concerns: Express Router -> Auth Controller -> Domain Service -> Redis/PostgreSQL Data Access. Features Argon2id password hashing, RS256/HS256 signed JWTs with 15-minute expiration, and 7-day cryptographic refresh token rotation stored with Redis TTLs.',
      folderStructure: `auth-service/
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── src/
│   ├── config/
│   │   └── env.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── services/
│   │   ├── tokenService.ts
│   │   └── authService.ts
│   ├── routes/
│   │   └── authRoutes.ts
│   ├── utils/
│   │   └── crypto.ts
│   └── index.ts
└── __tests__/
    └── auth.test.ts`,
      designDecisions: [
        'Used Argon2id for password hashing with memory cost 65536 and time cost 3',
        'Implemented Refresh Token Rotation with token reuse detection and instant family revocation',
        'Strict rate limiting on login/registration endpoints using memory/Redis sliding window bucket',
        'Multi-stage Dockerfile using Alpine Linux non-root runner user (node:node)'
      ]
    },
    step2_dependencies: {
      packageManager: 'npm',
      files: [
        {
          filename: 'package.json',
          language: 'json',
          content: `{
  "name": "auth-microservice",
  "version": "1.0.0",
  "description": "Production-grade authentication microservice with refresh token rotation",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "argon2": "^0.41.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.3.1",
    "helmet": "^7.1.0",
    "ioredis": "^5.4.1",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.14.0",
    "tsx": "^4.11.0",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}`
        },
        {
          filename: 'Dockerfile',
          language: 'dockerfile',
          content: `# Multi-stage production build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder --chown=appuser:appgroup /app/package*.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
USER appuser
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1
CMD ["node", "dist/index.js"]`
        }
      ]
    },
    step3_implementation: {
      files: [
        {
          filename: 'src/config/env.ts',
          language: 'typescript',
          description: 'Type-safe environment variable validation using Zod',
          content: `import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_ACCESS_SECRET: z.string().min(32, 'Access secret must be >= 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'Refresh secret must be >= 32 characters'),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY_DAYS: z.string().default('7').transform((v) => parseInt(v, 10)),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
});

export const env = envSchema.parse(process.env);`
        },
        {
          filename: 'src/services/tokenService.ts',
          language: 'typescript',
          description: 'Cryptographic token generation and Redis refresh token family management',
          content: `import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Redis from 'ioredis';
import { env } from '../config/env';

const redis = new Redis(env.REDIS_URL);

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class TokenService {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: '15m',
      algorithm: 'HS256',
    });
  }

  static async createRefreshTokenFamily(userId: string): Promise<string> {
    const familyId = crypto.randomUUID();
    const token = crypto.randomBytes(40).toString('hex');
    const key = \`refresh:\${userId}:\${familyId}\`;
    
    // Store with 7 day TTL
    await redis.set(key, token, 'EX', env.REFRESH_TOKEN_EXPIRY_DAYS * 86400);
    return \`\${familyId}.\${token}\`;
  }

  static async verifyAndRotateRefreshToken(userId: string, incomingToken: string): Promise<string> {
    const [familyId, secret] = incomingToken.split('.');
    if (!familyId || !secret) {
      throw new Error('Invalid token structure');
    }

    const key = \`refresh:\${userId}:\${familyId}\`;
    const stored = await redis.get(key);

    if (!stored) {
      // Possible reuse attack! Invalidate all tokens for user
      const keys = await redis.keys(\`refresh:\${userId}:*\`);
      if (keys.length > 0) await redis.del(...keys);
      throw new Error('Security Breach: Token reuse detected. All sessions revoked.');
    }

    if (stored !== secret) {
      await redis.del(key);
      throw new Error('Invalid refresh token credential');
    }

    // Rotate with new secret within same family
    const newSecret = crypto.randomBytes(40).toString('hex');
    await redis.set(key, newSecret, 'EX', env.REFRESH_TOKEN_EXPIRY_DAYS * 86400);
    return \`\${familyId}.\${newSecret}\`;
  }
}`
        },
        {
          filename: 'src/index.ts',
          language: 'typescript',
          description: 'Server bootstrap with Helmet security headers, rate limiting, and graceful shutdown',
          content: `import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100kb' }));

// Auth rate limiter: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again in 15 minutes.' }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(\`[DevAgent] Auth Service listening on port \${env.PORT} [\${env.NODE_ENV}]\`);
});`
        }
      ]
    },
    step4_execution: {
      prerequisites: [
        'Node.js >= 20.0.0 installed',
        'Docker & Docker Compose running locally'
      ],
      commands: [
        {
          command: 'npm install',
          description: 'Install production and development dependencies',
          expectedOutput: 'added 142 packages in 1.2s'
        },
        {
          command: 'npm test',
          description: 'Run Vitest unit and integration test suite',
          expectedOutput: 'Test Suites: 2 passed, 2 total'
        },
        {
          command: 'docker-compose up -d --build',
          description: 'Build multi-stage container and start Redis cluster in background',
          expectedOutput: 'Creating network "auth_default" ... Created'
        },
        {
          command: 'curl -i http://localhost:4000/health',
          description: 'Probe container healthcheck endpoint',
          expectedOutput: 'HTTP/1.1 200 OK\n{"status":"ok"}'
        }
      ]
    }
  },
  {
    id: 'preset_playwright_crawler',
    title: 'Autonomous Distributed Playwright Scraper with Rate-Limiting & Proxy Pool',
    mode: 'automation',
    createdAt: 1774100000000,
    prompt: 'Create a resilient web automation engine using Playwright and TypeScript with proxy rotation, exponential backoff retries, user-agent randomization, structured SQLite persistence, and anti-bot mitigation.',
    modelUsed: 'gemini-3.1-pro-preview',
    thinkingEnabled: true,
    thinkingProcess: 'Analyzing web automation risks: Modern cloudflare/perimeter firewalls identify automated browsers through TLS fingerprints, viewport dimensions, and navigational speed. Architecture requires stealth plugins, randomised realistic delays, automated page hydration awaits, and atomic SQLite upserts to prevent data corruption during network drops.',
    step1_architecture: {
      overview: 'Distributed crawler engine with decoupled Worker Pool, Queue Dispatcher, and SQLite Data Store. Uses playwright-extra with puppeteer-stealth evasions, dynamic proxy round-robin, and exponential backoff retry pipelines.',
      folderStructure: `scraper-engine/
├── .env.example
├── package.json
├── tsconfig.json
├── src/
│   ├── config.ts
│   ├── proxy/
│   │   └── proxyPool.ts
│   ├── db/
│   │   └── database.ts
│   ├── core/
│   │   ├── browserManager.ts
│   │   └── retryHandler.ts
│   ├── parsers/
│   │   └── catalogParser.ts
│   └── index.ts
└── data/
    └── crawl.db`,
      designDecisions: [
        'Stealth plugin injection to mask navigator.webdriver and Chrome runtime flags',
        'Token bucket rate limiter capping requests at 5 requests/sec per domain',
        'WAL-mode SQLite database for high concurrent write throughput',
        'Deterministic deduplication hashing to avoid redundant network fetching'
      ]
    },
    step2_dependencies: {
      packageManager: 'npm',
      files: [
        {
          filename: 'package.json',
          language: 'json',
          content: `{
  "name": "playwright-automation-engine",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "dotenv": "^16.4.5",
    "p-limit": "^5.0.0",
    "playwright": "^1.44.1",
    "user-agents": "^1.1.206",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.10",
    "@types/node": "^20.14.0",
    "tsx": "^4.11.0",
    "typescript": "^5.4.5"
  }
}`
        }
      ]
    },
    step3_implementation: {
      files: [
        {
          filename: 'src/core/browserManager.ts',
          language: 'typescript',
          description: 'Isolated browser context generator with randomized fingerprints and stealth parameters',
          content: `import { chromium, Browser, BrowserContext, Page } from 'playwright';
import UserAgent from 'user-agents';

export class BrowserManager {
  private static browser: Browser | null = null;

  static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--disable-blink-features=AutomationControlled',
        ],
      });
    }
    return this.browser;
  }

  static async createContext(proxyUrl?: string): Promise<{ context: BrowserContext; page: Page }> {
    const browser = await this.getBrowser();
    const userAgent = new UserAgent({ deviceCategory: 'desktop' }).toString();

    const context = await browser.newContext({
      userAgent,
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      proxy: proxyUrl ? { server: proxyUrl } : undefined,
    });

    const page = await context.newPage();
    // Neutralize webdriver flag
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    return { context, page };
  }

  static async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}`
        },
        {
          filename: 'src/index.ts',
          language: 'typescript',
          description: 'Orchestrator driving batch scraping with concurrent limiters and SQLite persistence',
          content: `import { BrowserManager } from './core/browserManager';
import pLimit from 'p-limit';

interface ScrapeTarget {
  url: string;
  category: string;
}

const targets: ScrapeTarget[] = [
  { url: 'https://news.ycombinator.com', category: 'tech' },
  { url: 'https://github.com/trending', category: 'developer' }
];

async function runWorker(target: ScrapeTarget) {
  const { context, page } = await BrowserManager.createContext();
  try {
    console.log(\`[DevAgent] Crawling target: \${target.url}\`);
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const title = await page.title();
    console.log(\`[SUCCESS] Scraped "\${title}" from \${target.url}\`);
  } catch (err: any) {
    console.error(\`[FAILURE] Target \${target.url} failed: \${err.message}\`);
  } finally {
    await context.close();
  }
}

async function main() {
  const limit = pLimit(3);
  await Promise.all(targets.map((t) => limit(() => runWorker(t))));
  await BrowserManager.close();
  console.log('[DevAgent] Batch crawling sequence completed.');
}

main();`
        }
      ]
    },
    step4_execution: {
      commands: [
        {
          command: 'npm install',
          description: 'Install dependencies and Playwright binaries',
          expectedOutput: 'added 98 packages in 0.9s'
        },
        {
          command: 'npx playwright install --with-deps chromium',
          description: 'Fetch headless Chromium browser binaries and system fonts',
          expectedOutput: 'Chromium 124.0.6367.29 downloaded'
        },
        {
          command: 'npm start',
          description: 'Execute autonomous crawler pipeline',
          expectedOutput: '[DevAgent] Crawling target: https://news.ycombinator.com\n[SUCCESS] Scraped "Hacker News"'
        }
      ]
    }
  },
  {
    id: 'preset_stack_trace_debug',
    title: 'Root-Cause Diagnosis: Node.js Unhandled Rejection & Memory Leak in Event Pipeline',
    mode: 'debugger',
    createdAt: 1774000000000,
    prompt: 'Diagnose and fix an unhandled promise rejection accompanied by an EventEmitter memory leak warning causing worker pods to crash with OOM (exit code 137).',
    modelUsed: 'gemini-3.1-pro-preview',
    thinkingEnabled: true,
    thinkingProcess: 'Deep root-cause inspection: 1. MaxListenersExceededWarning indicates that an event listener is registered inside an HTTP request lifecycle loop without an off/removeListener cleanup on response close/error. 2. Each pending request retains a closure over the request context, ballooning heap memory until V8 triggers SIGKILL (Exit code 137). 3. The UnhandledPromiseRejection arises because the async stream write promise lacks a .catch() handler when the client closes the TCP socket prematurely. 4. Fix requires using once() with AbortController signal or proper listener deregistration.',
    diagnostics: {
      rootCause: 'Inside the SSE streaming handler, an event listener `pipeline.on("chunk")` was added inside the request handler without cleanup. When clients disconnected prematurely, the listeners accumulated indefinitely (triggering MaxListenersExceededWarning) and stream pipe errors went unhandled, terminating the process with unhandled rejection.',
      offendingFile: 'src/streamService.ts',
      offendingSnippet: `// BROKEN CODE:
app.get('/api/events', (req, res) => {
  streamPipeline.on('data', (data) => {
    res.write(\`data: \${JSON.stringify(data)}\\n\\n\`);
  });
  // No listener removal on req.on('close')!
  // Unhandled error on pipeline write!
});`,
      fixedSnippet: `// REPAIRED PRODUCTION CODE:
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onData = (data: unknown) => {
    if (!res.writableEnded) {
      res.write(\`data: \${JSON.stringify(data)}\\n\\n\`);
    }
  };

  streamPipeline.on('data', onData);

  req.on('close', () => {
    streamPipeline.off('data', onData);
    res.end();
  });
});`,
      explanation: 'By storing the listener reference and explicitly unsubscribing via streamPipeline.off("data", onData) upon socket closure (req.on("close")), the garbage collector can reclaim the request closure. Adding writableEnded guards prevents unhandled write-after-close errors.'
    },
    step1_architecture: {
      overview: 'Memory-safe streaming pipeline architecture with explicit lifecycle hook cleanup, AbortController propagation, and centralized uncaughtException handlers.',
      folderStructure: `diagnosed-stream-service/
├── package.json
├── src/
│   ├── streamService.ts
│   └── index.ts
└── __tests__/
    └── memoryLeak.test.ts`,
      designDecisions: [
        'Registered cleanup hooks on req.on("close") and req.on("error")',
        'Integrated AbortController to cleanly cancel upstream async generators',
        'Implemented process-level unhandledRejection graceful teardown'
      ]
    },
    step2_dependencies: {
      packageManager: 'npm',
      files: [
        {
          filename: 'package.json',
          language: 'json',
          content: `{
  "name": "stream-service-fixed",
  "version": "1.0.1",
  "scripts": {
    "test:leak": "node --expose-gc ./node_modules/.bin/vitest run"
  }
}`
        }
      ]
    },
    step3_implementation: {
      files: [
        {
          filename: 'src/streamService.ts',
          language: 'typescript',
          description: 'Hardened streaming router with leak-proof event lifecycle handling',
          content: `import { Request, Response } from 'express';
import { EventEmitter } from 'events';

export const globalPipeline = new EventEmitter();
globalPipeline.setMaxListeners(50);

export function handleSseConnection(req: Request, res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(': ping\\n\\n');

  const messageHandler = (payload: unknown) => {
    if (!res.writableEnded && res.writable) {
      res.write(\`data: \${JSON.stringify(payload)}\\n\\n\`);
    }
  };

  globalPipeline.on('telemetry', messageHandler);

  const cleanup = () => {
    globalPipeline.off('telemetry', messageHandler);
    if (!res.writableEnded) {
      res.end();
    }
  };

  req.once('close', cleanup);
  req.once('error', cleanup);
}`
        }
      ]
    },
    step4_execution: {
      commands: [
        {
          command: 'node --expose-gc -e "console.log(\'GC test enabled\')"',
          description: 'Verify V8 garbage collection flags are accessible for heap profiling',
          expectedOutput: 'GC test enabled'
        },
        {
          command: 'npm test',
          description: 'Execute 1,000 simulated socket connections to confirm zero listener leaks',
          expectedOutput: 'PASS src/__tests__/memoryLeak.test.ts (Heap Delta: < 2MB after 1000 conns)'
        }
      ]
    }
  },
  {
    id: 'preset_devops_gitops',
    title: 'Zero-Downtime Kubernetes GitOps Pipeline with Helm, ArgoCD & Prometheus Telemetry',
    mode: 'devops',
    createdAt: 1774150000000,
    prompt: 'Architect a production DevOps CI/CD pipeline using GitHub Actions, multi-arch Docker buildx, Helm chart templating, ArgoCD sync automation, and Prometheus PodMonitor metrics exporters.',
    modelUsed: 'gemini-3.1-pro-preview',
    thinkingEnabled: true,
    thinkingProcess: 'Formulating robust DevOps automation: 1. GitHub Actions workflow must enforce static security scanning (Trivy) and semantic tagging. 2. Multi-stage Docker buildx pushes multi-arch images (linux/amd64, linux/arm64) to container registry with digest pinning. 3. Helm templates isolate configmaps, secrets, resource limits, and readiness/liveness probes. 4. ArgoCD Application manifest defines automated sync policies with self-healing and automated rollback on container probe failures.',
    step1_architecture: {
      overview: 'GitOps CI/CD delivery pipeline automating test-to-production deployment. Features GitHub Actions buildx push, Helm chart package versioning, and ArgoCD automated reconciliation loops with Prometheus alerts.',
      folderStructure: `devops-gitops/
├── .github/
│   └── workflows/
│       └── release.yml
├── helm/
│   └── app-chart/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│           ├── deployment.yaml
│           ├── service.yaml
│           └── monitor.yaml
├── argocd/
│   └── application.yaml
└── Dockerfile`,
      designDecisions: [
        'Multi-stage Dockerfile pinned to alpine with SHA256 digest verification',
        'Resource request & limit boundaries with HPA (Horizontal Pod Autoscaler) target at 75% CPU',
        'Liveness & readiness HTTP probes targeting /health with 5s timeout and 3 failure thresholds',
        'ArgoCD self-healing enabled with automated pruning of orphan Kubernetes resources'
      ]
    },
    step2_dependencies: {
      packageManager: 'helm / yaml',
      files: [
        {
          filename: 'helm/app-chart/Chart.yaml',
          language: 'yaml',
          content: `apiVersion: v2
name: enterprise-app
description: Production-grade Helm chart for cloud microservices
version: 1.4.0
appVersion: "2.1.0"
keywords:
  - gitops
  - microservice
  - high-availability`
        }
      ]
    },
    step3_implementation: {
      files: [
        {
          filename: '.github/workflows/release.yml',
          language: 'yaml',
          description: 'GitHub Actions workflow with Trivy vulnerability scanning and Docker Buildx multi-arch publish',
          content: `name: Production CI/CD Pipeline

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  validate-and-publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source
        uses: actions/checkout@v4

      - name: Run Vulnerability Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          ignore-unfixed: true
          severity: 'CRITICAL,HIGH'

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build & Push Container Image
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ghcr.io/org/enterprise-app:\${{ github.sha }}`
        },
        {
          filename: 'helm/app-chart/templates/deployment.yaml',
          language: 'yaml',
          description: 'Resilient Kubernetes Deployment with rolling updates and pod anti-affinity',
          content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-service
  labels:
    app: {{ .Values.appName | default "enterprise-app" }}
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: {{ .Values.appName | default "enterprise-app" }}
  template:
    metadata:
      labels:
        app: {{ .Values.appName | default "enterprise-app" }}
    spec:
      containers:
        - name: app
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5`
        }
      ]
    },
    step4_execution: {
      commands: [
        {
          command: 'helm lint helm/app-chart',
          description: 'Validate Helm chart syntax and template values',
          expectedOutput: '1 chart(s) linted, 0 chart(s) failed'
        },
        {
          command: 'helm template test-release helm/app-chart --debug',
          description: 'Dry-run render all Kubernetes resource manifests',
          expectedOutput: '--- # Source: app-chart/templates/deployment.yaml ... Rendered successfully'
        },
        {
          command: 'kubectl apply -f argocd/application.yaml',
          description: 'Register application with ArgoCD GitOps reconciliation controller',
          expectedOutput: 'application.argoproj.io/enterprise-app configured'
        }
      ]
    }
  },
  {
    id: 'preset_surveillance_device_auth',
    title: 'Zero-Trust Surveillance Gateway: Device Authorization via mTLS & WireGuard Mesh',
    mode: 'devops',
    createdAt: 1774160000000,
    prompt: 'Architect an end-to-end zero-trust surveillance gateway that strictly allows camera stream access only from verified, allowed devices using Mutual TLS (mTLS), hardware device certificates, WireGuard overlay networking, and isolated VLAN security controls.',
    modelUsed: 'gemini-3.1-pro-preview',
    thinkingEnabled: true,
    thinkingProcess: 'Formulating defense-in-depth architecture for physical security & surveillance monitoring: 1. Surveillance feeds must never be exposed to public networks or unauthenticated endpoints. 2. Mutual TLS (mTLS) with an internal private Certificate Authority (CA) guarantees that only devices possessing a cryptographically signed client certificate can complete the TLS handshake. 3. Hardware device binding: certificates are tied to device IDs and can be revoked instantly via CRL/OCSP. 4. Nginx acts as the perimeter ingress terminating mTLS, passing verified client certificate metadata to the media gateway. 5. WireGuard VPN mesh encapsulates traffic from remote field units with pre-shared keys and strict IP binding. 6. IP cameras sit in an isolated, air-gapped VLAN with no internet egress.',
    step1_architecture: {
      overview: 'Zero-Trust surveillance monitoring gateway that restricts live feeds, PTZ controls, and recordings exclusively to cryptographically authorized devices. Combines Mutual TLS (mTLS) at the Nginx reverse proxy level, WireGuard overlay tunnels, private device PKI, and automated audit logging.',
      folderStructure: `surveillance-gateway/
├── docker-compose.yml
├── pki/
│   ├── init-ca.sh
│   ├── issue-device-cert.sh
│   └── openssl.cnf
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
│       └── surveillance.conf
├── wireguard/
│   └── wg0.conf
└── docs/
    └── device-enrollment.md`,
      designDecisions: [
        'Mandatory mTLS Ingress: Nginx drops all incoming connections before HTTP parsing if a valid client certificate issued by the internal CA is not presented (ssl_verify_client on).',
        'Air-Gapped Camera Subnet (VLAN 30): Cameras cannot communicate with the internet or local LAN; only the media proxy container has dual-homed ingress to ingest RTSP streams.',
        'Cryptographic Hardware Binding: Client certificates are packaged into PKCS#12 bundles protected by AES-256 for installation into device keychains / TPMs.',
        'WireGuard Point-to-Point Overlay: Off-site security laptops and dispatch tablets connect through peer-to-peer WireGuard tunnels with strict IP assignment before reaching the mTLS gateway.',
        'Real-time Access Audit Trail: Every stream handshake records client certificate serial numbers, common names, device IP, and session duration to persistent audit logs.'
      ]
    },
    step2_dependencies: {
      packageManager: 'docker / openssl / bash',
      files: [
        {
          filename: 'docker-compose.yml',
          language: 'yaml',
          description: 'Multi-container zero-trust surveillance stack with network segmentation',
          content: `version: "3.8"

services:
  # Perimeter Ingress: Terminates mTLS and enforces device authorization
  gateway-proxy:
    image: nginx:1.25-alpine
    container_name: surveillance-gateway
    restart: unless-stopped
    ports:
      - "8443:8443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./pki/certs:/etc/nginx/certs:ro
      - ./logs/nginx:/var/log/nginx
    networks:
      - secure-access-net
      - internal-media-net
    depends_on:
      - media-streamer

  # RTSP/WebRTC Video Ingestion Broker (Isolated from public access)
  media-streamer:
    image: bluenviron/mediamtx:latest-alpine
    container_name: surveillance-media-broker
    restart: unless-stopped
    environment:
      - MTX_PROTOCOLS=tcp
      - MTX_WEBRTC=yes
      - MTX_HLS=yes
    volumes:
      - ./mediamtx.yml:/mediamtx.yml:ro
    networks:
      - internal-media-net
      - camera-vlan-net

  # Secure WireGuard Tunnel for Remote Security Operators
  wireguard:
    image: linuxserver/wireguard:latest
    container_name: surveillance-wireguard
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=UTC
      - SERVERURL=vpn.security.internal
      - SERVERPORT=51820
      - PEERS=operator_laptop_1,operator_tablet_1,hq_console
      - INTERNAL_SUBNET=10.13.13.0/24
    volumes:
      - ./wireguard:/config
      - /lib/modules:/lib/modules:ro
    ports:
      - "51820:51820/udp"
    networks:
      - secure-access-net

networks:
  # Network exposed to authorized device VPN peers
  secure-access-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.10.0/24

  # Isolated media network between proxy and video broker
  internal-media-net:
    internal: true
    driver: bridge

  # Camera-only network (Simulating isolated physical VLAN)
  camera-vlan-net:
    internal: true
    driver: bridge`
        }
      ]
    },
    step3_implementation: {
      files: [
        {
          filename: 'pki/issue-device-cert.sh',
          language: 'bash',
          description: 'Automated Device CA and Client Certificate Enrollment Script',
          content: `#!/usr/bin/env bash
set -euo pipefail

# Configuration
PKI_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="\${PKI_DIR}/certs"
CA_KEY="\${CERTS_DIR}/ca.key"
CA_CERT="\${CERTS_DIR}/ca.crt"
DAYS_VALID=365

mkdir -p "\${CERTS_DIR}"

# 1. Initialize Private Root CA if not exists
if [[ ! -f "\${CA_KEY}" ]]; then
  echo "==> Generating Private Surveillance Root CA..."
  openssl ecparam -name prime256v1 -genkey -noout -out "\${CA_KEY}"
  openssl req -new -x509 -sha256 -key "\${CA_KEY}" -out "\${CA_CERT}" -days 1825 \\
    -subj "/C=US/ST=Security/O=Enterprise Security Operations/CN=Surveillance-Root-CA"
  echo "✔ Root CA created: \${CA_CERT}"
fi

# 2. Generate Server Certificate for Nginx
if [[ ! -f "\${CERTS_DIR}/server.crt" ]]; then
  echo "==> Generating Gateway Server Certificate..."
  openssl ecparam -name prime256v1 -genkey -noout -out "\${CERTS_DIR}/server.key"
  openssl req -new -sha256 -key "\${CERTS_DIR}/server.key" -out "\${CERTS_DIR}/server.csr" \\
    -subj "/C=US/ST=Security/O=Enterprise Security Operations/CN=surveillance-gateway.internal"
  
  cat > "\${CERTS_DIR}/server_ext.cnf" <<EOF
basicConstraints = CA:FALSE
nsCertType = server
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = surveillance-gateway.internal
DNS.2 = localhost
IP.1 = 127.0.0.1
IP.2 = 10.13.13.1
EOF

  openssl x509 -req -in "\${CERTS_DIR}/server.csr" -CA "\${CA_CERT}" -CAkey "\${CA_KEY}" \\
    -CAcreateserial -out "\${CERTS_DIR}/server.crt" -days "\${DAYS_VALID}" -sha256 \\
    -extfile "\${CERTS_DIR}/server_ext.cnf"
  echo "✔ Gateway Server TLS Certificate created."
fi

# 3. Check parameters for Device Enrollment
DEVICE_ID="\${1:-}"
OPERATOR_NAME="\${2:-authorized-operator}"

if [[ -z "\${DEVICE_ID}" ]]; then
  echo "Usage: ./issue-device-cert.sh <DEVICE_UNIQUE_ID> [OPERATOR_NAME]"
  echo "Example: ./issue-device-cert.sh macbook-secops-01 'Alice Smith'"
  exit 1
fi

DEVICE_KEY="\${CERTS_DIR}/\${DEVICE_ID}.key"
DEVICE_CSR="\${CERTS_DIR}/\${DEVICE_ID}.csr"
DEVICE_CRT="\${CERTS_DIR}/\${DEVICE_ID}.crt"
DEVICE_P12="\${CERTS_DIR}/\${DEVICE_ID}.p12"

echo "==> Enrolling Authorized Device: \${DEVICE_ID} (\${OPERATOR_NAME})..."

# Generate ECDSA Client Key
openssl ecparam -name prime256v1 -genkey -noout -out "\${DEVICE_KEY}"

# Generate CSR with Device identity metadata
openssl req -new -sha256 -key "\${DEVICE_KEY}" -out "\${DEVICE_CSR}" \\
  -subj "/C=US/ST=Security/O=Surveillance Authorization/OU=\${OPERATOR_NAME}/CN=\${DEVICE_ID}"

cat > "\${CERTS_DIR}/\${DEVICE_ID}_ext.cnf" <<EOF
basicConstraints = CA:FALSE
nsCertType = client
keyUsage = critical, digitalSignature
extendedKeyUsage = clientAuth
EOF

# Sign with Internal Surveillance CA
openssl x509 -req -in "\${DEVICE_CSR}" -CA "\${CA_CERT}" -CAkey "\${CA_KEY}" \\
  -CAcreateserial -out "\${DEVICE_CRT}" -days "\${DAYS_VALID}" -sha256 \\
  -extfile "\${CERTS_DIR}/\${DEVICE_ID}_ext.cnf"

# Package into password-protected PKCS#12 for iOS/macOS/Windows keychain import
EXPORT_PASS="DeviceSecurePass123!"
openssl pkcs12 -export -out "\${DEVICE_P12}" -inkey "\${DEVICE_KEY}" \\
  -in "\${DEVICE_CRT}" -certfile "\${CA_CERT}" -passout "pass:\${EXPORT_PASS}"

echo "=========================================================="
echo "✔ Device Certificate Successfully Issued!"
echo "Device ID:         \${DEVICE_ID}"
echo "Client Cert (PEM): \${DEVICE_CRT}"
echo "Client Key:        \${DEVICE_KEY}"
echo "PKCS#12 Bundle:    \${DEVICE_P12}"
echo "Bundle Password:   \${EXPORT_PASS}"
echo "=========================================================="`
        },
        {
          filename: 'nginx/conf.d/surveillance.conf',
          language: 'nginx',
          description: 'Hardened Nginx Reverse Proxy with mTLS Client Certificate Enforcement',
          content: `server {
    listen 8443 ssl http2;
    server_name surveillance-gateway.internal localhost;

    # Server TLS Credentials
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    # ZERO-TRUST MUTUAL TLS ENFORCEMENT
    # Rejects any device handshake that does not present a cert signed by the private CA
    ssl_client_certificate /etc/nginx/certs/ca.crt;
    ssl_verify_client on;
    ssl_verify_depth 2;

    # Cryptographic Hardening (TLSv1.3 & High-Security Ciphers)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305';
    ssl_prefer_server_ciphers on;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    # Custom Audit Log with Verified Device Fingerprint
    log_format device_audit escape=json '{'
        '"timestamp":"$time_iso8601",'
        '"client_ip":"$remote_addr",'
        '"device_id":"$ssl_client_s_dn",'
        '"cert_serial":"$ssl_client_serial",'
        '"cert_fingerprint":"$ssl_client_fingerprint",'
        '"verify_status":"$ssl_client_verify",'
        '"request_uri":"$request_uri",'
        '"http_status":"$status",'
        '"bytes_sent":"$body_bytes_sent"'
    '}';

    access_log /var/log/nginx/surveillance_device_access.log device_audit;
    error_log /var/log/nginx/surveillance_error.log warn;

    # Healthcheck endpoint (Strictly requires valid device cert)
    location /healthz {
        return 200 "Device Authorized: $ssl_client_s_dn\\n";
    }

    # Camera Stream WebRTC / HLS Ingress
    location /streams/ {
        # Forward to internal media streamer broker
        proxy_pass http://media-streamer:8889/;
        proxy_http_version 1.1;

        # WebSocket & WebRTC Upgrade headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        # Pass cryptographically verified device identity to upstream
        proxy_set_header X-Authorized-Device $ssl_client_s_dn;
        proxy_set_header X-Client-Cert-Serial $ssl_client_serial;
        proxy_set_header X-Real-IP $remote_addr;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Deny all direct file/root indexing
    location / {
        return 403 "Direct access denied. Only authorized stream endpoints accessible.\\n";
    }
}`
        },
        {
          filename: 'wireguard/wg0.conf',
          language: 'ini',
          description: 'WireGuard Mesh Host Gateway with Device Public Key Whitelist',
          content: `[Interface]
Address = 10.13.13.1/24
ListenPort = 51820
PrivateKey = SERVER_GATEWAY_PRIVATE_KEY_REPLACE
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Allowed Device #1: Security Ops Laptop (Alice)
[Peer]
PublicKey = 5k3jA1+9lFj92HkLmsdf9834kjlfsd08234jklsdff=
AllowedIPs = 10.13.13.2/32
PersistentKeepalive = 25

# Allowed Device #2: Mobile Security Tablet (Unit 4)
[Peer]
PublicKey = 9x84mN+0pQrsT1uVwXyZ1234567890abcdefABCDEF=
AllowedIPs = 10.13.13.3/32
PersistentKeepalive = 25

# Allowed Device #3: Central SOC Monitoring Desk
[Peer]
PublicKey = 2bCD34+eFGH56ijKLMN78901234567890abcdefABCD=
AllowedIPs = 10.13.13.4/32
PersistentKeepalive = 25`
        }
      ]
    },
    step4_execution: {
      prerequisites: [
        'Docker & Docker Compose installed',
        'OpenSSL 1.1.1+ with elliptic curve support (prime256v1)',
        'WireGuard kernel module enabled on gateway host'
      ],
      commands: [
        {
          command: 'chmod +x pki/issue-device-cert.sh && ./pki/issue-device-cert.sh secops-workstation-01 "Alice Smith"',
          description: 'Initialize private Surveillance CA, Gateway server certificate, and enroll authorized device #1',
          expectedOutput: '✔ Device Certificate Successfully Issued! Client Cert: pki/certs/secops-workstation-01.crt'
        },
        {
          command: './pki/issue-device-cert.sh mobile-tablet-patrol-04 "Officer Davis"',
          description: 'Enroll secondary allowed mobile field device with cryptographically bound identity',
          expectedOutput: '✔ Device Certificate Successfully Issued! Bundle: pki/certs/mobile-tablet-patrol-04.p12'
        },
        {
          command: 'docker compose up -d',
          description: 'Launch Nginx mTLS gateway, MediaMTX video broker, and WireGuard mesh network in background',
          expectedOutput: '✔ Network surveillance-gateway_internal-media-net Created\n✔ Container surveillance-gateway Started'
        },
        {
          command: 'curl -k https://localhost:8443/healthz',
          description: 'Security validation test 1: Attempt connection WITHOUT device certificate (Should be rejected with 400 Bad Request / SSL error)',
          expectedOutput: '<html><head><title>400 No required SSL certificate was sent</title></head></html>'
        },
        {
          command: 'curl -k --cert pki/certs/secops-workstation-01.crt --key pki/certs/secops-workstation-01.key https://localhost:8443/healthz',
          description: 'Security validation test 2: Connect WITH verified device certificate (Should succeed with 200 OK)',
          expectedOutput: 'Device Authorized: /C=US/ST=Security/O=Surveillance Authorization/OU=Alice Smith/CN=secops-workstation-01'
        }
      ]
    }
  }
];

