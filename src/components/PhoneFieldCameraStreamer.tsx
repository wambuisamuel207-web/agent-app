import React, { useEffect, useRef, useState } from 'react';
import {
  Smartphone,
  Camera,
  RotateCcw,
  Zap,
  ZapOff,
  Battery,
  BatteryCharging,
  Radio,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';

export interface PairedPhoneCamera {
  id: string;
  name: string;
  deviceModel: string;
  operatorName: string;
  permissionStatus: 'granted' | 'prompt' | 'denied';
  connectionStatus: 'streaming' | 'standby' | 'disconnected';
  facingMode: 'environment' | 'user';
  batteryPercent: number;
  isCharging: boolean;
  gpsCoords?: { lat: number; lng: number; accuracy?: number };
  torchEnabled: boolean;
  resolution: string;
  fps: number;
  lastActive: string;
  pairingCode: string;
}

export const INITIAL_PAIRED_PHONES: PairedPhoneCamera[] = [
  {
    id: 'phone-patrol-01',
    name: 'Field Patrol Unit 01 (iPhone 15 Pro)',
    deviceModel: 'Apple iPhone 15 Pro (iOS 17.5)',
    operatorName: 'Officer J. Ramos',
    permissionStatus: 'granted',
    connectionStatus: 'streaming',
    facingMode: 'environment',
    batteryPercent: 88,
    isCharging: false,
    gpsCoords: { lat: 37.7765, lng: -122.4178, accuracy: 4 },
    torchEnabled: false,
    resolution: '1080p 60FPS',
    fps: 60,
    lastActive: 'Just now',
    pairingCode: 'PHONE-8492',
  },
  {
    id: 'phone-patrol-02',
    name: 'Tactical Recon Unit 02 (Pixel 8 Pro)',
    deviceModel: 'Google Pixel 8 Pro (Android 14)',
    operatorName: 'Specialist M. Chen',
    permissionStatus: 'granted',
    connectionStatus: 'streaming',
    facingMode: 'environment',
    batteryPercent: 64,
    isCharging: true,
    gpsCoords: { lat: 37.7812, lng: -122.4124, accuracy: 3 },
    torchEnabled: true,
    resolution: '4K 30FPS',
    fps: 30,
    lastActive: 'Just now',
    pairingCode: 'PHONE-3109',
  },
  {
    id: 'phone-patrol-03',
    name: 'Perimeter Inspection Mobile (Galaxy S24)',
    deviceModel: 'Samsung Galaxy S24 Ultra',
    operatorName: 'Inspector K. Vance',
    permissionStatus: 'prompt',
    connectionStatus: 'standby',
    facingMode: 'environment',
    batteryPercent: 92,
    isCharging: false,
    gpsCoords: { lat: 37.7889, lng: -122.4045, accuracy: 6 },
    torchEnabled: false,
    resolution: '1080p 30FPS',
    fps: 30,
    lastActive: '2 min ago',
    pairingCode: 'PHONE-9941',
  },
];

interface PhoneStreamPlayerProps {
  phone: PairedPhoneCamera;
  onRevokePermission?: (phoneId: string) => void;
  onGrantPermission?: (phoneId: string) => void;
  onToggleTorch?: (phoneId: string) => void;
  onToggleCameraFacing?: (phoneId: string) => void;
  isNightVision?: boolean;
  className?: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const PhoneStreamPlayer: React.FC<PhoneStreamPlayerProps> = ({
  phone,
  onRevokePermission,
  onGrantPermission,
  onToggleTorch,
  onToggleCameraFacing,
  isNightVision = false,
  className = '',
  isMaximized = false,
  onToggleMaximize,
}) => {
  const [hudTime, setHudTime] = useState('');
  const [motionDetected, setMotionDetected] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHudTime(now.toTimeString().split(' ')[0] + '.' + Math.floor(now.getMilliseconds() / 100));
    };
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  // Periodic simulated motion telemetry
  useEffect(() => {
    const motionInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setMotionDetected(true);
        setTimeout(() => setMotionDetected(false), 2200);
      }
    }, 6000);
    return () => clearInterval(motionInterval);
  }, []);

  const isGranted = phone.permissionStatus === 'granted';

  return (
    <div
      id={`phone-stream-card-${phone.id}`}
      className={`relative rounded-xl overflow-hidden border ${
        isGranted ? 'border-slate-800 bg-[#090d16]' : 'border-amber-700/60 bg-[#16120b]'
      } flex flex-col group shadow-lg ${className}`}
    >
      {/* Top Header Telemetry */}
      <div className="absolute top-0 inset-x-0 z-20 px-3 py-2 bg-gradient-to-b from-black/85 via-black/50 to-transparent flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-bold text-white tracking-wide truncate max-w-[140px] sm:max-w-xs">
            {phone.name}
          </span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
              isGranted
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                : 'bg-amber-950/80 text-amber-300 border-amber-700/80 animate-pulse'
            }`}
          >
            {isGranted ? 'PERMISSION GRANTED' : 'PERMISSION PENDING'}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-300">
          {/* Battery Status */}
          <div className="flex items-center space-x-1 text-slate-300" title={`Battery: ${phone.batteryPercent}%`}>
            {phone.isCharging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Battery className={`w-3.5 h-3.5 ${phone.batteryPercent < 20 ? 'text-rose-400' : 'text-slate-300'}`} />
            )}
            <span className="text-[10px]">{phone.batteryPercent}%</span>
          </div>

          {/* Torch Indicator */}
          {phone.torchEnabled && (
            <span className="flex items-center space-x-0.5 text-amber-300 text-[10px]" title="Phone Flashlight Active">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="hidden sm:inline">TORCH</span>
            </span>
          )}

          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1 rounded bg-black/50 hover:bg-slate-700 text-slate-300 hover:text-white"
              title={isMaximized ? 'Minimize' : 'Maximize stream'}
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Video View Canvas */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {isGranted && phone.connectionStatus === 'streaming' ? (
          <div className="relative w-full h-full">
            {/* Dynamic Canvas Simulation of Field Stream */}
            <div
              className={`w-full h-full relative transition-all duration-300 ${
                isNightVision ? 'brightness-125 contrast-125 hue-rotate-90 saturate-50' : ''
              }`}
            >
              {/* Synthetic Phone Camera feed view */}
              <div
                className={`w-full h-full flex flex-col items-center justify-center bg-radial from-slate-900 via-[#0a0f1d] to-[#04060a] ${
                  isNightVision ? 'from-emerald-950/40 via-emerald-950/80 to-black' : ''
                }`}
              >
                {/* Moving reticle or camera grid */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 border border-slate-500/20" />
                </div>

                {/* Center target crosshair */}
                <div className="relative z-10 flex flex-col items-center justify-center space-y-2">
                  <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full border border-blue-500/30 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border border-blue-400/60 animate-ping opacity-30" />
                    <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
                    <span className="absolute -bottom-5 text-[9px] font-mono text-blue-300 font-bold tracking-wider">
                      {phone.facingMode === 'environment' ? 'REAR WIDE 24mm' : 'FRONT ULTRA'}
                    </span>
                  </div>
                </div>

                {/* Motion bounding box when motion detected */}
                {motionDetected && (
                  <div className="absolute top-1/3 left-1/4 w-36 h-28 border-2 border-emerald-400 bg-emerald-500/10 rounded pointer-events-none animate-pulse flex flex-col justify-between p-1">
                    <span className="text-[9px] font-mono bg-emerald-950/90 text-emerald-300 px-1 py-0.5 rounded font-bold w-max">
                      HUMAN PATROL: 97.4%
                    </span>
                    <span className="text-[8px] font-mono text-emerald-200 self-end">
                      TRK_ID: #4092
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Night vision green tint overlay */}
            {isNightVision && (
              <div className="absolute inset-0 bg-emerald-500/10 mix-blend-color-dodge pointer-events-none" />
            )}

            {/* Scanlines */}
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-white/5 to-transparent bg-size-[100%_4px] pointer-events-none opacity-20" />

            {/* Bottom HUD bar */}
            <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between text-[10px] font-mono text-slate-300 z-20">
              <div className="space-y-0.5">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>OP: {phone.operatorName}</span>
                </div>
                {phone.gpsCoords && (
                  <div className="text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>
                      {phone.gpsCoords.lat.toFixed(4)}, {phone.gpsCoords.lng.toFixed(4)} (±{phone.gpsCoords.accuracy}m)
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right space-y-0.5">
                <div className="text-emerald-400 font-bold">{hudTime}</div>
                <div className="text-slate-400">{phone.resolution} • {phone.fps} FPS</div>
              </div>
            </div>
          </div>
        ) : (
          /* Permission Prompt State */
          <div className="p-6 text-center flex flex-col items-center justify-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-amber-400 animate-bounce" />
            <div className="space-y-1 max-w-xs">
              <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                Camera Permission Required
              </h4>
              <p className="text-[11px] text-slate-400">
                This mobile unit ({phone.deviceModel}) requires authorized camera access to stream live surveillance footage.
              </p>
            </div>
            {onGrantPermission && (
              <button
                onClick={() => onGrantPermission(phone.id)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Grant Stream Permission</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="p-2 bg-[#0e1422] border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          {/* Flip Lens button */}
          {onToggleCameraFacing && isGranted && (
            <button
              onClick={() => onToggleCameraFacing(phone.id)}
              className="px-2 py-1 rounded bg-[#161f30] hover:bg-[#1e2a42] text-slate-300 hover:text-white border border-slate-700/80 text-[11px] flex items-center gap-1"
              title="Switch between Rear and Front phone camera"
            >
              <RotateCcw className="w-3 h-3 text-blue-400" />
              <span>Flip Lens</span>
            </button>
          )}

          {/* Torch toggle */}
          {onToggleTorch && isGranted && (
            <button
              onClick={() => onToggleTorch(phone.id)}
              className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1 ${
                phone.torchEnabled
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                  : 'bg-[#161f30] border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title="Toggle mobile device torch/flashlight"
            >
              {phone.torchEnabled ? <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> : <ZapOff className="w-3 h-3 text-slate-400" />}
              <span>{phone.torchEnabled ? 'Torch ON' : 'Torch'}</span>
            </button>
          )}
        </div>

        {/* Revoke or Grant button */}
        <div className="flex items-center space-x-1.5">
          {isGranted ? (
            onRevokePermission && (
              <button
                onClick={() => onRevokePermission(phone.id)}
                className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-[11px] transition-colors"
                title="Revoke camera streaming permission"
              >
                Revoke
              </button>
            )
          ) : (
            onGrantPermission && (
              <button
                onClick={() => onGrantPermission(phone.id)}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors"
              >
                Authorize
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export const PhoneFieldCameraStreamer = PhoneStreamPlayer;
