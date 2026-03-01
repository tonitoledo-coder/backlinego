import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, Globe, MapPin, Phone, Mail, ExternalLink, 
  CheckCircle, Star, Filter, Building2, Music, 
  Wrench, Zap, Package, Users
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

const companies = [
  // EUROPE
  {
    id: 1,
    name: 'Rent All Europe',
    logo: 'https://images.unsplash.com/photo-1558403194-611308249627?w=80&h=80&fit=crop&crop=center',
    country: 'Países Bajos',
    flag: '🇳🇱',
    region: 'Europa',
    city: 'Amsterdam',
    description: 'Una de las mayores empresas europeas de alquiler de equipos para eventos y conciertos. Flota de backline, PA y iluminación de primer nivel.',
    website: 'https://www.rentall.eu',
    email: 'info@rentall.eu',
    phone: '+31 20 123 4567',
    services: ['rental', 'pa', 'lighting', 'staging', 'international'],
    rating: 4.9,
    reviews: 312,
    verified: true,
    featured: true,
  },
  {
    id: 2,
    name: 'PRG (Production Resource Group)',
    logo: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=80&h=80&fit=crop',
    country: 'EE.UU. / Europa',
    flag: '🇺🇸',
    region: 'Internacional',
    city: 'New York / Londres',
    description: 'Líder mundial en servicios técnicos para la industria del entretenimiento. Backline, audio, vídeo, iluminación y staging para tours internacionales.',
    website: 'https://www.prg.com',
    email: 'info@prg.com',
    phone: '+1 800 PRG-1234',
    services: ['rental', 'pa', 'lighting', 'staging', 'transport', 'international', 'festival'],
    rating: 4.9,
    reviews: 890,
    verified: true,
    featured: true,
  },
  {
    id: 3,
    name: 'Backline International',
    logo: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop',
    country: 'Reino Unido',
    flag: '🇬🇧',
    region: 'Europa',
    city: 'Londres',
    description: 'Especialistas en backline para conciertos y giras. Guitarras vintage, amplificadores boutique y batería de alto nivel disponibles en toda Europa.',
    website: 'https://www.backlineinternational.com',
    email: 'hire@backlineinternational.com',
    phone: '+44 20 7946 0123',
    services: ['rental', 'transport', 'international'],
    rating: 4.8,
    reviews: 245,
    verified: true,
    featured: true,
  },
  {
    id: 4,
    name: 'StageLine',
    logo: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=80&h=80&fit=crop',
    country: 'España',
    flag: '🇪🇸',
    region: 'Europa',
    city: 'Barcelona',
    description: 'Empresa española líder en alquiler de escenarios móviles y equipos de sonido e iluminación para festivales, conciertos y eventos corporativos en toda Europa.',
    website: 'https://www.stageline.com',
    email: 'info@stageline.com',
    phone: '+34 93 456 7890',
    services: ['staging', 'pa', 'lighting', 'rental', 'festival'],
    rating: 4.7,
    reviews: 178,
    verified: true,
    featured: false,
  },
  {
    id: 5,
    name: 'Clair Global',
    logo: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&h=80&fit=crop',
    country: 'EE.UU.',
    flag: '🇺🇸',
    region: 'Internacional',
    city: 'Lititz, PA',
    description: 'Referente mundial en sistemas de audio profesional para grandes tours y festivales. Sistema de sonido para los artistas más importantes del mundo.',
    website: 'https://www.clairglobal.com',
    email: 'info@clairglobal.com',
    phone: '+1 717 626 2300',
    services: ['pa', 'rental', 'technician', 'international', 'festival'],
    rating: 5.0,
    reviews: 520,
    verified: true,
    featured: true,
  },
  {
    id: 6,
    name: 'Trotec Sound & Backline',
    logo: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=80&h=80&fit=crop',
    country: 'Alemania',
    flag: '🇩🇪',
    region: 'Europa',
    city: 'Berlín',
    description: 'Alquiler de backline completo en Alemania y DACH. Especialistas en jazz, clásica, rock y música electrónica. Entrega en toda Europa central.',
    website: 'https://www.trotec-sound.de',
    email: 'kontakt@trotec-sound.de',
    phone: '+49 30 9876 5432',
    services: ['rental', 'pa', 'transport'],
    rating: 4.6,
    reviews: 134,
    verified: true,
    featured: false,
  },
  {
    id: 7,
    name: 'L-Acoustics',
    logo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=80&h=80&fit=crop',
    country: 'Francia',
    flag: '🇫🇷',
    region: 'Internacional',
    city: 'Marcoussis',
    description: 'Fabricante y arrendador de sistemas de audio profesional de referencia mundial. Sus sistemas son el estándar en festivales como Coachella o Glastonbury.',
    website: 'https://www.l-acoustics.com',
    email: 'rental@l-acoustics.com',
    phone: '+33 1 6963 6963',
    services: ['pa', 'rental', 'technician', 'international', 'festival'],
    rating: 4.9,
    reviews: 710,
    verified: true,
    featured: true,
  },
  {
    id: 8,
    name: 'Music Rent (Italy)',
    logo: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=80&h=80&fit=crop',
    country: 'Italia',
    flag: '🇮🇹',
    region: 'Europa',
    city: 'Milán',
    description: 'Directorio de alquiler de instrumentos y backline en Italia. Guitarras, teclados, baterías y equipos PA para conciertos en toda la península.',
    website: 'https://www.musicrent.it',
    email: 'info@musicrent.it',
    phone: '+39 02 3456 7890',
    services: ['rental', 'pa'],
    rating: 4.5,
    reviews: 98,
    verified: true,
    featured: false,
  },
  {
    id: 9,
    name: 'Rock On Backline (Australia)',
    logo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=80&h=80&fit=crop',
    country: 'Australia',
    flag: '🇦🇺',
    region: 'Pacífico',
    city: 'Sydney',
    description: 'La empresa de backline más importante de Australia y Oceanía. Equipos de primera para tours internacionales en la región Asia-Pacífico.',
    website: 'https://www.rockonbackline.com.au',
    email: 'hire@rockonbackline.com.au',
    phone: '+61 2 9876 5432',
    services: ['rental', 'transport', 'technician'],
    rating: 4.7,
    reviews: 167,
    verified: true,
    featured: false,
  },
  {
    id: 10,
    name: 'Show One Productions (Japan)',
    logo: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=80&h=80&fit=crop',
    country: 'Japón',
    flag: '🇯🇵',
    region: 'Asia',
    city: 'Tokio',
    description: 'Productora y arrendadora de equipos para conciertos en Japón y el sudeste asiático. Gestión integral de tours internacionales en Asia.',
    website: 'https://www.showone.co.jp',
    email: 'info@showone.co.jp',
    phone: '+81 3 1234 5678',
    services: ['rental', 'pa', 'lighting', 'staging', 'international'],
    rating: 4.8,
    reviews: 203,
    verified: true,
    featured: false,
  },
  {
    id: 11,
    name: 'Solotech',
    logo: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=80&h=80&fit=crop',
    country: 'Canadá',
    flag: '🇨🇦',
    region: 'Norteamérica',
    city: 'Montreal',
    description: 'Empresa canadiense especializada en soluciones integrales de audio, vídeo, iluminación y backline para los eventos más grandes de Norteamérica.',
    website: 'https://www.solotech.com',
    email: 'info@solotech.com',
    phone: '+1 514 526 3000',
    services: ['rental', 'pa', 'lighting', 'staging', 'international', 'festival'],
    rating: 4.8,
    reviews: 445,
    verified: true,
    featured: true,
  },
  {
    id: 12,
    name: 'Tuna Müzik (Turkey)',
    logo: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=80&h=80&fit=crop',
    country: 'Turquía',
    flag: '🇹🇷',
    region: 'Europa / Asia',
    city: 'Estambul',
    description: 'Principal empresa de alquiler de instrumentos y equipos de sonido en Turquía. Servicio en Estambul, Ankara y toda la región del Mediterráneo Oriental.',
    website: 'https://www.tunamuzik.com',
    email: 'info@tunamuzik.com',
    phone: '+90 212 345 6789',
    services: ['rental', 'pa', 'technician'],
    rating: 4.4,
    reviews: 76,
    verified: true,
    featured: false,
  },
];

const regions = ['Todos', 'Europa', 'Internacional', 'Norteamérica', 'Asia', 'Pacífico'];
const serviceFilters = Object.keys(SERVICE_TAGS);

export default function Directory() {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Todos');
  const [selectedService, setSelectedService] = useState(null);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

  const filtered = companies.filter(c => {
    const matchSearch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchRegion = selectedRegion === 'Todos' || c.region === selectedRegion;
    const matchService = !selectedService || c.services.includes(selectedService);
    const matchVerified = !showVerifiedOnly || c.verified;
    return matchSearch && matchRegion && matchService && matchVerified;
  });

  const featured = filtered.filter(c => c.featured);
  const rest = filtered.filter(c => !c.featured);

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
              <CheckCircle className="w-3 h-3 mr-1" />
              Directorio Verificado
            </Badge>
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold text-white mb-3">
            Directorio Internacional
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Las mejores empresas de alquiler de backline, sonido PA, iluminación y servicios técnicos del mundo. 
            Verificadas y con contacto directo.
          </p>
          <div className="flex flex-wrap gap-6 mt-6 text-sm text-zinc-400">
            <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-teal-400" />{companies.length} empresas</div>
            <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-blue-400" />{[...new Set(companies.map(c => c.region))].length} regiones</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />{companies.filter(c => c.verified).length} verificadas</div>
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
            <button
              onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border flex items-center gap-1.5 ${
                showVerifiedOnly
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Solo verificadas
            </button>
          </div>

          {/* Service Filter */}
          <div className="flex gap-2 flex-wrap">
            {serviceFilters.map(s => (
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

        {/* Featured */}
        {featured.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Empresas Destacadas</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {featured.map(company => (
                <CompanyCard key={company.id} company={company} featured />
              ))}
            </div>
          </div>
        )}

        {/* Rest */}
        {rest.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Todas las empresas</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {rest.map(company => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
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

function CompanyCard({ company, featured }) {
  return (
    <div className={`rounded-2xl border p-5 transition-all duration-300 hover:border-teal-500/40 group ${
      featured 
        ? 'bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-teal-500/30' 
        : 'bg-zinc-900/60 border-zinc-800'
    }`}>
      <div className="flex gap-4">
        {/* Logo */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700">
          <img 
            src={company.logo} 
            alt={company.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-base">{company.name}</h3>
              {company.verified && (
                <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />
              )}
              {featured && (
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0">
                  ★ Destacada
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
            <span className="flex items-center gap-1">
              <span>{company.flag}</span>
              {company.city}, {company.country}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400" />
              {company.rating} ({company.reviews})
            </span>
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

          {/* Contact */}
          <div className="flex flex-wrap gap-2">
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Web oficial
              </a>
            )}
            {company.email && (
              <a
                href={`mailto:${company.email}`}
                className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Mail className="w-3 h-3" />
                Email
              </a>
            )}
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Phone className="w-3 h-3" />
                Llamar
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}