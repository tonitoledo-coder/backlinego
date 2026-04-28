import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

import WizardProgress from '@/components/equipment/wizard/WizardProgress';
import Step1Basic from '@/components/equipment/wizard/Step1Basic';
import Step2Photos from '@/components/equipment/wizard/Step2Photos';
import Step3Pricing from '@/components/equipment/wizard/Step3Pricing';
import Step4Protection from '@/components/equipment/wizard/Step4Protection';

const getDraftKey = (email) => `backlinego_equipment_draft_${email || 'anon'}`;

const SPACE_CATEGORY = 'estudio_podcast';

const defaultData = () => ({
  title: '',
  description: '',
  category: '',
  subcategory: '',
  condition: 8,
  condition_label: '',
  listing_type: 'equipment',
  images: [],
  declared_value: '',
  price_per_day: '',
  price_per_hour: '',
  min_rental_price: '',
  deposit: '',
  pickup_type: 'in_person',
  delivery_radius_km: '',
  sos_available: false,
  blocked_dates: [],
  min_rental_days: 1,
  max_rental_days: 30,
  min_rental_hours: 1,
  advance_notice_days: 0,
  owner_required_protection: 'both',
  terms_accepted: false,
  location: { city: '', address: '', lat: null, lng: null },
  capacity_people: '',
  included_equipment: '',
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

// ── Per-step validators ──────────────────────────────────────────────────────
function validateStep(step, data) {
  const errors = {};
  if (step === 1) {
    if (!data.title?.trim()) errors.title = 'El nombre es obligatorio.';
    if (!data.category) errors.category = 'Selecciona una categoría.';
    if ((data.description || '').length < 100) errors.description = `Mínimo 100 caracteres (actual: ${(data.description || '').length}).`;
    if (!data.condition_label) errors.condition_label = 'Selecciona el estado de conservación.';
  }
  if (step === 2) {
    if ((data.images || []).length < 3) errors.images = 'Sube al menos 3 fotos.';
    if (!data.declared_value || parseFloat(data.declared_value) <= 0) errors.declared_value = 'Indica el valor de mercado del equipo.';
  }
  if (step === 3) {
    const isSpace = data.category === SPACE_CATEGORY;
    if (isSpace) {
      if (!data.price_per_hour || parseFloat(data.price_per_hour) <= 0) errors.price_per_hour = 'Indica el precio por hora.';
    } else {
      if (!data.price_per_day || parseFloat(data.price_per_day) <= 0) errors.price_per_day = 'Indica el precio por día.';
    }
  }
  if (step === 4) {
    if (!data.terms_accepted) errors.terms_accepted = 'Debes aceptar las condiciones para publicar.';
  }
  return errors;
}

export default function AddEquipment() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(defaultData());
  const [errors, setErrors] = useState({});
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [userProfile, setUserProfile] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load user profile and then draft
  useEffect(() => {
    base44.auth.isAuthenticated().then(async (isAuth) => {
      if (!isAuth) return;
      const u = await base44.auth.me();
      setUserEmail(u.email);
      const profiles = await base44.entities.UserProfile.filter({ email: u.email });
      if (profiles?.[0]) setUserProfile(profiles[0]);

      // Load draft only after knowing the user (only when not editing)
      if (!editId) {
        try {
          const saved = localStorage.getItem(getDraftKey(u.email));
          if (saved) {
            const parsed = JSON.parse(saved);
            setFormData(prev => ({ ...prev, ...parsed }));
          }
        } catch (_) {}
      }
    });
  }, []);

  // Load existing equipment for editing
  useEffect(() => {
    if (!editId) return;
    base44.entities.Equipment.get(editId).then(existing => {
      const { images: imgs, pricing_config: pc, ...rest } = existing;
      setFormData(prev => ({
        ...prev,
        ...rest,
        images: imgs || [],
        pricing_config: pc ?? prev.pricing_config,
        terms_accepted: true, // pre-accepted for edits
      }));
    }).finally(() => setLoadingEdit(false));
  }, [editId]);

  // Auto-save draft on change
  const saveDraft = useCallback((data) => {
    if (editId || !userEmail) return;
    try {
      localStorage.setItem(getDraftKey(userEmail), JSON.stringify(data));
    } catch (_) {}
  }, [editId, userEmail]);

  const handleChange = (newData) => {
    // Auto-set listing_type based on category
    const listing_type = newData.category === SPACE_CATEGORY ? 'space' : 'equipment';
    const updated = { ...newData, listing_type };
    setFormData(updated);
    saveDraft(updated);
  };

  const goNext = () => {
    const errs = validateStep(step, formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setErrors({});
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (editId) return base44.entities.Equipment.update(editId, data);
      return base44.entities.Equipment.create(data);
    },
    onSuccess: () => {
      localStorage.removeItem(getDraftKey(userEmail));
      setSuccess(true);
      setTimeout(() => navigate(createPageUrl('Profile')), 2000);
    },
  });

  const handlePublish = async () => {
    const errs = validateStep(4, formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) { base44.auth.redirectToLogin(window.location.href); return; }

    // Get location if missing
    let location = formData.location;
    if (!location.lat && navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        location = { ...location, lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (_) {}
    }

    const payload = {
      ...formData,
      location,
      price_per_day: parseFloat(formData.price_per_day) || 0,
      price_per_hour: parseFloat(formData.price_per_hour) || 0,
      declared_value: parseFloat(formData.declared_value) || 0,
      deposit: parseFloat(formData.deposit) || 0,
      min_rental_price: parseFloat(formData.min_rental_price) || 0,
      delivery_radius_km: parseInt(formData.delivery_radius_km) || null,
      capacity_people: parseInt(formData.capacity_people) || null,
      min_rental_hours: parseInt(formData.min_rental_hours) || 1,
      status: 'available',
      owner_type: 'particular',
    };
    delete payload.terms_accepted; // not stored on entity

    await createMutation.mutateAsync(payload);
  };

  const isVerified = userProfile?.identity_status === 'verified';
  const canPublish = isVerified || !!editId;

  // ── Loading / success states ─────────────────────────────────────────────
  if (loadingEdit) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
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
            {editId ? '¡Equipo actualizado!' : '¡Equipo publicado!'}
          </h2>
          <p className="text-zinc-400">{lang === 'es' ? 'Redirigiendo a tu perfil...' : 'Redirecting to your profile...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6 pb-32">
      {/* Back link */}
      <Link to={createPageUrl('Profile')} className="inline-flex items-center text-zinc-400 hover:text-white mb-6 text-sm">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        {t('back')}
      </Link>

      <h1 className="text-2xl font-bold text-white mb-1">
        {editId ? 'Editar equipo' : t('addEquipment')}
      </h1>
      <p className="text-zinc-500 text-sm mb-6">
        {editId ? 'Actualiza los detalles de tu equipo' : 'Publica tu equipo en 4 pasos'}
      </p>

      {/* Progress bar */}
      <WizardProgress currentStep={step} />

      {/* Step content */}
      <div className="mb-8">
        {step === 1 && (
          <Step1Basic data={formData} onChange={handleChange} errors={errors} />
        )}
        {step === 2 && (
          <Step2Photos data={formData} onChange={handleChange} errors={errors} />
        )}
        {step === 3 && (
          <Step3Pricing data={formData} onChange={handleChange} errors={errors} />
        )}
        {step === 4 && (
          <Step4Protection
            data={formData}
            onChange={handleChange}
            errors={errors}
            userProfile={userProfile}
            isEdit={!!editId}
          />
        )}
      </div>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 px-4 py-4 flex gap-3"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        {step > 1 ? (
          <Button variant="outline" onClick={goBack} className="flex-1">
            {t('back')}
          </Button>
        ) : (
          <div className="flex-1" />
        )}

        {step < 4 ? (
          <Button onClick={goNext} className="flex-1 bg-white text-zinc-900 hover:bg-zinc-100 font-semibold">
            {t('next')} →
          </Button>
        ) : (
          <Button
            onClick={handlePublish}
            disabled={createMutation.isPending || (!canPublish && !editId)}
            className="flex-1 font-semibold"
            style={{ background: canPublish ? '#1DDF7A' : undefined, color: canPublish ? '#060E18' : undefined }}
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{editId ? 'Guardando...' : 'Publicando...'}</>
            ) : (
              editId ? 'Guardar cambios' : t('goLive')
            )}
          </Button>
        )}
      </div>
    </div>
  );
}