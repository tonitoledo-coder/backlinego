import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/components/i18n/translations';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Zap, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

async function geocodeCity(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
  const data = await res.json();
  if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  return null;
}

const IS_SPACE = (cat) => cat === 'estudio_podcast';

const PICKUP_OPTIONS = [
  { value: 'in_person', label: 'En mano', desc: 'Entrega presencial' },
  { value: 'shipping',  label: 'Envío',    desc: 'Envío por mensajería' },
  { value: 'both',      label: 'Ambos',    desc: 'Flexible' },
];

export default function Step3Pricing({ data, onChange, errors }) {
  const { t } = useTranslation();
  const [calMonth, setCalMonth] = useState(new Date());
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState(false);
  const geocodeTimer = useRef(null);
  const geocodedCoordsRef = useRef(null);
  const isSpace = IS_SPACE(data.category);

  const set = (field, value) => onChange({ ...data, [field]: value });

  const handleCityChange = (city) => {
    onChange({ ...data, location: { ...(data.location || {}), city } });
    setGeocoded(false);
    clearTimeout(geocodeTimer.current);
    if (city.length < 3) return;
    // Capture latest data via a ref-like approach using the city string in closure
    const citySnapshot = city;
    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true);
      const coords = await geocodeCity(citySnapshot);
      if (coords) {
        setGeocoded(true);
        // We store coords in a ref so parent can pick them up on next render
        geocodedCoordsRef.current = { lat: coords.lat, lng: coords.lng };
        onChange({ ...data, location: { ...(data.location || {}), city: citySnapshot, lat: coords.lat, lng: coords.lng } });
      }
      setGeocoding(false);
    }, 800);
  };

  const blockedDates = data.blocked_dates || [];

  const toggleDate = (dateStr) => {
    const next = blockedDates.includes(dateStr)
      ? blockedDates.filter(d => d !== dateStr)
      : [...blockedDates, dateStr];
    set('blocked_dates', next);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(calMonth),
    end: endOfMonth(calMonth),
  });
  const firstDayOfWeek = (startOfMonth(calMonth).getDay() + 6) % 7; // Mon=0

  return (
    <div className="space-y-6">
      {/* Price */}
      <div className="grid grid-cols-2 gap-4">
        {isSpace ? (
          <div>
            <Label className="text-zinc-300 mb-1.5 block">Precio por hora (€) *</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={data.price_per_hour || ''}
                onChange={e => set('price_per_hour', e.target.value)}
                placeholder="0"
                className={cn("bg-zinc-800/50 border-zinc-700 text-white pr-8", errors?.price_per_hour && "border-red-500")}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">€/h</span>
            </div>
            {errors?.price_per_hour && <p className="text-red-400 text-xs mt-1">{errors.price_per_hour}</p>}
          </div>
        ) : (
          <div>
            <Label className="text-zinc-300 mb-1.5 block">{t('pricePerDay')} (€) *</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={data.price_per_day || ''}
                onChange={e => set('price_per_day', e.target.value)}
                placeholder="0"
                className={cn("bg-zinc-800/50 border-zinc-700 text-white pr-8", errors?.price_per_day && "border-red-500")}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">€/d</span>
            </div>
            {errors?.price_per_day && <p className="text-red-400 text-xs mt-1">{errors.price_per_day}</p>}
          </div>
        )}

        <div>
          <Label className="text-zinc-300 mb-1.5 block">Precio mínimo (€)</Label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              value={data.min_rental_price || ''}
              onChange={e => set('min_rental_price', e.target.value)}
              placeholder="0"
              className="bg-zinc-800/50 border-zinc-700 text-white pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">€</span>
          </div>
        </div>
      </div>

      {/* Pickup type */}
      <div>
        <Label className="text-zinc-300 mb-3 block">Modalidad de recogida</Label>
        <div className="grid grid-cols-3 gap-2">
          {PICKUP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('pickup_type', opt.value)}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center",
                data.pickup_type === opt.value
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : "border-zinc-800 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600"
              )}
            >
              <span className="font-semibold text-sm">{opt.label}</span>
              <span className="text-[10px] opacity-70 mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>

        {(data.pickup_type === 'shipping' || data.pickup_type === 'both') && (
          <div className="mt-3">
            <Label className="text-zinc-400 text-xs mb-1 block">Radio de entrega (km)</Label>
            <Input
              type="number"
              min="1"
              value={data.delivery_radius_km || ''}
              onChange={e => set('delivery_radius_km', parseInt(e.target.value) || '')}
              placeholder="Ej: 50"
              className="bg-zinc-800/50 border-zinc-700 text-white max-w-[140px]"
            />
          </div>
        )}
      </div>

      {/* SOS */}
      <div className="space-y-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-white font-medium text-sm">{t('sosMode')}</p>
              <p className="text-zinc-400 text-xs">{t('sosDescription')}</p>
            </div>
          </div>
          <Switch
            checked={data.sos_available || false}
            onCheckedChange={v => set('sos_available', v)}
          />
        </div>

        {data.sos_available && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-green-500/20">
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Tiempo máx. respuesta (min)</Label>
              <Input
                type="number"
                min="30"
                step="30"
                value={data.sos_response_time_minutes || ''}
                onChange={e => set('sos_response_time_minutes', parseInt(e.target.value) || '')}
                placeholder="Ej: 120"
                className="bg-zinc-800/50 border-zinc-700 text-white"
              />
              <p className="text-zinc-600 text-[10px] mt-0.5">60 = 1h, 120 = 2h, 240 = 4h</p>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Multiplicador precio SOS</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="3"
                  step="0.1"
                  value={data.sos_price_multiplier || 1}
                  onChange={e => set('sos_price_multiplier', parseFloat(e.target.value) || 1)}
                  placeholder="1.0"
                  className="bg-zinc-800/50 border-zinc-700 text-white pr-6"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">×</span>
              </div>
              <p className="text-zinc-600 text-[10px] mt-0.5">1.5 = +50% en urgencias</p>
            </div>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="space-y-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700">
        <Label className="text-zinc-300 text-sm font-semibold block">Ubicación del equipo</Label>

        <div>
          <Label className="text-zinc-400 text-xs mb-1 block">Ciudad *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <Input
              value={data.location?.city || ''}
              onChange={e => handleCityChange(e.target.value)}
              placeholder="Ej: Barcelona"
              className={cn("pl-9 bg-zinc-800 border-zinc-700 text-white pr-8", errors?.city && "border-red-500")}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {geocoding && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
              {!geocoding && geocoded && <CheckCircle className="w-4 h-4 text-green-400" />}
            </div>
          </div>
          {geocoded && (
            <p className="text-green-400 text-xs mt-1">
              📍 Ubicación encontrada ({data.location?.lat?.toFixed(4)}, {data.location?.lng?.toFixed(4)})
            </p>
          )}
          {errors?.city && <p className="text-red-400 text-xs mt-1">{errors.city}</p>}
        </div>
      </div>

      {/* Blocked dates calendar */}
      <div>
        <Label className="text-zinc-300 mb-3 block">Fechas bloqueadas</Label>
        <p className="text-zinc-500 text-xs mb-3">Toca un día para bloquearlo (no estará disponible para reservas).</p>

        <div className="bg-zinc-800/40 border border-zinc-700 rounded-xl p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setCalMonth(m => addMonths(m, -1))} className="p-1 text-zinc-400 hover:text-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white text-sm font-medium capitalize">
              {format(calMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <button type="button" onClick={() => setCalMonth(m => addMonths(m, 1))} className="p-1 text-zinc-400 hover:text-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['L','M','X','J','V','S','D'].map(d => (
              <div key={d} className="text-center text-xs text-zinc-600 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
            {daysInMonth.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const blocked = blockedDates.includes(dateStr);
              const isPast = day < new Date(new Date().setHours(0,0,0,0));
              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isPast}
                  onClick={() => toggleDate(dateStr)}
                  className={cn(
                    "aspect-square rounded-lg text-xs font-medium transition-all",
                    isPast ? "text-zinc-700 cursor-not-allowed" : "",
                    blocked && !isPast ? "bg-red-500/20 border border-red-500/40 text-red-400" : "",
                    !blocked && !isPast ? "text-zinc-300 hover:bg-zinc-700" : ""
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>

        {blockedDates.length > 0 && (
          <p className="text-zinc-500 text-xs mt-2">
            {blockedDates.length} día{blockedDates.length > 1 ? 's' : ''} bloqueado{blockedDates.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}