import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Video,
  VideoOff,
  SwitchCamera,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Download,
  FlipHorizontal,
  Settings,
  Shield,
  Radio,
  Activity,
  Bell,
  BellOff,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';

export interface MotionAlertData {
  score: number;
  timestamp: string;
  source: string;
  snapshotUrl?: string;
}

interface DeviceCameraStreamProps {
  isNightVision?: boolean;
  isMotionDetectionEnabled?: boolean;
  onMotionDetected?: (event: MotionAlertData) => void;
  motionSensitivity?: 'low' | 'medium' | 'high';
  enableAudioAlert?: boolean;
  onToggleMotionDetection?: () => void;
  onSnapshotTaken?: (imageDataUrl: string) => void;
  className?: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const DeviceCameraStream: React.FC<DeviceCameraStreamProps> = ({
  isNightVision = false,
  isMotionDetectionEnabled = true,
  onMotionDetected,
  motionSensitivity = 'medium',
  enableAudioAlert = true,
  onToggleMotionDetection,
  onSnapshotTaken,
  className = '',
  isMaximized = false,
  onToggleMaximize,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const motionCheckTimerRef = useRef<number | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [streamResolution, setStreamResolution] = useState<string>('Detecting...');
  const [snapshotSuccess, setSnapshotSuccess] = useState<boolean>(false);

  // Motion Detection States
  const [currentMotionScore, setCurrentMotionScore] = useState<number>(0);
  const [isMotionTriggered, setIsMotionTriggered] = useState<boolean>(false);
  const [motionBox, setMotionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(!enableAudioAlert);
  const [sensitivityLevel, setSensitivityLevel] = useState<'low' | 'medium' | 'high'>(motionSensitivity);

  // Audio beep generator on motion trigger
  const playAlertChime = useCallback(() => {
    if (isSoundMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // AudioContext autoplay restrictions handled silently
    }
  }, [isSoundMuted]);

  // Check camera support on mount
  useEffect(() => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionState('unsupported');
      setErrorMessage('MediaDevices API not supported in this browser environment.');
      return;
    }

    // Try enumerating existing devices
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate media devices:', err);
      });
  }, [selectedDeviceId]);

  // Request & attach user camera stream
  const startCamera = useCallback(async (deviceId?: string) => {
    setErrorMessage(null);

    // Stop any existing stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              width: { ideal: 1920, min: 640 },
              height: { ideal: 1080, min: 480 },
              facingMode: 'user',
            },
        audio: false, // Ensure muted to prevent feedback loop
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch((e) => console.warn('Autoplay prevented:', e));
            setStreamResolution(`${videoRef.current.videoWidth}x${videoRef.current.videoHeight} @ 30fps`);
          }
        };
      }

      setStreamActive(true);
      setPermissionState('granted');

      // Refresh list with full labels now that permission was granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
    } catch (err: any) {
      console.error('Failed to access device camera:', err);
      setStreamActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Camera access was denied by browser settings. Click the camera icon in your browser URL bar to grant permission.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionState('unsupported');
        setErrorMessage('No camera or webcam hardware detected on this device.');
      } else {
        setErrorMessage(`Camera error (${err.name || 'Unknown'}): ${err.message || 'Unable to start stream'}`);
      }
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }, []);

  // Motion detection processing loop
  useEffect(() => {
    if (!streamActive || !isMotionDetectionEnabled) {
      if (motionCheckTimerRef.current) {
        clearInterval(motionCheckTimerRef.current);
        motionCheckTimerRef.current = null;
      }
      prevFrameDataRef.current = null;
      setCurrentMotionScore(0);
      setIsMotionTriggered(false);
      setMotionBox(null);
      return;
    }

    if (!motionCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 80;
      c.height = 60;
      motionCanvasRef.current = c;
    }

    const canvas = motionCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Threshold configs
    const config = {
      high: { pixelDiffThreshold: 18, motionPercentThreshold: 2.0 },
      medium: { pixelDiffThreshold: 24, motionPercentThreshold: 3.5 },
      low: { pixelDiffThreshold: 32, motionPercentThreshold: 6.0 },
    }[sensitivityLevel];

    let resetTriggerTimeout: NodeJS.Timeout | null = null;

    motionCheckTimerRef.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        return;
      }

      const w = 80;
      const h = 60;
      const totalPixels = w * h;

      try {
        ctx.drawImage(video, 0, 0, w, h);
        const frame = ctx.getImageData(0, 0, w, h);
        const data = frame.data;

        if (prevFrameDataRef.current) {
          const prev = prevFrameDataRef.current;
          let changedPixels = 0;
          let minX = w;
          let minY = h;
          let maxX = 0;
          let maxY = 0;

          // Compare pixels luminance
          for (let i = 0; i < data.length; i += 4) {
            const lum1 = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const lum2 = prev[i] * 0.299 + prev[i + 1] * 0.587 + prev[i + 2] * 0.114;
            const diff = Math.abs(lum1 - lum2);

            if (diff > config.pixelDiffThreshold) {
              changedPixels++;
              const pixelIdx = i / 4;
              const px = pixelIdx % w;
              const py = Math.floor(pixelIdx / w);

              if (px < minX) minX = px;
              if (px > maxX) maxX = px;
              if (py < minY) minY = py;
              if (py > maxY) maxY = py;
            }
          }

          const motionPercent = (changedPixels / totalPixels) * 100;
          const displayScore = Math.min(100, Math.round(motionPercent * 3.5));
          setCurrentMotionScore(displayScore);

          if (motionPercent >= config.motionPercentThreshold) {
            setIsMotionTriggered(true);

            // Calculate bounding box in percentages (accounting for mirroring if mirrored)
            let boxX = (minX / w) * 100;
            let boxWidth = Math.max(16, ((maxX - minX) / w) * 100);
            if (isMirrored) {
              boxX = 100 - (boxX + boxWidth);
            }
            const boxY = (minY / h) * 100;
            const boxHeight = Math.max(16, ((maxY - minY) / h) * 100);

            setMotionBox({
              x: Math.max(0, Math.min(84, boxX)),
              y: Math.max(0, Math.min(84, boxY)),
              width: Math.min(95, boxWidth),
              height: Math.min(95, boxHeight),
            });

            // Throttle parent motion alert dispatch (max once per 2.5s)
            const now = Date.now();
            if (now - lastAlertTimeRef.current > 2500) {
              lastAlertTimeRef.current = now;
              playAlertChime();

              if (onMotionDetected) {
                // Generate a lightweight snapshot thumbnail if possible
                let previewDataUrl: string | undefined;
                try {
                  previewDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                } catch {
                  // Ignore preview export if blocked
                }

                onMotionDetected({
                  score: displayScore,
                  timestamp: new Date().toLocaleTimeString() + ' UTC',
                  source: 'Operator Device Camera',
                  snapshotUrl: previewDataUrl,
                });
              }
            }

            if (resetTriggerTimeout) clearTimeout(resetTriggerTimeout);
            resetTriggerTimeout = setTimeout(() => {
              setIsMotionTriggered(false);
              setMotionBox(null);
            }, 1400);
          }
        }

        prevFrameDataRef.current = new Uint8ClampedArray(data);
      } catch (err) {
        console.warn('Motion detection frame error:', err);
      }
    }, 150);

    return () => {
      if (motionCheckTimerRef.current) {
        clearInterval(motionCheckTimerRef.current);
        motionCheckTimerRef.current = null;
      }
      if (resetTriggerTimeout) {
        clearTimeout(resetTriggerTimeout);
      }
    };
  }, [
    streamActive,
    isMotionDetectionEnabled,
    sensitivityLevel,
    isMirrored,
    playAlertChime,
    onMotionDetected,
  ]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (motionCheckTimerRef.current) {
        clearInterval(motionCheckTimerRef.current);
      }
    };
  }, []);

  // Switch camera device
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    if (streamActive) {
      startCamera(newId);
    }
  };

  // Take photo snapshot
  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !streamActive) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/png');
      if (onSnapshotTaken) {
        onSnapshotTaken(dataUrl);
      }

      // Trigger instant download for convenience
      const link = document.createElement('a');
      link.download = `cctv-device-snap-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      link.href = dataUrl;
      link.click();

      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    }
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden border bg-black shadow-2xl flex flex-col justify-between transition-all duration-200 ${
        isMotionTriggered && isMotionDetectionEnabled
          ? 'border-red-500 ring-2 ring-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
          : 'border-emerald-500/50'
      } ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-all ${
          isMirrored ? '-scale-x-100' : 'scale-x-100'
        } ${isNightVision ? 'brightness-125 contrast-150 saturate-0 hue-rotate-90 filter drop-shadow-green' : ''} ${
          !streamActive ? 'hidden' : 'block'
        }`}
      />

      {/* Dynamic Motion Detection Bounding Box Overlay */}
      {streamActive && isMotionDetectionEnabled && isMotionTriggered && motionBox && (
        <div
          className="absolute border-2 border-red-500 bg-red-500/15 pointer-events-none transition-all duration-150 z-20 rounded"
          style={{
            left: `${motionBox.x}%`,
            top: `${motionBox.y}%`,
            width: `${motionBox.width}%`,
            height: `${motionBox.height}%`,
          }}
        >
          <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[9px] font-mono font-bold whitespace-nowrap shadow-md flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 text-amber-300 animate-bounce" />
            <span>MOTION TARGET ({currentMotionScore}%)</span>
          </div>
        </div>
      )}

      {/* Motion Trigger Perimeter Flash */}
      {streamActive && isMotionDetectionEnabled && isMotionTriggered && (
        <div className="absolute inset-0 bg-red-500/10 pointer-events-none z-10 animate-pulse border-2 border-red-500/60" />
      )}

      {/* IR Night Vision Filter Overlay */}
      {isNightVision && streamActive && (
        <div className="absolute inset-0 bg-emerald-950/40 mix-blend-color-dodge pointer-events-none" />
      )}

      {/* Scanline Raster Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16, 185, 129, 0.12) 2px, rgba(16, 185, 129, 0.12) 4px)',
        }}
      />

      {/* Crosshair Center Reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-14 h-14 border border-emerald-400/50 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>
      </div>

      {/* Corner Brackets */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400/80 pointer-events-none" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400/80 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400/80 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400/80 pointer-events-none" />

      {/* Inactive or Permission Denied Prompt State */}
      {!streamActive && (
        <div className="absolute inset-0 bg-[#070d17] flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg">
            <Camera className="w-7 h-7" />
          </div>

          <div className="max-w-md space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              Operator Device Camera Integration
            </div>
            <h4 className="text-base font-bold text-white tracking-tight">
              Connect Local Webcam / Phone Camera
            </h4>
            <p className="text-xs text-slate-400">
              Streams your live physical device camera securely into the Zero-Trust CCTV grid with real-time HUD telemetry and motion analysis.
            </p>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2 text-left max-w-sm">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              id="activate-device-camera-btn"
              onClick={() => startCamera(selectedDeviceId)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Allow & Activate Camera</span>
            </button>

            {availableDevices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="bg-[#121927] border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-hidden"
              >
                {availableDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Top HUD Overlay */}
      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono pointer-events-none z-30">
        <div className="flex items-center space-x-2">
          <span
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border font-semibold shadow-sm ${
              isMotionTriggered && isMotionDetectionEnabled
                ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
                : 'bg-black/80 border-emerald-500/60 text-white'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !streamActive
                  ? 'bg-slate-500'
                  : isMotionTriggered
                  ? 'bg-red-500 animate-ping'
                  : 'bg-red-500 animate-pulse'
              }`}
            />
            <span>
              {isMotionTriggered && isMotionDetectionEnabled
                ? `MOTION ALERT (${currentMotionScore}%)`
                : streamActive
                ? 'LIVE REC'
                : 'OFFLINE'}
            </span>
          </span>
          <span className="px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-emerald-400 font-semibold truncate max-w-[170px] sm:max-w-xs shadow-sm">
            CAM 01: Operator Device Camera
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Motion Activity Meter (HUD) */}
          {streamActive && isMotionDetectionEnabled && (
            <div className="hidden sm:flex items-center space-x-1.5 px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-slate-300">
              <Activity className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-slate-400">DISPLACEMENT:</span>
              <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    currentMotionScore > 40
                      ? 'bg-red-500'
                      : currentMotionScore > 15
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, currentMotionScore)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-emerald-400">{currentMotionScore}%</span>
            </div>
          )}

          <span className="px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-slate-300 hidden sm:inline shadow-sm">
            {streamResolution}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-600/80 text-emerald-300 font-bold shadow-sm">
            DEVICE LOCAL
          </span>
        </div>
      </div>

      {/* Interactive Controls Overlay Bar (Bottom) */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between z-30 pointer-events-auto">
        {/* Left Side: Device Selection & Motion Indicators */}
        <div className="flex items-center space-x-1.5 text-[10px] font-mono">
          {streamActive && (
            <div className="px-2 py-1 rounded bg-black/85 border border-slate-800 text-emerald-300 flex items-center gap-1.5 shadow-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Feed Active</span>
            </div>
          )}

          {/* Quick Motion Detection Toggle on Camera Stream */}
          {streamActive && (
            <button
              onClick={() => {
                if (onToggleMotionDetection) {
                  onToggleMotionDetection();
                }
              }}
              className={`px-2 py-1 rounded flex items-center gap-1 border transition-colors ${
                isMotionDetectionEnabled
                  ? isMotionTriggered
                    ? 'bg-red-950 text-red-200 border-red-500 font-bold animate-pulse'
                    : 'bg-amber-950/80 text-amber-300 border-amber-600/70'
                  : 'bg-black/80 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={
                isMotionDetectionEnabled
                  ? 'Motion Detection is ACTIVE. Click to pause.'
                  : 'Motion Detection is PAUSED. Click to activate.'
              }
            >
              <Activity className="w-3 h-3 text-amber-400" />
              <span>Motion: {isMotionDetectionEnabled ? 'Armed' : 'Off'}</span>
            </button>
          )}

          {/* Motion Audio Chime Toggle */}
          {streamActive && isMotionDetectionEnabled && (
            <button
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              className={`p-1 rounded bg-black/85 border transition-colors ${
                !isSoundMuted ? 'border-amber-500/70 text-amber-300' : 'border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={isSoundMuted ? 'Unmute Motion Alarm Chime' : 'Mute Motion Alarm Chime'}
            >
              {!isSoundMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            </button>
          )}

          {/* Sensitivity Selector */}
          {streamActive && isMotionDetectionEnabled && (
            <select
              value={sensitivityLevel}
              onChange={(e) => setSensitivityLevel(e.target.value as any)}
              className="bg-black/85 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-1 focus:border-amber-500 focus:outline-hidden"
              title="Motion Detection Sensitivity"
            >
              <option value="high">Sens: High (2%)</option>
              <option value="medium">Sens: Med (3.5%)</option>
              <option value="low">Sens: Low (6%)</option>
            </select>
          )}

          {availableDevices.length > 1 && streamActive && (
            <select
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="bg-black/85 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-1 focus:border-emerald-500 focus:outline-hidden"
              title="Switch Camera Sensor"
            >
              {availableDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Sensor ${i + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right Side Action Buttons */}
        <div className="flex items-center space-x-1.5">
          {streamActive ? (
            <>
              {/* Flip/Mirror Video */}
              <button
                onClick={() => setIsMirrored(!isMirrored)}
                className={`p-1.5 rounded bg-black/85 border transition-colors ${
                  isMirrored ? 'border-emerald-500/60 text-emerald-300' : 'border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Mirror / Flip Camera Feed"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Take Photo Snapshot */}
              <button
                onClick={handleCaptureSnapshot}
                className="p-1.5 rounded bg-black/85 border border-slate-700 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/60 transition-colors"
                title="Capture & Download Snapshot"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Stop Stream Button */}
              <button
                onClick={stopCamera}
                className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-[10px] font-semibold transition-colors flex items-center gap-1"
                title="Stop Camera Feed"
              >
                <VideoOff className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => startCamera(selectedDeviceId)}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold transition-colors flex items-center gap-1"
            >
              <Video className="w-3 h-3" />
              <span>Connect</span>
            </button>
          )}

          {/* Maximize Toggle */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded bg-black/85 border border-slate-700 text-emerald-400 hover:bg-slate-800 transition-colors"
              title={isMaximized ? 'Restore View' : 'Maximize Stream'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Snapshot Toast notification */}
      {snapshotSuccess && (
        <div className="absolute top-12 right-3 z-40 px-3 py-1.5 rounded-lg bg-emerald-950/95 border border-emerald-500 text-emerald-300 text-xs font-mono flex items-center gap-1.5 shadow-xl animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Snapshot downloaded</span>
        </div>
      )}
    </div>
  );
};
