import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search,
  MapPin,
  Compass,
  Navigation,
  ExternalLink,
  Layers,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  AlertCircle,
  Building,
  Shield,
  LocateFixed,
  Info,
  Radio,
  Video,
  Cctv,
  Eye,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import {
  NearbyCctvCamera,
  generateNearbyCctvsAroundLocation,
} from '../utils/nearbyCctv';

export interface LocationSearchResult {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId?: string;
  types?: string[];
}

export interface LocationMapProps {
  onLocationSelected?: (location: LocationSearchResult) => void;
  onSelectCctvToStream?: (cctv: NearbyCctvCamera) => void;
  className?: string;
}

// Fallback initial coordinates (San Francisco Security Operations Center)
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

// Known critical surveillance checkpoints with coordinates
export const SURVEILLANCE_CHECKPOINTS = [
  {
    id: 'pt-01',
    name: 'HQ North Gate Perimeter',
    address: 'North Outer Security Gate, Financial District, SF',
    lat: 37.7955,
    lng: -122.4005,
    type: 'Perimeter Checkpoint',
    status: 'ACTIVE_FEED',
  },
  {
    id: 'pt-02',
    name: 'Datacenter Server Vault Alpha',
    address: 'Mission Bay Data Campus, San Francisco, CA',
    lat: 37.7689,
    lng: -122.3912,
    type: 'Vault Ingress',
    status: 'ACTIVE_FEED',
  },
  {
    id: 'pt-03',
    name: 'Executive Access Corridor',
    address: 'Level 3 East Wing, Montgomery St, SF',
    lat: 37.7901,
    lng: -122.4022,
    type: 'Biometric Corridor',
    status: 'ACTIVE_FEED',
  },
  {
    id: 'pt-04',
    name: 'Emergency Dispatch Hub',
    address: 'Civic Center Dispatch Facility, SF',
    lat: 37.7793,
    lng: -122.4187,
    type: 'Command Center',
    status: 'STANDBY',
  },
];

declare global {
  interface Window {
    google?: any;
    initGoogleMapsCallback?: () => void;
  }
}

export const LocationSearchBarMap: React.FC<LocationMapProps> = ({
  onLocationSelected,
  onSelectCctvToStream,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [activeLocation, setActiveLocation] = useState<LocationSearchResult>({
    name: 'San Francisco SOC Hub',
    formattedAddress: 'San Francisco, CA, USA',
    lat: DEFAULT_CENTER.lat,
    lng: DEFAULT_CENTER.lng,
  });

  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>('pt-01');

  // Nearby CCTV search state
  const [nearbyCctvs, setNearbyCctvs] = useState<NearbyCctvCamera[]>([]);
  const [isScanningCctvs, setIsScanningCctvs] = useState(false);
  const [searchRadius, setSearchRadius] = useState<number>(2000);
  const [selectedCctvId, setSelectedCctvId] = useState<string | null>(null);

  // Google Maps objects held in refs to avoid re-rendering
  const mapInstanceRef = useRef<any>(null);
  const mainMarkerRef = useRef<any>(null);
  const checkpointMarkersRef = useRef<any[]>([]);
  const cctvMarkersRef = useRef<any[]>([]);
  const radiusCircleRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    'AIzaSyBHyijKD-_t3HtOXXsFyDsgOtrxkCOMEto';

  // Load Google Maps JavaScript API script
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      // Load with libraries=places,geometry,marker and async loading
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&v=weekly`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setIsLoaded(true);
      };

      script.onerror = () => {
        setLoadError(
          'Failed to load Google Maps script. Check network or API key configuration.'
        );
      };

      document.head.appendChild(script);
    } else {
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }
  }, [apiKey]);

  // Update center & marker
  const panToLocation = useCallback(
    (lat: number, lng: number, zoomLevel = 15, title = 'Selected Location') => {
      if (!mapInstanceRef.current || !window.google?.maps) return;

      const newPos = { lat, lng };
      mapInstanceRef.current.panTo(newPos);
      mapInstanceRef.current.setZoom(zoomLevel);

      if (mainMarkerRef.current) {
        mainMarkerRef.current.setPosition(newPos);
        mainMarkerRef.current.setTitle(title);
      } else {
        mainMarkerRef.current = new window.google.maps.Marker({
          position: newPos,
          map: mapInstanceRef.current,
          title,
          animation: window.google.maps.Animation.DROP,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
          },
        });
      }
    },
    []
  );

  // Scan CCTVs around coordinates
  const performCctvScan = useCallback(
    (centerLat: number, centerLng: number, radius = searchRadius) => {
      if (!mapInstanceRef.current || !window.google?.maps) return;
      setIsScanningCctvs(true);

      // Clear existing CCTV markers
      cctvMarkersRef.current.forEach((marker) => marker.setMap(null));
      cctvMarkersRef.current = [];

      // Update or create radius circle
      if (radiusCircleRef.current) {
        radiusCircleRef.current.setCenter({ lat: centerLat, lng: centerLng });
        radiusCircleRef.current.setRadius(radius);
        radiusCircleRef.current.setMap(mapInstanceRef.current);
      } else {
        radiusCircleRef.current = new window.google.maps.Circle({
          strokeColor: '#10b981',
          strokeOpacity: 0.85,
          strokeWeight: 1.5,
          fillColor: '#10b981',
          fillOpacity: 0.08,
          map: mapInstanceRef.current,
          center: { lat: centerLat, lng: centerLng },
          radius: radius,
        });
      }

      // Generate CCTVs around the center
      const discovered = generateNearbyCctvsAroundLocation(centerLat, centerLng, radius);
      setNearbyCctvs(discovered);

      // Create map markers for discovered CCTVs
      discovered.forEach((cctv) => {
        const marker = new window.google.maps.Marker({
          position: { lat: cctv.lat, lng: cctv.lng },
          map: mapInstanceRef.current,
          title: `CCTV: ${cctv.name} (${cctv.distanceMeters}m ${cctv.bearingCompass})`,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: cctv.status === 'ACTIVE_STREAM' ? '#38bdf8' : '#f59e0b',
            fillOpacity: 1,
            strokeColor: '#0b0f17',
            strokeWeight: 1.5,
            rotation: cctv.panHeading,
          },
        });

        marker.addListener('click', () => {
          setSelectedCctvId(cctv.id);
          panToLocation(cctv.lat, cctv.lng, 17, cctv.name);
        });

        cctvMarkersRef.current.push(marker);
      });

      setTimeout(() => setIsScanningCctvs(false), 450);
    },
    [searchRadius, panToLocation]
  );

  // Initialize Map and Places Autocomplete
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !window.google?.maps) return;
    if (mapInstanceRef.current) return;

    try {
      // Dark cyber-security styled map theme
      const darkCyberStyle = [
        { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#38bdf8' }],
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#64748b' }],
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{ color: '#132838' }],
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#1e293b' }],
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#0f172a' }],
        },
        {
          featureType: 'road',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#cbd5e1' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#334155' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#1e293b' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#f1f5f9' }],
        },
        {
          featureType: 'transit',
          elementType: 'geometry',
          stylers: [{ color: '#1e293b' }],
        },
        {
          featureType: 'transit.station',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#10b981' }],
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#060d17' }],
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#38bdf8' }],
        },
        {
          featureType: 'water',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#060d17' }],
        },
      ];

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 14,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: darkCyberStyle,
        disableDefaultUI: true,
        zoomControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
      });

      mapInstanceRef.current = map;

      // Initial CCTV scan around default center
      setTimeout(() => {
        performCctvScan(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, 2000);
      }, 300);

      // Add Checkpoint Markers
      SURVEILLANCE_CHECKPOINTS.forEach((pt) => {
        const marker = new window.google.maps.Marker({
          position: { lat: pt.lat, lng: pt.lng },
          map,
          title: `${pt.name} (${pt.type})`,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: '#38bdf8',
            fillOpacity: 0.9,
            strokeColor: '#0f172a',
            strokeWeight: 1.5,
          },
        });

        marker.addListener('click', () => {
          setSelectedCheckpoint(pt.id);
          const locResult: LocationSearchResult = {
            name: pt.name,
            formattedAddress: pt.address,
            lat: pt.lat,
            lng: pt.lng,
          };
          setActiveLocation(locResult);
          panToLocation(pt.lat, pt.lng, 16, pt.name);
          performCctvScan(pt.lat, pt.lng);
          if (onLocationSelected) onLocationSelected(locResult);
        });

        checkpointMarkersRef.current.push(marker);
      });

      // Create Active Location Marker
      mainMarkerRef.current = new window.google.maps.Marker({
        position: DEFAULT_CENTER,
        map,
        title: 'Security Operations Hub',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
      });

      // Click to select arbitrary coordinates
      map.addListener('click', (event: any) => {
        if (!event.latLng) return;
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        // Reverse geocode clicked location
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          const locName =
            status === 'OK' && results && results[0]
              ? results[0].formatted_address
              : `Coordinate Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

          const locResult: LocationSearchResult = {
            name: results?.[0]?.address_components?.[0]?.long_name || 'Selected Location',
            formattedAddress: locName,
            lat,
            lng,
          };

          setActiveLocation(locResult);
          panToLocation(lat, lng, map.getZoom(), locName);
          performCctvScan(lat, lng);
          if (onLocationSelected) onLocationSelected(locResult);
        });
      });

      // Attach Places Autocomplete to Search Bar input
      if (inputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            fields: ['formatted_address', 'geometry', 'name', 'place_id', 'types'],
          }
        );

        autocomplete.bindTo('bounds', map);
        autocompleteRef.current = autocomplete;

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) {
            return;
          }

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const name = place.name || 'Searched Location';
          const formattedAddress = place.formatted_address || name;

          const result: LocationSearchResult = {
            name,
            formattedAddress,
            lat,
            lng,
            placeId: place.place_id,
            types: place.types,
          };

          setActiveLocation(result);
          setSelectedCheckpoint(null);

          if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
          } else {
            panToLocation(lat, lng, 16, name);
          }

          performCctvScan(lat, lng);

          if (onLocationSelected) {
            onLocationSelected(result);
          }
        });
      }
    } catch (err: any) {
      console.error('Error initializing Google Maps:', err);
      setLoadError(err.message || 'Google Maps failed to initialize.');
    }
  }, [isLoaded, onLocationSelected, panToLocation, performCctvScan]);

  // Switch map view style (Roadmap / Satellite)
  const handleMapTypeChange = (type: 'roadmap' | 'satellite' | 'hybrid') => {
    setMapType(type);
    if (mapInstanceRef.current && window.google?.maps) {
      mapInstanceRef.current.setMapTypeId(type);
    }
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || 14;
      mapInstanceRef.current.setZoom(currentZoom + delta);
    }
  };

  // Locate user device GPS
  const handleFindCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const result: LocationSearchResult = {
          name: 'Current Operator Position',
          formattedAddress: `GPS Fix: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          lat: latitude,
          lng: longitude,
        };

        setActiveLocation(result);
        setSelectedCheckpoint(null);
        panToLocation(latitude, longitude, 16, 'Current Operator GPS');
        if (inputRef.current) {
          inputRef.current.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        }
        performCctvScan(latitude, longitude, searchRadius);
        if (onLocationSelected) onLocationSelected(result);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error or denied:', err);
        // Fallback smooth pan to HQ default
        panToLocation(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, 15, 'San Francisco SOC Hub');
        performCctvScan(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, searchRadius);
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  };

  return (
    <div
      id="location-search-map-container"
      className={`rounded-xl overflow-hidden border border-slate-800 bg-[#0b0f17] flex flex-col shadow-lg ${className}`}
    >
      {/* Top Search Header Bar */}
      <div className="p-3.5 bg-[#0e1422] border-b border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Real-Time Autocomplete Search Bar */}
        <div className="relative flex-1" ref={autocompleteContainerRef}>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-emerald-400" />
          </div>
          <input
            ref={inputRef}
            id="google-maps-location-input"
            type="text"
            placeholder="Search address, landmark, city, or coordinates (e.g. Times Square, SF HQ)..."
            className="w-full bg-[#141b2a] border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-lg pl-10 pr-24 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-hidden transition-all shadow-inner"
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center space-x-1">
            <button
              onClick={handleFindCurrentLocation}
              disabled={isLocating}
              title="Locate device GPS position & scan nearby CCTVs"
              className="p-1.5 rounded-md hover:bg-slate-700/80 text-slate-300 hover:text-emerald-400 transition-colors"
            >
              <LocateFixed
                className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-emerald-400' : ''}`}
              />
            </button>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 hidden sm:inline">
              Maps Live
            </span>
          </div>
        </div>

        {/* CCTV Proximity Scan Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Radius selector */}
          <div className="flex items-center space-x-1 bg-[#141b2a] border border-slate-700 rounded-lg px-2 py-1 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400">Radius:</span>
            <select
              value={searchRadius}
              onChange={(e) => {
                const r = Number(e.target.value);
                setSearchRadius(r);
                performCctvScan(activeLocation.lat, activeLocation.lng, r);
              }}
              className="bg-transparent text-emerald-400 font-semibold text-xs border-none focus:outline-none cursor-pointer"
            >
              <option value={500} className="bg-[#141b2a] text-white">500 m</option>
              <option value={1000} className="bg-[#141b2a] text-white">1.0 km</option>
              <option value={2000} className="bg-[#141b2a] text-white">2.0 km</option>
              <option value={5000} className="bg-[#141b2a] text-white">5.0 km</option>
            </select>
          </div>

          {/* Trigger Scan Around Current Target */}
          <button
            onClick={() => performCctvScan(activeLocation.lat, activeLocation.lng, searchRadius)}
            disabled={isScanningCctvs}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${isScanningCctvs ? 'animate-spin' : ''}`} />
            <span>{isScanningCctvs ? 'Scanning CCTVs...' : 'Scan Nearby CCTVs'}</span>
          </button>

          {/* Map View Controls & Map Type */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#141b2a] border border-slate-700 text-xs">
            <button
              onClick={() => handleMapTypeChange('roadmap')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                mapType === 'roadmap'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vector
            </button>
            <button
              onClick={() => handleMapTypeChange('satellite')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                mapType === 'satellite'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => handleMapTypeChange('hybrid')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                mapType === 'hybrid'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hybrid
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Container Canvas */}
      <div className="relative w-full h-[320px] sm:h-[400px] bg-[#070b12]">
        {/* The Google Maps Canvas */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Zoom & Compass Controls */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col space-y-1.5 shadow-xl">
          <button
            onClick={() => handleZoom(1)}
            className="w-8 h-8 rounded-lg bg-[#0e1422]/90 hover:bg-[#1a2338] border border-slate-700 text-white flex items-center justify-center transition-colors shadow-md"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-slate-200" />
          </button>
          <button
            onClick={() => handleZoom(-1)}
            className="w-8 h-8 rounded-lg bg-[#0e1422]/90 hover:bg-[#1a2338] border border-slate-700 text-white flex items-center justify-center transition-colors shadow-md"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-slate-200" />
          </button>
          <button
            onClick={() => panToLocation(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, 14)}
            className="w-8 h-8 rounded-lg bg-[#0e1422]/90 hover:bg-[#1a2338] border border-slate-700 text-white flex items-center justify-center transition-colors shadow-md"
            title="Reset to SOC HQ"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* Floating Telemetry Box for Active Target */}
        <div className="absolute top-3 left-3 z-20 max-w-[280px] sm:max-w-xs p-2.5 rounded-lg bg-[#0e1422]/95 border border-slate-700/80 backdrop-blur-md shadow-xl text-xs space-y-1 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Target Telemetry
            </span>
            <span className="text-[10px] text-slate-400">Google Places API</span>
          </div>
          <div className="text-white font-semibold truncate text-[11px]">
            {activeLocation.name}
          </div>
          <div className="text-slate-400 text-[10px] truncate">
            {activeLocation.formattedAddress}
          </div>
          <div className="flex items-center justify-between text-[10px] pt-1 text-slate-400 border-t border-slate-800/80">
            <span>LAT: <strong className="text-slate-200">{activeLocation.lat.toFixed(5)}</strong></span>
            <span>LNG: <strong className="text-slate-200">{activeLocation.lng.toFixed(5)}</strong></span>
          </div>
        </div>

        {/* Error Fallback Overlay if Maps fails */}
        {loadError && (
          <div className="absolute inset-0 bg-[#0b0f17]/95 flex flex-col items-center justify-center p-6 text-center z-30">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">Google Maps Initialization Notice</h4>
            <p className="text-xs text-slate-400 max-w-md mb-3">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg flex items-center gap-1.5 border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Load</span>
            </button>
          </div>
        )}
      </div>

      {/* Discovered Nearby CCTVs Proximity Drawer / Grid */}
      <div className="p-3 bg-[#0a0e17] border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nearby CCTV Cameras Around Target ({nearbyCctvs.length} In Range)</span>
            <span className="text-[10px] text-slate-500 font-mono">
              Within {searchRadius >= 1000 ? `${(searchRadius / 1000).toFixed(1)}km` : `${searchRadius}m`}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span className="hidden sm:inline">Click camera to focus on map or stream in console</span>
          </div>
        </div>

        {nearbyCctvs.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-dashed border-slate-800 text-xs text-slate-500">
            No public or municipal CCTV feeds detected within selected radius. Try expanding radius or scanning another checkpoint.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {nearbyCctvs.map((cctv) => {
              const isSelected = selectedCctvId === cctv.id;
              return (
                <div
                  key={cctv.id}
                  className={`p-2.5 rounded-lg border text-xs transition-all flex flex-col justify-between space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500/80 shadow-md ring-1 ring-blue-500/40'
                      : 'bg-[#0f1524] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white truncate max-w-[170px] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">{cctv.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[190px]">
                        {cctv.locationDescription || cctv.address}
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#162035] text-blue-300 font-bold shrink-0 border border-blue-900">
                      {cctv.distanceMeters}m {cctv.bearingCompass}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-300 font-medium">{cctv.category}</span>
                      <span>•</span>
                      <span className="text-emerald-400">{cctv.protocol}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setSelectedCctvId(cctv.id);
                          panToLocation(cctv.lat, cctv.lng, 17, cctv.name);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px]"
                        title="Locate on map"
                      >
                        Locate
                      </button>

                      {onSelectCctvToStream && (
                        <button
                          onClick={() => onSelectCctvToStream(cctv)}
                          className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] flex items-center gap-1 shadow-xs"
                          title="Stream live feed in console"
                        >
                          <Video className="w-3 h-3" />
                          <span>Stream</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Checkpoint Quick Selector Strip */}
      <div className="p-3 bg-[#0d121c] border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center space-x-2 text-slate-400 shrink-0">
          <Building className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-semibold text-slate-300">Monitored Facilities:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {SURVEILLANCE_CHECKPOINTS.map((pt) => {
            const isSelected = selectedCheckpoint === pt.id;
            return (
              <button
                key={pt.id}
                onClick={() => {
                  setSelectedCheckpoint(pt.id);
                  const loc: LocationSearchResult = {
                    name: pt.name,
                    formattedAddress: pt.address,
                    lat: pt.lat,
                    lng: pt.lng,
                  };
                  setActiveLocation(loc);
                  panToLocation(pt.lat, pt.lng, 16, pt.name);
                  if (onLocationSelected) onLocationSelected(loc);
                  if (inputRef.current) inputRef.current.value = pt.name;
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-semibold'
                    : 'bg-[#131926] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <MapPin className={`w-3 h-3 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{pt.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
