import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { useTranslation } from '@/components/i18n/translations';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Zap, MapPin } from 'lucide-react';
import PartnerCard from '@/components/partners/PartnerCard';

export default function Partners() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sosFilter, setSosFilter] = useState(false);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: () => db.entities.Partner.list('-rating', 100),
  });

  const filteredPartners = partners.filter(p => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!p.name?.toLowerCase().includes(query) && 
          !p.location?.city?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (sosFilter && !p.sos_service) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{t('proPartners')}</h1>
            <p className="text-zinc-400">Directorio de empresas de backline profesional</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            placeholder="Buscar empresa o ciudad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 h-12 rounded-xl"
          />
        </div>

        <button
          onClick={() => setSosFilter(!sosFilter)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
            sosFilter 
              ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
              : 'bg-zinc-800/50 border border-zinc-700 text-zinc-400'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span>{t('sosService')}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{partners.length}</p>
          <p className="text-sm text-zinc-500">Partners</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{partners.filter(p => p.verified).length}</p>
          <p className="text-sm text-zinc-500">{t('verified')}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{partners.filter(p => p.sos_service).length}</p>
          <p className="text-sm text-zinc-500">SOS 24h</p>
        </div>
      </div>

      {/* Partners Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : filteredPartners.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPartners.map(partner => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">{t('noResults')}</h3>
          <p className="text-zinc-500">No se encontraron partners con estos filtros</p>
        </div>
      )}
    </div>
  );
}