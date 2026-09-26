import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Key,
  Laptop,
  Tablet,
  Monitor,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Video,
  Grid,
  Maximize2,
  Radio,
  FileText,
  Download,
  ArrowRight,
  Sliders,
  ChevronRight,
  X,
  Clock,
  Activity,
  HardDrive,
  MapPin,
  Map,
  Wifi,
  WifiOff,
  Signal,
  Tv,
  Smartphone,
} from 'lucide-react';
import { LocationSearchBarMap } from './LocationSearchBarMap';
import { DeviceCameraStream, MotionAlertData } from './DeviceCameraStream';
import {
  WifiCctvManagerModal,
  WifiCctvDevice,
  INITIAL_WIFI_CCTVS,
} from './WifiCctvManagerModal';
import {
  PhoneFieldCameraStreamer,
  PairedPhoneCamera,
} from './PhoneFieldCameraStreamer';
import { PhoneCameraPairingModal } from './PhoneCameraPairingModal';
import { NearbyCctvCamera } from '../utils/nearbyCctv';

export interface AllowedDevice {
  id: string;
  name: string;
  operator: string;
  type: 'laptop' | 'tablet' | 'workstation' | 'console';
  certSerial: string;
  fingerprint: string;
  wireguardIp: string;
  status: 'authorized' | 'revoked';
  enrolledAt: string;
  lastActive: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'allow' | 'deny';
  deviceId: string;
  clientIp: string;
  stream: string;
  reason: string;
}

interface SurveillancePanelProps {
  onSwitchToPipelineWithTask?: (taskId: string) => void;
  onOpenPhoneRemote?: () => void;
}

const INITIAL_DEVICES: AllowedDevice[] = [
  {
    id: 'secops-workstation-01',
    name: 'SOC Command Station Alpha',
    operator: 'Alice Smith (SecOps Lead)',
    type: 'workstation',
    certSerial: '0x7F94A28B10C94D',
    fingerprint: 'SHA256:4a:89:12:ef:90:bc:33:11:ff:aa:78:23:45:90:12:77',
    wireguardIp: '10.13.13.2',
    status: 'authorized',
    enrolledAt: '2026-09-15 08:30:00',
    lastActive: 'Just now',
  },
  {
    id: 'mobile-tablet-patrol-04',
    name: 'Field Patrol Unit 4',
    operator: 'Officer Davis (Perimeter)',
    type: 'tablet',
    certSerial: '0x3A12DE5890FF21',
    fingerprint: 'SHA256:bc:44:90:12:ee:aa:11:78:34:56:ef:01:23:89:45:10',
    wireguardIp: '10.13.13.3',
    status: 'authorized',
    enrolledAt: '2026-09-18 14:15:00',
    lastActive: '2 mins ago',
  },
  {
    id: 'laptop-analyst-mark',
    name: 'Forensics Laptop 02',
    operator: 'Mark Chen (Incident Response)',
    type: 'laptop',
    certSerial: '0x99BB8811223344',
    fingerprint: 'SHA256:11:22:33:44:55:66:77:88:99:00:aa:bb:cc:dd:ee:ff',
    wireguardIp: '10.13.13.4',
    status: 'authorized',
    enrolledAt: '2026-09-20 10:00:00',
    lastActive: '12 mins ago',
  },
  {
    id: 'contractor-audit-lap09',
    name: 'External Audit Terminal',
    operator: 'Temporary Security Auditor',
    type: 'laptop',
    certSerial: '0xDEADBEEF001122',
    fingerprint: 'SHA256:ee:11:00:ff:44:33:22:11:aa:bb:cc:dd:55:66:77:88',
    wireguardIp: '10.13.13.9',
    status: 'revoked',
    enrolledAt: '2026-09-10 09:00:00',
    lastActive: 'Revoked 3 days ago',
  },
];

export interface SurveillanceCamera {
  id: string;
  name: string;
  location: string;
  resolution: string;
  bitrate: string;
  codec: string;
  zone: string;
  defaultPan: number;
  defaultTilt: number;
  type: 'device' | 'wifi' | 'mtls' | 'phone' | 'nearby_cctv';
  wifiSsid?: string;
  ipAddress?: string;
  signalStrength?: number;
  phoneData?: PairedPhoneCamera;
  nearbyData?: NearbyCctvCamera;
}

export const INITIAL_PAIRED_PHONES: PairedPhoneCamera[] = [
  {
    id: 'phone-patrol-01',
    name: 'Patrol Phone: Delta Alpha',
    deviceModel: 'Apple iPhone 15 Pro (iOS 17.5)',
    operatorName: 'Officer Davis (North Gate Patrol)',
    permissionStatus: 'granted',
    connectionStatus: 'streaming',
    facingMode: 'environment',
    batteryPercent: 88,
    isCharging: false,
    gpsCoords: { lat: 37.7762, lng: -122.4215, accuracy: 3.2 },
    torchEnabled: false,
    resolution: '1080p 60FPS',
    fps: 60,
    lastActive: 'Just now',
    pairingCode: 'PIN-8812',
  },
  {
    id: 'phone-patrol-02',
    name: 'BodyCam Phone: Sector 3',
    deviceModel: 'Samsung Galaxy S24 Ultra (Android 14)',
    operatorName: 'Sgt. M. Rodriguez (Transit Hub)',
    permissionStatus: 'granted',
    connectionStatus: 'streaming',
    facingMode: 'environment',
    batteryPercent: 64,
    isCharging: true,
    gpsCoords: { lat: 37.7735, lng: -122.4172, accuracy: 4.0 },
    torchEnabled: false,
    resolution: '1080p 30FPS',
    fps: 30,
    lastActive: 'Just now',
    pairingCode: 'PIN-4921',
  },
  {
    id: 'phone-patrol-03',
    name: 'Mobile Phone: External Inspector',
    deviceModel: 'Google Pixel 8 Pro',
    operatorName: 'Visiting Auditor Vance',
    permissionStatus: 'prompt',
    connectionStatus: 'standby',
    facingMode: 'user',
    batteryPercent: 91,
    isCharging: false,
    gpsCoords: { lat: 37.7788, lng: -122.4241, accuracy: 5.5 },
    torchEnabled: false,
    resolution: '1080p 30FPS',
    fps: 30,
    lastActive: '4 mins ago',
    pairingCode: 'PIN-1094',
  },
];

const DEFAULT_CAMERAS: SurveillanceCamera[] = [
  {
    id: 'cam-device',
    name: 'CAM 01: Operator Device Camera',
    location: 'Local Operator Station (Webcam / Mobile)',
    resolution: '1080p 30FPS',
    bitrate: 'Hardware MediaStream',
    codec: 'Local Video / WebRTC',
    zone: 'Security Command Post',
    defaultPan: 0,
    defaultTilt: 0,
    type: 'device',
  },
  {
    id: 'phone-patrol-01',
    name: 'CAM 02: Field Phone Alpha (iPhone)',
    location: 'North Perimeter (GPS: 37.7762, -122.4215)',
    resolution: '1080p 60FPS',
    bitrate: '5.6 Mbps',
    codec: 'WebRTC / H.265 (Mobile Stream)',
    zone: 'Mobile Patrol Unit',
    defaultPan: 0,
    defaultTilt: 0,
    type: 'phone',
  },
  {
    id: 'wifi-cam-01',
    name: 'CAM 03: Wi-Fi West Gate PTZ',
    location: 'Gate 4 North / Outer Perimeter (192.168.1.104)',
    resolution: '4K 60FPS',
    bitrate: '8.4 Mbps',
    codec: 'RTSP / H.265 (AES-256)',
    zone: 'Perimeter Boundary',
    defaultPan: 142,
    defaultTilt: -14,
    type: 'wifi',
    wifiSsid: 'SecOps-IoT-Surveillance-5G',
    ipAddress: '192.168.1.104',
    signalStrength: -48,
  },
  {
    id: 'wifi-cam-02',
    name: 'CAM 04: Wi-Fi Lobby Ingress',
    location: 'Main Entry Ingress (192.168.1.115)',
    resolution: '1080p 30FPS',
    bitrate: '4.8 Mbps',
    codec: 'MJPEG / HTTP (WPA3)',
    zone: 'Access Control',
    defaultPan: 35,
    defaultTilt: -5,
    type: 'wifi',
    wifiSsid: 'SecOps-IoT-Surveillance-5G',
    ipAddress: '192.168.1.115',
    signalStrength: -54,
  },
  {
    id: 'cam-02',
    name: 'CAM 05: Datacenter Server Vault',
    location: 'Building B - Rack Row 04 / HSM',
    resolution: '4K 30FPS',
    bitrate: '6.2 Mbps',
    codec: 'H.265 / mTLS WebRTC',
    zone: 'Restricted Vault',
    defaultPan: 45,
    defaultTilt: -8,
    type: 'mtls',
  },
];

export const SurveillancePanel: React.FC<SurveillancePanelProps> = ({
  onSwitchToPipelineWithTask,
  onOpenPhoneRemote,
}) => {
  const [devices, setDevices] = useState<AllowedDevice[]>(INITIAL_DEVICES);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('secops-workstation-01');
  const [viewMode, setViewMode] = useState<'cameras' | 'map'>('cameras');
  const [cameras, setCameras] = useState<SurveillanceCamera[]>(DEFAULT_CAMERAS);
  const [wifiCctvs, setWifiCctvs] = useState<WifiCctvDevice[]>(INITIAL_WIFI_CCTVS);
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);
  const [pairedPhones, setPairedPhones] = useState<PairedPhoneCamera[]>(INITIAL_PAIRED_PHONES);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [selectedCamId, setSelectedCamId] = useState<string | null>(null); // null = grid view
  const [nightVision, setNightVision] = useState(false);
  const [motionAlerts, setMotionAlerts] = useState(true);
  const [activeMotionAlert, setActiveMotionAlert] = useState<MotionAlertData | null>(null);
  const [recentMotionAlerts, setRecentMotionAlerts] = useState<MotionAlertData[]>([]);
  const [motionSensitivity, setMotionSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [timeString, setTimeString] = useState('');
  const [selectedCertDevice, setSelectedCertDevice] = useState<AllowedDevice | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newOperator, setNewOperator] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<'laptop' | 'tablet' | 'workstation'>('laptop');
  const [ptzState, setPtzState] = useState<Record<string, { pan: number; tilt: number }>>({
    'cam-device': { pan: 0, tilt: 0 },
    'wifi-cam-01': { pan: 142, tilt: -14 },
    'wifi-cam-02': { pan: 35, tilt: -5 },
    'cam-02': { pan: 45, tilt: -8 },
  });

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([
    {
      id: 'evt-1',
      timestamp: '12:38:40 UTC',
      type: 'allow',
      deviceId: 'secops-workstation-01',
      clientIp: '10.13.13.2',
      stream: 'CAM 01 & 02 (Quad Stream)',
      reason: 'mTLS Handshake verified by Surveillance-Root-CA (prime256v1)',
    },
    {
      id: 'evt-2',
      timestamp: '12:37:15 UTC',
      type: 'deny',
      deviceId: 'Unknown Hardware',
      clientIp: '192.168.1.188',
      stream: '/streams/cam-01',
      reason: '400 Bad Request: No client certificate presented in TLS handshake',
    },
    {
      id: 'evt-3',
      timestamp: '12:35:02 UTC',
      type: 'allow',
      deviceId: 'mobile-tablet-patrol-04',
      clientIp: '10.13.13.3',
      stream: 'CAM 01 (North Perimeter)',
      reason: 'WireGuard Tunnel authenticated + client cert CN=mobile-tablet-patrol-04',
    },
    {
      id: 'evt-4',
      timestamp: '12:30:19 UTC',
      type: 'deny',
      deviceId: 'contractor-audit-lap09',
      clientIp: '10.13.13.9',
      stream: '/streams/cam-02',
      reason: '403 Forbidden: Client Certificate revoked on CRL (0xDEADBEEF001122)',
    },
  ]);

  // Clock ticker for surveillance timestamps
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toISOString().replace('T', ' ').replace('Z', ' UTC')
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeDevice = useMemo(() => {
    if (activeDeviceId === 'unauthorized-device') {
      return {
        id: 'unauthorized-device',
        name: 'Unrecognized External Device',
        operator: 'Untrusted Client',
        type: 'laptop' as const,
        certSerial: 'NONE',
        fingerprint: 'NONE',
        wireguardIp: '192.168.1.250',
        status: 'revoked' as const,
        enrolledAt: 'Never',
        lastActive: 'Attempting connection',
      };
    }
    return devices.find((d) => d.id === activeDeviceId) || devices[0];
  }, [devices, activeDeviceId]);

  const isAccessAllowed = activeDevice && activeDevice.status === 'authorized';

  // Toggle device authorization
  const handleToggleDeviceStatus = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === deviceId) {
          const nextStatus = d.status === 'authorized' ? 'revoked' : 'authorized';
          // Log security event
          setSecurityEvents((evts) => [
            {
              id: `evt-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString() + ' UTC',
              type: nextStatus === 'authorized' ? 'allow' : 'deny',
              deviceId: d.id,
              clientIp: d.wireguardIp,
              stream: 'Device Posture Update',
              reason:
                nextStatus === 'authorized'
                  ? `Device certificate re-activated in CA truststore`
                  : `Certificate manually revoked by administrator (CRL updated)`,
            },
            ...evts,
          ]);
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );
  };

  // Enroll new device
  const handleEnrollDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim() || !newOperator.trim()) return;

    const newId = newDeviceName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(10 + Math.random() * 90);
    const newIp = `10.13.13.${devices.length + 5}`;
    const newSerial = '0x' + Math.random().toString(16).substring(2, 16).toUpperCase();
    const hexParts: string[] = [];
    for (let i = 0; i < 16; i++) {
      hexParts.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
    }
    const newFingerprint = `SHA256:${hexParts.join(':')}`;

    const newDev: AllowedDevice = {
      id: newId,
      name: newDeviceName.trim(),
      operator: newOperator.trim(),
      type: newDeviceType,
      certSerial: newSerial,
      fingerprint: newFingerprint,
      wireguardIp: newIp,
      status: 'authorized',
      enrolledAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      lastActive: 'Enrolled just now',
    };

    setDevices((prev) => [newDev, ...prev]);
    setActiveDeviceId(newDev.id);
    setIsEnrollModalOpen(false);
    setNewDeviceName('');
    setNewOperator('');

    // Security audit log
    setSecurityEvents((evts) => [
      {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString() + ' UTC',
        type: 'allow',
        deviceId: newDev.id,
        clientIp: newIp,
        stream: 'PKI Enrollment',
        reason: `New ECDSA Client Certificate issued & bound to ${newDev.operator}`,
      },
      ...evts,
    ]);
  };

  // PTZ Control simulation
  const handlePtzAdjust = (camId: string, dPan: number, dTilt: number) => {
    setPtzState((prev) => {
      const curr = prev[camId] || { pan: 0, tilt: 0 };
      return {
        ...prev,
        [camId]: {
          pan: (curr.pan + dPan + 360) % 360,
          tilt: Math.max(-90, Math.min(45, curr.tilt + dTilt)),
        },
      };
    });
  };

  // Handler when user adds or imports a Wi-Fi camera
  const handleAddOrUpdateWifiCctv = (newWifiCam: WifiCctvDevice) => {
    setWifiCctvs((prev) => {
      const exists = prev.some((c) => c.id === newWifiCam.id);
      if (exists) {
        return prev.map((c) => (c.id === newWifiCam.id ? newWifiCam : c));
      }
      return [newWifiCam, ...prev];
    });

    // Also add to active surveillance cameras grid if not already present
    setCameras((prev) => {
      const exists = prev.some((c) => c.id === newWifiCam.id);
      if (exists) return prev;
      const newSurvCam: SurveillanceCamera = {
        id: newWifiCam.id,
        name: `Wi-Fi: ${newWifiCam.name}`,
        location: `${newWifiCam.ipAddress}:${newWifiCam.port} (${newWifiCam.wifiSsid})`,
        resolution: newWifiCam.resolution,
        bitrate: `${(newWifiCam.fps * 0.15).toFixed(1)} Mbps`,
        codec: `${newWifiCam.protocol} / WPA3-Enterprise`,
        zone: 'Wireless Subnet',
        defaultPan: 0,
        defaultTilt: 0,
        type: 'wifi',
        wifiSsid: newWifiCam.wifiSsid,
        ipAddress: newWifiCam.ipAddress,
        signalStrength: newWifiCam.signalStrength,
      };
      return [...prev, newSurvCam];
    });

    // Audit log
    setSecurityEvents((evts) => [
      {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString() + ' UTC',
        type: 'allow',
        deviceId: activeDevice.id,
        clientIp: newWifiCam.ipAddress,
        stream: `Wi-Fi CCTV: ${newWifiCam.name}`,
        reason: `Wireless camera connected via ${newWifiCam.protocol} on SSID ${newWifiCam.wifiSsid} (${newWifiCam.signalStrength} dBm)`,
      },
      ...evts,
    ]);
  };

  const handleSelectWifiForMainView = (cctv: WifiCctvDevice) => {
    setViewMode('cameras');
    setCameras((prev) => {
      if (prev.some((c) => c.id === cctv.id)) return prev;
      return [
        ...prev,
        {
          id: cctv.id,
          name: `Wi-Fi: ${cctv.name}`,
          location: `${cctv.ipAddress}:${cctv.port} (${cctv.wifiSsid})`,
          resolution: cctv.resolution,
          bitrate: '5.2 Mbps',
          codec: `${cctv.protocol} / AES-256`,
          zone: 'Wireless Subnet',
          defaultPan: 0,
          defaultTilt: 0,
          type: 'wifi',
          wifiSsid: cctv.wifiSsid,
          ipAddress: cctv.ipAddress,
          signalStrength: cctv.signalStrength,
        },
      ];
    });
    setSelectedCamId(cctv.id);
  };

  // Handler for adding/pairing a new phone camera
  const handleAddPhone = (newPhone: PairedPhoneCamera) => {
    setPairedPhones((prev) => [newPhone, ...prev.filter((p) => p.id !== newPhone.id)]);

    if (newPhone.permissionStatus === 'granted') {
      setCameras((prev) => {
        if (prev.some((c) => c.id === newPhone.id)) return prev;
        return [
          {
            id: newPhone.id,
            name: `Phone: ${newPhone.name}`,
            location: `${newPhone.operatorName} (${newPhone.deviceModel})`,
            resolution: newPhone.resolution,
            bitrate: '5.6 Mbps',
            codec: 'WebRTC / H.265 (Mobile Stream)',
            zone: 'Mobile Patrol Field',
            defaultPan: 0,
            defaultTilt: 0,
            type: 'phone',
            phoneData: newPhone,
          },
          ...prev,
        ];
      });
    }

    setSecurityEvents((evts) => [
      {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString() + ' UTC',
        type: newPhone.permissionStatus === 'granted' ? 'allow' : 'deny',
        deviceId: activeDevice.id,
        clientIp: '10.13.13.18',
        stream: `Phone Camera: ${newPhone.name}`,
        reason:
          newPhone.permissionStatus === 'granted'
            ? `Mobile camera sensor access granted by operator for ${newPhone.deviceModel}`
            : `Pairing registered: Awaiting camera/GPS permission grant from ${newPhone.deviceModel}`,
      },
      ...evts,
    ]);
  };

  const handleGrantPhonePermission = (phoneId: string) => {
    setPairedPhones((prev) =>
      prev.map((p) => (p.id === phoneId ? { ...p, permissionStatus: 'granted', connectionStatus: 'streaming' } : p))
    );

    const targetPhone = pairedPhones.find((p) => p.id === phoneId);
    if (targetPhone) {
      setCameras((prev) => {
        if (prev.some((c) => c.id === phoneId)) return prev;
        return [
          {
            id: targetPhone.id,
            name: `Phone: ${targetPhone.name}`,
            location: `${targetPhone.operatorName} (${targetPhone.deviceModel})`,
            resolution: targetPhone.resolution,
            bitrate: '5.6 Mbps',
            codec: 'WebRTC / H.265 (Mobile Stream)',
            zone: 'Mobile Patrol Field',
            defaultPan: 0,
            defaultTilt: 0,
            type: 'phone',
            phoneData: targetPhone,
          },
          ...prev,
        ];
      });
    }

    setSecurityEvents((evts) => [
      {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString() + ' UTC',
        type: 'allow',
        deviceId: activeDevice.id,
        clientIp: '10.13.13.18',
        stream: `Mobile Sensor: ${phoneId}`,
        reason: 'User explicitly granted permission for phone camera & GPS telemetry broadcast',
      },
      ...evts,
    ]);
  };

  const handleRevokePhonePermission = (phoneId: string) => {
    setPairedPhones((prev) =>
      prev.map((p) => (p.id === phoneId ? { ...p, permissionStatus: 'denied', connectionStatus: 'disconnected' } : p))
    );
    setCameras((prev) => prev.filter((c) => c.id !== phoneId));
    if (selectedCamId === phoneId) setSelectedCamId(null);

    setSecurityEvents((evts) => [
      {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString() + ' UTC',
        type: 'deny',
        deviceId: activeDevice.id,
        clientIp: '10.13.13.18',
        stream: `Mobile Sensor: ${phoneId}`,
        reason: 'Operator revoked camera streaming permission; broadcast pipeline severed',
      },
      ...evts,
    ]);
  };

  const handleRemovePhone = (phoneId: string) => {
    setPairedPhones((prev) => prev.filter((p) => p.id !== phoneId));
    setCameras((prev) => prev.filter((c) => c.id !== phoneId));
    if (selectedCamId === phoneId) setSelectedCamId(null);
  };

  const handleSelectPhoneForMainView = (phone: PairedPhoneCamera) => {
    setViewMode('cameras');
    setCameras((prev) => {
      if (prev.some((c) => c.id === phone.id)) return prev;
      return [
        {
          id: phone.id,
          name: `Phone: ${phone.name}`,
          location: `${phone.operatorName} (${phone.deviceModel})`,
          resolution: phone.resolution,
          bitrate: '5.6 Mbps',
          codec: 'WebRTC / H.265 (Mobile Stream)',
          zone: 'Mobile Patrol Field',
          defaultPan: 0,
          defaultTilt: 0,
          type: 'phone',
          phoneData: phone,
        },
        ...prev,
      ];
    });
    setSelectedCamId(phone.id);
  };

  // Handler when user selects a nearby CCTV from the map to stream
  const handleStreamNearbyCctv = (cctv: NearbyCctvCamera) => {
    setViewMode('cameras');
    const survCam: SurveillanceCamera = {
      id: cctv.id,
      name: cctv.name,
      location: `${cctv.locationDescription || cctv.address} (${cctv.distanceMeters}m ${cctv.bearingCompass})`,
      resolution: cctv.resolution,
      bitrate: '7.8 Mbps',
      codec: `${cctv.protocol} / AES-256 GeoStream`,
      zone: `Nearby CCTV (${cctv.category})`,
      defaultPan: cctv.panHeading,
      defaultTilt: -10,
      type: 'nearby_cctv',
      nearbyData: cctv,
    };

    setCameras((prev) => {
      if (prev.some((c) => c.id === cctv.id)) return prev;
      return [survCam, ...prev];
    });

    setSelectedCamId(cctv.id);

    setSecurityEvents((evts) => [
      {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString() + ' UTC',
        type: 'allow',
        deviceId: activeDevice.id,
        clientIp: '10.13.13.2',
        stream: `Proximity CCTV: ${cctv.name}`,
        reason: `Discovered and connected via location radar (${cctv.distanceMeters}m away, azimuth ${cctv.panHeading}°)`,
      },
      ...evts,
    ]);
  };

  // Handler for motion detection events triggered by the device camera
  const handleDeviceMotionDetected = (event: MotionAlertData) => {
    if (!motionAlerts) return;
    setActiveMotionAlert(event);
    setRecentMotionAlerts((prev) => [event, ...prev.slice(0, 7)]);

    setSecurityEvents((evts) => [
      {
        id: `evt-${Date.now()}`,
        timestamp: event.timestamp,
        type: 'deny',
        deviceId: activeDevice.id,
        clientIp: activeDevice.wireguardIp,
        stream: 'CAM 01: Operator Device Camera',
        reason: `MOTION ALARM: Real-time optical displacement (${event.score}%) detected in video stream`,
      },
      ...evts,
    ]);
  };

  return (
    <div id="surveillance-panel-root" className="h-full overflow-y-auto bg-[#070a0f] text-slate-200 p-3 sm:p-5 lg:p-6 space-y-5">
      {/* Top Banner: Zero-Trust Security Status & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-xl bg-[#0d121c] border border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Zero-Trust Surveillance Gateway
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  mTLS Enforced
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Encrypted camera feeds restricted to verified client certificates and WireGuard mesh devices
              </p>
            </div>
          </div>
        </div>

        {/* Device Simulation Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center space-x-2 bg-[#131926] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Viewing As:</span>
            <select
              id="active-viewing-device-select"
              value={activeDeviceId}
              onChange={(e) => setActiveDeviceId(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-hidden text-xs cursor-pointer max-w-[210px] truncate"
            >
              <optgroup label="Authorized Devices (mTLS Valid)" className="bg-[#131926] text-emerald-400">
                {devices
                  .filter((d) => d.status === 'authorized')
                  .map((d) => (
                    <option key={d.id} value={d.id} className="bg-[#131926] text-slate-200">
                      ✓ {d.name} ({d.operator})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Revoked / Untrusted Devices" className="bg-[#131926] text-rose-400">
                {devices
                  .filter((d) => d.status === 'revoked')
                  .map((d) => (
                    <option key={d.id} value={d.id} className="bg-[#131926] text-rose-300">
                      ✗ {d.name} (REVOKED)
                    </option>
                  ))}
                <option value="unauthorized-device" className="bg-[#131926] text-rose-300">
                  ✗ External Device (No Certificate)
                </option>
              </optgroup>
            </select>
          </div>

          <button
            id="open-enroll-device-modal-btn"
            onClick={() => setIsEnrollModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll Device</span>
          </button>

          {onSwitchToPipelineWithTask && (
            <button
              onClick={() => onSwitchToPipelineWithTask('preset_surveillance_device_auth')}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#141b29] hover:bg-[#1d273a] border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
              title="View Nginx mTLS configuration and deployment scripts"
            >
              <span>View Infra Code</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          )}
        </div>
      </div>

      {/* Main Monitoring Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Camera Grid / Feed Canvas */}
        <div className="lg:col-span-8 space-y-3">
          {/* Feed Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0d121c] border border-slate-800 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-200">{timeString || 'Syncing UTC...'}</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                TLS 1.3 / AES-256-GCM
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Mode Switcher: Video Grid vs Real-Time Google Maps Location Search */}
              <div className="flex items-center p-0.5 rounded bg-[#141924] border border-slate-700 text-slate-400">
                <button
                  id="surveillance-mode-cams-btn"
                  onClick={() => setViewMode('cameras')}
                  className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
                    viewMode === 'cameras'
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'hover:text-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video Feeds</span>
                </button>
                <button
                  id="surveillance-mode-map-btn"
                  onClick={() => setViewMode('map')}
                  className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
                    viewMode === 'map'
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'hover:text-slate-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                  <span>Facility Map</span>
                </button>
              </div>

              {/* Device Camera Quick Access Button */}
              <button
                id="toggle-device-camera-btn"
                onClick={() => setSelectedCamId(selectedCamId === 'cam-device' ? null : 'cam-device')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors text-xs font-medium border ${
                  selectedCamId === 'cam-device'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-xs'
                    : 'bg-[#141924] text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="View & control your physical device webcam"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">My Camera</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>

              {/* Motion Alarm Arm/Disarm Toggle */}
              <button
                id="toggle-motion-detection-btn"
                onClick={() => {
                  setMotionAlerts(!motionAlerts);
                  if (motionAlerts) {
                    setActiveMotionAlert(null);
                  }
                }}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-all text-xs font-medium border cursor-pointer ${
                  motionAlerts
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/70 shadow-xs'
                    : 'bg-[#141924] text-slate-400 border-slate-700 hover:text-white'
                }`}
                title={
                  motionAlerts
                    ? 'Motion Detection is ARMED on local camera sensor. Click to pause.'
                    : 'Motion Detection is PAUSED. Click to arm.'
                }
              >
                <Activity className={`w-3.5 h-3.5 ${motionAlerts ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">Motion Alarm:</span>
                <span className={`font-bold font-mono text-[11px] ${motionAlerts ? 'text-amber-300' : 'text-slate-500'}`}>
                  {motionAlerts ? 'ARMED' : 'OFF'}
                </span>
              </button>

              {/* Wi-Fi CCTVs Manager Button */}
              <button
                id="open-wifi-cctv-manager-btn"
                onClick={() => setIsWifiModalOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors text-xs font-medium border bg-[#141924] border-slate-700 text-slate-300 hover:border-emerald-500/60 hover:text-white cursor-pointer"
                title="Manage and scan Wi-Fi / LAN CCTV streams"
              >
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Wi-Fi CCTVs</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-[10px] text-emerald-300 font-mono border border-emerald-700 font-bold">
                  {wifiCctvs.length}
                </span>
              </button>

              {/* Field Patrol Phone Cameras Button */}
              <button
                id="open-phone-camera-modal-btn"
                onClick={() => setIsPhoneModalOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors text-xs font-medium border bg-[#141924] border-slate-700 text-slate-300 hover:border-blue-500/60 hover:text-white cursor-pointer"
                title="Manage and pair field patrol phone cameras"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Phones</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-950 text-[10px] text-blue-300 font-mono border border-blue-700 font-bold">
                  {pairedPhones.length}
                </span>
              </button>

              {/* Android Phone Remote Control Gateway Launcher */}
              {onOpenPhoneRemote && (
                <button
                  id="open-phone-remote-gateway-btn"
                  onClick={onOpenPhoneRemote}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors text-xs font-semibold border bg-blue-950/80 border-blue-600/60 text-blue-300 hover:bg-blue-900 hover:text-white cursor-pointer shadow-xs"
                  title="Launch Android Phone Remote Control & Command Gateway"
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span>Phone Remote</span>
                </button>
              )}

              {viewMode === 'cameras' && (
                <>
                  {/* IR / Night Vision Toggle */}
                  <button
                    onClick={() => setNightVision(!nightVision)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors text-xs font-medium border ${
                      nightVision
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                        : 'bg-[#141924] text-slate-300 border-slate-700 hover:text-white'
                    }`}
                    title="Toggle Infrared Night Vision Filter"
                  >
                    {nightVision ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>IR</span>
                  </button>

                  {/* View Layout Toggle */}
                  <div className="flex items-center p-0.5 rounded bg-[#141924] border border-slate-700 text-slate-400">
                    <button
                      onClick={() => setSelectedCamId(null)}
                      className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                        selectedCamId === null ? 'bg-slate-800 text-slate-100 font-semibold' : 'hover:text-slate-200'
                      }`}
                      title="Quad Camera Grid View"
                    >
                      <Grid className="w-3 h-3" />
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                    {cameras.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCamId(c.id)}
                        className={`px-2 py-1 rounded text-xs truncate max-w-[75px] sm:max-w-none ${
                          selectedCamId === c.id ? 'bg-slate-800 text-emerald-400 font-semibold' : 'hover:text-slate-200'
                        }`}
                        title={c.name}
                      >
                        {c.type === 'device' ? 'Device' : c.type === 'wifi' ? `Wi-Fi ${i}` : `CAM ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Active Motion Intrusion Alert Banner */}
          {motionAlerts && activeMotionAlert && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-red-950/70 border-2 border-red-500/80 text-white shadow-xl animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-red-900/90 border border-red-400 flex items-center justify-center text-red-200 shrink-0">
                  <Activity className="w-5 h-5 text-red-200 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-red-200 uppercase tracking-wider">
                      ⚠️ Optical Movement Detected
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-red-600 text-[10px] font-mono font-bold">
                      {activeMotionAlert.score}% Delta
                    </span>
                    <span className="text-[10px] text-red-300 font-mono hidden sm:inline">
                      [{activeMotionAlert.timestamp}]
                    </span>
                  </div>
                  <p className="text-xs text-red-200/90 font-mono">
                    Movement intrusion triggered on <span className="text-white font-semibold">{activeMotionAlert.source}</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => setSelectedCamId('cam-device')}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Camera</span>
                </button>
                <button
                  onClick={() => setActiveMotionAlert(null)}
                  className="p-1.5 rounded-lg bg-red-900/40 hover:bg-red-900 text-red-300 hover:text-white transition-colors"
                  title="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Video Stream Screen Area OR Real-Time Google Maps Facility Tracker */}
          {viewMode === 'map' ? (
            <div className="space-y-3">
              <LocationSearchBarMap
                onLocationSelected={(loc) => {
                  setSecurityEvents((evts) => [
                    {
                      id: `evt-${Date.now()}`,
                      timestamp: new Date().toLocaleTimeString() + ' UTC',
                      type: 'allow',
                      deviceId: activeDevice.id,
                      clientIp: activeDevice.wireguardIp,
                      stream: `Map GPS: ${loc.name}`,
                      reason: `Real-time position lock updated via Google Maps Platform Places API (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
                    },
                    ...evts,
                  ]);
                }}
              />
            </div>
          ) : !isAccessAllowed ? (
            /* ACCESS DENIED LOCKOUT SCREEN */
            <div className="h-[460px] sm:h-[520px] rounded-xl bg-black border-2 border-rose-900/60 p-6 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden shadow-2xl">
              {/* Scanline & Lockout Grid Overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(244, 63, 94, 0.15) 2px, rgba(244, 63, 94, 0.15) 4px)',
                }}
              />
              <div className="w-16 h-16 rounded-full bg-rose-950/80 border-2 border-rose-600 flex items-center justify-center text-rose-400 animate-bounce">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div className="max-w-md space-y-2 relative z-10">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-rose-950 text-rose-300 border border-rose-800">
                  HTTP 400/403 TLS Handshake Terminated
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Surveillance Access Denied: Device Not Authorized
                </h3>
                <p className="text-xs text-rose-200/80 font-mono">
                  {activeDevice.id === 'unauthorized-device'
                    ? 'ERR_SSL_CLIENT_AUTH_REQUIRED: No client certificate was presented. Surveillance feeds are air-gapped on VLAN 30.'
                    : `ERR_CERT_REVOKED: Device certificate '${activeDevice.certSerial}' is marked as revoked in CA certificate revocation list.`}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-left text-xs font-mono text-slate-300 max-w-lg w-full space-y-1">
                <div className="text-rose-400 font-bold border-b border-rose-900/50 pb-1 flex items-center justify-between">
                  <span>NGINX INGRESS SECURITY VIOLATION</span>
                  <span>IP: {activeDevice.wireguardIp}</span>
                </div>
                <div>Device Identity: <span className="text-white">{activeDevice.name}</span></div>
                <div>Certificate Serial: <span className="text-rose-300">{activeDevice.certSerial}</span></div>
                <div>ssl_client_verify: <span className="text-rose-400 font-bold">FAILED</span></div>
                <div>Action: Connection terminated before media broker routing</div>
              </div>

              <div className="flex items-center space-x-3 relative z-10 pt-2">
                <button
                  onClick={() => setActiveDeviceId('secops-workstation-01')}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Switch to Authorized Station Alpha</span>
                </button>
                <button
                  onClick={() => setIsEnrollModalOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  Enroll Current Device
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE CAMERA VIEWS */
            <div
              className={`grid gap-3.5 ${
                selectedCamId ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              {cameras.filter((c) => (selectedCamId ? c.id === selectedCamId : true)).map((cam) => {
                if (cam.id === 'cam-device') {
                  return (
                    <DeviceCameraStream
                      key={cam.id}
                      isNightVision={nightVision}
                      isMotionDetectionEnabled={motionAlerts}
                      motionSensitivity={motionSensitivity}
                      enableAudioAlert={true}
                      onToggleMotionDetection={() => setMotionAlerts(!motionAlerts)}
                      onMotionDetected={handleDeviceMotionDetected}
                      isMaximized={selectedCamId === 'cam-device'}
                      onToggleMaximize={() => setSelectedCamId(selectedCamId ? null : 'cam-device')}
                      onSnapshotTaken={() => {
                        setSecurityEvents((evts) => [
                          {
                            id: `evt-${Date.now()}`,
                            timestamp: new Date().toLocaleTimeString() + ' UTC',
                            type: 'allow',
                            deviceId: activeDevice.id,
                            clientIp: activeDevice.wireguardIp,
                            stream: 'CAM 01: Operator Device Camera',
                            reason: 'Verified snapshot saved from physical device camera stream',
                          },
                          ...evts,
                        ]);
                      }}
                      className={
                        selectedCamId
                          ? 'h-[460px] sm:h-[520px]'
                          : 'h-[230px] sm:h-[250px]'
                      }
                    />
                  );
                }

                if (cam.type === 'phone') {
                  const phone = pairedPhones.find((p) => p.id === cam.id) || cam.phoneData;
                  if (phone) {
                    return (
                      <PhoneFieldCameraStreamer
                        key={cam.id}
                        phone={phone}
                        isMaximized={selectedCamId === cam.id}
                        onToggleMaximize={() => setSelectedCamId(selectedCamId === cam.id ? null : cam.id)}
                        className={
                          selectedCamId
                            ? 'h-[460px] sm:h-[520px]'
                            : 'h-[230px] sm:h-[250px]'
                        }
                      />
                    );
                  }
                }

                const ptz = ptzState[cam.id] || { pan: cam.defaultPan, tilt: cam.defaultTilt };
                return (
                  <div
                    key={cam.id}
                    className={`relative rounded-xl overflow-hidden border transition-all ${
                      selectedCamId
                        ? 'h-[460px] sm:h-[520px] border-emerald-500/40 bg-black'
                        : 'h-[230px] sm:h-[250px] border-slate-800 bg-black hover:border-slate-700'
                    }`}
                  >
                    {/* Simulated High-Tech Video Feed Canvas */}
                    <div
                      className={`absolute inset-0 transition-all ${
                        nightVision
                          ? 'bg-gradient-to-b from-emerald-950/60 via-black to-emerald-950/40'
                          : 'bg-gradient-to-b from-slate-900/90 via-[#0a0f16] to-[#05080e]'
                      }`}
                    >
                      {/* Scanline Raster Overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-25"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 120, 0.08) 2px, rgba(0, 255, 120, 0.08) 4px)',
                        }}
                      />

                      {/* Optical Grid & Crosshairs */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                        <div className="w-16 h-16 border border-emerald-500/40 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        </div>
                      </div>

                      {/* Corner Sight Reticles */}
                      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400/70 pointer-events-none" />
                      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400/70 pointer-events-none" />
                      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400/70 pointer-events-none" />
                      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400/70 pointer-events-none" />
                    </div>

                    {/* HUD Top Bar */}
                    <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono pointer-events-none z-10">
                      <div className="flex items-center space-x-2">
                        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-black/70 border border-slate-700/80 text-white font-semibold">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                          <span>REC</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-black/70 border border-slate-700/80 text-emerald-400 font-semibold truncate max-w-[150px] sm:max-w-[220px]">
                          {cam.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-black/70 border border-slate-700/80 text-slate-300">
                          {cam.resolution}
                        </span>
                        {cam.type === 'wifi' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-600/70 text-emerald-300 font-bold flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-emerald-400" />
                            <span>WI-FI LAN</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 font-bold">
                            mTLS VERIFIED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* HUD Center Context Info (in single view) */}
                    {selectedCamId && (
                      <div className="absolute top-12 left-4 p-2.5 rounded bg-black/60 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-0.5 pointer-events-none z-10">
                        <div>ZONE: <span className="text-emerald-400 font-semibold">{cam.zone}</span></div>
                        <div>PHYSICAL LOC: <span className="text-white">{cam.location}</span></div>
                        <div>CODEC & INGRESS: <span className="text-slate-300">{cam.codec} ({cam.bitrate})</span></div>
                        {cam.type === 'wifi' ? (
                          <div>WI-FI NETWORK: <span className="text-emerald-300">{cam.wifiSsid} (IP: {cam.ipAddress} • {cam.signalStrength} dBm)</span></div>
                        ) : (
                          <div>CLIENT CERT DN: <span className="text-emerald-300">CN={activeDevice.id}</span></div>
                        )}
                      </div>
                    )}

                    {/* HUD Bottom Status Bar */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[10px] font-mono pointer-events-none z-10">
                      <div className="bg-black/70 px-2 py-1 rounded border border-slate-800 text-slate-300">
                        <span>PAN: {ptz.pan}°</span> • <span>TILT: {ptz.tilt}°</span> • <span>ZOOM: 1.0x</span>
                      </div>

                      <div className="bg-black/70 px-2 py-1 rounded border border-slate-800 text-slate-300">
                        {timeString || 'SYNCING...'}
                      </div>
                    </div>

                    {/* PTZ Quick Controls Overlay */}
                    <div className="absolute bottom-2.5 right-3 pointer-events-auto z-20 flex items-center space-x-1 opacity-80 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePtzAdjust(cam.id, -5, 0)}
                        className="w-6 h-6 rounded bg-black/80 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-bold"
                        title="Pan Left"
                      >
                        ◀
                      </button>
                      <button
                        onClick={() => handlePtzAdjust(cam.id, 5, 0)}
                        className="w-6 h-6 rounded bg-black/80 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-bold"
                        title="Pan Right"
                      >
                        ▶
                      </button>
                      <button
                        onClick={() => handlePtzAdjust(cam.id, 0, 3)}
                        className="w-6 h-6 rounded bg-black/80 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-bold"
                        title="Tilt Up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handlePtzAdjust(cam.id, 0, -3)}
                        className="w-6 h-6 rounded bg-black/80 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-bold"
                        title="Tilt Down"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => setSelectedCamId(selectedCamId ? null : cam.id)}
                        className="px-1.5 h-6 rounded bg-black/80 hover:bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center text-[10px]"
                        title={selectedCamId ? 'Restore Grid' : 'Maximize Stream'}
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Allowed Devices Whitelist & Live Security Audit */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Device Certificate Posture */}
          <div className="p-4 rounded-xl bg-[#0d121c] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Current Device Trust Posture
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isAccessAllowed
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                }`}
              >
                {isAccessAllowed ? 'Authorized' : 'Rejected'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#121824] border border-slate-800 text-xs space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Device ID:</span>
                <span className="text-white font-semibold">{activeDevice.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Operator:</span>
                <span className="text-slate-200">{activeDevice.operator}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">WireGuard IP:</span>
                <span className="text-emerald-400">{activeDevice.wireguardIp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cert Serial:</span>
                <span className="text-slate-300 text-[11px] truncate max-w-[140px]">{activeDevice.certSerial}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Handshake Status:</span>
                <span className={isAccessAllowed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {isAccessAllowed ? '200 OK (mTLS Valid)' : '400/403 (No Valid Cert)'}
                </span>
              </div>
            </div>

            {isAccessAllowed && (
              <button
                onClick={() => setSelectedCertDevice(activeDevice)}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>View X.509 Certificate Details</span>
              </button>
            )}
          </div>

          {/* Allowed Devices Whitelist Table */}
          <div className="p-4 rounded-xl bg-[#0d121c] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Laptop className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Allowed Device Whitelist ({devices.length})
                </h3>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(true)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Enroll</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {devices.map((device) => {
                const isCurrent = device.id === activeDeviceId;
                return (
                  <div
                    key={device.id}
                    className={`p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between gap-2 ${
                      isCurrent
                        ? 'bg-[#161f30] border-emerald-500/40'
                        : 'bg-[#121722] border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-slate-200 truncate">{device.name}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        {device.operator} • {device.wireguardIp}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleDeviceStatus(device.id)}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                          device.status === 'authorized'
                            ? 'bg-emerald-950/80 text-emerald-300 hover:bg-rose-950/80 hover:text-rose-300 border border-emerald-800/60'
                            : 'bg-rose-950/80 text-rose-300 hover:bg-emerald-950/80 hover:text-emerald-300 border border-rose-800/60'
                        }`}
                        title={device.status === 'authorized' ? 'Click to Revoke' : 'Click to Re-authorize'}
                      >
                        {device.status === 'authorized' ? 'REVOKE' : 'ENABLE'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Time Security Audit Log */}
          <div className="p-4 rounded-xl bg-[#0d121c] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Perimeter Audit Log
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 animate-pulse">● Live SIEM</span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 font-mono text-[11px]">
              {securityEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`p-2 rounded border text-[11px] space-y-0.5 ${
                    evt.type === 'allow'
                      ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-300'
                      : 'bg-rose-950/25 border-rose-900/50 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={evt.type === 'allow' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {evt.type === 'allow' ? 'ALLOW (200 OK)' : 'DENIED (400/403)'}
                    </span>
                    <span className="text-slate-500">{evt.timestamp}</span>
                  </div>
                  <div className="text-white font-medium truncate">{evt.reason}</div>
                  <div className="text-slate-400 text-[10px] flex items-center justify-between">
                    <span>IP: {evt.clientIp}</span>
                    <span>Target: {evt.stream}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Certificate Details Viewer */}
      {selectedCertDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0e1420] border border-slate-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  X.509 Client Certificate - {selectedCertDevice.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCertDevice(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300 bg-[#080c14] p-3 rounded-lg border border-slate-800">
              <div><span className="text-slate-500">Issuer:</span> CN=Surveillance-Root-CA, O=Enterprise Security</div>
              <div><span className="text-slate-500">Subject:</span> CN={selectedCertDevice.id}, OU={selectedCertDevice.operator}</div>
              <div><span className="text-slate-500">Serial:</span> <span className="text-amber-300">{selectedCertDevice.certSerial}</span></div>
              <div><span className="text-slate-500">Key Type:</span> ECDSA (prime256v1 / secp256r1)</div>
              <div><span className="text-slate-500">Fingerprint:</span> <span className="text-emerald-400 text-[11px]">{selectedCertDevice.fingerprint}</span></div>
              <div><span className="text-slate-500">Extended Key Usage:</span> TLS Web Client Authentication (1.3.6.1.5.5.7.3.2)</div>
              <div><span className="text-slate-500">WireGuard IP Binding:</span> {selectedCertDevice.wireguardIp}/32</div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                onClick={() => setSelectedCertDevice(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Enroll New Device */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleEnrollDevice}
            className="bg-[#0e1420] border border-slate-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Enroll Authorized Device</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Generates an ECDSA client certificate signed by the internal CA and allocates an isolated WireGuard mesh IP address.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Device Name / Station Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Security Dispatch Console 3"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full bg-[#121722] border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Authorized Operator Name & Role
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sarah Connor (Watch Commander)"
                  value={newOperator}
                  onChange={(e) => setNewOperator(e.target.value)}
                  className="w-full bg-[#121722] border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Device Hardware Type</label>
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value as any)}
                  className="w-full bg-[#121722] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="workstation">Security Operations Workstation</option>
                  <option value="laptop">Encrypted SecOps Laptop</option>
                  <option value="tablet">Field Patrol Tablet</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-[11px] text-emerald-300 font-mono space-y-1">
                <div>✔ Auto-provisioning PKCS#12 bundle (.p12)</div>
                <div>✔ Binding to WireGuard Subnet 10.13.13.0/24</div>
                <div>✔ Registering in Nginx mTLS client whitelist</div>
              </div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
              >
                Issue Certificate & Whitelist
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Wi-Fi and LAN CCTV Management Gateway Modal */}
      <WifiCctvManagerModal
        isOpen={isWifiModalOpen}
        onClose={() => setIsWifiModalOpen(false)}
        connectedCctvs={wifiCctvs}
        onAddOrUpdateCctv={handleAddOrUpdateWifiCctv}
        onSelectForMainView={handleSelectWifiForMainView}
      />

      {/* Field Patrol Phone Camera Pairing & Permissions Gateway Modal */}
      <PhoneCameraPairingModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        pairedPhones={pairedPhones}
        onAddPhone={handleAddPhone}
        onGrantPermission={handleGrantPhonePermission}
        onRevokePermission={handleRevokePhonePermission}
        onRemovePhone={handleRemovePhone}
        onSelectForMainView={handleSelectPhoneForMainView}
      />
    </div>
  );
};
