import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import SosRequestModal from '@/components/sos/SosRequestModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import {
  Search, SlidersHorizontal, X, Zap, ArrowUpDown, Check,
  LayoutGrid, List, MapPin, ShieldCheck, Map, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import DatePickerDrawer from '@/components/ui/DatePickerDrawer';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import CategoryIcon from '@/components/ui/CategoryIcon';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import ExploreMap from '@/components/map/ExploreMap';
import { cn } from '@/lib/utils';

// ── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 24;

const CATEGORIES = [
  { value: 'cuerdas',         labelKey: 'cuerdas' },
  { value: 'teclados',        labelKey: 'teclados' },
  { value: 'percusion',       labelKey: 'percusion' },
  { value: 'dj_gear',         labelKey: 'dj_gear' },
  { value: 'sonido_pa',       labelKey: 'sonido_pa' },
  { value: 'estudio_podcast', labelKey: 'estudio_podcast' },
];

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Más reciente' },
  { value: 'price_asc',  label: 'Precio ↑' },
  { value: 'price_desc', label: 'Precio ↓' },
  { value: 'rating',     label: 'Mejor valorado' },
  { value: 'condition',  label: 'Mejor estado' },
];

const PICKUP_OPTIONS = [
  { value: 'in_person', label: 'En mano' },
  { value: 'shipping',  label: 'Envío' },
  { value: 'both',      label: 'Ambos' },
];

const RATING_OPTIONS = [
  { value: '',    label: 'Cualquiera' },
  { value: '3',   label: '3★ o más' },
  { value: '4',   label: '4★ o más' },
  { value: '4.5', label: '4.5★ o más' },
];

const LISTING_TYPES = [
  { value: '',          label: 'Todo' },
  { value: 'equipment', label: 'Equipo' },
  { value: 'space',     label: 'Espacio' },
];

// ── URL helpers ───────────────────────────────────────────────────────────────
function readParams(search) {
  const p = new URLSearchParams(search);
  return {
    q:            p.get('q') || '',
    city:         p.get('city') || '',
    from:         p.get('from') ? parseISO(p.get('from')) : null,
    to:           p.get('to')   ? parseISO(p.get('to'))   : null,
    cats:         p.get('cats') ? p.get('cats').split(',') : (p.get('category') ? [p.get('category')] : []),
    listingType:  p.get('lt') || '',
    priceMin:     parseInt(p.get('pmin') || '0', 10),
    priceMax:     parseInt(p.get('pmax') || '500', 10),
    rating:       p.get('rating') || '',
    sos:          p.get('sos') === 'true',
    verified:     p.get('verified') === 'true',
    pickup:       p.get('pickup') || '',
    sort:         p.get('sort') || 'newest',
    page:         parseInt(p.get('page') || '1', 10),
    view:         p.get('view') || 'grid',
  };
}

function buildParams(filters) {
  const p = new URLSearchParams();
  if (filters.q)           p.set('q', filters.q);
  if (filters.city)        p.set('city', filters.city);
  if (filters.from)        p.set('from', format(filters.from, 'yyyy-MM-dd'));
  if (filters.to)          p.set('to',   format(filters.to,   'yyyy-MM-dd'));
  if (filters.cats.length) p.set('cats', filters.cats.join(','));
  if (filters.listingType) p.set('lt', filters.listingType);
  if (filters.priceMin > 0)    p.set('pmin', filters.priceMin);
  if (filters.priceMax < 500)  p.set('pmax', filters.priceMax);
  if (filters.rating)      p.set('rating', filters.rating);
  if (filters.sos)         p.set('sos', 'true');
  if (filters.verified)    p.set('verified', 'true');
  if (filters.pickup)      p.set('pickup', filters.pickup);
  if (filters.sort !== 'newest') p.set('sort', filters.sort);
  if (filters.page > 1)    p.set('page', filters.page);
  if (filters.view !== 'grid') p.set('view', filters.view);
  return p.toString();
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function EquipmentListRow({ equipment, searchStart, searchEnd }) {
  const { t } = useTranslation();
  return (
    <a
      href={(() => {
        const p = new URLSearchParams({ id: equipment.id });
        if (searchStart) p.set('from', format(searchStart, 'yyyy-MM-dd'));
        if (searchEnd)   p.set('to',   format(searchEnd,   'yyyy-MM-dd'));
        return '/EquipmentDetail?' + p.toString();
      })()}
      className="flex gap-4 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 transition-all"
    >
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
        {equipment.images?.[0] ? (
          <img src={equipment.images[0]} alt={equipment.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon category={equipment.category} className="w-8 h-8 text-zinc-600" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white truncate">{equipment.title}</h3>
          <span className="text-white font-bold shrink-0">€{equipment.price_per_day}<span className="text-zinc-500 text-xs font-normal">/día</span></span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
          <CategoryIcon category={equipment.category} className="w-3.5 h-3.5 text-purple-400" />
          <span>{t(equipment.category) !== equipment.category ? t(equipment.category) : (equipment.category === 'estudio_podcast' ? 'Estudio/Podcast' : equipment.category)}</span>
          {equipment.brand && <><span>•</span><span>{equipment.brand}</span></>}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="w-3 h-3" />{equipment.location?.city || '—'}
          </span>
          {equipment.sos_available && (
            <Badge className="text-black text-[10px] font-bold py-0 px-1.5" style={{ background: '#22c55e' }}>
              <Zap className="w-2.5 h-2.5 mr-0.5" />SOS
            </Badge>
          )}
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
        </div>
      </div>
    </a>
  );
}

function FiltersPanel({ filters, setFilter, t }) {
  const catLabel = (key) => {
    if (key === 'estudio_podcast') return 'Estudio / Podcast';
    return t(key) !== key ? t(key) : key;
  };

  const toggleCat = (v) => {
    const next = filters.cats.includes(v)
      ? filters.cats.filter(c => c !== v)
      : [...filters.cats, v];
    setFilter('cats', next);
    setFilter('page', 1);
  };

  const togglePickup = (v) => {
    setFilter('pickup', filters.pickup === v ? '' : v);
    setFilter('page', 1);
  };

  return (
    <div className="space-y-6">
      {/* Listing type */}
      <div>
        <Label className="text-zinc-300 mb-3 block text-sm font-semibold">Tipo de listing</Label>
        <div className="flex gap-2">
          {LISTING_TYPES.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setFilter('listingType', opt.value); setFilter('page', 1); }}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all",
                filters.listingType === opt.value
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <Label className="text-zinc-300 mb-3 block text-sm font-semibold">Categorías</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => {
            const active = filters.cats.includes(cat.value);
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCat(cat.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  active
                    ? "border-purple-500 bg-purple-500/15 text-purple-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                )}
              >
                <CategoryIcon category={cat.value} className="w-3.5 h-3.5" />
                {catLabel(cat.labelKey)}
                {active && <X className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price range */}
      <div>
        <Label className="text-zinc-300 mb-4 block text-sm font-semibold">
          {t('pricePerDay')}: <span className="text-white">€{filters.priceMin} – €{filters.priceMax}</span>
        </Label>
        <Slider
          value={[filters.priceMin, filters.priceMax]}
          onValueChange={([min, max]) => { setFilter('priceMin', min); setFilter('priceMax', max); setFilter('page', 1); }}
          min={0} max={500} step={10}
        />
      </div>

      {/* Rating */}
      <div>
        <Label className="text-zinc-300 mb-3 block text-sm font-semibold">Valoración mínima</Label>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setFilter('rating', opt.value); setFilter('page', 1); }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                filters.rating === opt.value
                  ? "border-amber-500 bg-amber-500/15 text-amber-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pickup type */}
      <div>
        <Label className="text-zinc-300 mb-3 block text-sm font-semibold">Modalidad de entrega</Label>
        <div className="flex flex-wrap gap-2">
          {PICKUP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => togglePickup(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                filters.pickup === opt.value
                  ? "border-blue-500 bg-blue-500/15 text-blue-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-zinc-300 text-sm cursor-pointer" htmlFor="sos-toggle">
            <Zap className="w-4 h-4 inline mr-1.5 text-green-400" />
            {t('sosMode')}
          </Label>
          <Switch
            id="sos-toggle"
            checked={filters.sos}
            onCheckedChange={v => { setFilter('sos', v); setFilter('page', 1); }}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-zinc-300 text-sm cursor-pointer" htmlFor="verified-toggle">
            <ShieldCheck className="w-4 h-4 inline mr-1.5 text-blue-400" />
            Propietario verificado
          </Label>
          <Switch
            id="verified-toggle"
            checked={filters.verified}
            onCheckedChange={v => { setFilter('verified', v); setFilter('page', 1); }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Explore() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [filters, setFiltersState] = useState(() => readParams(location.search));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);
  const [openDateFrom, setOpenDateFrom] = useState(false);
  const [openDateTo, setOpenDateTo] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [showSosModal, setShowSosModal] = useState(false);
  const cardRefs = useRef({});

  // Sync filters → URL
  useEffect(() => {
    const qs = buildParams(filters);
    const newUrl = location.pathname + (qs ? '?' + qs : '');
    if (newUrl !== location.pathname + location.search) {
      navigate(newUrl, { replace: true });
    }
  }, [filters]);

  const setFilter = useCallback((key, value) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment', 'all'],
    queryFn: () => base44.entities.Equipment.filter({ status: 'available' }, '-created_date', 200),
    staleTime: 60_000,
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['equipment', 'all'] });
  }, [queryClient]);

  const filtered = useMemo(() => {
    let list = [...equipment];

    // Text search
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.brand?.toLowerCase().includes(q) ||
        e.model?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
      );
    }

    // City
    if (filters.city) {
      const c = filters.city.toLowerCase();
      list = list.filter(e => e.location?.city?.toLowerCase().includes(c));
    }

    // Listing type
    if (filters.listingType) {
      list = list.filter(e => (e.listing_type || 'equipment') === filters.listingType);
    }

    // Categories (multi)
    if (filters.cats.length > 0) {
      list = list.filter(e => filters.cats.includes(e.category));
    }

    // Price
    list = list.filter(e => {
      const p = e.price_per_day || 0;
      return p >= filters.priceMin && p <= filters.priceMax;
    });

    // Rating
    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      // Equipment doesn't have rating directly — filter by owner profile rating
      // Since we don't have joined data, we skip this silently unless rating stored on equip
    }

    // SOS
    if (filters.sos) list = list.filter(e => e.sos_available);

    // Pickup type
    if (filters.pickup) {
      list = list.filter(e => {
        if (!e.pickup_type) return filters.pickup === 'in_person';
        if (e.pickup_type === 'both') return true;
        return e.pickup_type === filters.pickup;
      });
    }

    // Availability dates — exclude if blocked
    if (filters.from && filters.to) {
      list = list.filter(e => {
        if (!e.blocked_dates?.length) return true;
        const fromStr = format(filters.from, 'yyyy-MM-dd');
        const toStr   = format(filters.to,   'yyyy-MM-dd');
        return !e.blocked_dates.some(d => d >= fromStr && d <= toStr);
      });
    }

    // Sort
    switch (filters.sort) {
      case 'price_asc':  list.sort((a, b) => (a.price_per_day||0) - (b.price_per_day||0)); break;
      case 'price_desc': list.sort((a, b) => (b.price_per_day||0) - (a.price_per_day||0)); break;
      case 'condition':  list.sort((a, b) => (b.condition||0) - (a.condition||0)); break;
      case 'rating':     list.sort((a, b) => (b.condition||0) - (a.condition||0)); break; // proxy
      default: break;
    }

    return list;
  }, [equipment, filters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeFiltersCount = [
    filters.q,
    filters.city,
    filters.from,
    filters.cats.length > 0,
    filters.listingType,
    filters.priceMin > 0 || filters.priceMax < 500,
    filters.rating,
    filters.sos,
    filters.verified,
    filters.pickup,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFiltersState({
      q: '', city: '', from: null, to: null,
      cats: [], listingType: '', priceMin: 0, priceMax: 500,
      rating: '', sos: false, verified: false, pickup: '',
      sort: 'newest', page: 1, view: filters.view,
    });
  };

  const handleSearch = () => setFilter('page', 1);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* ── Search Bar ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">{t('explore')}</h1>

        <div className="flex flex-col gap-3">
          {/* Row 1: text + city + search button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder={`${t('search')} equipo, marca, modelo...`}
                value={filters.q}
                onChange={e => setFilter('q', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-9 bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 h-11 rounded-xl"
              />
              {filters.q && (
                <button onClick={() => setFilter('q', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative w-36 shrink-0">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <Input
                placeholder="Ciudad..."
                value={filters.city}
                onChange={e => setFilter('city', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-9 bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Row 2: dates + sort + filters + view */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Dates */}
            <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 h-11">
              <DatePickerDrawer
                label="Desde"
                value={filters.from}
                onChange={d => { setFilter('from', d); setFilter('to', null); setOpenDateFrom(false); setOpenDateTo(true); }}
                disabled={d => d < new Date()}
                open={openDateFrom}
                onOpenChange={setOpenDateFrom}
              />
              <span className="text-zinc-600 text-xs">→</span>
              <DatePickerDrawer
                label="Hasta"
                value={filters.to}
                onChange={d => setFilter('to', d)}
                disabled={d => d < (filters.from || new Date())}
                open={openDateTo}
                onOpenChange={setOpenDateTo}
              />
              {(filters.from || filters.to) && (
                <button onClick={() => { setFilter('from', null); setFilter('to', null); }} className="text-zinc-500 hover:text-white ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-2 ml-auto">
              {/* Sort — desktop */}
              <div className="hidden lg:block">
                <Select value={filters.sort} onValueChange={v => setFilter('sort', v)}>
                  <SelectTrigger className="w-[160px] bg-zinc-900/80 border-zinc-800 text-zinc-300 h-11 rounded-xl">
                    <ArrowUpDown className="w-4 h-4 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort — mobile drawer */}
              <div className="lg:hidden">
                <Drawer open={sortDrawerOpen} onOpenChange={setSortDrawerOpen}>
                  <DrawerTrigger asChild>
                    <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-11 rounded-xl">
                      <ArrowUpDown className="w-4 h-4 mr-1.5" />
                      {SORT_OPTIONS.find(o => o.value === filters.sort)?.label || 'Ordenar'}
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="bg-zinc-900 border-zinc-800">
                    <DrawerHeader><DrawerTitle className="text-white">Ordenar por</DrawerTitle></DrawerHeader>
                    <div className="px-4 pb-8 space-y-1">
                      {SORT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setFilter('sort', opt.value); setSortDrawerOpen(false); }}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors"
                          style={{
                            background: filters.sort === opt.value ? 'rgba(29,223,122,0.12)' : 'transparent',
                            color: filters.sort === opt.value ? '#1DDF7A' : '#d4d4d8',
                          }}
                        >
                          {opt.label}
                          {filters.sort === opt.value && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>

              {/* SOS quick toggle */}
              <Button
                variant={filters.sos ? 'default' : 'outline'}
                onClick={() => { setFilter('sos', !filters.sos); setFilter('page', 1); }}
                className={cn(
                  "h-11 rounded-xl",
                  filters.sos ? "bg-green-500 hover:bg-green-600 text-black" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                )}
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">SOS</span>
              </Button>

              {/* Request SOS button */}
              <Button
                onClick={() => setShowSosModal(true)}
                className="h-11 rounded-xl font-semibold"
                style={{ background: 'rgba(29,223,122,0.15)', color: '#1DDF7A', border: '1px solid rgba(29,223,122,0.3)' }}
              >
                <Zap className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Necesito equipo HOY</span>
                <span className="sm:hidden">SOS!</span>
              </Button>

              {/* Filters sheet — mobile drawer */}
              <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-11 rounded-xl relative">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="ml-1.5">{t('filter')}</span>
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-zinc-900 border-zinc-800 max-h-[90vh]">
                  <DrawerHeader className="flex items-center justify-between pr-4">
                    <DrawerTitle className="text-white">{t('filter')}</DrawerTitle>
                    {activeFiltersCount > 0 && (
                      <button onClick={clearFilters} className="text-xs text-zinc-400 hover:text-white underline">
                        Limpiar todo
                      </button>
                    )}
                  </DrawerHeader>
                  <div className="px-4 pb-8 overflow-y-auto">
                    <FiltersPanel filters={filters} setFilter={setFilter} t={t} />
                  </div>
                </DrawerContent>
              </Drawer>

              {/* View toggle */}
              <div className="flex border border-zinc-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setFilter('view', 'grid')}
                  className={cn("p-2.5 transition-colors", filters.view === 'grid' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                  title="Vista grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFilter('view', 'list')}
                  className={cn("p-2.5 transition-colors", filters.view === 'list' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                  title="Vista lista"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFilter('view', 'map')}
                  className={cn("p-2.5 transition-colors", filters.view === 'map' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                  title="Vista mapa"
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active filter chips ─────────────────────────────────────────── */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.q && (
            <button onClick={() => setFilter('q', '')} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 border border-zinc-700">
              "{filters.q}" <X className="w-3 h-3" />
            </button>
          )}
          {filters.city && (
            <button onClick={() => setFilter('city', '')} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 border border-zinc-700">
              <MapPin className="w-3 h-3" />{filters.city} <X className="w-3 h-3" />
            </button>
          )}
          {filters.cats.map(c => (
            <button key={c} onClick={() => setFilter('cats', filters.cats.filter(x => x !== c))} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/40 text-purple-300 text-xs border border-purple-700 hover:bg-purple-900/60">
              {c === 'estudio_podcast' ? 'Estudio/Podcast' : t(c)} <X className="w-3 h-3" />
            </button>
          ))}
          {filters.listingType && (
            <button onClick={() => setFilter('listingType', '')} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 border border-zinc-700">
              {LISTING_TYPES.find(l => l.value === filters.listingType)?.label} <X className="w-3 h-3" />
            </button>
          )}
          {filters.sos && (
            <button onClick={() => setFilter('sos', false)} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/40 text-green-300 text-xs border border-green-700 hover:bg-green-900/60">
              <Zap className="w-3 h-3" />SOS 24h <X className="w-3 h-3" />
            </button>
          )}
          {filters.verified && (
            <button onClick={() => setFilter('verified', false)} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/40 text-blue-300 text-xs border border-blue-700 hover:bg-blue-900/60">
              <ShieldCheck className="w-3 h-3" />Verificado <X className="w-3 h-3" />
            </button>
          )}
          {filters.pickup && (
            <button onClick={() => setFilter('pickup', '')} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 border border-zinc-700">
              {PICKUP_OPTIONS.find(p => p.value === filters.pickup)?.label} <X className="w-3 h-3" />
            </button>
          )}
          {(filters.priceMin > 0 || filters.priceMax < 500) && (
            <button onClick={() => { setFilter('priceMin', 0); setFilter('priceMax', 500); }} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 border border-zinc-700">
              €{filters.priceMin}–€{filters.priceMax} <X className="w-3 h-3" />
            </button>
          )}
          <button onClick={clearFilters} className="px-3 py-1 rounded-full text-xs text-zinc-500 hover:text-white underline">
            Limpiar todo
          </button>
        </div>
      )}

      {/* ── Results count ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-sm">
          <span className="text-white font-semibold">{filtered.length}</span> {filtered.length === 1 ? 'resultado' : 'resultados'}
          {(filters.q || filters.city) && <span className="text-zinc-600"> encontrados</span>}
        </p>
        {totalPages > 1 && (
          <span className="text-zinc-600 text-xs">Página {currentPage}/{totalPages}</span>
        )}
      </div>

      {/* ── Results ─────────────────────────────────────────────────────── */}

      {/* MAP VIEW */}
      {filters.view === 'map' && (
        <div className="relative">
          {/* Desktop: split map + list */}
          <div className="hidden lg:flex gap-4" style={{ height: '70vh' }}>
            {/* Left: scrollable list */}
            <div className="w-80 shrink-0 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
              {isLoading ? (
                [...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-zinc-800/50 animate-pulse" />)
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">Sin resultados</div>
              ) : (
                filtered.map(eq => (
                  <div
                    key={eq.id}
                    ref={el => { if (el) cardRefs.current[eq.id] = el; }}
                    onMouseEnter={() => setHoveredId(eq.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={cn(
                      "cursor-pointer rounded-xl border transition-all",
                      hoveredId === eq.id ? "border-white/40 bg-zinc-800" : "border-zinc-800 bg-zinc-900/60"
                    )}
                  >
                    <EquipmentListRow equipment={eq} searchStart={filters.from} searchEnd={filters.to} />
                  </div>
                ))
              )}
            </div>
            {/* Right: map */}
            <div className="flex-1 rounded-xl overflow-hidden">
              <ExploreMap
                equipment={filtered}
                hoveredId={hoveredId}
                searchStart={filters.from}
                searchEnd={filters.to}
                className="w-full h-full"
                onMarkerClick={(id) => {
                  setHoveredId(id);
                  const el = cardRefs.current[id];
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            </div>
          </div>

          {/* Mobile: full-screen map + floating list button */}
          <div className="lg:hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <ExploreMap
              equipment={filtered}
              hoveredId={hoveredId}
              searchStart={filters.from}
              searchEnd={filters.to}
              className="w-full h-full rounded-xl overflow-hidden"
              onMarkerClick={(id) => setHoveredId(id)}
            />
            {/* Floating switch to list */}
            <button
              onClick={() => setFilter('view', 'grid')}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm shadow-2xl"
              style={{ background: '#1DDF7A', color: '#060E18' }}
            >
              <List className="w-4 h-4" />
              Ver lista ({filtered.length})
            </button>
          </div>
        </div>
      )}

      {/* GRID / LIST VIEW */}
      {filters.view !== 'map' && (
        <PullToRefresh onRefresh={handleRefresh}>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-xl bg-zinc-800/50 animate-pulse" />
              ))}
            </div>
          ) : paginated.length > 0 ? (
            filters.view === 'list' ? (
              <div className="space-y-3">
                {paginated.map(eq => (
                  <div
                    key={eq.id}
                    ref={el => { if (el) cardRefs.current[eq.id] = el; }}
                    onMouseEnter={() => setHoveredId(eq.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <EquipmentListRow equipment={eq} searchStart={filters.from} searchEnd={filters.to} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {paginated.map(eq => (
                  <div
                    key={eq.id}
                    ref={el => { if (el) cardRefs.current[eq.id] = el; }}
                    onMouseEnter={() => setHoveredId(eq.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <EquipmentCard equipment={eq} searchStart={filters.from} searchEnd={filters.to} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{t('noResults')}</h3>
              <p className="text-zinc-500 mb-4">Intenta cambiar los filtros de búsqueda</p>
              <Button variant="outline" onClick={clearFilters} className="border-zinc-700 text-zinc-300">
                Limpiar filtros
              </Button>
            </div>
          )}
        </PullToRefresh>
      )}

      {/* SOS Modal */}
      <SosRequestModal
        open={showSosModal}
        onClose={() => setShowSosModal(false)}
        initialCategory={filters.cats[0] || ''}
      />

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {filters.view !== 'map' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            disabled={currentPage <= 1}
            onClick={() => { setFilter('page', currentPage - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="w-10 h-10 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let page;
            if (totalPages <= 7) {
              page = i + 1;
            } else if (currentPage <= 4) {
              page = i + 1;
            } else if (currentPage >= totalPages - 3) {
              page = totalPages - 6 + i;
            } else {
              page = currentPage - 3 + i;
            }
            return (
              <button
                key={page}
                onClick={() => { setFilter('page', page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={cn(
                  "w-10 h-10 rounded-xl text-sm font-medium transition-all",
                  page === currentPage
                    ? "bg-white text-zinc-900"
                    : "border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                )}
              >
                {page}
              </button>
            );
          })}

          <button
            disabled={currentPage >= totalPages}
            onClick={() => { setFilter('page', currentPage + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="w-10 h-10 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}