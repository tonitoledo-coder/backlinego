import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Zap, 
  Camera, 
  DollarSign, 
  Rocket,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Music,
  Palette,
  Megaphone,
  Briefcase,
  Building2,
  Star,
  Users
} from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { motion, AnimatePresence } from 'framer-motion';

const categories = ['cuerdas', 'teclados', 'percusion', 'dj_gear', 'sonido_pa'];

const USER_TYPES = [
  { id: 'musico',        icon: Music,      color: '#a78bfa', label: { es: 'Músico',         en: 'Musician',    fr: 'Musicien',       de: 'Musiker'       } },
  { id: 'artista',       icon: Palette,    color: '#f472b6', label: { es: 'Artista',         en: 'Artist',      fr: 'Artiste',        de: 'Künstler'      } },
  { id: 'promotor',      icon: Megaphone,  color: '#34d399', label: { es: 'Promotor',        en: 'Promoter',    fr: 'Promoteur',      de: 'Promoter'      } },
  { id: 'manager',       icon: Briefcase,  color: '#fbbf24', label: { es: 'Manager',         en: 'Manager',     fr: 'Manager',        de: 'Manager'       } },
  { id: 'empresa',       icon: Building2,  color: '#60a5fa', label: { es: 'Empresa',         en: 'Company',     fr: 'Entreprise',     de: 'Unternehmen'   } },
  { id: 'coleccionista', icon: Star,       color: '#fb923c', label: { es: 'Coleccionista',   en: 'Collector',   fr: 'Collectionneur', de: 'Sammler'       } },
];

const STEPS = [
  { id: 1, icon: Users,       key: 'Tipo de perfil' },
  { id: 2, icon: Camera,      key: 'Fotos' },
  { id: 3, icon: DollarSign,  key: 'Detalles' },
  { id: 4, icon: Rocket,      key: 'Publicar' },
];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.18 } }),
};

export default function Onboarding() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [userType, setUserType] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    brand: '',
    condition: 8,
    price_per_day: '',
    sos_available: false,
    location: { city: '', lat: null, lng: null }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => base44.entities.Equipment.create(data),
    onSuccess: () => setCurrentStep(5),
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = await Promise.all(
      files.map(async (file) => {
        const res = await base44.integrations.Core.UploadFile({ file });
        return res.file_url;
      })
    );
    setImages(prev => [...prev, ...urls].slice(0, 4));
    setUploading(false);
  };

  const handleSubmit = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) { base44.auth.redirectToLogin(window.location.href); return; }

    let location = formData.location;
    if (!location.lat && navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        location = { ...location, lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (_) {}
    }

    await base44.auth.updateMe({ user_type: userType, onboarding_completed: true });

    // Sync UserProfile for admin management
    try {
      const u = await base44.auth.me();
      const existing = await base44.entities.UserProfile.filter({ email: u.email });
      if (existing.length === 0) {
        await base44.entities.UserProfile.create({
          user_id: u.id,
          email: u.email,
          display_name: u.full_name || u.email,
          role: 'user',
          is_verified: false,
          is_banned: false,
          profile_complete: false,
          onboarding_completed: true,
          subscription_plan: 'free',
        });
      }
    } catch (e) {
      console.warn('UserProfile sync failed:', e);
    }
    await createMutation.mutateAsync({
      ...formData,
      images,
      location,
      price_per_day: parseFloat(formData.price_per_day) || 0,
      status: 'available',
      owner_type: 'particular',
    });
  };

  const canProceed = () => {
    if (currentStep === 1) return !!userType;
    if (currentStep === 2) return images.length > 0;
    if (currentStep === 3) return formData.title && formData.category && formData.price_per_day;
    return true;
  };

  const goNext = () => {
    if (currentStep === 4) { handleSubmit(); return; }
    setDirection(1);
    setCurrentStep(s => s + 1);
  };

  const goPrev = () => {
    setDirection(-1);
    setCurrentStep(s => s - 1);
  };

  const progress = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100);

  // ── Success screen ──────────────────────────────────────────────────
  if (currentStep === 5) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0d0d1a' }}>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="text-center"
        >
          <div className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(52,211,153,0.12)', border: '2px solid #34d399' }}>
            <CheckCircle className="w-14 h-14" style={{ color: '#34d399' }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {lang === 'es' ? '¡Equipo publicado!' : 'Equipment published!'}
          </h1>
          <p className="text-zinc-400 mb-8">
            {lang === 'es' ? 'Tu equipo ya está disponible para alquilar.' : 'Your equipment is now available for rent.'}
          </p>
          <Button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="font-semibold text-black"
            style={{ background: '#a78bfa' }}
          >
            {lang === 'es' ? 'Ver mi perfil' : 'View my profile'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Main wizard ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0d1a' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => navigate(createPageUrl('Home'))} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#a78bfa,#34d399)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">BacklineGo</span>
        </div>
        <div className="w-8" />
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-2 pb-4">
        <div className="max-w-md mx-auto">
          {/* Step labels */}
          <div className="flex justify-between mb-2">
            {STEPS.map((step) => (
              <span
                key={step.id}
                className="text-[10px] font-medium transition-colors"
                style={{ color: currentStep >= step.id ? '#a78bfa' : '#52525b' }}
              >
                {step.key}
              </span>
            ))}
          </div>
          {/* Bar */}
          <div className="relative h-2 rounded-full" style={{ background: '#27272a' }}>
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ background: 'linear-gradient(90deg,#7c3aed,#a78bfa)' }}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
            {/* Dots */}
            {STEPS.map((step, i) => {
              const pct = (i / (STEPS.length - 1)) * 100;
              return (
                <div
                  key={step.id}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all"
                  style={{
                    left: `${pct}%`,
                    background: currentStep > step.id ? '#a78bfa' : currentStep === step.id ? '#7c3aed' : '#27272a',
                    borderColor: currentStep >= step.id ? '#a78bfa' : '#52525b',
                  }}
                />
              );
            })}
          </div>
          {/* Percentage */}
          <div className="flex justify-end mt-1.5">
            <span className="text-[11px] font-semibold" style={{ color: '#a78bfa' }}>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden px-4 pb-28">
        <div className="max-w-md mx-auto h-full">
          <AnimatePresence mode="wait" custom={direction}>

            {/* ── STEP 1: User type ── */}
            {currentStep === 1 && (
              <motion.div key="s1" custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit" className="space-y-6">
                <div className="text-center pt-4 pb-2">
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {lang === 'es' ? '¿Quién eres?' : 'Who are you?'}
                  </h1>
                  <p className="text-zinc-400 text-sm">
                    {lang === 'es' ? 'Personaliza tu experiencia en BacklineGo' : 'Personalize your BacklineGo experience'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {USER_TYPES.map((type) => {
                    const Icon = type.icon;
                    const label = type.label[lang] || type.label['en'];
                    const active = userType === type.id;
                    return (
                      <motion.button
                        key={type.id}
                        onClick={() => setUserType(type.id)}
                        whileTap={{ scale: 0.96 }}
                        className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all"
                        style={{
                          borderColor: active ? type.color : 'rgba(255,255,255,0.08)',
                          background: active ? `${type.color}18` : '#161625',
                          color: active ? type.color : '#71717a',
                        }}
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: active ? `${type.color}22` : 'rgba(255,255,255,0.05)' }}>
                          <Icon className="w-6 h-6" style={{ color: active ? type.color : '#71717a' }} />
                        </div>
                        <span className="text-sm font-semibold">{label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Photos ── */}
            {currentStep === 2 && (
              <motion.div key="s2" custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit" className="space-y-6">
                <div className="text-center pt-4 pb-2">
                  <h1 className="text-2xl font-bold text-white mb-1">{t('onboardingStep1')}</h1>
                  <p className="text-zinc-400 text-sm">
                    {lang === 'es' ? 'Sube hasta 4 fotos de tu equipo' : 'Upload up to 4 photos of your equipment'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {images.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.7)' }}
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length < 4 && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all"
                      style={{ borderColor: 'rgba(124,58,237,0.4)', background: '#161625' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                    >
                      {uploading ? (
                        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#a78bfa' }} />
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                            style={{ background: 'rgba(124,58,237,0.15)' }}>
                            <Camera className="w-6 h-6" style={{ color: '#a78bfa' }} />
                          </div>
                          <span className="text-sm text-zinc-500">
                            {lang === 'es' ? 'Añadir foto' : 'Add photo'}
                          </span>
                        </>
                      )}
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Details ── */}
            {currentStep === 3 && (
              <motion.div key="s3" custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit" className="space-y-5">
                <div className="text-center pt-4 pb-2">
                  <h1 className="text-2xl font-bold text-white mb-1">{t('onboardingStep2')}</h1>
                  <p className="text-zinc-400 text-sm">
                    {lang === 'es' ? 'Información básica de tu equipo' : 'Basic info about your equipment'}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-zinc-300 text-sm">{lang === 'es' ? 'Título' : 'Title'} *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                      placeholder={lang === 'es' ? 'Ej: Gibson Les Paul Standard' : 'E.g. Gibson Les Paul Standard'}
                      className="mt-1.5 text-white border-zinc-700"
                      style={{ background: '#161625' }}
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300 text-sm">{lang === 'es' ? 'Categoría' : 'Category'} *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }}>
                        <SelectValue placeholder={lang === 'es' ? 'Selecciona' : 'Select'} />
                      </SelectTrigger>
                      <SelectContent style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)' }}>
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
                  <div>
                    <Label className="text-zinc-300 text-sm">{t('pricePerDay')} (€) *</Label>
                    <Input
                      type="number"
                      value={formData.price_per_day}
                      onChange={(e) => setFormData(p => ({ ...p, price_per_day: e.target.value }))}
                      placeholder="0"
                      className="mt-1.5 text-white border-zinc-700 text-xl font-bold"
                      style={{ background: '#161625' }}
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300 text-sm mb-2 block">
                      {t('condition')}: <span style={{ color: '#a78bfa' }}>{formData.condition}/10</span>
                    </Label>
                    <Slider
                      value={[formData.condition]}
                      onValueChange={([v]) => setFormData(p => ({ ...p, condition: v }))}
                      min={1} max={10} step={1} className="py-3"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300 text-sm">{lang === 'es' ? 'Ciudad' : 'City'}</Label>
                    <Input
                      value={formData.location.city}
                      onChange={(e) => setFormData(p => ({ ...p, location: { ...p.location, city: e.target.value } }))}
                      placeholder="Barcelona"
                      className="mt-1.5 text-white border-zinc-700"
                      style={{ background: '#161625' }}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border"
                    style={{ background: 'rgba(52,211,153,0.07)', borderColor: 'rgba(52,211,153,0.25)' }}>
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5" style={{ color: '#34d399' }} />
                      <div>
                        <p className="text-white text-sm font-medium">{t('sosMode')}</p>
                        <p className="text-xs text-zinc-500">{t('urgentDelivery')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.sos_available}
                      onCheckedChange={(v) => setFormData(p => ({ ...p, sos_available: v }))}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Review ── */}
            {currentStep === 4 && (
              <motion.div key="s4" custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit" className="space-y-6">
                <div className="text-center pt-4 pb-2">
                  <h1 className="text-2xl font-bold text-white mb-1">{t('onboardingStep3')}</h1>
                  <p className="text-zinc-400 text-sm">
                    {lang === 'es' ? 'Revisa tu publicación antes de publicar' : 'Review your listing before publishing'}
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden border" style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.08)' }}>
                  {images[0] && (
                    <img src={images[0]} alt="" className="w-full aspect-video object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryIcon category={formData.category} className="w-4 h-4" style={{ color: '#a78bfa' }} />
                      <span className="text-sm" style={{ color: '#a78bfa' }}>{t(formData.category)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3">{formData.title || '—'}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">
                        €{formData.price_per_day}<span className="text-sm text-zinc-500">/día</span>
                      </span>
                      {formData.sos_available && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 text-black"
                          style={{ background: '#34d399' }}>
                          <Zap className="w-3 h-3" /> SOS
                        </span>
                      )}
                    </div>
                    {/* Selected user type */}
                    {userType && (() => {
                      const ut = USER_TYPES.find(u => u.id === userType);
                      if (!ut) return null;
                      const Icon = ut.icon;
                      return (
                        <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: ut.color }}>
                          <Icon className="w-4 h-4" />
                          <span>{ut.label[lang] || ut.label['en']}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Footer nav */}
      <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, #0d0d1a 70%, transparent)' }}>
        <div className="max-w-md mx-auto flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={goPrev}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Button
            className="flex-1 h-12 font-semibold text-black"
            style={{ background: canProceed() ? '#7c3aed' : '#3f3f46', color: canProceed() ? 'white' : '#71717a' }}
            disabled={!canProceed() || createMutation.isPending}
            onClick={goNext}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : currentStep === 4 ? (
              <><span>{t('goLive')}</span><Rocket className="w-4 h-4 ml-2" /></>
            ) : (
              <><span>{t('next')}</span><ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}