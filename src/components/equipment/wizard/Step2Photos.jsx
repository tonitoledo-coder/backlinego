import React, { useState } from 'react';
import { db } from '@/lib/db';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Loader2, Info, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const IS_SPACE_CATEGORY = (cat) => cat === 'estudio_podcast';

export default function Step2Photos({ data, onChange, errors }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  const images = data.images || [];
  const isSpace = IS_SPACE_CATEGORY(data.category);

  const set = (field, value) => onChange({ ...data, [field]: value });

  const handleFiles = async (files) => {
    const remaining = 10 - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (!toUpload.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        toUpload.map(f => db.integrations.Core.UploadFile({ file: f }).then(r => r.file_url))
      );
      onChange({ ...data, images: [...images, ...urls].slice(0, 10) });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (i) => {
    const next = images.filter((_, idx) => idx !== i);
    onChange({ ...data, images: next });
  };

  // Drag-to-reorder
  const handleDragStart = (i) => setDragIdx(i);
  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...images];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    onChange({ ...data, images: next });
    setDragIdx(null);
  };

  return (
    <div className="space-y-6">
      {/* Photo upload */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-zinc-300">Fotos del equipo * <span className="text-zinc-500 font-normal">(mín. 3, máx. 10)</span></Label>
          <span className={cn("text-xs font-medium", images.length >= 3 ? "text-green-400" : "text-zinc-500")}>
            {images.length}/10
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {images.map((url, i) => (
            <div
              key={url + i}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => { e.preventDefault(); setDragOver(i); }}
              onDrop={() => { handleDrop(i); setDragOver(null); }}
              onDragEnd={() => { setDragIdx(null); setDragOver(null); }}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden group cursor-grab active:cursor-grabbing border-2 transition-all",
                dragOver === i ? "border-green-400 scale-105" : "border-transparent",
                i === 0 ? "ring-2 ring-green-500/50" : ""
              )}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-green-400 text-[10px] font-semibold text-center py-0.5">
                  Principal
                </div>
              )}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-white drop-shadow" />
              </div>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}

          {images.length < 10 && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-green-500 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-800/20">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-zinc-500 mb-1" />
                  <span className="text-xs text-zinc-500">Añadir</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {errors?.images && <p className="text-red-400 text-xs mt-1">{errors.images}</p>}
        <p className="text-zinc-600 text-xs">Arrastra las fotos para reordenarlas. La primera será la foto principal.</p>
      </div>

      {/* Declared value */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label className="text-zinc-300">Valor de mercado declarado (€) *</Label>
          <div className="relative group">
            <Info className="w-4 h-4 text-zinc-500 cursor-help" />
            <div className="absolute left-6 top-0 z-20 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl">
              Este valor se usa para calcular el seguro o depósito de garantía. Declara el valor real de mercado del equipo.
            </div>
          </div>
        </div>
        <div className="relative">
          <Input
            type="number"
            min="0"
            value={data.declared_value || ''}
            onChange={e => set('declared_value', e.target.value)}
            placeholder="0"
            className={cn("bg-zinc-800/50 border-zinc-700 text-white pr-8", errors?.declared_value && "border-red-500")}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">€</span>
        </div>
        {data.declared_value > 0 && (
          <p className="text-zinc-500 text-xs mt-1">
            Depósito escrow estimado: <span className="text-amber-400 font-medium">€{Math.round(data.declared_value * 0.25)}</span>
          </p>
        )}
        {errors?.declared_value && <p className="text-red-400 text-xs mt-1">{errors.declared_value}</p>}
      </div>

      {/* Space-specific fields */}
      {isSpace && (
        <div className="space-y-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700">
          <p className="text-zinc-300 text-sm font-semibold">Detalles del espacio</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Aforo (personas)</Label>
              <Input
                type="number"
                min="1"
                value={data.capacity_people || ''}
                onChange={e => set('capacity_people', parseInt(e.target.value) || '')}
                placeholder="Ej: 10"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Mín. horas por reserva</Label>
              <Input
                type="number"
                min="1"
                value={data.min_rental_hours || ''}
                onChange={e => set('min_rental_hours', parseInt(e.target.value) || '')}
                placeholder="Ej: 2"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-zinc-400 text-xs mb-1 block">Equipamiento incluido</Label>
            <Textarea
              value={data.included_equipment || ''}
              onChange={e => set('included_equipment', e.target.value)}
              placeholder="Describe qué equipo está incluido: mesa de mezclas, micrófonos, monitores..."
              className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
            />
          </div>

          <div>
            <Label className="text-zinc-400 text-xs mb-1 block">Dirección del espacio</Label>
            <Input
              value={data.location?.address || ''}
              onChange={e => onChange({ ...data, location: { ...(data.location || {}), address: e.target.value } })}
              placeholder="Calle y número"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}