import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Loader2, MapPin, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';

const CATEGORIES = [
  { value: 'cuerdas',         label: 'Cuerdas (guitarra, bajo...)' },
  { value: 'teclados',        label: 'Teclados / Piano' },
  { value: 'percusion',       label: 'Percusión / Batería' },
  { value: 'dj_gear',         label: 'DJ Gear' },
  { value: 'sonido_pa',       label: 'Sonido PA / Altavoces' },
  { value: 'estudio_podcast', label: 'Estudio / Podcast' },
];

const DURATION_OPTIONS = [
  { value: 2, label: '2 horas' },
  { value: 4, label: '4 horas' },
  { value: 8, label: '8 horas (día)' },
  { value: 24, label: '24 horas' },
  { value: 48, label: '48 horas' },
];

export default function SosRequestModal({ open, onClose, initialCategory = '' }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    category: initialCategory,
    city: '',
    pickup_time: '',
    duration_hours: 4,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.category || !form.city || !form.description) return;
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const sosRequest = await base44.entities.SosRequest.create({
        requester_email: user.email,
        category: form.category,
        city: form.city,
        pickup_time: form.pickup_time,
        duration_hours: form.duration_hours,
        description: form.description,
        status: 'active',
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      });
      // Notify SOS owners via backend function
      base44.functions.invoke('notifySosOwners', {
        sos_request_id: sosRequest.id,
        category: form.category,
        city: form.city,
        expires_at: expiresAt,
        description: form.description,
        requester_email: user.email,
      }).catch(() => {});
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-green-400" />
            </div>
            <DialogTitle className="text-white">Solicitud SOS</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400">
            Necesito equipo hoy — los propietarios recibirán tu solicitud urgente de inmediato.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <Zap className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-white font-semibold text-lg">¡Solicitud enviada!</p>
            <p className="text-zinc-400 text-sm">Los propietarios de tu ciudad con equipo disponible han sido notificados. Recibirás respuesta en breve.</p>
            <p className="text-zinc-500 text-xs">La solicitud expira en 24 horas si no hay respuesta.</p>
            <Button onClick={onClose} className="w-full mt-2" style={{ background: '#1DDF7A', color: '#060E18' }}>
              Entendido
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Category */}
            <div>
              <Label className="text-zinc-300 mb-1.5 block text-sm">¿Qué equipo necesitas? *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder="Selecciona categoría..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div>
              <Label className="text-zinc-300 mb-1.5 block text-sm">Ciudad *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <Input
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Ej: Madrid"
                  className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
              </div>
            </div>

            {/* Pickup time + Duration row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300 mb-1.5 block text-sm">Hora de recogida</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <Input
                    type="time"
                    value={form.pickup_time}
                    onChange={e => set('pickup_time', e.target.value)}
                    className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200"
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-300 mb-1.5 block text-sm">Duración estimada</Label>
                <Select value={String(form.duration_hours)} onValueChange={v => set('duration_hours', parseInt(v))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {DURATION_OPTIONS.map(d => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-zinc-300 mb-1.5 block text-sm">Descripción breve *</Label>
              <Textarea
                value={form.description}
                onChange={e => set('description', e.target.value.slice(0, 300))}
                placeholder="Ej: Necesito una guitarra eléctrica para concierto esta noche en sala Razzmatazz..."
                className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 resize-none h-20"
              />
              <p className="text-xs text-zinc-600 text-right mt-1">{form.description.length}/300</p>
            </div>

            {/* SOS notice */}
            <div className="rounded-lg bg-green-500/8 border border-green-500/20 px-3 py-2.5">
              <p className="text-xs text-green-400">
                <Zap className="w-3 h-3 inline mr-1" />
                Los propietarios con equipo SOS disponible en <strong>{form.city || 'tu ciudad'}</strong> recibirán email inmediato. La solicitud expira en 24h.
              </p>
            </div>

            <Button
              className="w-full h-11 font-semibold"
              style={{ background: '#1DDF7A', color: '#060E18' }}
              disabled={!form.category || !form.city || !form.description || submitting}
              onClick={handleSubmit}
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Zap className="w-4 h-4 mr-2" />Enviar solicitud SOS</>
              }
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}