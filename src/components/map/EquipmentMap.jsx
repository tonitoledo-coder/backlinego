import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '../i18n/translations';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createIcon = (color) => new L.DivIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const blueIcon = createIcon('#3B82F6');
const goldIcon = createIcon('#F59E0B');
const userIcon = new L.DivIcon({
  className: 'user-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #22C55E;
      border-radius: 50%;
      border: 4px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function LocationMarker({ position, sosMode }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position, 13);
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <>
      <Marker position={position} icon={userIcon}>
        <Popup>Tu ubicación</Popup>
      </Marker>
      {sosMode && (
        <Circle
          center={position}
          radius={20000}
          pathOptions={{
            color: '#22C55E',
            fillColor: '#22C55E',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '10, 5'
          }}
        />
      )}
    </>
  );
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Give the DOM time to settle, then force Leaflet to recalculate size
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);
  return null;
}

export default function EquipmentMap({ equipment = [], sosMode = false, className = "" }) {
  const { t } = useTranslation();
  const [userPosition, setUserPosition] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          // Default to Madrid if geolocation fails
          setUserPosition([40.4168, -3.7038]);
        }
      );
    } else {
      setUserPosition([40.4168, -3.7038]);
    }
  }, []);

  const defaultCenter = userPosition || [40.4168, -3.7038];

  const filteredEquipment = sosMode 
    ? equipment.filter(e => e.sos_available)
    : equipment;

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full rounded-xl"
        style={{ background: '#1a1a2e' }}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          opacity={1}
        />

        <MapResizer />
        <LocationMarker position={userPosition} sosMode={sosMode} />
        
        {filteredEquipment.map(item => {
          if (!item.location?.lat || !item.location?.lng) return null;
          
          return (
            <Marker
              key={item.id}
              position={[item.location.lat, item.location.lng]}
              icon={item.owner_type === 'professional' ? goldIcon : blueIcon}
            >
              <Popup className="equipment-popup">
                <div className="p-2 min-w-[200px]">
                  {item.images?.[0] && (
                    <img 
                      src={item.images[0]} 
                      alt={item.title}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  )}
                  <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-blue-600">€{item.price_per_day}/día</span>
                    {item.sos_available && (
                      <Badge className="bg-green-500 text-white text-xs">SOS</Badge>
                    )}
                  </div>
                  <Link to={createPageUrl('EquipmentDetail') + `?id=${item.id}`}>
                    <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                      {t('bookNow')}
                    </Button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-3 z-[1000]">
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-zinc-300">{t('particular')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-zinc-300">{t('professional')}</span>
          </div>
          {userPosition && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-zinc-300">{t('yourLocation')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}