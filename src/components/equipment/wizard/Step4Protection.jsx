import React from 'react';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ShieldAlert, Shield, ShieldCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROTECTION_OPTIONS = [
  {
    value: 'both',
    icon: ShieldCheck,
    label: 'Acepto ambas opciones',
    desc: 'El arrendatario puede elegir entre seguro o depósito escrow. Mayor flexibilidad.',
    color: 'text-green-400',
    activeBg: 'bg-green-500/10 border-green-500/40',
  },
  {
    value: 'insurance_only',
    icon: Shield,
    label: 'Solo seguro',
    desc: 'El arrendatario debe contratar el seguro incluido en la plataforma.',
    color: 'text-blue-400',
    activeBg: 'bg-blue-500/10 border-blue-500/40',
  },
  {
    value: 'escrow_only',
    icon: ShieldAlert,
    label: 'Solo depósito escrow',
    desc: 'El arrendatario debe dejar un depósito retenido hasta la devolución.',
    color: 'text-amber-400',
    activeBg: 'bg-amber-500/10 border-amber-500/40',
  },
];

export default function Step4Protection({ data, onChange, errors, userProfile, isEdit }) {
  const set = (field, value) => onChange({ ...data, [field]: value });

  const declaredValue = parseFloat(data.declared_value) || 0;
  const escrowEstimate = Math.round(declaredValue * 0.25);
  const insuranceEstimate = Math.round(declaredValue * 0.008); // ~0.8% del valor

  const isVerified = userProfile?.identity_status === 'verified';

  return (
    <div className="space-y-6">
      {/* KYC warning */}
      {!isVerified && !isEdit && (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-300 font-semibold text-sm">Verifica tu identidad para publicar</p>
            <p className="text-amber-400/80 text-xs mt-1">
              Para publicar equipos debes verificar tu identidad. Esto protege a la comunidad.
            </p>
            <Link
              to={createPageUrl('Settings') + '?tab=identity'}
              className="inline-block mt-2 text-xs font-semibold text-amber-400 underline underline-offset-2"
            >
              Ir a verificación →
            </Link>
          </div>
        </div>
      )}

      {/* Protection options */}
      <div>
        <Label className="text-zinc-300 mb-3 block">Protección requerida *</Label>
        <div className="space-y-3">
          {PROTECTION_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = data.owner_required_protection === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('owner_required_protection', opt.value)}
                className={cn(
                  "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                  active ? opt.activeBg : "border-zinc-800 bg-zinc-800/30 hover:border-zinc-600"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", active ? opt.color : "text-zinc-500")} />
                <div>
                  <p className={cn("font-semibold text-sm", active ? opt.color : "text-zinc-300")}>{opt.label}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Estimates */}
      {declaredValue > 0 && (
        <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700 space-y-3">
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-semibold">
            <Info className="w-4 h-4 text-zinc-500" />
            Estimaciones de protección
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-zinc-800">
              <p className="text-zinc-500 text-xs mb-1">Depósito escrow</p>
              <p className="text-amber-400 font-bold text-lg">€{escrowEstimate}</p>
              <p className="text-zinc-600 text-[10px]">25% del valor declarado</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-zinc-800">
              <p className="text-zinc-500 text-xs mb-1">Prima de seguro</p>
              <p className="text-blue-400 font-bold text-lg">€{insuranceEstimate}</p>
              <p className="text-zinc-600 text-[10px]">~0.8% del valor declarado</p>
            </div>
          </div>
          <p className="text-zinc-600 text-xs">Basado en el valor declarado de €{declaredValue.toLocaleString()}. Las cifras son orientativas.</p>
        </div>
      )}

      {/* Terms checkbox */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => set('terms_accepted', !data.terms_accepted)}
            className={cn(
              "w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all",
              data.terms_accepted ? "bg-green-500 border-green-500" : "border-zinc-600 bg-zinc-800"
            )}
          >
            {data.terms_accepted && <span className="text-black text-xs font-bold">✓</span>}
          </div>
          <span className="text-zinc-400 text-sm leading-relaxed">
            Acepto los{' '}
            <Link to={createPageUrl('Home')} className="text-green-400 underline underline-offset-2">
              términos y condiciones
            </Link>{' '}
            de BacklineGo y confirmo que el equipo es de mi propiedad o tengo permiso para alquilarlo.
          </span>
        </label>
        {errors?.terms_accepted && <p className="text-red-400 text-xs mt-2">{errors.terms_accepted}</p>}
      </div>
    </div>
  );
}