// Utility for searching and calculating CCTV cameras around device location

export interface NearbyCctvCamera {
  id: string;
  name: string;
  category: 'municipal_traffic' | 'public_safety' | 'transit_hub' | 'perimeter_security' | 'commercial_vault';
  categoryLabel: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  bearingDeg: number;
  bearingCompass: string;
  address: string;
  locationDescription?: string;
  status: 'ONLINE' | 'ACTIVE_STREAM' | 'STANDBY';
  resolution: string;
  fps: number;
  protocol: 'RTSP' | 'HLS' | 'MJPEG' | 'WebRTC';
  streamUrl: string;
  fovAngle: number;
  panHeading: number;
  operator: string;
}

// Haversine distance in meters
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Compass bearing from point 1 to point 2
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { deg: number; compass: string } {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  const deg = Math.round(((theta * 180) / Math.PI + 360) % 360);

  const compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return { deg, compass: compassPoints[index] };
}

// Generate realistic geo-referenced surveillance cameras around any coordinate point
export function generateNearbyCctvsAroundLocation(
  centerLat: number,
  centerLng: number,
  radiusMeters: number = 2000
): NearbyCctvCamera[] {
  // Preset radial offsets within the radius
  const offsets = [
    {
      dNorth: 180,
      dEast: 120,
      name: 'Municipal Traffic Cam - Main Junction',
      category: 'municipal_traffic' as const,
      categoryLabel: 'DOT Traffic Camera',
      addressSuffix: 'Main Traffic Corridor / 4th Ave',
      protocol: 'HLS' as const,
      resolution: '1080p 30FPS',
      fps: 30,
      panHeading: 45,
      operator: 'City Dept of Transportation',
    },
    {
      dNorth: -240,
      dEast: 310,
      name: 'Public Transit Terminal CCTV-09',
      category: 'transit_hub' as const,
      categoryLabel: 'Transit & Rail Surveillance',
      addressSuffix: 'Subway Platform Ingress B',
      protocol: 'RTSP' as const,
      resolution: '4K 30FPS',
      fps: 30,
      panHeading: 120,
      operator: 'Metropolitan Transit Authority',
    },
    {
      dNorth: 450,
      dEast: -180,
      name: 'Public Safety Dome PTZ (North Gate)',
      category: 'public_safety' as const,
      categoryLabel: 'Municipal Public Safety',
      addressSuffix: 'Civic Plaza North Perimeter',
      protocol: 'WebRTC' as const,
      resolution: '4K 60FPS',
      fps: 60,
      panHeading: 280,
      operator: 'Emergency Dispatch & Public Safety',
    },
    {
      dNorth: -380,
      dEast: -420,
      name: 'Financial District ATM & Ingress Vault',
      category: 'commercial_vault' as const,
      categoryLabel: 'Commercial High-Security',
      addressSuffix: 'Commerce Tower Outer Lobby',
      protocol: 'RTSP' as const,
      resolution: '1080p 60FPS',
      fps: 60,
      panHeading: 210,
      operator: 'SecureVault Operations',
    },
    {
      dNorth: 720,
      dEast: 640,
      name: 'Expressway Interchange Speed & Plate Cam',
      category: 'municipal_traffic' as const,
      categoryLabel: 'Highway ANPR Surveillance',
      addressSuffix: 'Interstate Connector Ramp 12',
      protocol: 'HLS' as const,
      resolution: '4K 60FPS',
      fps: 60,
      panHeading: 75,
      operator: 'Highway Patrol ANPR Grid',
    },
    {
      dNorth: -120,
      dEast: -650,
      name: 'Pedestrian Promenade Optical Cam',
      category: 'public_safety' as const,
      categoryLabel: 'Pedestrian Walkway Node',
      addressSuffix: 'Riverfront Green Belt Walkway',
      protocol: 'MJPEG' as const,
      resolution: '1080p 25FPS',
      fps: 25,
      panHeading: 195,
      operator: 'City Parks Security',
    },
    {
      dNorth: 950,
      dEast: -320,
      name: 'Telecom Repeater Facility Perimeter',
      category: 'perimeter_security' as const,
      categoryLabel: 'Critical Infrastructure',
      addressSuffix: 'Microwave Substation Enclosure',
      protocol: 'RTSP' as const,
      resolution: '1080p 30FPS',
      fps: 30,
      panHeading: 330,
      operator: 'Grid Infrastructure Security',
    },
  ];

  // Convert meter offsets to lat/lng (1 deg lat ~= 111,139 meters)
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.cos((centerLat * Math.PI) / 180);

  const results: NearbyCctvCamera[] = [];

  offsets.forEach((item, index) => {
    // Scale offset based on search radius
    const scaleFactor = Math.min(1.5, Math.max(0.4, radiusMeters / 1500));
    const dN = item.dNorth * scaleFactor;
    const dE = item.dEast * scaleFactor;

    const lat = centerLat + dN / metersPerDegLat;
    const lng = centerLng + dE / metersPerDegLng;

    const distanceMeters = calculateDistanceMeters(centerLat, centerLng, lat, lng);

    if (distanceMeters <= radiusMeters) {
      const { deg, compass } = calculateBearing(centerLat, centerLng, lat, lng);

      results.push({
        id: `nearby-cctv-${index + 1}`,
        name: item.name,
        category: item.category,
        categoryLabel: item.categoryLabel,
        lat,
        lng,
        distanceMeters,
        bearingDeg: deg,
        bearingCompass: compass,
        address: `${item.addressSuffix} (${distanceMeters}m ${compass} from device)`,
        status: index % 4 === 3 ? 'STANDBY' : 'ACTIVE_STREAM',
        resolution: item.resolution,
        fps: item.fps,
        protocol: item.protocol,
        streamUrl: `${item.protocol.toLowerCase()}://cctv-mesh.internal/node-${index + 1}/live`,
        fovAngle: 85,
        panHeading: item.panHeading,
        operator: item.operator,
      });
    }
  });

  // Sort by distance ascending
  return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
}
