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
  Mic2,
  Star,
  Building2,
  Users,
  Briefcase,
  Package
} from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { motion, AnimatePresence } from 'framer-motion';

const categories = [
  'cuerdas', 'teclados', 'percusion', 'dj_gear', 'sonido_pa'
];

const steps = [
  { id: 1, icon: Camera, title: 'uploadPhotos' },
  { id: 2, icon: DollarSign, title: 'setPrice' },
  { id: 3, icon: Rocket, title: 'goLive' },
];

export default function Onboarding() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
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
    mutationFn: async (data) => {
      return base44.entities.Equipment.create(data);
    },
    onSuccess: () => {
      setCurrentStep(4); // Success state
    }
  });

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
      setImages(prev => [...prev, ...urls].slice(0, 4));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    // Get location
    let location = formData.location;
    if (!location.lat && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
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
      status: 'available',
      owner_type: 'particular'
    });
  };

  const canProceed = () => {
    if (currentStep === 1) return images.length > 0;
    if (currentStep === 2) return formData.title && formData.category && formData.price_per_day;
    return true;
  };

  // Success screen
  if (currentStep === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 neon-green">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {lang === 'es' ? '¡Equipo publicado!' : 'Equipment published!'}
          </h1>
          <p className="text-zinc-400 mb-8">
            {lang === 'es' ? 'Tu equipo ya está disponible para alquilar' : 'Your equipment is now available for rent'}
          </p>
          <Button 
            onClick={() => navigate(createPageUrl('Profile'))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {lang === 'es' ? 'Ver mi perfil' : 'View my profile'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button 
          onClick={() => navigate(createPageUrl('Home'))}
          className="flex items-center gap-2 text-zinc-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">BacklineGo</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Progress */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, i) => (
              <React.Fragment key={step.id}>
                <div className={`flex flex-col items-center ${
                  currentStep >= step.id ? 'text-blue-500' : 'text-zinc-600'
                }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                    currentStep >= step.id 
                      ? 'bg-blue-500/20 border-2 border-blue-500' 
                      : 'bg-zinc-800 border-2 border-zinc-700'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium">{t(step.title)}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-blue-500' : 'bg-zinc-700'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-32">
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Photos */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-white mb-2">{t('onboardingStep1')}</h1>
                  <p className="text-zinc-400">
                    {lang === 'es' ? 'Sube hasta 4 fotos de tu equipo' : 'Upload up to 4 photos of your equipment'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {images.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  
                  {images.length < 4 && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-zinc-700 hover:border-blue-500 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-zinc-800/50">
                      {uploading ? (
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                            <Camera className="w-7 h-7 text-blue-500" />
                          </div>
                          <span className="text-sm text-zinc-400">
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
              </motion.div>
            )}

            {/* Step 2: Details */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-white mb-2">{t('onboardingStep2')}</h1>
                  <p className="text-zinc-400">
                    {lang === 'es' ? 'Información básica de tu equipo' : 'Basic info about your equipment'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-zinc-300">
                      {lang === 'es' ? 'Título' : 'Title'} *
                    </Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={lang === 'es' ? 'Ej: Gibson Les Paul Standard' : 'E.g. Gibson Les Paul Standard'}
                      className="bg-zinc-800/50 border-zinc-700 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-zinc-300">
                      {lang === 'es' ? 'Categoría' : 'Category'} *
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-2">
                        <SelectValue placeholder={lang === 'es' ? 'Selecciona' : 'Select'} />
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

                  <div>
                    <Label className="text-zinc-300">{t('pricePerDay')} (€) *</Label>
                    <Input
                      type="number"
                      value={formData.price_per_day}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_per_day: e.target.value }))}
                      placeholder="0"
                      className="bg-zinc-800/50 border-zinc-700 text-white mt-2 text-2xl font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-zinc-300 mb-3 block">
                      {t('condition')}: {formData.condition}/10
                    </Label>
                    <Slider
                      value={[formData.condition]}
                      onValueChange={([v]) => setFormData(prev => ({ ...prev, condition: v }))}
                      min={1}
                      max={10}
                      step={1}
                      className="py-4"
                    />
                  </div>

                  <div>
                    <Label className="text-zinc-300">
                      {lang === 'es' ? 'Ciudad' : 'City'}
                    </Label>
                    <Input
                      value={formData.location.city}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        location: { ...prev.location, city: e.target.value }
                      }))}
                      placeholder={lang === 'es' ? 'Ej: Barcelona' : 'E.g. Barcelona'}
                      className="bg-zinc-800/50 border-zinc-700 text-white mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-white font-medium">{t('sosMode')}</p>
                        <p className="text-xs text-zinc-400">{t('urgentDelivery')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.sos_available}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, sos_available: v }))}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-white mb-2">{t('onboardingStep3')}</h1>
                  <p className="text-zinc-400">
                    {lang === 'es' ? 'Revisa tu publicación' : 'Review your listing'}
                  </p>
                </div>

                {/* Preview Card */}
                <div className="bg-zinc-900/80 rounded-2xl overflow-hidden border border-zinc-800">
                  {images[0] && (
                    <img src={images[0]} alt="" className="w-full aspect-video object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryIcon category={formData.category} className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-blue-500">{t(formData.category)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{formData.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">€{formData.price_per_day}<span className="text-sm text-zinc-500">/día</span></span>
                      {formData.sos_available && (
                        <span className="bg-green-500 text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <Zap className="w-3 h-3" /> SOS
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent">
        <div className="max-w-md mx-auto flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(s => s - 1)}
              className="border-zinc-700 text-zinc-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 font-semibold"
            disabled={!canProceed() || createMutation.isPending}
            onClick={() => {
              if (currentStep === 3) {
                handleSubmit();
              } else {
                setCurrentStep(s => s + 1);
              }
            }}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : currentStep === 3 ? (
              <>
                {t('goLive')}
                <Rocket className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                {t('next')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}