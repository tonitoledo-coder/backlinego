import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MapPin, Link2, X, Upload, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'busco_banda',    label: 'Busco banda',      color: 'purple' },
  { value: 'busco_musico',   label: 'Busco músico',     color: 'rose' },
  { value: 'alquila_local',  label: 'Local de ensayo',  color: 'blue' },
  { value: 'colaboracion',   label: 'Colaboración',     color: 'green' },
  { value: 'vendo_material', label: 'Vendo material',   color: 'amber' },
];

const COLOR_CLASSES = {
  purple: { active: 'bg-purple-600 text-white border-purple-600', inactive: 'border-zinc-700 text-zinc-400 hover:border-purple-500 hover:text-purple-400' },
  rose:   { active: 'bg-rose-600 text-white border-rose-600',     inactive: 'border-zinc-700 text-zinc-400 hover:border-rose-500 hover:text-rose-400' },
  blue:   { active: 'bg-blue-600 text-white border-blue-600',     inactive: 'border-zinc-700 text-zinc-400 hover:border-blue-500 hover:text-blue-400' },
  green:  { active: 'bg-green-600 text-white border-green-600',   inactive: 'border-zinc-700 text-zinc-400 hover:border-green-500 hover:text-green-400' },
  amber:  { active: 'bg-amber-500 text-black border-amber-500',   inactive: 'border-zinc-700 text-zinc-400 hover:border-amber-500 hover:text-amber-400' },
};

const BODY_PLACEHOLDER = {
  busco_banda:    'Cuéntanos qué tipo de banda buscas, géneros, experiencia, disponibilidad...',
  busco_musico:   'Describe el proyecto, qué instrumento/perfil buscas, nivel requerido...',
  alquila_local:  'Describe el local, equipamiento incluido, horarios disponibles...',
  colaboracion:   'Explica en qué proyecto trabajas y qué tipo de colaboración buscas...',
  vendo_material: 'Describe el material, estado, precio orientativo...',
};

export default function BulletinNewPost() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    category: '',
    city: '',
    body: '',
    images: [],
    links: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleImageFiles = async (files) => {
    const remaining = 3 - form.images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (!toUpload.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        toUpload.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url))
      );
      set('images', [...form.images, ...urls].slice(0, 3));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (i) => set('images', form.images.filter((_, idx) => idx !== i));

  const addLink = () => {
    if (form.links.length >= 3) return;
    set('links', [...form.links, '']);
  };

  const updateLink = (i, value) => {
    const next = [...form.links];
    next[i] = value;
    set('links', next);
  };

  const removeLink = (i) => set('links', form.links.filter((_, idx) => idx !== i));

  const validate = () => {
    const errs = {};
    if (!form.category) errs.category = 'Selecciona una categoría';
    if (form.title.trim().length < 3) errs.title = 'El título es demasiado corto';
    if (form.body.trim().length < 20) errs.body = 'La descripción es demasiado corta';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const post = await base44.entities.BulletinPost.create({
        title: form.title.trim(),
        category: form.category,
        city: form.city.trim(),
        body: form.body.trim(),
        images: form.images,
        links: form.links.filter(l => l.trim()),
        status: 'active',
        reply_count: 0,
        is_pinned: false,
        is_banned: false,
        report_count: 0,
      });
      navigate(createPageUrl('BulletinPost') + '?id=' + post.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Volver</span>
          </button>
          <h1 className="text-xl font-bold text-white">Nuevo anuncio</h1>
        </div>

        <div className="space-y-6">

          {/* 1. Categoría */}
          <div>
            <Label className="text-zinc-300 mb-3 block">Categoría *</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const isActive = form.category === cat.value;
                const cls = COLOR_CLASSES[cat.color];
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => set('category', cat.value)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium border transition-all',
                      isActive ? cls.active : cls.inactive
                    )}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
            {errors.category && <p className="text-red-400 text-xs mt-2">{errors.category}</p>}
          </div>

          {/* 2. Título */}
          <div>
            <Label className="text-zinc-300 mb-1.5 block">Título *</Label>
            <Input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ej: Batería busca banda de rock en Madrid"
              className={cn('bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600', errors.title && 'border-red-500')}
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* 3. Ciudad */}
          <div>
            <Label className="text-zinc-300 mb-1.5 block">Ciudad <span className="text-zinc-600 font-normal">(opcional)</span></Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Madrid, Barcelona..."
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 pl-9"
              />
            </div>
          </div>

          {/* 4. Descripción */}
          <div>
            <Label className="text-zinc-300 mb-1.5 block">Descripción *</Label>
            <Textarea
              value={form.body}
              onChange={e => set('body', e.target.value)}
              placeholder={BODY_PLACEHOLDER[form.category] || 'Describe tu anuncio con detalle...'}
              className={cn('bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 min-h-[140px]', errors.body && 'border-red-500')}
            />
            <div className="flex justify-between mt-1">
              {errors.body
                ? <p className="text-red-400 text-xs">{errors.body}</p>
                : <span />
              }
              <span className={cn('text-xs', form.body.trim().length >= 20 ? 'text-zinc-500' : 'text-zinc-600')}>
                {form.body.trim().length} / 20 mín.
              </span>
            </div>
          </div>

          {/* 5. Imágenes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-zinc-300">Fotos <span className="text-zinc-600 font-normal">(máx. 3)</span></Label>
              <span className="text-xs text-zinc-500">{form.images.length}/3</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {form.images.map((url, i) => (
                <div key={url + i} className="relative aspect-square rounded-xl overflow-hidden group border border-zinc-700">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {form.images.length < 3 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-800/20">
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
                    onChange={e => handleImageFiles(e.target.files)}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* 6. Links */}
          <div>
            <Label className="text-zinc-300 mb-2 block">Vídeos y redes sociales <span className="text-zinc-600 font-normal">(opcional)</span></Label>
            <div className="space-y-2">
              {form.links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      value={link}
                      onChange={e => updateLink(i, e.target.value)}
                      placeholder="https://youtube.com/... o @usuario"
                      className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 pl-9"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-500 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {form.links.length < 3 && (
                <button
                  type="button"
                  onClick={addLink}
                  className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors py-1"
                >
                  <Plus className="w-4 h-4" />
                  Añadir enlace
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Submit */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 px-4 py-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full font-semibold text-base h-12"
              style={{ background: '#1DDF7A', color: '#060E18' }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publicando...</>
              ) : (
                'Publicar anuncio'
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}