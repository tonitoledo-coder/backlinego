import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Globe
} from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import CategoryFilter from '@/components/equipment/CategoryFilter';

const categories = [
  { id: 'cuerdas', icon: 'cuerdas', color: 'from-blue-500 to-blue-600' },
  { id: 'teclados', icon: 'teclados', color: 'from-purple-500 to-purple-600' },
  { id: 'percusion', icon: 'percusion', color: 'from-orange-500 to-orange-600' },
  { id: 'dj_gear', icon: 'dj_gear', color: 'from-pink-500 to-pink-600' },
  { id: 'sonido_pa', icon: 'sonido_pa', color: 'from-green-500 to-green-600' },
];

export default function Home() {
  const { t, lang } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

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
        
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-20">
          <div className="text-center max-w-3xl mx-auto">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a08f2a394db4f3cafbc46f/0a293e3b0_Puedeshacerlaconcalidadmxima_1.png"
                alt="BacklineGo"
                className="h-16 lg:h-24 w-auto object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.25)]"
              />
            </div>

            <Badge className="mb-6 bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Glocal Marketplace
            </Badge>
            
            <h1 className="text-3xl lg:text-6xl font-bold text-white mb-4 lg:mb-6 leading-tight">
              {t('heroTitle')}
            </h1>
            
            <p className="text-base lg:text-xl text-zinc-400 mb-6 lg:mb-8 px-2 lg:px-0">
              {t('heroSubtitle')}
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mb-8">
              <div className="flex items-center bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 p-2">
                <div className="flex items-center flex-1 px-4">
                  <Search className="w-5 h-5 text-zinc-500 mr-3" />
                  <Input 
                    placeholder={t('search') + '...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 bg-transparent text-white placeholder:text-zinc-500 focus-visible:ring-0"
                  />
                </div>
                <Link to={createPageUrl('Explore') + (searchQuery ? `?q=${searchQuery}` : '')}>
                  <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6">
                    {t('search')}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-3 lg:gap-8">
              <div className="flex items-center gap-1.5 text-xs lg:text-sm text-zinc-400">
                <ShieldCheck className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500 shrink-0" />
                <span>{t('idVerified')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs lg:text-sm text-zinc-400">
                <CreditCard className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 shrink-0" />
                <span>{t('escrowPayment')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs lg:text-sm text-zinc-400">
                <Zap className="w-4 h-4 lg:w-5 lg:h-5 text-amber-500 shrink-0" />
                <span>{t('insuranceIncluded')}</span>
              </div>
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
              <EquipmentCard key={eq.id} equipment={eq} />
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
            
            <Link to={createPageUrl('Onboarding')}>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8">
                {t('getStarted')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}