import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Zap, 
  Camera,
  Loader2,
  CheckCircle
} from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';

const categories = [
  'cuerdas', 'teclados', 'percusion', 'dj_gear', 'sonido_pa'
];

export default function AddEquipment() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    brand: '',
    model: '',
    year: '',
    condition: 8,
    price_per_day: '',
    deposit: '',
    sos_available: false,
    history: '',
    min_rental_days: 1,
    max_rental_days: 30,
    advance_notice_days: 0,
    location: {
      city: '',
      address: '',
      lat: null,
      lng: null
    },
    pricing_config: {
      weekend: { on: false, val: '1.25' },
      summer:  { on: false, val: '1.15' },
      tiers:   [
        { id: 1, minDays: '7',  pct: '10' },
        { id: 2, minDays: '14', pct: '20' },
      ],
      slots: Array.from({ length: 24 }, (_, i) => i >= 9 && i < 22),
    },
  });
  
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  useEffect(() => {
    if (!editId) return;
    base44.entities.Equipment.get(editId).then(existing => {
      const { images: existingImages, ...rest } = existing;
      setFormData(prev => ({ ...prev, ...rest }));
      setImages(existingImages || []);
    }).finally(() => setLoadingEdit(false));
  }, [editId]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (editId) {
        return base44.entities.Equipment.update(editId, data);
      }
      return base44.entities.Equipment.create(data);
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        navigate(createPageUrl('Profile'));
      }, 2000);
    }
  });

  const pc = formData.pricing_config;
  const setPC = (updater) =>
    setFormData(prev => ({
      ...prev,
      pricing_config: typeof updater === 'function'
        ? updater(prev.pricing_config)
        : updater,
    }));

  const togglePCBool  = (key) => setPC(c => ({ ...c, [key]: { ...c[key], on: !c[key].on } }));
  const setPCVal      = (key, val) => setPC(c => ({ ...c, [key]: { ...c[key], val } }));
  const addTier       = () => setPC(c => ({ ...c, tiers: [...c.tiers, { id: Date.now(), minDays: '', pct: '' }] }));
  const removeTier    = (id) => setPC(c => ({ ...c, tiers: c.tiers.filter(t => t.id !== id) }));
  const updateTier    = (id, field, val) =>
    setPC(c => ({ ...c, tiers: c.tiers.map(t => t.id === id ? { ...t, [field]: val } : t) }));
  const toggleSlot    = (i) =>
    setPC(c => { const s = [...c.slots]; s[i] = !s[i]; return { ...c, slots: s }; });
  const bulkSlots     = (from, to, val) =>
    setPC(c => ({ ...c, slots: c.slots.map((x, idx) => idx >= from && idx < to ? val : x) }));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const result = await base44.integrations.Core.UploadFile({ file });
        return result.file_url;
      });
      
      const urls = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...urls].slice(0, 6));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    // Get user location if not set
    let location = formData.location;
    if (!location.lat && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = {
          ...location,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
      } catch (e) {
        console.log('Could not get location');
      }
    }

    await createMutation.mutateAsync({
      ...formData,
      images,
      location,
      price_per_day: parseFloat(formData.price_per_day) || 0,
      deposit: parseFloat(formData.deposit) || 0,
      year: parseInt(formData.year) || null,
      status: 'available',
      owner_type: 'particular',
      pricing_config: formData.pricing_config
    });
  };

  if (loadingEdit) {
    return (
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-48 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {editId
            ? (lang === 'es' ? '¡Equipo actualizado!' : 'Equipment updated!')
            : (lang === 'es' ? '¡Equipo publicado!' : 'Equipment published!')}
          </h2>
          <p className="text-zinc-400">
            {lang === 'es' ? 'Redirigiendo a tu perfil...' : 'Redirecting to your profile...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
      <Link to={createPageUrl('Home')} className="inline-flex items-center text-zinc-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('back')}
      </Link>

      <h1 className="text-3xl font-bold text-white mb-2">{editId ? 'Editar equipo' : t('addEquipment')}</h1>
      <p className="text-zinc-400 mb-8">{t('onboardingTitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Images */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Fotos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              
              {images.length < 6 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-blue-500 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                      <span className="text-xs text-zinc-500">
                        {lang === 'es' ? 'Añadir foto' : 'Add photo'}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Información básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-zinc-300">Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Fender Stratocaster American Pro"
                className="bg-zinc-800/50 border-zinc-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-zinc-300">Categoría *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        <CategoryIcon category={cat} className="w-4 h-4" />
                        {t(cat)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Marca</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="Ej: Fender"
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Modelo</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Ej: Stratocaster"
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-zinc-300">Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe tu equipo, su estado, accesorios incluidos..."
                className="bg-zinc-800/50 border-zinc-700 text-white min-h-[100px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-zinc-300">Estado del instrumento</Label>
                <span className="text-emerald-400 font-semibold text-sm bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  {formData.condition}/10
                </span>
              </div>
              <Slider
                value={[formData.condition]}
                onValueChange={([v]) => setFormData(prev => ({ ...prev, condition: v }))}
                min={1}
                max={10}
                step={1}
                className="py-4"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Precio y disponibilidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">{t('pricePerDay')} (€) *</Label>
                <Input
                  type="number"
                  value={formData.price_per_day}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_per_day: e.target.value }))}
                  placeholder="0"
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-zinc-300">{t('deposit')} (€)</Label>
                <Input
                  type="number"
                  value={formData.deposit}
                  onChange={(e) => setFormData(prev => ({ ...prev, deposit: e.target.value }))}
                  placeholder="0"
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Rental rules */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-zinc-300 flex items-center gap-1">
                  Mín. días
                  <span className="text-zinc-600 text-xs cursor-help" title="Número mínimo de días que se puede alquilar">(?)</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.min_rental_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_rental_days: parseInt(e.target.value) || 1 }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-300 flex items-center gap-1">
                  Máx. días
                  <span className="text-zinc-600 text-xs cursor-help" title="Número máximo de días que se puede alquilar">(?)</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.max_rental_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_rental_days: parseInt(e.target.value) || 30 }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-300 flex items-center gap-1">
                  Días antelación
                  <span className="text-zinc-600 text-xs cursor-help" title="Días mínimos de preaviso para reservar (0 = reserva para mañana)">(?)</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.advance_notice_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, advance_notice_days: parseInt(e.target.value) || 0 }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">{t('sosMode')}</p>
                  <p className="text-sm text-zinc-400">{t('sosDescription')}</p>
                </div>
              </div>
              <Switch
                checked={formData.sos_available}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, sos_available: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Ubicación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-zinc-300">Ciudad</Label>
              <Input
                value={formData.location.city}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  location: { ...prev.location, city: e.target.value }
                }))}
                placeholder="Ej: Barcelona"
                className="bg-zinc-800/50 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Dirección (opcional)</Label>
              <Input
                value={formData.location.address}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  location: { ...prev.location, address: e.target.value }
                }))}
                placeholder="Ej: Calle Mayor 123"
                className="bg-zinc-800/50 border-zinc-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Tarifas dinámicas ───────────────────────────── */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <span>€</span> Tarifas y multiplicadores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Multiplicador fin de semana */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${pc.weekend.on ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-800 bg-zinc-800/30'}`}
              onClick={() => togglePCBool('weekend')}
            >
              <div>
                <p className="text-sm font-medium text-white">🗓 Recargo fin de semana</p>
                <p className="text-xs text-zinc-500">Sábado y domingo</p>
              </div>
              <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                {pc.weekend.on && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="1.01" max="3" step="0.05"
                      value={pc.weekend.val}
                      onChange={e => setPCVal('weekend', e.target.value)}
                      className="w-16 bg-zinc-800 border border-zinc-700 text-amber-400 text-center text-sm rounded-md px-2 py-1 outline-none focus:border-amber-500"
                    />
                    <span className="text-zinc-500 text-xs">×</span>
                  </div>
                )}
                <Switch checked={pc.weekend.on} onCheckedChange={() => togglePCBool('weekend')} />
              </div>
            </div>

            {/* Multiplicador temporada alta */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${pc.summer.on ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-800 bg-zinc-800/30'}`}
              onClick={() => togglePCBool('summer')}
            >
              <div>
                <p className="text-sm font-medium text-white">☀️ Temporada alta</p>
                <p className="text-xs text-zinc-500">Junio · Julio · Agosto</p>
              </div>
              <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                {pc.summer.on && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="1.01" max="3" step="0.05"
                      value={pc.summer.val}
                      onChange={e => setPCVal('summer', e.target.value)}
                      className="w-16 bg-zinc-800 border border-zinc-700 text-amber-400 text-center text-sm rounded-md px-2 py-1 outline-none focus:border-amber-500"
                    />
                    <span className="text-zinc-500 text-xs">×</span>
                  </div>
                )}
                <Switch checked={pc.summer.on} onCheckedChange={() => togglePCBool('summer')} />
              </div>
            </div>

            {/* Descuentos por duración */}
            <div>
              <Label className="text-zinc-300 mb-3 block text-sm">Descuentos por reserva larga</Label>
              <div className="space-y-2">
                {pc.tiers.map(tier => (
                  <div key={tier.id} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number" min="2" placeholder="7"
                        value={tier.minDays}
                        onChange={e => updateTier(tier.id, 'minDays', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 pr-8 outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">d+</span>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="number" min="1" max="80" placeholder="10"
                        value={tier.pct}
                        onChange={e => updateTier(tier.id, 'pct', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 pr-6 outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTier(tier.id)}
                      className="w-8 h-9 flex items-center justify-center border border-zinc-700 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
                    >✕</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTier}
                  className="w-full border border-dashed border-zinc-700 text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/5 rounded-md py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  + Añadir tramo
                </button>
              </div>
            </div>

            {/* Slots horarios */}
            <div>
              <Label className="text-zinc-300 mb-1 block text-sm">Slots de entrega y recogida</Label>
              <p className="text-xs text-zinc-500 mb-3">Selecciona las franjas en que puedes hacer entregas. No afectan al precio.</p>
              <div className="flex gap-2 mb-3 flex-wrap">
                {[
                  { label: 'Mañana 9–14h', from: 9,  to: 14 },
                  { label: 'Tarde 16–21h', from: 16, to: 21 },
                  { label: 'Todo el día',  from: 0,  to: 24 },
                ].map(({ label, from, to }) => (
                  <button key={label} type="button"
                    onClick={() => bulkSlots(from, to, true)}
                    className="text-xs px-3 py-1.5 border border-zinc-700 rounded-md text-zinc-400 hover:border-amber-500/40 hover:text-white transition-colors"
                  >{label}</button>
                ))}
                <button type="button"
                  onClick={() => bulkSlots(0, 24, false)}
                  className="text-xs px-3 py-1.5 border border-zinc-700 rounded-md text-zinc-500 hover:text-white transition-colors"
                >Limpiar</button>
              </div>
              <div className="grid grid-cols-12 gap-1">
                {pc.slots.map((open, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSlot(i)}
                    className={`py-1.5 rounded text-center text-xs font-mono transition-colors ${
                      open
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-600'
                    }`}
                  >
                    {String(i).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Submit */}
        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12"
          disabled={!formData.title || !formData.category || !formData.price_per_day || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {lang === 'es' ? (editId ? 'Guardando...' : 'Publicando...') : (editId ? 'Saving...' : 'Publishing...')}
            </>
          ) : (
            editId ? 'Guardar cambios' : t('goLive')
          )}
        </Button>
      </form>
    </div>
  );
}