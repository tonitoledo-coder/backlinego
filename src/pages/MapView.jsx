import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Zap, List, MapIcon } from 'lucide-react';
import EquipmentMap from '@/components/map/EquipmentMap';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import CategoryFilter from '@/components/equipment/CategoryFilter';

export default function MapView() {
  const { t } = useTranslation();
  const params = new URLSearchParams(window.location.search);
  
  const [sosMode, setSosMode] = useState(params.get('sos') === 'true');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('map');
  const [mapKey, setMapKey] = useState(0);
  const containerRef = useRef(null);

  // Force Leaflet re-mount when the tab container becomes visible
  // (the layout hides tabs with display:none, so Leaflet can't calc size until visible)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setMapKey(k => k + 1);
          observer.disconnect();
        }
      },
      { threshold: 0.01 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment', 'map'],
    queryFn: () => base44.entities.Equipment.filter({ status: 'available' }, '-created_date', 200),
  });

  const filteredEquipment = equipment.filter(e => {
    if (sosMode && !e.sos_available) return false;
    if (selectedCategory && e.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div ref={containerRef} className="h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4rem)] flex flex-col">
      {/* Controls Bar */}
      <div className="px-4 lg:px-6 py-4 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* SOS Mode Toggle */}
              <div className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 ${
                sosMode ? 'bg-green-500/20 border border-green-500/50' : 'bg-zinc-800/50'
              }`}>
                <Zap className={`w-5 h-5 ${sosMode ? 'text-green-400' : 'text-zinc-500'}`} />
                <Label className={sosMode ? 'text-green-400' : 'text-zinc-400'}>{t('sosMode')}</Label>
                <Switch 
                  checked={sosMode} 
                  onCheckedChange={setSosMode}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              
              <span className="text-zinc-500 text-sm">
                {filteredEquipment.length} {t('equipment').toLowerCase()}
              </span>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-zinc-800 rounded-lg p-1">
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
                className={viewMode === 'map' ? 'bg-blue-600' : 'text-zinc-400'}
              >
                <MapIcon className="w-4 h-4 mr-2" />
                {t('map')}
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-blue-600' : 'text-zinc-400'}
              >
                <List className="w-4 h-4 mr-2" />
                Lista
              </Button>
            </div>
          </div>

          <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
        </div>
      </div>

      {/* Map / List View */}
      <div className="flex-1 relative">
        {viewMode === 'map' ? (
          <EquipmentMap
            key={mapKey}
            equipment={filteredEquipment} 
            sosMode={sosMode}
            className="w-full h-full"
          />
        ) : (
          <div className="p-4 lg:p-6 overflow-auto h-full">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredEquipment.map(eq => (
                <EquipmentCard key={eq.id} equipment={eq} />
              ))}
            </div>
          </div>
        )}

        {/* SOS Info Overlay */}
        {sosMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/90 backdrop-blur-sm text-black px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 neon-green">
            <Zap className="w-4 h-4" />
            {t('sosDescription')} • {t('sosRadius')}
          </div>
        )}
      </div>
    </div>
  );
}