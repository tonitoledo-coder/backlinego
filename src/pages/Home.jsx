import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format } from 'date-fns';
import { 
  Search, 
  MapPin, 
  Zap, 
  ShieldCheck, 
  CreditCard,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Wrench,
  QrCode,
  Star,
  CheckCircle,
  Trophy,
  Globe,
  CalendarIcon
} from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import CategoryFilter from '@/components/equipment/CategoryFilter';

const categories = [
  { id: 'cuerdas',    icon: 'cuerdas',    color: 'from-amber-500   to-amber-600'  },
  { id: 'teclados',   icon: 'teclados',   color: 'from-yellow-500  to-amber-500'  },
  { id: 'percusion',  icon: 'percusion',  color: 'from-orange-500  to-orange-600' },
  { id: 'dj_gear',    icon: 'dj_gear',    color: 'from-amber-400   to-yellow-500' },
  { id: 'sonido_pa',  icon: 'sonido_pa',  color: 'from-emerald-500 to-teal-500'   },
];


export default function Home() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchStart, setSearchStart] = useState(null);
  const [searchEnd,   setSearchEnd]   = useState(null);

  const handleAddEquipmentClick = async (e) => {
    e.preventDefault();
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    const user = await base44.auth.me();
    const profiles = await base44.entities.UserProfile.filter({ email: user.email });
    const profile = profiles?.[0];
    if (profile?.account_status === 'pending') {
      toast.warning('Tu cuenta está pendiente de aprobación. Podrás publicar equipo una vez sea verificada.');
      return;
    }
    if (!profile?.profile_complete) {
      navigate(createPageUrl('CompleteProfile') + '?next=AddEquipment');
      return;
    }
    navigate(createPageUrl('AddEquipment'));
  };

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment', 'featured'],
    queryFn: () => base44.entities.Equipment.filter({ status: 'available' }, '-created_date', 12),
  });

  const { data: sosEquipment = [] } = useQuery({
    queryKey: ['equipment', 'sos'],
    queryFn: () => base44.entities.Equipment.filter({ sos_available: true, status: 'available' }, '-created_date', 4),
  });

  const filteredEquipment = selectedCategory 
    ? equipment.filter(e => e.category === selectedCategory)
    : equipment;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-green-500/20" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-green-500/30 rounded-full blur-[100px]" />
        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-20">
          <div className="text-center max-w-3xl mx-auto">
            {/* Logo + Tagline Hero Block */}
            <div className="flex flex-col items-center mb-8 lg:mb-10">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a08f2a394db4f3cafbc46f/0a293e3b0_Puedeshacerlaconcalidadmxima_1.png"
                alt="BacklineGo"
                className="h-24 lg:h-36 w-auto object-contain drop-shadow-[0_0_50px_rgba(59,130,246,0.35)]"
              />
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="w-1.5 h-1.5 rounded-full pulse-sos flex-shrink-0" style={{ background: '#1DDF7A' }} />
                <span className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-300">Glocal Marketplace</span>
              </div>
            </div>
            
            <h1 className="text-3xl lg:text-6xl font-bold text-white mb-4 lg:mb-6 leading-tight">
              {t('heroTitle')}
            </h1>
            
            <p className="text-base lg:text-xl text-zinc-400 mb-6 lg:mb-8 px-2 lg:px-0">
              {t('heroSubtitle')}
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mb-8">
              <div className="flex items-center rounded-2xl p-2 transition-all duration-200" style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.12)' }}
                onFocusCapture={e => e.currentTarget.style.cssText += ';border-color:#1DDF7A;box-shadow:0 0 0 3px rgba(29,223,122,0.12)'}
                onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div className="flex items-center flex-1 px-4">
                  <Search className="w-5 h-5 text-zinc-500 mr-3 flex-shrink-0" />
                  <Input 
                    placeholder={t('search') + '...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 bg-transparent text-white focus-visible:ring-0"
                    style={{ '--placeholder-opacity': '0.3' }}
                  />
                </div>
                {/* Date range pickers */}
                <div className="hidden sm:flex items-center gap-1 border-l border-zinc-700 pl-3 mr-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {searchStart ? format(searchStart, 'dd MMM') : 'Desde'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start">
                      <Calendar
                        mode="single"
                        selected={searchStart}
                        onSelect={(d) => { setSearchStart(d); setSearchEnd(null); }}
                        disabled={(d) => d < new Date()}
                        className="text-white"
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-zinc-600 text-xs">→</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {searchEnd ? format(searchEnd, 'dd MMM') : 'Hasta'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start">
                      <Calendar
                        mode="single"
                        selected={searchEnd}
                        onSelect={setSearchEnd}
                        disabled={(d) => d < (searchStart || new Date())}
                        className="text-white"
                      />
                    </PopoverContent>
                  </Popover>
                  {(searchStart || searchEnd) && (
                    <button
                      className="text-zinc-500 hover:text-white text-xs px-1"
                      onClick={() => { setSearchStart(null); setSearchEnd(null); }}
                    >✕</button>
                  )}
                </div>
                <Link to={createPageUrl('Explore') + (searchQuery ? `?q=${searchQuery}` : '')}>
                  <Button className="rounded-xl px-6 font-semibold" style={{ background: '#1DDF7A', color: '#060E18' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#17c96e'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1DDF7A'}>
                    {t('search')}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-2.5">
              {[
                { icon: ShieldCheck, color: '#3D8EF8', label: t('idVerified') },
                { icon: CreditCard,  color: '#1DDF7A', label: t('escrowPayment') },
                { icon: Zap,         color: '#E8C86A', label: t('insuranceIncluded') },
              ].map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px' }}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                  <span className="text-zinc-300" style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SOS Mode Banner */}
      {sosEquipment.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
          <Link to={createPageUrl('MapView') + '?sos=true'}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500/20 to-green-600/10 border border-green-500/30 p-6 lg:p-8 group hover:border-green-500/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/20 rounded-full blur-[80px]" />
              
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-2xl bg-green-500/20 flex items-center justify-center pulse-sos shrink-0">
                    <Zap className="w-5 h-5 lg:w-7 lg:h-7 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-base lg:text-xl font-bold text-white mb-0.5">{t('sosMode')}</h3>
                    <p className="text-green-400/80 text-xs lg:text-base">{t('sosDescription')} • {t('sosRadius')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="hidden lg:flex items-center gap-2">
                    {sosEquipment.slice(0, 3).map((eq, i) => (
                      <div key={eq.id} className="w-12 h-12 rounded-lg overflow-hidden border-2 border-green-500/50">
                        {eq.images?.[0] ? (
                          <img src={eq.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-zinc-800" />
                        )}
                      </div>
                    ))}
                    <span className="text-green-400 font-semibold ml-2">+{sosEquipment.length}</span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-green-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{t('categories')}</h2>
          <Link to={createPageUrl('Explore')} className="text-blue-500 hover:text-blue-400 flex items-center gap-1 text-sm font-medium">
            {t('viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 lg:gap-4">
          {categories.map((cat) => (
            <Link 
              key={cat.id}
              to={createPageUrl('Explore') + `?category=${cat.id}`}
              className="group"
            >
              <div className={`aspect-square rounded-2xl bg-gradient-to-br ${cat.color} p-0.5 group-hover:scale-105 transition-transform duration-300`}>
                <div className="w-full h-full rounded-2xl bg-zinc-900 flex flex-col items-center justify-center gap-2 group-hover:bg-zinc-900/80 transition-colors">
                  <CategoryIcon category={cat.id} className="w-8 h-8 text-white" />
                  <span className="text-xs lg:text-sm font-medium text-zinc-300">{t(cat.id)}</span>
                </div>
              </div>
            </Link>
          ))}

          {/* Directorio Internacional */}
          <Link to={createPageUrl('Directory')} className="group">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 p-0.5 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full rounded-2xl bg-zinc-900 flex flex-col items-center justify-center gap-2 group-hover:bg-zinc-900/80 transition-colors">
                <Globe className="w-8 h-8 text-teal-400" />
                <span className="text-xs lg:text-sm font-medium text-zinc-300 text-center leading-tight">Directorio<br/>Global</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Equipment */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{t('nearYou')}</h2>
          <Link to={createPageUrl('Explore')} className="text-blue-500 hover:text-blue-400 flex items-center gap-1 text-sm font-medium">
            {t('viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mb-6">
          <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-xl bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        ) : filteredEquipment.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredEquipment.map(eq => (
              <EquipmentCard key={eq.id} equipment={eq} searchStart={searchStart} searchEnd={searchEnd} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-zinc-500">{t('noResults')}</p>
          </div>
        )}
      </section>

      {/* Specialists Banner */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
        <Link to={createPageUrl('Specialists')}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600/20 to-purple-800/10 border border-purple-500/30 p-5 lg:p-6 group hover:border-purple-500/60 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[60px]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Directorio de Luthiers & Técnicos</h3>
                  <p className="text-purple-400/80 text-sm">Especialistas verificados · Presupuesto online con foto de avería</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </section>

      {/* Rewards Banner */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
        <Link to={createPageUrl('Rewards')}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-600/10 border border-amber-500/30 p-5 lg:p-6 group hover:border-amber-500/60 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-[60px]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Programa de Recompensas</h3>
                  <p className="text-amber-400/80 text-sm">Gana puntos · Descuentos hasta -15% · Insignias de partner</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </section>

      {/* Trust & QR Security Strip */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: QrCode, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', title: 'QR de Entrega', desc: 'Confirmación segura con código único' },
            { icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', title: 'Pago Escrow', desc: 'El dinero queda retenido hasta la entrega' },
            { icon: CreditCard, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', title: 'Seguro incluido', desc: '8% cubre daños y robos' },
            { icon: Star, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', title: 'Perfiles verificados', desc: 'ID verificado en cada arrendador' },
          ].map((item) => (
            <div key={item.title} className={`rounded-xl border p-4 ${item.bg}`}>
              <item.icon className={`w-6 h-6 ${item.color} mb-2`} />
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 lg:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[100px]" />
          
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl lg:text-3xl font-bold text-white mb-2">
                {t('onboardingTitle')}
              </h3>
              <p className="text-blue-100/80 text-sm lg:text-base">
                {t('onboardingStep1')} → {t('onboardingStep2')} → {t('onboardingStep3')}
              </p>
            </div>
            
            <Button size="lg" onClick={handleAddEquipmentClick} className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8">
              {t('getStarted')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}