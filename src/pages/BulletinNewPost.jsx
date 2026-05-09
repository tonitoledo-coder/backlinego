import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MapPin, Link2, X, Upload, Loader2, Plus, Music, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'busco_banda',    label: 'Busco banda',      color: 'purple' },
  { value: 'busco_musico',   label: 'Busco músico',     color: 'rose' },
  { value: 'alquila_local',  label: 'Local de ensayo',  color: 'blue' },
  { value: 'colaboracion',   label: 'Colaboración',     color: 'green' },
  { value: 'vendo_material', label: 'Vendo material',   color: 'amber' },
  { value: 'oferta_empleo',  label: 'Oferta empleo',    color: 'emerald' },
  { value: 'busco_empleo',   label: 'Busco empleo',     color: 'cyan' },
];

const COLOR_CLASSES = {
  purple:  { active: 'bg-purple-600 text-white border-purple-600',  inactive: 'border-zinc-700 text-zinc-400 hover:border-purple-500 hover:text-purple-400' },
  rose:    { active: 'bg-rose-600 text-white border-rose-600',      inactive: 'border-zinc-700 text-zinc-400 hover:border-rose-500 hover:text-rose-400' },
  blue:    { active: 'bg-blue-600 text-white border-blue-600',      inactive: 'border-zinc-700 text-zinc-400 hover:border-blue-500 hover:text-blue-400' },
  green:   { active: 'bg-green-600 text-white border-green-600',    inactive: 'border-zinc-700 text-zinc-400 hover:border-green-500 hover:text-green-400' },
  amber:   { active: 'bg-amber-500 text-black border-amber-500',    inactive: 'border-zinc-700 text-zinc-400 hover:border-amber-500 hover:text-amber-400' },
  emerald: { active: 'bg-emerald-500 text-black border-emerald-500',inactive: 'border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400' },
  cyan:    { active: 'bg-cyan-500 text-black border-cyan-500',      inactive: 'border-zinc-700 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400' },
};

const BODY_PLACEHOLDER = {
  busco_banda:    'Cuéntanos qué tipo de banda buscas, géneros, experiencia, disponibilidad...',
  busco_musico:   'Describe el proyecto, qué instrumento/perfil buscas, nivel requerido...',
  alquila_local:  'Describe el local, equipamiento incluido, horarios disponibles...',
  colaboracion:   'Explica en qué proyecto trabajas y qué tipo de colaboración buscas...',
  vendo_material: 'Describe el material, estado, precio orientativo...',
  oferta_empleo:  'Describe la oferta, condiciones, fechas, remuneración...',
  busco_empleo:   'Cuenta tu experiencia, qué tipo de trabajo buscas, disponibilidad...',
};

const AVAILABILITY_OPTIONS = [
  'Inmediata',
  'Tardes',
  'Noches',
  'Fines de semana',
  'Flexible',
  'A convenir',
];

function isValidUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

// ── Chip input (used for tags & genres) ───────────────────────────────────────
function ChipInput({ value = [], onChange, placeholder, max = 8 }) {
  const [text, setText] = useState('');

  const add = (raw) => {
    const v = (raw || text).trim().replace(/^#/, '');
    if (!v) return;
    if (value.includes(v)) { setText(''); return; }
    if (value.length >= max) return;
    onChange([...value, v]);
    setText('');
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !text && value.length) {
      remove(value.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700 focus-within:border-zinc-500 transition-colors">
      {value.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-700 text-white text-xs">
          {tag}
          <button type="button" onClick={() => remove(i)} className="text-zinc-400 hover:text-red-400">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => text && add()}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] bg-transparent text-white text-sm placeholder:text-zinc-600 focus:outline-none"
      />
    </div>
  );
}

export default function BulletinNewPost() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [form, setForm] = useState({
    title: '',
    category: '',
    city: '',
    body: '',
    instrument: '',
    availability: '',
    images: [],
    links: [],
    tags: [],
    genres: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const isAuth = await db.auth.isAuthenticated();
      if (!isAuth) { db.auth.redirectToLogin(window.location.href); return; }
      const me = await db.auth.me();
      setUser(me);
      setAuthLoading(false);
    })();
  }, []);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleImageFiles = async (files) => {
    if (!user) return;
    const remaining = 3 - form.images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (!toUpload.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        toUpload.map(async (file) => {
          const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `${user.id}/${Date.now()}_${safeName}`;
          const { url } = await db.storage.upload('bulletin-images', path, file, { publicUrl: true });
          return url;
        })
      );
      set('images', [...form.images, ...urls].slice(0, 3));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (i) => set('images', form.images.filter((_, idx) => idx !== i));

  const addLink = () => {
    if (form.links.length >= 4) return;
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
    const trimmedLinks = form.links.map(l => l.trim()).filter(Boolean);
    const invalid = trimmedLinks.find(l => !isValidUrl(l));
    if (invalid) errs.links = `Enlace no válido: ${invalid}`;
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const post = await db.entities.BulletinPost.create({
        author_id: user.id,
        title: form.title.trim(),
        category: form.category,
        city: form.city.trim() || null,
        body: form.body.trim(),
        instrument: form.instrument.trim() || null,
        availability: form.availability.trim() || null,
        tags: form.tags,
        genres: form.genres,
        images: form.images,
        links: form.links.map(l => l.trim()).filter(Boolean),
        status: 'active',
        reply_count: 0,
        is_pinned: false,
        is_banned: false,
        report_count: 0,
      });
      navigate(createPageUrl('BulletinPost') + '?id=' + post.id);
    } catch (e) {
      console.error('[BulletinNewPost] create failed:', e);
      setErrors({ submit: e?.message || 'No se pudo publicar el anuncio' });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">

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

          {/* Categoría */}
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

          {/* Título */}
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

          {/* Ciudad + disponibilidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div>
              <Label className="text-zinc-300 mb-1.5 block">Disponibilidad <span className="text-zinc-600 font-normal">(opcional)</span></Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <select
                  value={form.availability}
                  onChange={e => set('availability', e.target.value)}
                  className="w-full pl-9 pr-3 h-10 rounded-md bg-zinc-800/50 border border-zinc-700 text-white text-sm focus:outline-none focus:border-zinc-500"
                >
                  <option value="">Selecciona...</option>
                  {AVAILABILITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Instrumento */}
          <div>
            <Label className="text-zinc-300 mb-1.5 block">Instrumento <span className="text-zinc-600 font-normal">(opcional)</span></Label>
            <div className="relative">
              <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={form.instrument}
                onChange={e => set('instrument', e.target.value)}
                placeholder="Guitarra, batería, voz..."
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 pl-9"
              />
            </div>
          </div>

          {/* Géneros */}
          <div>
            <Label className="text-zinc-300 mb-1.5 block">Géneros <span className="text-zinc-600 font-normal">(opcional)</span></Label>
            <ChipInput
              value={form.genres}
              onChange={v => set('genres', v)}
              placeholder="rock, jazz, metal... (Enter para añadir)"
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-zinc-300 mb-1.5 block">Tags <span className="text-zinc-600 font-normal">(opcional)</span></Label>
            <ChipInput
              value={form.tags}
              onChange={v => set('tags', v)}
              placeholder="estudio, gira, ensayo... (Enter para añadir)"
            />
          </div>

          {/* Descripción */}
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

          {/* Imágenes */}
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

          {/* Links */}
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
                      placeholder="https://youtube.com/... https://spotify.com/..."
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
              {form.links.length < 4 && (
                <button
                  type="button"
                  onClick={addLink}
                  className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors py-1"
                >
                  <Plus className="w-4 h-4" />
                  Añadir enlace
                </button>
              )}
              {errors.links && <p className="text-red-400 text-xs">{errors.links}</p>}
            </div>
          </div>

          {errors.submit && (
            <p className="text-red-400 text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/20">{errors.submit}</p>
          )}

        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 px-4 py-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSubmit}
              disabled={submitting || uploading}
              className="w-full font-semibold text-base h-12 bg-emerald-500 hover:bg-emerald-600 text-black"
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
