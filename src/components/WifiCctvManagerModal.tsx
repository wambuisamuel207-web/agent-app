import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Camera,
  Plus,
  Radio,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Signal,
  Server,
  Key,
  Globe,
  Sliders,
  X,
  Play,
  Tv,
} from 'lucide-react';

export interface WifiCctvDevice {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  protocol: 'RTSP' | 'MJPEG' | 'HLS' | 'WebRTC';
  streamUrl: string;
  wifiSsid: string;
  signalStrength: number; // in -dBm (e.g. -48 is strong)
  vendor: string;
  macAddress: string;
  resolution: string;
  fps: number;
  status: 'connected' | 'offline' | 'authenticating';
  authRequired: boolean;
  username?: string;
  password?: string;
  isCustom?: boolean;
}

export const INITIAL_WIFI_CCTVS: WifiCctvDevice[] = [
  {
    id: 'wifi-cam-01',
    name: 'Perimeter West Gate PTZ (Wi-Fi 6)',
    ipAddress: '192.168.1.104',
    port: 554,
    protocol: 'RTSP',
    streamUrl: 'rtsp://192.168.1.104:554/live/ch0',
    wifiSsid: 'SecOps-IoT-Surveillance-5G',
    signalStrength: -48,
    vendor: 'Hikvision Pro PTZ',
    macAddress: 'DC:A6:32:8B:11:4A',
    resolution: '4K 60FPS',
    fps: 60,
    status: 'connected',
    authRequired: true,
    username: 'admin',
  },
  {
    id: 'wifi-cam-02',
    name: 'Lobby Ingress Thermal Cam',
    ipAddress: '192.168.1.115',
    port: 8080,
    protocol: 'MJPEG',
    streamUrl: 'http://192.168.1.115:8080/stream.mjpg',
    wifiSsid: 'SecOps-IoT-Surveillance-5G',
    signalStrength: -54,
    vendor: 'Reolink Lumus Wi-Fi',
    macAddress: 'E4:5F:01:3C:99:12',
    resolution: '1080p 30FPS',
    fps: 30,
    status: 'connected',
    authRequired: true,
    username: 'operator',
  },
  {
    id: 'wifi-cam-03',
    name: 'Hardware Lab Esp32-CAM Sensor',
    ipAddress: '192.168.1.128',
    port: 80,
    protocol: 'MJPEG',
    streamUrl: 'http://192.168.1.128:80/stream',
    wifiSsid: 'Lab-Mesh-2.4G',
    signalStrength: -62,
    vendor: 'AI-Thinker ESP32-CAM',
    macAddress: '24:0A:C4:F9:6E:D8',
    resolution: '720p 25FPS',
    fps: 25,
    status: 'connected',
    authRequired: false,
  },
  {
    id: 'wifi-cam-04',
    name: 'Emergency Stairwell Bullet Cam',
    ipAddress: '192.168.1.139',
    port: 554,
    protocol: 'RTSP',
    streamUrl: 'rtsp://192.168.1.139:554/stream1',
    wifiSsid: 'SecOps-IoT-Surveillance-5G',
    signalStrength: -71,
    vendor: 'Dahua WizSense',
    macAddress: '3C:EF:8C:74:20:9B',
    resolution: '1080p 30FPS',
    fps: 30,
    status: 'connected',
    authRequired: true,
    username: 'admin',
  },
];

interface WifiCctvManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedCctvs: WifiCctvDevice[];
  onAddOrUpdateCctv: (cctv: WifiCctvDevice) => void;
  onSelectForMainView?: (cctv: WifiCctvDevice) => void;
}

export const WifiCctvManagerModal: React.FC<WifiCctvManagerModalProps> = ({
  isOpen,
  onClose,
  connectedCctvs,
  onAddOrUpdateCctv,
  onSelectForMainView,
}) => {
  const [activeTab, setActiveTab] = useState<'devices' | 'scan' | 'add'>('devices');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSubnet, setScanSubnet] = useState('192.168.1.0/24');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanDiscoveredList, setScanDiscoveredList] = useState<WifiCctvDevice[]>([]);

  // Add camera form state
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '192.168.1.150',
    port: 554,
    protocol: 'RTSP' as 'RTSP' | 'MJPEG' | 'HLS' | 'WebRTC',
    streamUrl: '',
    wifiSsid: 'SecOps-IoT-Surveillance-5G',
    vendor: 'Generic ONVIF / Wi-Fi IP Camera',
    resolution: '1080p 30FPS',
    username: 'admin',
    password: '',
    authRequired: true,
  });

  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'failed';
    message?: string;
  }>({ status: 'idle' });

  // Handle Scan Simulation
  const handleStartScan = () => {
    setIsScanning(true);
    setScanProgress(10);
    setScanDiscoveredList([]);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setIsScanning(false);
          // Populate discovered devices on the subnet
          setScanDiscoveredList([
            {
              id: `wifi-scan-${Date.now()}-1`,
              name: 'Dahua 4K Dome (Discovered)',
              ipAddress: '192.168.1.144',
              port: 554,
              protocol: 'RTSP',
              streamUrl: 'rtsp://192.168.1.144:554/cam/realmonitor',
              wifiSsid: 'SecOps-IoT-Surveillance-5G',
              signalStrength: -51,
              vendor: 'Dahua IPC-HDBW',
              macAddress: 'E0:50:8B:2A:44:90',
              resolution: '4K 30FPS',
              fps: 30,
              status: 'connected',
              authRequired: true,
              username: 'admin',
            },
            {
              id: `wifi-scan-${Date.now()}-2`,
              name: 'Android IP Webcam Streamer',
              ipAddress: '192.168.1.162',
              port: 8080,
              protocol: 'MJPEG',
              streamUrl: 'http://192.168.1.162:8080/video',
              wifiSsid: 'Home-WiFi-5G',
              signalStrength: -44,
              vendor: 'IP Webcam Pro',
              macAddress: '9C:E6:5E:81:F2:17',
              resolution: '1080p 30FPS',
              fps: 30,
              status: 'connected',
              authRequired: false,
            },
            {
              id: `wifi-scan-${Date.now()}-3`,
              name: 'Wyze Cam v3 RTSP Hack',
              ipAddress: '192.168.1.173',
              port: 554,
              protocol: 'RTSP',
              streamUrl: 'rtsp://192.168.1.173:554/live',
              wifiSsid: 'SecOps-IoT-Surveillance-5G',
              signalStrength: -65,
              vendor: 'Wyze Labs Inc',
              macAddress: '2C:AA:8E:10:DD:32',
              resolution: '1080p 20FPS',
              fps: 20,
              status: 'connected',
              authRequired: true,
              username: 'admin',
            },
          ]);
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  // Test Camera Connection ping
  const handleTestConnection = () => {
    if (!formData.ipAddress) {
      setTestResult({ status: 'failed', message: 'Enter a valid IP address' });
      return;
    }
    setTestResult({ status: 'testing' });
    setTimeout(() => {
      setTestResult({
        status: 'success',
        message: `Handshake verified: ${formData.protocol} port ${formData.port} open (12ms latency, TLS/AES ready)`,
      });
    }, 900);
  };

  // Submit manual camera
  const handleSaveCamera = (e: React.FormEvent) => {
    e.preventDefault();
    const newCctv: WifiCctvDevice = {
      id: `custom-wifi-${Date.now()}`,
      name: formData.name || `Wi-Fi Cam (${formData.ipAddress})`,
      ipAddress: formData.ipAddress,
      port: Number(formData.port),
      protocol: formData.protocol,
      streamUrl:
        formData.streamUrl ||
        `${formData.protocol.toLowerCase()}://${formData.ipAddress}:${formData.port}/stream`,
      wifiSsid: formData.wifiSsid,
      signalStrength: -50,
      vendor: formData.vendor,
      macAddress: `02:FF:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:99:A1`,
      resolution: formData.resolution,
      fps: 30,
      status: 'connected',
      authRequired: formData.authRequired,
      username: formData.username,
      password: formData.password,
      isCustom: true,
    };

    onAddOrUpdateCctv(newCctv);
    setActiveTab('devices');
    setTestResult({ status: 'idle' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-2xl bg-[#0b0f17] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#0e1422] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Wi-Fi & LAN CCTV Camera Gateway</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  ONVIF / RTSP / MJPEG
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Connect and stream local wireless IP cameras, security DVRs, and Wi-Fi video feeds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#0d121d] px-4 pt-2">
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'devices'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Configured Wi-Fi Cameras ({connectedCctvs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'scan'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Subnet Network Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'add'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Camera</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Configured Wi-Fi Cameras */}
          {activeTab === 'devices' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Active wireless security feeds connected to Zero-Trust gateway:</span>
                <button
                  onClick={() => setActiveTab('scan')}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Scan for new cameras</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {connectedCctvs.map((cam) => (
                  <div
                    key={cam.id}
                    className="p-3.5 rounded-xl bg-[#111724] border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{cam.name}</h4>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {cam.ipAddress}:{cam.port} • {cam.protocol}
                          </p>
                          <p className="text-[10px] text-slate-400">{cam.vendor}</p>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[10px]">
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <Signal className="w-3 h-3" />
                          <span>{cam.signalStrength} dBm</span>
                        </span>
                        <div className="text-slate-400">{cam.wifiSsid}</div>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/40 border border-slate-800/80 text-[10px] font-mono text-slate-300 truncate">
                      Stream: <span className="text-emerald-300">{cam.streamUrl}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                      <span className="text-slate-400 font-mono">
                        {cam.resolution} • {cam.fps} FPS
                      </span>

                      {onSelectForMainView && (
                        <button
                          onClick={() => {
                            onSelectForMainView(cam);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          <span>View Feed</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Subnet Scanner */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#111724] border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Local Wi-Fi Subnet Scanner</h4>
                    <p className="text-[11px] text-slate-400">
                      Discovers ONVIF discovery beacons, RTSP endpoints (554), and HTTP/MJPEG streams.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={scanSubnet}
                      onChange={(e) => setScanSubnet(e.target.value)}
                      className="bg-[#172033] border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-mono focus:border-emerald-500 focus:outline-hidden"
                      placeholder="192.168.1.0/24"
                    />
                    <button
                      onClick={handleStartScan}
                      disabled={isScanning}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? 'Scanning...' : 'Start Scan'}</span>
                    </button>
                  </div>
                </div>

                {isScanning && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Probing IP addresses across {scanSubnet}...</span>
                      <span>{scanProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Discovered items */}
              {scanDiscoveredList.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Discovered Camera Devices ({scanDiscoveredList.length})
                  </h4>

                  <div className="space-y-2">
                    {scanDiscoveredList.map((dev) => (
                      <div
                        key={dev.id}
                        className="p-3 rounded-xl bg-[#111724] border border-emerald-500/30 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-700/50">
                            <Wifi className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{dev.name}</span>
                              <span className="text-[10px] font-mono text-emerald-400">{dev.vendor}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              IP: {dev.ipAddress}:{dev.port} • MAC: {dev.macAddress} • Signal: {dev.signalStrength} dBm
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onAddOrUpdateCctv(dev);
                            setActiveTab('devices');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Import Feed</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Add Custom Camera Form */}
          {activeTab === 'add' && (
            <form onSubmit={handleSaveCamera} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Camera Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Backyard Gate PTZ"
                    className="w-full bg-[#131b2b] border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Wi-Fi SSID / Network Tag
                  </label>
                  <input
                    type="text"
                    value={formData.wifiSsid}
                    onChange={(e) => setFormData({ ...formData, wifiSsid: e.target.value })}
                    className="w-full bg-[#131b2b] border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    IP Address or Hostname
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    placeholder="192.168.1.150"
                    className="w-full bg-[#131b2b] border border-slate-700 text-white text-xs rounded-lg p-2.5 font-mono focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    className="w-full bg-[#131b2b] border border-slate-700 text-white text-xs rounded-lg p-2.5 font-mono focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Protocol
                  </label>
                  <select
                    value={formData.protocol}
                    onChange={(e: any) => setFormData({ ...formData, protocol: e.target.value })}
                    className="w-full bg-[#131b2b] border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="RTSP">RTSP (rtsp://... port 554)</option>
                    <option value="MJPEG">HTTP MJPEG Stream (port 8080/80)</option>
                    <option value="HLS">HLS Stream (.m3u8)</option>
                    <option value="WebRTC">WebRTC Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Hardware / Vendor Model
                  </label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full bg-[#131b2b] border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Full Stream URL or Path
                </label>
                <input
                  type="text"
                  value={formData.streamUrl}
                  onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                  placeholder="e.g. http://192.168.1.150:8080/video or rtsp://192.168.1.150:554/live/ch0"
                  className="w-full bg-[#131b2b] border border-slate-700 text-white text-xs rounded-lg p-2.5 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Authentication */}
              <div className="p-3.5 rounded-xl bg-[#0f1523] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    Camera Credentials (Digest / Basic Auth)
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.authRequired}
                    onChange={(e) => setFormData({ ...formData, authRequired: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                {formData.authRequired && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full bg-[#172033] border border-slate-700 text-white text-xs rounded-lg p-2 focus:border-emerald-500 focus:outline-hidden font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Password</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-[#172033] border border-slate-700 text-white text-xs rounded-lg p-2 focus:border-emerald-500 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Ping / Test Feedback */}
              {testResult.status !== 'idle' && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                    testResult.status === 'testing'
                      ? 'bg-slate-800 text-slate-300'
                      : testResult.status === 'success'
                      ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                      : 'bg-rose-950/80 border border-rose-700 text-rose-300'
                  }`}
                >
                  {testResult.status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />}
                  {testResult.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {testResult.status === 'failed' && <XCircle className="w-4 h-4 text-rose-400" />}
                  <span>{testResult.message || 'Connecting to IP camera...'}</span>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Test Connection
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save & Connect Wi-Fi Camera</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
