import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/components/i18n/translations';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'cuerdas',           labelKey: 'cuerdas' },
  { value: 'teclados',          labelKey: 'teclados' },
  { value: 'percusion',         labelKey: 'percusion' },
  { value: 'dj_gear',           labelKey: 'dj_gear' },
  { value: 'sonido_pa',         labelKey: 'sonido_pa' },
  { value: 'estudio_podcast',   labelKey: 'estudio_podcast' },
];

const CONDITION_OPTIONS = [
  { value: 'new',        label: 'Nuevo',     score: 10, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/40' },
  { value: 'excellent',  label: 'Excelente', score: 8,  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/40' },
  { value: 'good',       label: 'Bueno',     score: 6,  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/40' },
  { value: 'acceptable', label: 'Aceptable', score: 4,  color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/40' },
];

const CONDITION_SCORE = { new: 10, excellent: 8, good: 6, acceptable: 4 };

export default function Step1Basic({ data, onChange, errors }) {
  const { t } = useTranslation();

  const set = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <Label className="text-zinc-300 mb-1.5 block">Nombre del equipo *</Label>
        <Input
          value={data.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Ej: Fender Stratocaster American Pro"
          className={cn("bg-zinc-800/50 border-zinc-700 text-white", errors?.title && "border-red-500")}
        />
        {errors?.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Category */}
      <div>
        <Label className="text-zinc-300 mb-1.5 block">Categoría *</Label>
        <Select value={data.category} onValueChange={v => set('category', v)}>
          <SelectTrigger className={cn("bg-zinc-800/50 border-zinc-700 text-white", errors?.category && "border-red-500")}>
            <SelectValue placeholder="Selecciona categoría" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  <CategoryIcon category={cat.value} className="w-4 h-4" />
                  {t(cat.labelKey) !== cat.labelKey ? t(cat.labelKey) : (cat.value === 'estudio_podcast' ? 'Estudio / Podcast' : cat.value)}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
      </div>

      {/* Subcategory */}
      <div>
        <Label className="text-zinc-300 mb-1.5 block">Subcategoría</Label>
        <Input
          value={data.subcategory || ''}
          onChange={e => set('subcategory', e.target.value)}
          placeholder="Ej: Guitarra eléctrica, Sintetizador..."
          className="bg-zinc-800/50 border-zinc-700 text-white"
        />
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-zinc-300">Descripción *</Label>
          <span className={cn("text-xs", (data.description || '').length >= 100 ? "text-green-400" : "text-zinc-500")}>
            {(data.description || '').length}/100 mín.
          </span>
        </div>
        <Textarea
          value={data.description || ''}
          onChange={e => set('description', e.target.value)}
          placeholder="Describe el equipo, su estado, accesorios incluidos, historial de uso..."
          className={cn("bg-zinc-800/50 border-zinc-700 text-white min-h-[120px]", errors?.description && "border-red-500")}
        />
        {errors?.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* Condition */}
      <div>
        <Label className="text-zinc-300 mb-3 block">Estado de conservación *</Label>
        <div className="grid grid-cols-2 gap-3">
          {CONDITION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange({ ...data, condition_label: opt.value, condition: CONDITION_SCORE[opt.value] });
              }}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                data.condition_label === opt.value
                  ? opt.bg + " " + opt.color
                  : "border-zinc-800 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600"
              )}
            >
              <span className="font-semibold text-sm">{opt.label}</span>
              <span className="text-xs opacity-70 mt-0.5">{opt.score}/10</span>
            </button>
          ))}
        </div>
        {errors?.condition_label && <p className="text-red-400 text-xs mt-1">{errors.condition_label}</p>}
      </div>
    </div>
  );
}