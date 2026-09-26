import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Terminal,
  Send,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Play,
  RotateCcw,
  Camera,
  Eye,
  EyeOff,
  Flame,
  Lock,
  Unlock,
  Radio,
  Wifi,
  Copy,
  Check,
  QrCode,
  Sliders,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Clock,
  Sparkles,
  Cpu,
  HardDrive,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Vibrate,
  Battery,
  BatteryCharging,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { TerminalExecutionResult } from '../types';

interface AndroidPhoneRemoteControlProps {
  onBackToCommandPost?: () => void;
  onTriggerSurveillanceAction?: (action: string, payload?: any) => void;
  isStandaloneMobile?: boolean;
}

export const AndroidPhoneRemoteControl: React.FC<AndroidPhoneRemoteControlProps> = ({
  onBackToCommandPost,
  onTriggerSurveillanceAction,
  isStandaloneMobile = false,
}) => {
  // Navigation tabs within remote control
  const [activeTab, setActiveTab] = useState<'console' | 'terminal' | 'hardware' | 'ai_agent' | 'security'>('console');
  
  // Custom command execution state
  const [commandInput, setCommandInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<TerminalExecutionResult[]>([
    {
      command: 'auth-mesh-handshake',
      status: 'success',
      stdout: [
        '[SEC-AUTH] Android Handheld Remote paired via mTLS client certificate',
        '[SESSION] Node 10.13.13.5 authenticated with prime256v1 key',
        '[PRIVILEGES] Tier-1 SecOps Operator: Full Remote Command Execution Granted',
      ],
      stderr: [],
      durationMs: 140,
      exitCode: 0,
    },
  ]);
  const [commandPillsHistory, setCommandPillsHistory] = useState<string[]>([
    'npm test',
    'facility-lockdown',
    'audit-mesh',
    'cctv-health-check',
    'snapshot-all',
    'wg show',
    'uptime',
  ]);

  // Hardware & PTZ states
  const [isLockdownActive, setIsLockdownActive] = useState(false);
  const [isNightVisionActive, setIsNightVisionActive] = useState(false);
  const [isMotionAlarmActive, setIsMotionAlarmActive] = useState(true);
  const [ptzPan, setPtzPan] = useState(0);
  const [ptzTilt, setPtzTilt] = useState(0);

  // Device telemetry
  const [batteryLevel, setBatteryLevel] = useState(88);
  const [isCharging, setIsCharging] = useState(false);
  const [deviceModel, setDeviceModel] = useState('Google Pixel 8 Pro (Android 14)');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [viewFramed, setViewFramed] = useState(!isStandaloneMobile);

  // DevAgent prompt execution
  const [agentPrompt, setAgentPrompt] = useState('');
  const [isAgentGenerating, setIsAgentGenerating] = useState(false);
  const [agentOutputMsg, setAgentOutputMsg] = useState<string | null>(null);

  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Detect Android phone environment or battery if possible
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      if (/Android/i.test(ua)) {
        if (/Pixel/i.test(ua)) setDeviceModel('Google Pixel (Android)');
        else if (/Samsung|SM-/i.test(ua)) setDeviceModel('Samsung Galaxy (Android)');
        else setDeviceModel('Personal Android Phone');
      }

      if ('getBattery' in navigator) {
        (navigator as any).getBattery?.().then((bat: any) => {
          setBatteryLevel(Math.round(bat.level * 100));
          setIsCharging(bat.charging);
          bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)));
          bat.addEventListener('chargingchange', () => setIsCharging(bat.charging));
        }).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executionHistory]);

  // Haptic feedback trigger for physical Android devices
  const triggerHaptic = (type: 'light' | 'success' | 'warning' | 'heavy' = 'light') => {
    if (!hapticsEnabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    try {
      if (type === 'light') navigator.vibrate(20);
      else if (type === 'success') navigator.vibrate([25, 40, 25]);
      else if (type === 'warning') navigator.vibrate([60, 40, 60, 40, 100]);
      else if (type === 'heavy') navigator.vibrate(70);
    } catch {
      // Ignore vibration errors
    }
  };

  // Execute terminal/custom command over the API
  const handleExecuteCommand = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed || isExecuting) return;

    triggerHaptic('light');
    setIsExecuting(true);

    try {
      const res = await fetch('/api/devagent/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: trimmed,
          sourceDevice: 'android_remote_controller',
          clientIp: '10.13.13.5',
        }),
      });

      const data: TerminalExecutionResult = await res.json();
      setExecutionHistory((prev) => [...prev, data]);

      // Update pills history
      setCommandPillsHistory((prev) => {
        const filtered = prev.filter((c) => c !== trimmed);
        return [trimmed, ...filtered].slice(0, 8);
      });

      if (data.status === 'success') {
        triggerHaptic('success');
      } else {
        triggerHaptic('warning');
      }

      // Check for specific commands to update remote state
      if (trimmed === 'facility-lockdown') {
        setIsLockdownActive(true);
      } else if (trimmed.includes('motion') && (trimmed.includes('disarm') || trimmed.includes('off'))) {
        setIsMotionAlarmActive(false);
      } else if (trimmed.includes('motion') && (trimmed.includes('arm') || trimmed.includes('on'))) {
        setIsMotionAlarmActive(true);
      }

      setCommandInput('');
    } catch {
      triggerHaptic('warning');
      setExecutionHistory((prev) => [
        ...prev,
        {
          command: trimmed,
          status: 'failed',
          stdout: [],
          stderr: ['Connection error: Failed to reach DevAgent security gateway endpoint.'],
          durationMs: 250,
          exitCode: 1,
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle hardware actions
  const handleToggleLockdown = () => {
    triggerHaptic('heavy');
    const next = !isLockdownActive;
    setIsLockdownActive(next);
    handleExecuteCommand(next ? 'facility-lockdown' : 'facility-unlock --restore');
  };

  const handleToggleMotionAlarm = () => {
    triggerHaptic('light');
    const next = !isMotionAlarmActive;
    setIsMotionAlarmActive(next);
    handleExecuteCommand(next ? 'cctv-motion --arm' : 'cctv-motion --disarm');
  };

  const handlePTZ = (axis: 'pan' | 'tilt', delta: number) => {
    triggerHaptic('light');
    if (axis === 'pan') {
      const nextPan = Math.max(-180, Math.min(180, ptzPan + delta));
      setPtzPan(nextPan);
      onTriggerSurveillanceAction?.('ptz', { pan: nextPan, tilt: ptzTilt });
    } else {
      const nextTilt = Math.max(-90, Math.min(90, ptzTilt + delta));
      setPtzTilt(nextTilt);
      onTriggerSurveillanceAction?.('ptz', { pan: ptzPan, tilt: nextTilt });
    }
  };

  const handleResetPTZ = () => {
    triggerHaptic('light');
    setPtzPan(0);
    setPtzTilt(0);
    onTriggerSurveillanceAction?.('ptz', { pan: 0, tilt: 0 });
  };

  // Handle DevAgent AI generation
  const handleRunAgentPrompt = async () => {
    if (!agentPrompt.trim() || isAgentGenerating) return;
    triggerHaptic('light');
    setIsAgentGenerating(true);
    setAgentOutputMsg('DevAgent executing high-thinking architecture synthesis...');

    try {
      const res = await fetch('/api/devagent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: agentPrompt,
          mode: 'fullstack',
          thinkingEnabled: true,
        }),
      });

      if (!res.ok) throw new Error('Agent failed to complete generation.');
      const data = await res.json();
      triggerHaptic('success');
      setAgentOutputMsg(`Agent created solution: "${data.title}" with ${data.steps?.length || 4} steps.`);
      setAgentPrompt('');
    } catch (err: any) {
      triggerHaptic('warning');
      setAgentOutputMsg(`Execution error: ${err.message}`);
    } finally {
      setIsAgentGenerating(false);
    }
  };

  // Copy pairing link for the mobile device
  const mobileLink = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?view=remote#remote`
    : 'https://ais-dev-7mlxmjaacutuob6mtcuhsl-913792568943.europe-west2.run.app?view=remote';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mobileLink);
      setCopiedLink(true);
      triggerHaptic('light');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Render the phone UI contents
  const renderPhoneInterface = () => (
    <div className="flex flex-col h-full bg-[#0a0e17] text-slate-200 select-none overflow-hidden">
      {/* Android Top Status Bar */}
      <div className="bg-[#070a10] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80">
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-white">14:38</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">mTLS OK</span>
        </div>

        <div className="flex items-center space-x-2 text-[10px]">
          <span className="flex items-center gap-0.5 text-blue-400">
            <Wifi className="w-3 h-3" />
            <span>WG-Mesh</span>
          </span>
          <span className="flex items-center gap-0.5 text-slate-300">
            {isCharging ? <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> : <Battery className="w-3.5 h-3.5" />}
            <span>{batteryLevel}%</span>
          </span>
        </div>
      </div>

      {/* Controller Header Bar */}
      <div className="px-3.5 py-2.5 bg-[#0f1524] border-b border-slate-800 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5 leading-none">
              <span>Android SecOps Remote</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700">
                ACTIVE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Node: 10.13.13.5 • {deviceModel.split(' ')[0]}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Haptics toggle */}
          <button
            onClick={() => {
              setHapticsEnabled(!hapticsEnabled);
              triggerHaptic('light');
            }}
            className={`p-1.5 rounded text-xs border transition-colors ${
              hapticsEnabled
                ? 'bg-emerald-950 text-emerald-400 border-emerald-700/60'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={hapticsEnabled ? 'Haptic Vibration Enabled' : 'Haptic Vibration Disabled'}
          >
            <Vibrate className="w-3.5 h-3.5" />
          </button>

          {/* Desktop Pairing QR */}
          <button
            onClick={() => setShowPairingModal(true)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="View Mobile Pairing QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>

          {onBackToCommandPost && (
            <button
              onClick={onBackToCommandPost}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Return to Main Command Center"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs (Mobile Bottom/Top Bar) */}
      <div className="flex items-center justify-around bg-[#0a0f1a] border-b border-slate-800/80 px-1 py-1 text-[11px] font-medium">
        <button
          onClick={() => {
            setActiveTab('console');
            triggerHaptic('light');
          }}
          className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'console'
              ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Deck</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('terminal');
            triggerHaptic('light');
          }}
          className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'terminal'
              ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>Terminal</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('hardware');
            triggerHaptic('light');
          }}
          className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'hardware'
              ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-blue-400" />
          <span>PTZ</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('ai_agent');
            triggerHaptic('light');
          }}
          className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'ai_agent'
              ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>DevAgent</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('security');
            triggerHaptic('light');
          }}
          className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'security'
              ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Auth</span>
        </button>
      </div>

      {/* Main Tab Views Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ================= TAB 1: QUICK ACTION COMMAND DECK ================= */}
        {activeTab === 'console' && (
          <div className="space-y-3">
            {/* Emergency Lockdown Action Card */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                isLockdownActive
                  ? 'bg-red-950/80 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                  : 'bg-[#0f1422] border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${isLockdownActive ? 'bg-red-600 text-white' : 'bg-red-950/60 text-red-400'}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Zero-Trust Facility Lockdown
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {isLockdownActive ? 'ENGAGED: Maglocks locked & sirens active' : 'ARMED: Ready for remote deployment'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleToggleLockdown}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 ${
                    isLockdownActive
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {isLockdownActive ? 'Disengage' : 'TRIGGER'}
                </button>
              </div>
            </div>

            {/* Grid of Quick Operations */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Remote Operator Commands:
              </span>

              <div className="grid grid-cols-2 gap-2">
                {/* Audit Mesh */}
                <button
                  onClick={() => handleExecuteCommand('audit-mesh')}
                  disabled={isExecuting}
                  className="p-2.5 rounded-xl bg-[#131929] hover:bg-[#1a233a] border border-slate-800 text-left transition-all active:scale-98 flex flex-col justify-between h-20"
                >
                  <div className="flex items-center justify-between w-full">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-300">mTLS</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Audit Mesh</div>
                    <div className="text-[10px] text-slate-400 font-mono">Verify peers & CA</div>
                  </div>
                </button>

                {/* CCTV Health Check */}
                <button
                  onClick={() => handleExecuteCommand('cctv-health-check')}
                  disabled={isExecuting}
                  className="p-2.5 rounded-xl bg-[#131929] hover:bg-[#1a233a] border border-slate-800 text-left transition-all active:scale-98 flex flex-col justify-between h-20"
                >
                  <div className="flex items-center justify-between w-full">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-950 text-blue-300">5 CAMS</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">CCTV Health</div>
                    <div className="text-[10px] text-slate-400 font-mono">Probe frame bitrates</div>
                  </div>
                </button>

                {/* Automated Test Suite */}
                <button
                  onClick={() => handleExecuteCommand('npm test')}
                  disabled={isExecuting}
                  className="p-2.5 rounded-xl bg-[#131929] hover:bg-[#1a233a] border border-slate-800 text-left transition-all active:scale-98 flex flex-col justify-between h-20"
                >
                  <div className="flex items-center justify-between w-full">
                    <Play className="w-4 h-4 text-amber-400" />
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950 text-amber-300">TESTS</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Run Test Suite</div>
                    <div className="text-[10px] text-slate-400 font-mono">Vitest & Jest suites</div>
                  </div>
                </button>

                {/* Snapshot All Feeds */}
                <button
                  onClick={() => handleExecuteCommand('snapshot-all')}
                  disabled={isExecuting}
                  className="p-2.5 rounded-xl bg-[#131929] hover:bg-[#1a233a] border border-slate-800 text-left transition-all active:scale-98 flex flex-col justify-between h-20"
                >
                  <div className="flex items-center justify-between w-full">
                    <Download className="w-4 h-4 text-purple-400" />
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-950 text-purple-300">SNAP</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Snapshot All</div>
                    <div className="text-[10px] text-slate-400 font-mono">Simultaneous capture</div>
                  </div>
                </button>

                {/* Motion Detection Toggle */}
                <button
                  onClick={handleToggleMotionAlarm}
                  className={`p-2.5 rounded-xl border text-left transition-all active:scale-98 flex flex-col justify-between h-20 ${
                    isMotionAlarmActive
                      ? 'bg-amber-950/40 border-amber-600/70 text-amber-200'
                      : 'bg-[#131929] border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Activity className={`w-4 h-4 ${isMotionAlarmActive ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                      isMotionAlarmActive ? 'bg-amber-900 text-amber-200' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isMotionAlarmActive ? 'ARMED' : 'OFF'}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Motion Alarm</div>
                    <div className="text-[10px] text-slate-400 font-mono">Toggle optical diff</div>
                  </div>
                </button>

                {/* WireGuard Mesh Status */}
                <button
                  onClick={() => handleExecuteCommand('wg show')}
                  disabled={isExecuting}
                  className="p-2.5 rounded-xl bg-[#131929] hover:bg-[#1a233a] border border-slate-800 text-left transition-all active:scale-98 flex flex-col justify-between h-20"
                >
                  <div className="flex items-center justify-between w-full">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-300">VPN</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">WireGuard Status</div>
                    <div className="text-[10px] text-slate-400 font-mono">Peer handshakes</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Command Launcher Box */}
            <div className="p-3 rounded-xl bg-[#0f1422] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Execute Custom Command</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Sandbox PID 1024</span>
              </div>

              <div className="flex items-center space-x-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand(commandInput)}
                    placeholder="Enter command (e.g. npm test, wg show)..."
                    className="w-full bg-[#161d2d] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs font-mono text-emerald-300 placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <button
                  onClick={() => handleExecuteCommand(commandInput)}
                  disabled={!commandInput.trim() || isExecuting}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Run</span>
                </button>
              </div>

              {/* Command quick pills */}
              <div className="flex flex-wrap gap-1 pt-1">
                {commandPillsHistory.slice(0, 5).map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleExecuteCommand(cmd)}
                    className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-slate-300 transition-colors"
                  >
                    ${cmd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: FULL TERMINAL STREAM ================= */}
        {activeTab === 'terminal' && (
          <div className="space-y-2.5 h-full flex flex-col">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Remote Execution Stream</span>
              </span>
              <button
                onClick={() => setExecutionHistory([])}
                className="text-[10px] text-slate-400 hover:text-white font-mono px-2 py-0.5 rounded bg-slate-800"
              >
                Clear
              </button>
            </div>

            {/* Terminal Window Box */}
            <div className="flex-1 min-h-[300px] rounded-xl bg-black border border-slate-800 p-3 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-3 relative shadow-inner">
              {/* Scanline pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16, 185, 129, 0.2) 2px, rgba(16, 185, 129, 0.2) 4px)',
                }}
              />

              {executionHistory.length === 0 ? (
                <div className="text-slate-600 italic p-4 text-center">
                  Terminal idle. Type a command below or execute from the Deck.
                </div>
              ) : (
                executionHistory.map((item, idx) => (
                  <div key={idx} className="space-y-1 border-b border-slate-900 pb-2">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span>$</span> {item.command}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={item.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          exit:{item.exitCode}
                        </span>
                        <span>({item.durationMs}ms)</span>
                      </span>
                    </div>

                    {(item.stdout || []).map((line, lIdx) => (
                      <div key={lIdx} className="text-slate-300 pl-2 border-l border-emerald-500/30">
                        {line}
                      </div>
                    ))}

                    {(item.stderr || []).map((line, lIdx) => (
                      <div key={lIdx} className="text-rose-400 pl-2 border-l border-rose-500/50">
                        {line}
                      </div>
                    ))}
                  </div>
                ))
              )}

              {isExecuting && (
                <div className="flex items-center space-x-2 text-emerald-400 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing in sandbox...</span>
                </div>
              )}

              <div ref={terminalBottomRef} />
            </div>

            {/* Input Bar */}
            <div className="flex items-center space-x-1.5 pt-1">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand(commandInput)}
                placeholder="Type command on Android keyboard..."
                className="flex-1 bg-[#121826] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                onClick={() => handleExecuteCommand(commandInput)}
                disabled={!commandInput.trim() || isExecuting}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Exec
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 3: HARDWARE & PTZ CAMERA CONTROLS ================= */}
        {activeTab === 'hardware' && (
          <div className="space-y-3">
            {/* PTZ D-PAD Controller */}
            <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 text-center space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>Virtual PTZ Joystick (Camera Steering)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Pan: {ptzPan}° | Tilt: {ptzTilt}°
                </span>
              </div>

              {/* Directional Pad */}
              <div className="flex flex-col items-center justify-center space-y-1 pt-1">
                {/* Up / Tilt Up */}
                <button
                  onClick={() => handlePTZ('tilt', 10)}
                  className="w-12 h-12 rounded-xl bg-[#162035] hover:bg-[#202d4a] active:bg-blue-600 border border-slate-700 flex items-center justify-center text-slate-200 transition-colors shadow-md"
                  title="Tilt Up"
                >
                  <ChevronUp className="w-6 h-6" />
                </button>

                {/* Left - Center - Right */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePTZ('pan', -15)}
                    className="w-12 h-12 rounded-xl bg-[#162035] hover:bg-[#202d4a] active:bg-blue-600 border border-slate-700 flex items-center justify-center text-slate-200 transition-colors shadow-md"
                    title="Pan Left"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={handleResetPTZ}
                    className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-600 flex items-center justify-center text-xs font-mono font-bold text-emerald-400 shadow-md"
                    title="Reset to Center"
                  >
                    CTR
                  </button>

                  <button
                    onClick={() => handlePTZ('pan', 15)}
                    className="w-12 h-12 rounded-xl bg-[#162035] hover:bg-[#202d4a] active:bg-blue-600 border border-slate-700 flex items-center justify-center text-slate-200 transition-colors shadow-md"
                    title="Pan Right"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Down / Tilt Down */}
                <button
                  onClick={() => handlePTZ('tilt', -10)}
                  className="w-12 h-12 rounded-xl bg-[#162035] hover:bg-[#202d4a] active:bg-blue-600 border border-slate-700 flex items-center justify-center text-slate-200 transition-colors shadow-md"
                  title="Tilt Down"
                >
                  <ChevronDown className="w-6 h-6" />
                </button>
              </div>

              {/* Hardware Toggles Bar */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsNightVisionActive(!isNightVisionActive);
                    triggerHaptic('light');
                  }}
                  className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isNightVisionActive
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {isNightVisionActive ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>IR Night Vision: {isNightVisionActive ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={handleToggleMotionAlarm}
                  className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isMotionAlarmActive
                      ? 'bg-amber-950 text-amber-300 border-amber-600'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Motion: {isMotionAlarmActive ? 'ARMED' : 'DISARMED'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: DEVAGENT AI PROMPT COMMANDER ================= */}
        {activeTab === 'ai_agent' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-[#0f1422] border border-slate-800 space-y-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">DevAgent Voice & Prompt Commander</h4>
                  <p className="text-[10px] text-slate-400">Command autonomous engineering runs remotely</p>
                </div>
              </div>

              <textarea
                value={agentPrompt}
                onChange={(e) => setAgentPrompt(e.target.value)}
                placeholder="Give command to DevAgent (e.g. Build mTLS reverse proxy, run benchmark, write unit tests for websocket gateway)..."
                rows={3}
                className="w-full bg-[#161d2d] border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-indigo-300">Model: gemini-3.1-pro</span>
                <button
                  onClick={handleRunAgentPrompt}
                  disabled={!agentPrompt.trim() || isAgentGenerating}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                >
                  {isAgentGenerating ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>Dispatch to Agent</span>
                    </>
                  )}
                </button>
              </div>

              {agentOutputMsg && (
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                  {agentOutputMsg}
                </div>
              )}
            </div>

            {/* Pre-built prompt buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">1-Tap Prompts:</span>
              <div className="space-y-1.5">
                {[
                  'Run end-to-end security penetration test against mTLS API',
                  'Synthesize automated surveillance failover script',
                  'Optimize optical motion detection frame diffing performance',
                ].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => {
                      setAgentPrompt(promptText);
                      triggerHaptic('light');
                    }}
                    className="w-full text-left p-2 rounded-lg bg-[#121724] hover:bg-[#1a2233] border border-slate-800 text-xs text-slate-300 truncate"
                  >
                    ⚡ {promptText}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: SECURITY TOKEN & PERMISSIONS ================= */}
        {activeTab === 'security' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#0f1422] border border-slate-800 space-y-2 text-xs">
              <div className="text-white font-bold flex items-center justify-between">
                <span>Zero-Trust Session Credentials</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold">
                  VERIFIED
                </span>
              </div>

              <div className="space-y-1 font-mono text-[10px] text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Device Fingerprint:</span>
                  <span className="text-slate-200">SHA256:8f4b...392a</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Assigned WireGuard IP:</span>
                  <span className="text-emerald-400 font-bold">10.13.13.5</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-500">Client Certificate:</span>
                  <span className="text-slate-200">CN=android-operator-unit</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Revocation Policy:</span>
                  <span className="text-amber-400">Strict CRL (Immediate drop)</span>
                </div>
              </div>
            </div>

            {/* Permissions list */}
            <div className="p-3 rounded-xl bg-[#0f1422] border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-white">Granted Device Privileges</span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span>Remote Shell & Sandbox Execution</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span>CCTV PTZ Steering & Motion Arming</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span>Zero-Trust Facility Lockdown Deployment</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span>DevAgent Model Prompt Dispatch</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Revoke Session */}
            <button
              onClick={() => {
                triggerHaptic('heavy');
                handleExecuteCommand('auth-revoke --device 10.13.13.5');
              }}
              className="w-full py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Revoke Mobile Operator Token</span>
            </button>
          </div>
        )}
      </div>

      {/* Android Bottom Navigation Bar Bar */}
      <div className="bg-[#070a10] py-2 px-6 flex items-center justify-center space-x-12 border-t border-slate-800/80">
        <button
          onClick={() => {
            setActiveTab('console');
            triggerHaptic('light');
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-300"
          title="Back / Deck"
        >
          <div className="w-3.5 h-3.5 border-b-2 border-l-2 border-current transform rotate-45" />
        </button>

        <button
          onClick={() => {
            setActiveTab('console');
            triggerHaptic('light');
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-300"
          title="Home"
        >
          <div className="w-3 h-3 rounded-full border-2 border-current" />
        </button>

        <button
          onClick={() => {
            setActiveTab('terminal');
            triggerHaptic('light');
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-300"
          title="Overview / Terminal"
        >
          <div className="w-3 h-3 border-2 border-current rounded-xs" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#070a0f] flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Top Bar for Desktop Preview with Framing Toggle and Instructions */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-3 px-2">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">
            Android Phone Remote Control & Command Gateway
          </h3>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
            Zero-Trust Gateway
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewFramed(!viewFramed)}
            className="px-2.5 py-1 rounded bg-[#131926] hover:bg-[#1a2334] border border-slate-700 text-xs text-slate-300 transition-colors"
          >
            {viewFramed ? 'Full-Width View' : 'Android Frame View'}
          </button>

          <button
            onClick={() => setShowPairingModal(true)}
            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pair Physical Phone</span>
          </button>

          {onBackToCommandPost && (
            <button
              onClick={onBackToCommandPost}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
            >
              Exit Remote
            </button>
          )}
        </div>
      </div>

      {/* Main Container: Either Mobile Phone Frame OR Full Width Console */}
      {viewFramed ? (
        <div className="relative w-full max-w-[390px] h-[780px] rounded-[48px] p-3.5 bg-[#1a202c] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-4 border-slate-700 flex flex-col items-center">
          {/* Top Speaker & Camera Notch */}
          <div className="absolute top-4 w-28 h-4 bg-black rounded-full flex items-center justify-center space-x-2 z-30">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
            <div className="w-8 h-1 bg-slate-800 rounded-full" />
          </div>

          {/* Screen Bezel and Inner Display */}
          <div className="w-full h-full rounded-[38px] overflow-hidden border border-slate-800 bg-black flex flex-col relative">
            {renderPhoneInterface()}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl h-[750px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-[#0a0e17] flex flex-col">
          {renderPhoneInterface()}
        </div>
      )}

      {/* QR Code & Mobile Pairing Modal */}
      {showPairingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Use Your Personal Android Phone</h4>
              </div>
              <button
                onClick={() => setShowPairingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Open your Android phone camera or browser to pair this secure remote controller session. Any command you execute from your phone will run instantly on the DevAgent server with live feedback.
            </p>

            {/* QR Code Generator representation */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white text-black space-y-2">
              <div className="w-48 h-48 bg-white p-2 flex items-center justify-center">
                <svg viewBox="0 0 29 29" className="w-full h-full text-black" fill="currentColor">
                  {/* Stylized QR Code SVG Pattern */}
                  <path d="M0 0h7v7H0zM2 2v3h3V2zM22 0h7v7h-7zM24 2v3h3V2zM0 22h7v7H0zM2 24v3h3v-3zM9 1h2v1H9zM12 1h1v1h-1zM15 1h1v1h-1zM18 1h3v1h-3zM9 3h1v1H9zM14 3h1v1h-1zM17 3h1v1h-1zM9 5h3v1H9zM14 5h2v1h-2zM17 5h2v1h-2zM1 9h1v1H1zM4 9h2v1H4zM8 9h2v2H8zM12 9h1v3h-1zM15 9h1v2h-1zM18 9h2v1h-2zM21 9h1v1h-1zM24 9h1v1h-1zM27 9h1v1h-1zM1 12h2v1H1zM5 12h1v1H5zM8 12h2v2H8zM14 12h3v1h-3zM19 12h1v1h-1zM22 12h2v1h-2zM26 12h2v1h-2zM1 15h1v1H1zM3 15h2v1H3zM7 15h1v2H7zM10 15h2v1h-2zM14 15h1v1h-1zM16 15h2v2h-2zM20 15h2v1h-2zM24 15h1v1h-1zM26 15h2v1h-2zM9 18h2v2H9zM12 18h1v2h-1zM15 18h3v1h-3zM20 18h1v2h-1zM23 18h2v1h-2zM26 18h1v2h-1zM9 22h1v1H9zM11 22h1v2h-1zM14 22h2v1h-2zM18 22h2v1h-2zM22 22h2v2h-2zM26 22h2v1h-2zM9 25h2v1H9zM13 25h1v1h-1zM16 25h1v2h-1zM19 25h2v1h-2zM25 25h3v2h-3zM9 27h3v1H9zM14 27h1v1h-1zM18 27h1v1h-1zM21 27h2v1h-2z" />
                </svg>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-700">
                Scan with Android Camera
              </span>
            </div>

            {/* Direct Link Copy */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-mono">Mobile Controller Direct URL:</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  readOnly
                  value={mobileLink}
                  className="flex-1 bg-[#161d2d] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-[11px] text-emerald-300 font-mono space-y-1">
              <div>✔ No APK installation required (PWA Web Client)</div>
              <div>✔ Physical haptic vibration supported on Android</div>
              <div>✔ Bound to WireGuard Subnet 10.13.13.5 token</div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowPairingModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
