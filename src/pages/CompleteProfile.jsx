import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Zap } from 'lucide-react';
import StepPublicPresence from '@/components/profile/StepPublicPresence';
import StepLocation from '@/components/profile/StepLocation';
import StepProfessional from '@/components/profile/StepProfessional';
import StepPreferences from '@/components/profile/StepPreferences';

const STEPS = [
  { id: 1, label: 'Presencia pública' },
  { id: 2, label: 'Ubicación' },
  { id: 3, label: 'Perfil profesional' },
  { id: 4, label: 'Preferencias' },
];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.16 } }),
};

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState({});

  const nextPage = new URLSearchParams(window.location.search).get('next');

  useEffect(() => {
    (async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { base44.auth.redirectToLogin(window.location.href); return; }
      const u = await base44.auth.me();
      setUser(u);
      // Resume from saved step
      const savedStep = u.onboarding_step || 1;
      setStep(Math.min(savedStep, 5));
      setFormData({
        avatar_url: u.avatar_url || '',
        username: u.username || '',
        bio: u.bio || '',
        website_url: u.website_url || '',
        social_links: u.social_links || {},
        phone: u.phone || '',
        country: u.country || '',
        city: u.city || '',
        state_province: u.state_province || '',
        postal_code: u.postal_code || '',
        address_line_1: u.address_line_1 || '',
        address_line_2: u.address_line_2 || '',
        timezone: u.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid',
        professional_tags: u.professional_tags || [],
        portfolio_url: u.portfolio_url || '',
        agency_or_company_name: u.agency_or_company_name || '',
        tax_id: u.tax_id || '',
        commission_open: u.commission_open || false,
        profile_visibility: u.profile_visibility || 'public',
        notifications_prefs: u.notifications_prefs || { email_marketing: true, email_transaccional: true, push_notificaciones: true },
        default_currency: u.default_currency || 'EUR',
        billing_name: u.billing_name || '',
        billing_email: u.billing_email || '',
        billing_type: u.billing_type || 'individual',
        billing_address: u.billing_address || {},
        stripe_onboarding_completed: u.stripe_onboarding_completed || false,
      });
      setLoading(false);
    })();
  }, []);

  const updateField = (key, value) => setFormData(p => ({ ...p, [key]: value }));

  const saveAndAdvance = async (nextStep) => {
    setSaving(true);
    await base44.auth.updateMe({ ...formData, onboarding_step: nextStep });
    setSaving(false);
    setDirection(1);
    setStep(nextStep);
  };

  const goBack = () => {
    setDirection(-1);
    setStep(s => s - 1);
  };

  const finish = async () => {
    setSaving(true);
    await base44.auth.updateMe({ ...formData, onboarding_completed: true, onboarding_step: 5 });

    // Sync UserProfile for admin management
    try {
      const existing = await base44.entities.UserProfile.filter({ email: user.email });
      if (existing.length === 0) {
        await base44.entities.UserProfile.create({
          user_id: user.id,
          email: user.email,
          display_name: formData.username || user.full_name || user.email,
          role: 'user',
          is_verified: false,
          is_banned: false,
          profile_complete: true,
          onboarding_completed: true,
          subscription_plan: 'free',
        });
      } else {
        await base44.entities.UserProfile.update(existing[0].id, {
          display_name: formData.username || user.full_name || user.email,
          profile_complete: true,
          onboarding_completed: true,
        });
      }
    } catch (e) {
      console.warn('UserProfile sync failed:', e);
    }

    setSaving(false);
    navigate(createPageUrl('Profile'));
  };

  const progress = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d1a' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#a78bfa' }} />
      </div>
    );
  }

  if (!user) return null;

  const stepProps = { formData, updateField, user };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0d1a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-2 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#a78bfa,#34d399)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">BacklineGo</span>
        </div>
        <span className="text-xs text-zinc-500">Completar perfil</span>
      </div>

      {/* Progress */}
      <div className="px-4 pt-3 pb-4 max-w-2xl mx-auto w-full">
        <div className="flex justify-between mb-2">
          {STEPS.map(s => (
            <span key={s.id} className="text-[10px] font-medium hidden sm:block transition-colors"
              style={{ color: step >= s.id ? '#a78bfa' : '#52525b' }}>
              {s.label}
            </span>
          ))}
        </div>
        <div className="relative h-2 rounded-full" style={{ background: '#27272a' }}>
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ background: 'linear-gradient(90deg,#7c3aed,#a78bfa)' }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
          {STEPS.map((s, i) => {
            const pct = (i / (STEPS.length - 1)) * 100;
            return (
              <div key={s.id} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all"
                style={{
                  left: `${pct}%`,
                  background: step > s.id ? '#a78bfa' : step === s.id ? '#7c3aed' : '#27272a',
                  borderColor: step >= s.id ? '#a78bfa' : '#52525b',
                }} />
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[11px] text-zinc-500">Paso {step} de {STEPS.length}</span>
          <span className="text-[11px] font-semibold" style={{ color: '#a78bfa' }}>{progress}%</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 px-4 pb-32 max-w-2xl mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <StepPublicPresence {...stepProps} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <StepLocation {...stepProps} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <StepProfessional {...stepProps} />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="s4" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <StepPreferences {...stepProps} />
            </motion.div>
          )}
          {step === 5 && (
            <motion.div key="s5" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <StepBilling {...stepProps} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 max-w-2xl mx-auto w-full"
        style={{ background: 'linear-gradient(to top, #0d0d1a 80%, transparent)' }}>
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={goBack} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          {step === 5 ? (
            <div className="flex flex-col gap-2 flex-1">
              <Button
                onClick={finish}
                disabled={saving}
                className="w-full h-12 font-semibold text-white"
                style={{ background: '#7c3aed' }}
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><CheckCircle className="w-4 h-4 mr-2" />Completar perfil</>
                )}
              </Button>
              <button onClick={finish} className="text-xs text-zinc-500 hover:text-zinc-300 text-center transition-colors">
                Omitir facturación por ahora, configurar más tarde
              </button>
            </div>
          ) : (
            <Button
              onClick={() => saveAndAdvance(step + 1)}
              disabled={saving}
              className="flex-1 h-12 font-semibold text-white"
              style={{ background: '#7c3aed' }}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <><span>Guardar y continuar</span><ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}