import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { 
  Search, 
  SlidersHorizontal, 
  X,
  Zap,
  ArrowUpDown,
  CalendarIcon
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import CategoryFilter from '@/components/equipment/CategoryFilter';
import EquipmentCard from '@/components/equipment/EquipmentCard';

export default function Explore() {
  const { t } = useTranslation();
  const params = new URLSearchParams(window.location.search);
  
  const [searchQuery, setSearchQuery] = useState(params.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(params.get('category') || null);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sosOnly, setSosOnly] = useState(params.get('sos') === 'true');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment', 'all'],
    queryFn: () => base44.entities.Equipment.filter({ status: 'available' }, '-created_date', 100),
  });

  const filteredEquipment = useMemo(() => {
    let filtered = [...equipment];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.title?.toLowerCase().includes(query) ||
        e.brand?.toLowerCase().includes(query) ||
        e.model?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
      );
    }

    // Category
    if (selectedCategory) {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    // Price
    filtered = filtered.filter(e => 
      e.price_per_day >= priceRange[0] && e.price_per_day <= priceRange[1]
    );

    // SOS
    if (sosOnly) {
      filtered = filtered.filter(e => e.sos_available);
    }

    // Sort
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => (a.price_per_day || 0) - (b.price_per_day || 0));
        break;
      case 'price_desc':
        filtered.sort((a, b) => (b.price_per_day || 0) - (a.price_per_day || 0));
        break;
      case 'condition':
        filtered.sort((a, b) => (b.condition || 0) - (a.condition || 0));
        break;
      default:
        // newest - already sorted by created_date
        break;
    }

    return filtered;
  }, [equipment, searchQuery, selectedCategory, priceRange, sosOnly, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setPriceRange([0, 500]);
    setSosOnly(false);
    setSortBy('newest');
  };

  const activeFiltersCount = [
    searchQuery,
    selectedCategory,
    sosOnly,
    priceRange[0] > 0 || priceRange[1] < 500,
    sortBy !== 'newest'
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">{t('explore')}</h1>
        <p className="text-zinc-400">{filteredEquipment.length} {t('equipment').toLowerCase()} {t('available').toLowerCase()}</p>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            placeholder={`${t('search')} equipo, marca, modelo...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 h-12 rounded-xl"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {/* SOS Toggle */}
          <Button
            variant={sosOnly ? 'default' : 'outline'}
            onClick={() => setSosOnly(!sosOnly)}
            className={sosOnly 
              ? "bg-green-500 hover:bg-green-600 text-black" 
              : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            }
          >
            <Zap className="w-4 h-4 mr-2" />
            SOS 24h
          </Button>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] bg-zinc-900/80 border-zinc-800 text-zinc-300">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="newest">Más reciente</SelectItem>
              <SelectItem value="price_asc">Precio ↑</SelectItem>
              <SelectItem value="price_desc">Precio ↓</SelectItem>
              <SelectItem value="condition">Mejor estado</SelectItem>
            </SelectContent>
          </Select>

          {/* Filters Sheet */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 relative">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {t('filter')}
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs w-5 h-5 p-0 flex items-center justify-center">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-900 border-zinc-800">
              <SheetHeader>
                <SheetTitle className="text-white">{t('filter')}</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Price Range */}
                <div>
                  <Label className="text-zinc-300 mb-4 block">{t('pricePerDay')}: €{priceRange[0]} - €{priceRange[1]}</Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={500}
                    step={10}
                    className="mt-2"
                  />
                </div>

                {/* SOS Only */}
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">{t('sosMode')}</Label>
                  <Switch checked={sosOnly} onCheckedChange={setSosOnly} />
                </div>

                {/* Clear Filters */}
                <Button 
                  variant="outline" 
                  className="w-full border-zinc-700 text-zinc-300"
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
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
    </div>
  );
}