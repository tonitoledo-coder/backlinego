import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Save, Loader2, CheckCircle } from 'lucide-react';

const NOTIFICATION_OPTIONS = [
  {
    key: 'email_marketing',
    label: 'Emails de marketing',
    desc: 'Novedades, ofertas especiales y noticias de BacklineGo',
    group: 'Email',
  },
  {
    key: 'email_transaccional',
    label: 'Emails transaccionales',
    desc: 'Confirmaciones de reserva, pagos recibidos y actualizaciones de cuenta',
    group: 'Email',
  },
  {
    key: 'push_notificaciones',
    label: 'Notificaciones push',
    desc: 'Alertas en tiempo real cuando recibes mensajes, reservas o pagos',
    group: 'Push',
  },
];

export default function SettingsNotifications({ user, onSaved }) {
  const [prefs, setPrefs] = useState(user?.notifications_prefs || {
    email_marketing: true,
    email_transaccional: true,
    push_notificaciones: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ notifications_prefs: prefs });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onSaved?.();
  };

  const groups = [...new Set(NOTIFICATION_OPTIONS.map(o => o.group))];

  return (
    <div className="space-y-5">
      {groups.map(group => (
        <div key={group} className="rounded-xl border p-5 space-y-1" style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">{group}</h3>
          {NOTIFICATION_OPTIONS.filter(o => o.group === group).map(opt => (
            <div key={opt.key} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{opt.desc}</p>
              </div>
              <Switch checked={prefs[opt.key] ?? true} onCheckedChange={() => toggle(opt.key)} />
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-900">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saved ? <CheckCircle className="w-4 h-4 mr-2 text-green-400" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? '¡Guardado!' : 'Guardar preferencias'}
        </Button>
      </div>
    </div>
  );
}