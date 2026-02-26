import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, Phone, Star, Zap, CheckCircle } from 'lucide-react';
import { useTranslation } from '../i18n/translations';

export default function PartnerCard({ partner }) {
  const { t } = useTranslation();

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50 transition-all duration-300 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {partner.logo_url ? (
            <img 
              src={partner.logo_url} 
              alt={partner.name}
              className="w-16 h-16 rounded-xl object-cover bg-zinc-800"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-black">
                {partner.name?.charAt(0) || 'P'}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-white truncate">{partner.name}</h3>
              {partner.verified && (
                <CheckCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
            
            {partner.rating && (
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm text-white">{partner.rating.toFixed(1)}</span>
                <span className="text-sm text-zinc-500">({partner.reviews_count} {t('reviews')})</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 mb-3">
              {partner.sos_service && (
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  {t('sosService')}
                </Badge>
              )}
              {partner.categories?.slice(0, 2).map(cat => (
                <Badge key={cat} variant="outline" className="border-zinc-700 text-zinc-400">
                  {t(cat)}
                </Badge>
              ))}
            </div>
            
            {partner.location?.city && (
              <div className="flex items-center gap-1 text-sm text-zinc-500 mb-3">
                <MapPin className="w-3.5 h-3.5" />
                <span>{partner.location.city}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          {partner.phone && (
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => window.open(`tel:${partner.phone}`)}
            >
              <Phone className="w-4 h-4 mr-2" />
              {t('phone')}
            </Button>
          )}
          {partner.website && (
            <Button 
              size="sm"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => window.open(partner.website, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('visitWebsite')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}