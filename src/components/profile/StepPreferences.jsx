import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, Users, Lock } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const VISIBILITY_OPTIONS = [
  { value: 'public',        icon: Globe,  color: '#34d399', label: 'Público',          desc: 'Cualquiera puede ver tu perfil' },
  { value: 'contacts_only', icon: Users,  color: '#a78bfa', label: 'Solo contactos',   desc: 'Solo las personas que conectes' },
  { value: 'private',       icon: Lock,   color: '#71717a', label: 'Privado',           desc: 'Solo tú puedes verlo' },
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'ARS', 'COP', 'CLP', 'BRL'];

export default function StepPreferences({ formData, updateField }) {
  const prefs = formData.notifications_prefs || { email_marketing: true, email_transaccional: true, push_notificaciones: true };
  const updatePref = (key, val) => updateField('notifications_prefs', { ...prefs, [key]: val });

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Visibilidad y preferencias</h2>
        <p className="text-zinc-400 text-sm">Controla quién puede ver tu perfil y cómo quieres recibir notificaciones.</p>
      </div>

      {/* Visibility */}
      <div>
        <Label className="text-zinc-300 text-sm mb-3 block">Visibilidad del perfil</Label>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = formData.profile_visibility === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => updateField('profile_visibility', opt.value)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all"
                style={{
                  borderColor: active ? opt.color : 'rgba(255,255,255,0.08)',
                  background: active ? `${opt.color}12` : '#161625',
                }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: active ? `${opt.color}25` : 'rgba(255,255,255,0.05)' }}>
                  <Icon className="w-4 h-4" style={{ color: active ? opt.color : '#52525b' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: active ? opt.color : '#d4d4d8' }}>{opt.label}</p>
                  <p className="text-xs text-zinc-500">{opt.desc}</p>
                </div>
                <div className="ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: active ? opt.color : '#52525b' }}>
                  {active && <div className="w-2 h-2 rounded-full" style={{ background: opt.color }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      <div>
        <Label className="text-zinc-300 text-sm mb-3 block">Notificaciones</Label>
        <div className="space-y-3">
          {[
            { key: 'email_marketing',      label: 'Emails de marketing',       desc: 'Novedades, ofertas y noticias de BacklineGo' },
            { key: 'email_transaccional',  label: 'Emails transaccionales',    desc: 'Confirmaciones, reservas y pagos' },
            { key: 'push_notificaciones',  label: 'Notificaciones push',        desc: 'Alertas en tiempo real en tu dispositivo' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-xl border"
              style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
              <Switch checked={prefs[key] ?? true} onCheckedChange={v => updatePref(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div>
        <Label className="text-zinc-300 text-sm">Moneda predeterminada</Label>
        <Select value={formData.default_currency || 'EUR'} onValueChange={v => updateField('default_currency', v)}>
          <SelectTrigger className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)' }}>
            {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}