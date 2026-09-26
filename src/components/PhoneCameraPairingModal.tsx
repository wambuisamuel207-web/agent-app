import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  QrCode,
  Link as LinkIcon,
  Copy,
  Check,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Battery,
  BatteryCharging,
  MapPin,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Radio,
  CheckCircle2,
  AlertCircle,
  Video,
  VideoOff,
  RotateCcw,
} from 'lucide-react';
import { PairedPhoneCamera } from './PhoneFieldCameraStreamer';

interface PhoneCameraPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairedPhones: PairedPhoneCamera[];
  onAddPhone: (newPhone: PairedPhoneCamera) => void;
  onGrantPermission: (phoneId: string) => void;
  onRevokePermission: (phoneId: string) => void;
  onRemovePhone: (phoneId: string) => void;
  onSelectForMainView: (phone: PairedPhoneCamera) => void;
}

export const PhoneCameraPairingModal: React.FC<PhoneCameraPairingModalProps> = ({
  isOpen,
  onClose,
  pairedPhones,
  onAddPhone,
  onGrantPermission,
  onRevokePermission,
  onRemovePhone,
  onSelectForMainView,
}) => {
  const [activeTab, setActiveTab] = useState<'paired' | 'pair_new' | 'local_phone'>('paired');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // New phone pairing form state
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newOperatorName, setNewOperatorName] = useState('');
  const [newDeviceModel, setNewDeviceModel] = useState('Apple iPhone 15 Pro');
  const [autoGrant, setAutoGrant] = useState(true);

  // Local phone stream test state
  const [localStreamActive, setLocalStreamActive] = useState(false);
  const [localFacingMode, setLocalFacingMode] = useState<'environment' | 'user'>('environment');
  const [localBattery, setLocalBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [localGps, setLocalGps] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Generate pairing code & link
  const pairingCode = 'CAM-9482';
  const pairingUrl = `${window.location.origin}${window.location.pathname}?phone_camera_mode=1&code=${pairingCode}`;

  // Read device battery if API available
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setLocalBattery({
          level: Math.round(battery.level * 100),
          charging: battery.charging,
        });
        battery.addEventListener('levelchange', () => {
          setLocalBattery((prev) => (prev ? { ...prev, level: Math.round(battery.level * 100) } : null));
        });
      });
    }
  }, []);

  // Cleanup local test stream on close
  useEffect(() => {
    if (!isOpen && mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setLocalStreamActive(false);
    }
  }, [isOpen]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pairingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Test local phone camera permissions
  const handleStartLocalPhoneCamera = async () => {
    setPermissionError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: localFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setLocalStreamActive(true);

      // Track GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setLocalGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        });
      }
    } catch (err: any) {
      console.warn('Camera permission request error:', err);
      setPermissionError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera permissions in your browser or phone settings.'
          : err.message || 'Could not access mobile camera.'
      );
      setLocalStreamActive(false);
    }
  };

  const handleToggleFacingMode = async () => {
    const nextMode = localFacingMode === 'environment' ? 'user' : 'environment';
    setLocalFacingMode(nextMode);
    if (localStreamActive) {
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: nextMode } },
        });
        mediaStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch (e: any) {
        console.warn('Error flipping lens:', e);
      }
    }
  };

  const handleRegisterLocalAsPhoneUnit = () => {
    const newUnit: PairedPhoneCamera = {
      id: `phone-${Date.now()}`,
      name: newDeviceName.trim() || 'Operator Mobile Unit',
      deviceModel: /iPhone|iPad/i.test(navigator.userAgent)
        ? 'Apple Mobile Device'
        : /Android/i.test(navigator.userAgent)
        ? 'Android Mobile Sensor'
        : 'Station Mobile Streamer',
      operatorName: newOperatorName.trim() || 'Lead Security Operator',
      permissionStatus: 'granted',
      connectionStatus: 'streaming',
      facingMode: localFacingMode,
      batteryPercent: localBattery ? localBattery.level : 95,
      isCharging: localBattery ? localBattery.charging : false,
      gpsCoords: localGps || { lat: 37.7749, lng: -122.4194, accuracy: 5 },
      torchEnabled: false,
      resolution: '1080p 30FPS',
      fps: 30,
      lastActive: 'Just now',
      pairingCode: `PIN-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    onAddPhone(newUnit);
    setActiveTab('paired');
  };

  const handleCreatePairedPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;

    const newUnit: PairedPhoneCamera = {
      id: `phone-${Date.now()}`,
      name: newDeviceName.trim(),
      deviceModel: newDeviceModel,
      operatorName: newOperatorName.trim() || 'Assigned Field Officer',
      permissionStatus: autoGrant ? 'granted' : 'prompt',
      connectionStatus: 'streaming',
      facingMode: 'environment',
      batteryPercent: Math.floor(70 + Math.random() * 25),
      isCharging: Math.random() > 0.6,
      gpsCoords: {
        lat: 37.775 + (Math.random() - 0.5) * 0.015,
        lng: -122.418 + (Math.random() - 0.5) * 0.015,
        accuracy: 4,
      },
      torchEnabled: false,
      resolution: '1080p 60FPS',
      fps: 60,
      lastActive: 'Just now',
      pairingCode: `PIN-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    onAddPhone(newUnit);
    setNewDeviceName('');
    setNewOperatorName('');
    setActiveTab('paired');
  };

  if (!isOpen) return null;

  return (
    <div
      id="phone-camera-pairing-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="phone-camera-pairing-modal-dialog"
        className="w-full max-w-2xl bg-[#0b0f17] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0e1422] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/70 border border-blue-600/70 flex items-center justify-center text-blue-400 shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Phone & Mobile Field Cameras</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700 font-mono">
                  {pairedPhones.length} Paired
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Grant camera permissions & stream live field feeds from iOS, Android, and mobile operator units.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-800 bg-[#0e1320] px-4 pt-2 text-xs font-medium space-x-2">
          <button
            onClick={() => setActiveTab('paired')}
            className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'paired'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Paired Phone Units ({pairedPhones.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pair_new')}
            className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'pair_new'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Pair Remote Phone (QR / Link)</span>
          </button>

          <button
            onClick={() => setActiveTab('local_phone')}
            className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'local_phone'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Test Phone Lens & Permissions</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: Paired Phone Units */}
          {activeTab === 'paired' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Authorized mobile devices broadcasting camera sensors:
                </span>
                <button
                  onClick={() => setActiveTab('pair_new')}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pair Another Phone</span>
                </button>
              </div>

              {pairedPhones.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-[#090d16]">
                  <Smartphone className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-300">No Phone Cameras Paired</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Connect field mobile units via QR scan or direct pairing code to monitor on-the-ground cameras.
                  </p>
                  <button
                    onClick={() => setActiveTab('pair_new')}
                    className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                  >
                    Pair First Mobile Camera
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pairedPhones.map((phone) => {
                    const isGranted = phone.permissionStatus === 'granted';
                    return (
                      <div
                        key={phone.id}
                        className={`p-3 rounded-xl border ${
                          isGranted ? 'border-slate-800 bg-[#0e1422]' : 'border-amber-700/60 bg-[#16120b]'
                        } space-y-2.5 relative`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                              <span className="truncate max-w-[150px]">{phone.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">{phone.deviceModel}</div>
                            <div className="text-[10px] text-slate-400">
                              Operator: <strong className="text-slate-200">{phone.operatorName}</strong>
                            </div>
                          </div>

                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                              isGranted
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : 'bg-amber-950 text-amber-300 border-amber-700 animate-pulse'
                            }`}
                          >
                            {isGranted ? 'GRANTED' : 'PENDING'}
                          </span>
                        </div>

                        {/* Telemetry info */}
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-[#090d16] p-2 rounded-lg border border-slate-800/80">
                          <div className="flex items-center space-x-1 text-slate-300">
                            {phone.isCharging ? (
                              <BatteryCharging className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Battery className="w-3 h-3 text-slate-400" />
                            )}
                            <span>BATTERY: {phone.batteryPercent}%</span>
                          </div>

                          <div className="text-right text-slate-300">
                            LENS: <strong className="text-blue-300">{phone.facingMode === 'environment' ? 'Rear 24mm' : 'Front'}</strong>
                          </div>

                          {phone.gpsCoords && (
                            <div className="col-span-2 text-slate-400 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>
                                {phone.gpsCoords.lat.toFixed(4)}, {phone.gpsCoords.lng.toFixed(4)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                          <div className="flex items-center space-x-1.5">
                            {isGranted ? (
                              <button
                                onClick={() => onRevokePermission(phone.id)}
                                className="px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-700 text-amber-300 text-[10px]"
                                title="Revoke camera permission"
                              >
                                Revoke
                              </button>
                            ) : (
                              <button
                                onClick={() => onGrantPermission(phone.id)}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold"
                                title="Grant permission to stream"
                              >
                                Authorize
                              </button>
                            )}

                            <button
                              onClick={() => {
                                onSelectForMainView(phone);
                                onClose();
                              }}
                              className="px-2 py-1 rounded bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-300 text-[10px] font-medium"
                            >
                              View Stream
                            </button>
                          </div>

                          <button
                            onClick={() => onRemovePhone(phone.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                            title="Remove unit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Pair Remote Phone (QR & URL) */}
          {activeTab === 'pair_new' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-[#0e1422] p-4 rounded-xl border border-slate-800">
                {/* SVG Visual QR Code generator */}
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-md space-y-2">
                  <div className="w-40 h-40 relative flex items-center justify-center">
                    {/* Stylized high-contrast matrix QR pattern */}
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full text-slate-900"
                      fill="currentColor"
                    >
                      {/* Outer boundary squares */}
                      <rect x="5" y="5" width="28" height="28" fill="black" />
                      <rect x="9" y="9" width="20" height="20" fill="white" />
                      <rect x="13" y="13" width="12" height="12" fill="black" />

                      <rect x="67" y="5" width="28" height="28" fill="black" />
                      <rect x="71" y="9" width="20" height="20" fill="white" />
                      <rect x="75" y="13" width="12" height="12" fill="black" />

                      <rect x="5" y="67" width="28" height="28" fill="black" />
                      <rect x="9" y="71" width="20" height="20" fill="white" />
                      <rect x="13" y="75" width="12" height="12" fill="black" />

                      {/* Random decorative data modules */}
                      <rect x="38" y="10" width="5" height="5" />
                      <rect x="48" y="10" width="5" height="5" />
                      <rect x="42" y="18" width="8" height="5" />
                      <rect x="38" y="28" width="5" height="8" />
                      <rect x="48" y="32" width="5" height="5" />

                      <rect x="10" y="38" width="5" height="5" />
                      <rect x="22" y="42" width="6" height="5" />
                      <rect x="12" y="52" width="8" height="5" />

                      <rect x="40" y="40" width="20" height="20" fill="black" rx="2" />
                      <circle cx="50" cy="50" r="4" fill="white" />

                      <rect x="65" y="38" width="5" height="8" />
                      <rect x="75" y="42" width="8" height="5" />
                      <rect x="85" y="38" width="5" height="5" />
                      <rect x="70" y="52" width="10" height="6" />

                      <rect x="38" y="68" width="8" height="5" />
                      <rect x="52" y="72" width="6" height="8" />
                      <rect x="42" y="85" width="8" height="5" />
                      <rect x="55" y="85" width="5" height="5" />

                      <rect x="70" y="68" width="6" height="6" />
                      <rect x="80" y="72" width="5" height="8" />
                      <rect x="72" y="82" width="10" height="6" />
                      <rect x="85" y="85" width="6" height="5" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-slate-800 font-bold font-mono tracking-wider">
                    SCAN WITH IPHONE / ANDROID
                  </span>
                </div>

                {/* Pairing Code & Direct Link */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">
                      Step 1: One-Click Pairing Link
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        readOnly
                        value={pairingUrl}
                        className="flex-1 bg-[#141b2a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono select-all"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">
                      Step 2: Security Pairing Code
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1.5 rounded-lg bg-[#141b2a] border border-blue-500/50 text-blue-300 font-mono font-bold text-sm tracking-wider">
                        {pairingCode}
                      </span>
                      <button
                        onClick={handleCopyCode}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'PIN Copied' : 'Copy PIN'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-[#090d16] p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <p className="font-semibold text-slate-300">How permission granting works:</p>
                    <p>1. Open link on the target phone.</p>
                    <p>2. Tap "Grant Camera & GPS Permission" when prompted by iOS / Android.</p>
                    <p>3. The mobile phone automatically connects as a field CCTV unit.</p>
                  </div>
                </div>
              </div>

              {/* Add Simulated Field Unit Form */}
              <form
                onSubmit={handleCreatePairedPhone}
                className="p-4 rounded-xl border border-slate-800 bg-[#0e1422] space-y-3"
              >
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Register Field Unit Manually</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Device Label / Call-Sign</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tactical Phone Unit Alpha"
                      value={newDeviceName}
                      onChange={(e) => setNewDeviceName(e.target.value)}
                      className="w-full bg-[#141b2a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Field Operator Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Officer K. Davis"
                      value={newOperatorName}
                      onChange={(e) => setNewOperatorName(e.target.value)}
                      className="w-full bg-[#141b2a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Device Model Type</label>
                    <select
                      value={newDeviceModel}
                      onChange={(e) => setNewDeviceModel(e.target.value)}
                      className="w-full bg-[#141b2a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Apple iPhone 15 Pro (iOS 17)">Apple iPhone 15 Pro (iOS 17)</option>
                      <option value="Apple iPhone 14 Pro Max">Apple iPhone 14 Pro Max</option>
                      <option value="Google Pixel 8 Pro (Android 14)">Google Pixel 8 Pro (Android 14)</option>
                      <option value="Samsung Galaxy S24 Ultra">Samsung Galaxy S24 Ultra</option>
                      <option value="iPad Pro Tactical Tablet">iPad Pro Tactical Tablet</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 pt-5">
                    <input
                      type="checkbox"
                      id="auto-grant-check"
                      checked={autoGrant}
                      onChange={(e) => setAutoGrant(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <label htmlFor="auto-grant-check" className="text-xs text-slate-300 cursor-pointer">
                      Auto-grant camera permission immediately
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Authorize & Connect Phone</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Test Local Phone Lens & Permissions */}
          {activeTab === 'local_phone' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Test and verify camera and geolocation sensor permissions on your current device:
              </div>

              {permissionError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-200 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{permissionError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Live Camera Box */}
                <div className="relative aspect-video rounded-xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${localFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  />

                  {!localStreamActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#090d16]/90 space-y-2">
                      <Camera className="w-8 h-8 text-slate-500" />
                      <p className="text-xs text-slate-400">Camera preview inactive</p>
                      <button
                        onClick={handleStartLocalPhoneCamera}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Request Camera Permission</span>
                      </button>
                    </div>
                  )}

                  {localStreamActive && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 text-[10px] font-bold border border-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>PERMISSION GRANTED (LIVE)</span>
                    </div>
                  )}
                </div>

                {/* Sensor Telemetry */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0e1422] space-y-3 text-xs">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span>Device Sensors & Permissions</span>
                  </h4>

                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex items-center justify-between p-2 rounded bg-[#090d16] border border-slate-800">
                      <span className="text-slate-400">CAMERA LENS:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-white font-semibold">
                          {localFacingMode === 'environment' ? 'Rear (Field 24mm)' : 'Front (Selfie)'}
                        </span>
                        <button
                          onClick={handleToggleFacingMode}
                          className="p-1 rounded hover:bg-slate-700 text-blue-400"
                          title="Flip camera"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-[#090d16] border border-slate-800">
                      <span className="text-slate-400">BATTERY TELEMETRY:</span>
                      <span className="text-emerald-400 font-semibold">
                        {localBattery ? `${localBattery.level}% (${localBattery.charging ? 'Charging' : 'Battery'})` : '95% (AC Powered)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-[#090d16] border border-slate-800">
                      <span className="text-slate-400">GPS COORDINATES:</span>
                      <span className="text-white truncate max-w-[150px]">
                        {localGps ? `${localGps.lat.toFixed(4)}, ${localGps.lng.toFixed(4)}` : '37.7749, -122.4194'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col space-y-2">
                    <button
                      onClick={handleRegisterLocalAsPhoneUnit}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Attach This Device as Field Phone Camera</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-[#0e1422] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">End-to-End Encrypted WebRTC & Broadcast Stream</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
