import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Wrench, MapIcon, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import SpecialistCard from '@/components/specialists/SpecialistCard';
import QuoteRequestModal from '@/components/specialists/QuoteRequestModal';
import SpecialistsMap from '@/components/specialists/SpecialistsMap';

const specialties = [
  { id: 'luthier_cuerda', label: 'Luthier de Cuerda' },
  { id: 'tecnico_valvulas', label: 'Técnico Válvulas' },
  { id: 'reparacion_dj', label: 'Reparación DJ' },
  { id: 'mantenimiento_pianos', label: 'Pianos' },
];

export default function Specialists() {
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);

  const { data: specialists = [], isLoading } = useQuery({
    queryKey: ['specialists'],
    queryFn: () => base44.entities.Specialist.list('-rating', 100),
  });

  const filtered = specialists.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.name?.toLowerCase().includes(q) && !s.location?.city?.toLowerCase().includes(q)) return false;
    }
    if (selectedSpecialty && s.specialty !== selectedSpecialty) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
          <Wrench className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Técnicos & Luthiers</h1>
          <p className="text-zinc-400">Directorio de especialistas verificados</p>
        </div>
      </div>

      {/* Search + View toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            placeholder="Buscar por nombre o ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-12 bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 h-11 rounded-xl"
          />
        </div>
        <div className="flex items-center bg-zinc-800 rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-purple-600' : 'text-zinc-400'}
          >
            <List className="w-4 h-4 mr-2" /> Lista
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            className={viewMode === 'map' ? 'bg-purple-600' : 'text-zinc-400'}
          >
            <MapIcon className="w-4 h-4 mr-2" /> Mapa
          </Button>
        </div>
      </div>

      {/* Specialty filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Button
          size="sm"
          onClick={() => setSelectedSpecialty(null)}
          className={cn(
            'rounded-full',
            !selectedSpecialty
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          )}
          variant={!selectedSpecialty ? 'default' : 'outline'}
        >
          Todos
        </Button>
        {specialties.map(sp => (
          <Button
            key={sp.id}
            size="sm"
            onClick={() => setSelectedSpecialty(selectedSpecialty === sp.id ? null : sp.id)}
            className={cn(
              'rounded-full',
              selectedSpecialty === sp.id
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
            )}
            variant={selectedSpecialty === sp.id ? 'default' : 'outline'}
          >
            {sp.label}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{specialists.length}</p>
          <p className="text-sm text-zinc-500">Especialistas</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{specialists.filter(s => s.verified).length}</p>
          <p className="text-sm text-zinc-500">Verificados</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{specialists.filter(s => s.workshop).length}</p>
          <p className="text-sm text-zinc-500">Con taller</p>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'map' ? (
        <div className="h-[500px] rounded-2xl overflow-hidden">
          <SpecialistsMap specialists={filtered} onRequestQuote={setSelectedSpecialist} />
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(s => (
            <SpecialistCard key={s.id} specialist={s} onRequestQuote={setSelectedSpecialist} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Wrench className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Sin resultados</h3>
          <p className="text-zinc-500">Prueba con otros filtros</p>
        </div>
      )}

      {/* Quote Modal */}
      {selectedSpecialist && (
        <QuoteRequestModal
          specialist={selectedSpecialist}
          open={!!selectedSpecialist}
          onClose={() => setSelectedSpecialist(null)}
        />
      )}
    </div>
  );
}