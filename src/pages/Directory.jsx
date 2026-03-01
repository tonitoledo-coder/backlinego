import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, Globe, MapPin, Phone, Mail, ExternalLink, 
  CheckCircle, Star, ShieldCheck, Building2, AlertCircle
} from 'lucide-react';

const SERVICE_TAGS = {
  rental: { label: 'Alquiler Backline', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  pa: { label: 'Sonido PA', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  lighting: { label: 'Iluminación', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  staging: { label: 'Staging', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  transport: { label: 'Transporte', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  technician: { label: 'Técnicos', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  international: { label: 'Internacional', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  festival: { label: 'Festivales', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

// Solo empresas verificadas y de primer nivel internacional.
// Criterio de inclusión: empresa real, web activa confirmada, referente en su mercado.
const companies = [
  {
    id: 1,
    name: 'Call & Play',
    country: 'España',
    flag: '🇪🇸',
    region: 'Europa',
    city: 'España',
    description: 'La empresa más grande de España especializada en alquiler de backline para conciertos, festivales y eventos. Referente nacional del sector.',
    website: 'https://www.callandplay.com',
    services: ['rental', 'pa', 'festival', 'international'],
    verified: true,
    featured: true,
  },
  {
    id: 2,
    name: 'PRG (Production Resource Group)',
    country: 'EE.UU. / Global',
    flag: '🇺🇸',
    region: 'Internacional',
    city: 'New York',
    description: 'Líder mundial en servicios técnicos para la industria del entretenimiento. Backline, audio, vídeo, iluminación y staging para los tours más grandes del mundo.',
    website: 'https://www.prg.com',
    services: ['rental', 'pa', 'lighting', 'staging', 'transport', 'international', 'festival'],
    verified: true,
    featured: true,
  },
  {
    id: 3,
    name: 'Clair Global',
    country: 'EE.UU.',
    flag: '🇺🇸',
    region: 'Internacional',
    city: 'Lititz, Pennsylvania',
    description: 'Referente mundial en sistemas de audio profesional para grandes tours y festivales. Proveedor de los artistas más importantes del mundo durante décadas.',
    website: 'https://www.clairglobal.com',
    services: ['pa', 'rental', 'technician', 'international', 'festival'],
    verified: true,
    featured: true,
  },
  {
    id: 4,
    name: 'Solotech',
    country: 'Canadá',
    flag: '🇨🇦',
    region: 'Norteamérica',
    city: 'Montreal',
    description: 'Empresa canadiense de referencia en soluciones integrales de audio, vídeo, iluminación y backline. Proveedor oficial de los eventos más grandes de Norteamérica.',
    website: 'https://www.solotech.com',
    services: ['rental', 'pa', 'lighting', 'staging', 'international', 'festival'],
    verified: true,
    featured: true,
  },
  {
    id: 5,
    name: 'Backline International',
    country: 'Reino Unido',
    flag: '🇬🇧',
    region: 'Europa',
    city: 'Londres',
    description: 'Especialistas en backline para conciertos y giras internacionales en el Reino Unido y Europa. Guitarras vintage, amplificadores boutique y batería de alto nivel.',
    website: 'https://www.backlineinternational.com',
    services: ['rental', 'transport', 'international'],
    verified: true,
    featured: true,
  },
  {
    id: 6,
    name: 'L-Acoustics',
    country: 'Francia',
    flag: '🇫🇷',
    region: 'Internacional',
    city: 'Marcoussis',
    description: 'Fabricante y proveedor de sistemas de audio profesional de referencia mundial. Sus sistemas son el estándar en Coachella, Glastonbury y los principales festivales del mundo.',
    website: 'https://www.l-acoustics.com',
    services: ['pa', 'rental', 'technician', 'international', 'festival'],
    verified: true,
    featured: true,
  },
];

const regions = ['Todos', 'Europa', 'Internacional', 'Norteamérica'];

export default function Directory() {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Todos');
  const [selectedService, setSelectedService] = useState(null);

  const filtered = companies.filter(c => {
    const matchSearch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchRegion = selectedRegion === 'Todos' || c.region === selectedRegion;
    const matchService = !selectedService || c.services.includes(selectedService);
    return matchSearch && matchRegion && matchService;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600/20 via-zinc-900 to-blue-600/20 border-b border-zinc-800">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Globe className="w-6 h-6 text-teal-400" />
            </div>
            <Badge className="bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Verificación Estricta
            </Badge>
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold text-white mb-3">
            Directorio Internacional
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Solo las mejores empresas de alquiler de backline del mundo. 
            Seleccionadas y verificadas manualmente. Sin intermediarios, sin empresas sin contrastar.
          </p>
          <div className="flex flex-wrap gap-6 mt-6 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              {companies.length} empresas verificadas
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              {[...new Set(companies.map(c => c.region))].length} regiones
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Verificación manual estricta
            </div>
          </div>

          {/* Verification notice */}
          <div className="mt-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 max-w-2xl">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80">
              Este directorio es curado y exclusivo. Cada empresa es verificada manualmente antes de ser incluida. 
              ¿Eres una empresa referente en tu país? Solicita tu inclusión.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        {/* Search & Filters */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              placeholder="Buscar por empresa, país o ciudad..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12 rounded-xl"
            />
          </div>

          {/* Region Filter */}
          <div className="flex gap-2 flex-wrap">
            {regions.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRegion(r)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  selectedRegion === r
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Service Filter */}
          <div className="flex gap-2 flex-wrap">
            {Object.keys(SERVICE_TAGS).map(s => (
              <button
                key={s}
                onClick={() => setSelectedService(selectedService === s ? null : s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  selectedService === s
                    ? SERVICE_TAGS[s].color + ' border-current'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {SERVICE_TAGS[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Companies Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(company => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Globe className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-lg">No se encontraron empresas con esos filtros</p>
            <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-300" onClick={() => { setSearch(''); setSelectedRegion('Todos'); setSelectedService(null); }}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyCard({ company }) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-teal-500/20 p-5 transition-all duration-300 hover:border-teal-500/50 group">
      <div className="flex gap-4">
        {/* Flag + Region */}
        <div className="w-14 h-14 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center flex-shrink-0 text-3xl">
          {company.flag}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-white text-base">{company.name}</h3>
            <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" title="Verificada manualmente" />
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0">
              ★ Destacada
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
            <MapPin className="w-3 h-3" />
            {company.city}, {company.country}
          </div>

          <p className="text-zinc-400 text-sm leading-relaxed mb-3 line-clamp-2">{company.description}</p>

          {/* Services */}
          <div className="flex flex-wrap gap-1 mb-3">
            {company.services.map(s => (
              <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full border ${SERVICE_TAGS[s]?.color}`}>
                {SERVICE_TAGS[s]?.label}
              </span>
            ))}
          </div>

          {/* Website */}
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Web oficial
            </a>
          )}
        </div>
      </div>
    </div>
  );
}