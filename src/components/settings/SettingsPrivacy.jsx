import React, { useState } from 'react';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Save, Loader2, CheckCircle, Globe, Users, Lock, Trash2, AlertTriangle } from 'lucide-react';

const VISIBILITY_OPTIONS = [
  { value: 'public',        icon: Globe,  color: '#34d399', label: 'Público',        desc: 'Cualquiera puede ver tu perfil' },
  { value: 'contacts_only', icon: Users,  color: '#a78bfa', label: 'Solo contactos', desc: 'Solo personas con las que conectes' },
  { value: 'private',       icon: Lock,   color: '#71717a', label: 'Privado',         desc: 'Solo tú puedes verlo' },
];

export default function SettingsPrivacy({ user, onSaved }) {
  const [visibility, setVisibility] = useState(user?.profile_visibility || 'public');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await db.auth.updateMe({ profile_visibility: visibility });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onSaved?.();
  };

  return (
    <div className="space-y-5">
      {/* Visibility */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.07)' }}>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Visibilidad del perfil</h3>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = visibility === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setVisibility(opt.value)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all"
                style={{
                  borderColor: active ? opt.color : 'rgba(255,255,255,0.06)',
                  background: active ? `${opt.color}10` : 'transparent',
                }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: active ? `${opt.color}22` : 'rgba(255,255,255,0.04)' }}>
                  <Icon className="w-4 h-4" style={{ color: active ? opt.color : '#52525b' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: active ? opt.color : '#d4d4d8' }}>{opt.label}</p>
                  <p className="text-xs text-zinc-500">{opt.desc}</p>
                </div>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: active ? opt.color : '#52525b' }}>
                  {active && <div className="w-2 h-2 rounded-full" style={{ background: opt.color }} />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="sm" className="font-semibold text-white" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-900">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : saved ? <CheckCircle className="w-4 h-4 mr-1 text-green-400" /> : <Save className="w-4 h-4 mr-1" />}
            {saved ? '¡Guardado!' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: '#1a0a0a', borderColor: 'rgba(239,68,68,0.2)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#ef4444' }}>Zona de peligro</h3>
        <p className="text-sm text-zinc-400">Eliminar tu cuenta es una acción permanente e irreversible. Todos tus datos, equipos y reservas serán eliminados.</p>

        {!showDeleteConfirm ? (
          <Button onClick={() => setShowDeleteConfirm(true)} size="sm" variant="outline"
            className="border-red-900 text-red-400 hover:bg-red-900/20 gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Eliminar mi cuenta
          </Button>
        ) : (
          <div className="space-y-3 p-4 rounded-lg border" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
              <p className="text-sm font-medium text-red-400">¿Seguro que quieres eliminar tu cuenta?</p>
            </div>
            <p className="text-xs text-zinc-500">Para eliminar tu cuenta, por favor contacta con soporte en <span className="text-zinc-300">support@backlinego.com</span></p>
            <Button onClick={() => setShowDeleteConfirm(false)} size="sm" variant="outline" className="border-zinc-700 text-zinc-400">
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}