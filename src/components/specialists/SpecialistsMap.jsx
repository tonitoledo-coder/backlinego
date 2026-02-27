import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Purple marker for specialists (workshops)
const purpleIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 32px; height: 32px;
    background: #9333EA;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const userIcon = new L.DivIcon({
  className: 'user-marker',
  html: `<div style="width:20px;height:20px;background:#22C55E;border-radius:50%;border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function SpecialistsMap({ specialists = [], onRequestQuote }) {
  const [userPos, setUserPos] = useState([40.4168, -3.7038]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  const withLocation = specialists.filter(s => s.location?.lat && s.location?.lng);

  return (
    <MapContainer center={userPos} zoom={6} className="w-full h-full">
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <Marker position={userPos} icon={userIcon}>
        <Popup>Tu ubicación</Popup>
      </Marker>

      {withLocation.map(s => (
        <Marker key={s.id} position={[s.location.lat, s.location.lng]} icon={purpleIcon}>
          <Popup>
            <div className="p-2 min-w-[180px]">
              <p className="font-bold text-sm mb-1">{s.name}</p>
              <p className="text-xs text-gray-500 mb-2">{s.location.city}</p>
              <Button
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs"
                onClick={() => onRequestQuote(s)}
              >
                Pedir Presupuesto
              </Button>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000 }}
        className="bg-zinc-900/90 rounded-lg p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Taller especialista</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-300 mt-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Tu ubicación</span>
        </div>
      </div>
    </MapContainer>
  );
}