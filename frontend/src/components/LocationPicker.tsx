import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiSearch, FiLoader } from 'react-icons/fi';
import { geocodeService } from '../services/geocodeService';
import toast from 'react-hot-toast';

// Leaflet's default marker icon references image assets by relative path,
// which breaks under Vite's bundling. A colored divIcon sidesteps that
// entirely and matches the app's brand color.
const markerIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:#0d9488;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);transform:rotate(-45deg)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

interface LatLng {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  radiusMeters?: number;
}

const DEFAULT_CENTER: LatLng = { lat: 6.5244, lng: 3.3792 }; // Lagos, as a reasonable default

const Recenter: React.FC<{ center: LatLng }> = ({ center }) => {
  const map = useMap();
  map.setView(center, map.getZoom() < 10 ? 15 : map.getZoom());
  return null;
};

const ClickToPlace: React.FC<{ onChange: (v: LatLng) => void }> = ({ onChange }) => {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange, radiusMeters }) => {
  const [address, setAddress] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!address.trim()) return;
    setSearching(true);
    try {
      const result = await geocodeService.lookup(address);
      onChange({ lat: result.latitude, lng: result.longitude });
      toast.success(result.displayName);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not find that address');
    } finally {
      setSearching(false);
    }
  };

  const center = value || DEFAULT_CENTER;

  return (
    <div>
      {/* A plain div, not a <form> — this can be nested inside a page's own
          registration/settings form, and nested <form> elements are invalid
          HTML with unpredictable submit behavior across browsers. */}
      <div className="mb-2 flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          className="input"
          placeholder="Type an address, e.g. 14 Adeola Odeku St, Victoria Island, Lagos"
        />
        <button type="button" onClick={handleSearch} disabled={searching} className="btn-secondary shrink-0">
          {searching ? <FiLoader className="animate-spin" size={16} /> : <FiSearch size={16} />}
          Search
        </button>
      </div>

      <div className="h-64 w-full overflow-hidden rounded-lg border border-gray-200">
        <MapContainer center={center} zoom={value ? 15 : 11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter center={center} />
          <ClickToPlace onChange={onChange} />
          {value && (
            <Marker
              position={value}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  onChange({ lat: pos.lat, lng: pos.lng });
                },
              }}
            />
          )}
          {value && radiusMeters && (
            <Circle center={value} radius={radiusMeters} pathOptions={{ color: '#0d9488', fillOpacity: 0.08 }} />
          )}
        </MapContainer>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Search an address, drag the pin, or click the map to fine-tune the exact office location.
      </p>
    </div>
  );
};

export default LocationPicker;
