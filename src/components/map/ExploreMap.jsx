import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { createPageUrl } from '@/utils';
import { useTranslation } from '@/components/i18n/translations';
import { Badge } from '@/components/ui/badge';
import { Zap, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom pin icon factory
function makeIcon(color, size = 36, highlighted = false) {
  const s = highlighted ? size + 8 : size;
  const shadow = highlighted ? '0 0 0 4px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.4)';
  return new L.DivIcon({
    className: '',
    html: `<div style="
      width:${s}px;height:${s}px;
      background:${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid rgba(255,255,255,0.9);
      box-shadow:${shadow};
      transition:all 0.15s ease;
    "></div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s],
    popupAnchor: [0, -s],
  });
}

const ICONS = {
  equipment: makeIcon('#3B82F6'),
  space:     makeIcon('#10B981'),
  sos:       makeIcon('#F97316'),
  equipmentH: makeIcon('#3B82F6', 36, true),
  spaceH:     makeIcon('#10B981', 36, true),
  sosH:       makeIcon('#F97316', 36, true),
};

function getIcon(eq, highlighted) {
  const suffix = highlighted ? 'H' : '';
  if (eq.sos_available) return ICONS['sos' + suffix];
  if ((eq.listing_type || 'equipment') === 'space') return ICONS['space' + suffix];
  return ICONS['equipment' + suffix];
}

// Fit bounds to visible markers
function FitBounds({ equipment }) {
  const map = useMap();
  useEffect(() => {
    const points = equipment.filter(e => e.location?.lat && e.location?.lng)
      .map(e => [e.location.lat, e.location.lng]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    }
  }, [equipment]);
  return null;
}

// Popup content — plain HTML-safe, no React router Link (Leaflet portals)
function EquipmentPopup({ eq, searchStart, searchEnd }) {
  const detailUrl = (() => {
    const p = new URLSearchParams({ id: eq.id });
    if (searchStart) p.set('from', searchStart instanceof Date ? searchStart.toISOString().slice(0,10) : searchStart);
    if (searchEnd)   p.set('to',   searchEnd   instanceof Date ? searchEnd.toISOString().slice(0,10)   : searchEnd);
    return '/EquipmentDetail?' + p.toString();
  })();

  return (
    <div style={{ minWidth: 200, maxWidth: 240 }}>
      {eq.images?.[0] && (
        <img
          src={eq.images[0]}
          alt={eq.title}
          style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
        />
      )}
      <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>
        {eq.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#60a5fa' }}>
          €{eq.price_per_day}<span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>/día</span>
        </span>
        {eq.sos_available && (
          <span style={{ background: '#f97316', color: '#000', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99 }}>
            ⚡ SOS
          </span>
        )}
      </div>
      {eq.location?.city && (
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>📍 {eq.location.city}</div>
      )}
      <a
        href={detailUrl}
        style={{
          display: 'block', width: '100%', textAlign: 'center',
          background: '#1DDF7A', color: '#060E18', fontWeight: 700,
          padding: '7px 0', borderRadius: 8, fontSize: 12, textDecoration: 'none',
        }}
      >
        Ver detalle →
      </a>
    </div>
  );
}

export default function ExploreMap({ equipment = [], hoveredId = null, onMarkerClick, searchStart, searchEnd, className = '' }) {
  const { t } = useTranslation();
  const markersRef = useRef({});
  const [defaultCenter] = useState([40.4168, -3.7038]);

  const withCoords = equipment.filter(e => e.location?.lat && e.location?.lng);

  return (
    <div className={`relative ${className}`} style={{ background: '#0d0d1a' }}>
      <MapContainer
        center={defaultCenter}
        zoom={6}
        className="w-full h-full"
        style={{ background: '#0d0d1a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <FitBounds equipment={withCoords} />

        {withCoords.map(eq => (
          <Marker
            key={eq.id}
            position={[eq.location.lat, eq.location.lng]}
            icon={getIcon(eq, hoveredId === eq.id)}
            ref={ref => { if (ref) markersRef.current[eq.id] = ref; }}
            eventHandlers={{
              click: () => onMarkerClick?.(eq.id),
            }}
          >
            <Popup className="dark-popup" maxWidth={240}>
              <EquipmentPopup eq={eq} searchStart={searchStart} searchEnd={searchEnd} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-zinc-900/90 backdrop-blur-sm rounded-xl p-3 text-xs space-y-1.5 border border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-zinc-300">Equipo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-zinc-300">Espacio</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-zinc-300">SOS 24h</span>
        </div>
      </div>

      {/* Count badge */}
      <div className="absolute top-4 right-4 z-[1000] bg-zinc-900/90 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs text-zinc-300 border border-zinc-700">
        {withCoords.length} en mapa
        {equipment.length - withCoords.length > 0 && (
          <span className="text-zinc-600 ml-1">· {equipment.length - withCoords.length} sin coords</span>
        )}
      </div>
    </div>
  );
}