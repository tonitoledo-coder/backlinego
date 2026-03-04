import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Star, Zap, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../i18n/translations';
import CategoryIcon from '../ui/CategoryIcon';

export default function EquipmentCard({ equipment }) {
  const { t } = useTranslation();
  
  const conditionColor = equipment.condition >= 8 ? 'text-green-400' : 
                         equipment.condition >= 5 ? 'text-yellow-400' : 'text-red-400';
  const conditionStyle = { color: '#a78bfa' }; // brand violet for rating

  return (
    <Link to={createPageUrl('EquipmentDetail') + `?id=${equipment.id}`}>
      <Card className="bg-zinc-900/50 border-zinc-800 hover:border-blue-500/50 transition-all duration-300 overflow-hidden group">
        <div className="relative aspect-[4/3] overflow-hidden">
          {equipment.images?.[0] ? (
            <img 
              src={equipment.images[0]} 
              alt={equipment.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <CategoryIcon category={equipment.category} className="w-12 h-12 text-zinc-600" />
            </div>
          )}
          
          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {equipment.sos_available && (
              <Badge className="bg-green-500/90 text-black font-semibold">
                <Zap className="w-3 h-3 mr-1" />
                SOS 24h
              </Badge>
            )}
            {equipment.owner_type === 'professional' && (
              <Badge className="bg-amber-500/90 text-black font-semibold">
                PRO
              </Badge>
            )}
          </div>
          
          {/* Price tag */}
          <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
            <span className="text-lg font-bold text-white">€{equipment.price_per_day}</span>
            <span className="text-zinc-400 text-sm">{t('perDay')}</span>
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-white truncate flex-1 group-hover:text-blue-400 transition-colors">
              {equipment.title}
            </h3>
            <div className="flex items-center gap-1 text-sm">
              <span className={conditionColor}>{equipment.condition}/10</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
            <CategoryIcon category={equipment.category} className="w-4 h-4" />
            <span>{t(equipment.category)}</span>
            {equipment.brand && (
              <>
                <span>•</span>
                <span>{equipment.brand}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-zinc-500">
              <MapPin className="w-3.5 h-3.5" />
              <span>{equipment.location?.city || 'Location'}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}