import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const COUNTRIES = [
  'España', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú', 'Venezuela',
  'Ecuador', 'Guatemala', 'Cuba', 'Bolivia', 'República Dominicana', 'Honduras',
  'Paraguay', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panamá', 'Uruguay',
  'United Kingdom', 'France', 'Germany', 'Italy', 'Portugal', 'Netherlands',
  'Belgium', 'Switzerland', 'Austria', 'Poland', 'United States', 'Canada',
  'Brazil', 'Japan', 'Australia', 'Other',
];

const TIMEZONES = [
  'Europe/Madrid', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Mexico_City', 'America/Bogota', 'America/Santiago', 'America/Buenos_Aires',
  'America/Sao_Paulo', 'Asia/Tokyo', 'Australia/Sydney',
];

export default function StepLocation({ formData, updateField }) {
  const f = (key) => formData[key] || '';

  return (
    <div className="space-y-5 pt-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Ubicación y contacto</h2>
        <p className="text-zinc-400 text-sm">Esta información puede mostrarse en tu perfil público.</p>
      </div>

      <div>
        <Label className="text-zinc-300 text-sm">Teléfono</Label>
        <Input value={f('phone')} onChange={e => updateField('phone', e.target.value)}
          placeholder="+34 600 000 000" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
      </div>

      <div>
        <Label className="text-zinc-300 text-sm">País</Label>
        <Select value={f('country')} onValueChange={v => updateField('country', v)}>
          <SelectTrigger className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }}>
            <SelectValue placeholder="Seleccionar país" />
          </SelectTrigger>
          <SelectContent style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)', maxHeight: 260 }}>
            {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-zinc-300 text-sm">Ciudad</Label>
          <Input value={f('city')} onChange={e => updateField('city', e.target.value)}
            placeholder="Barcelona" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
        </div>
        <div>
          <Label className="text-zinc-300 text-sm">Provincia / Estado</Label>
          <Input value={f('state_province')} onChange={e => updateField('state_province', e.target.value)}
            placeholder="Cataluña" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
        </div>
      </div>

      <div>
        <Label className="text-zinc-300 text-sm">Dirección línea 1</Label>
        <Input value={f('address_line_1')} onChange={e => updateField('address_line_1', e.target.value)}
          placeholder="Calle, número" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-zinc-300 text-sm">Dirección línea 2</Label>
          <Input value={f('address_line_2')} onChange={e => updateField('address_line_2', e.target.value)}
            placeholder="Piso, puerta..." className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
        </div>
        <div>
          <Label className="text-zinc-300 text-sm">Código postal</Label>
          <Input value={f('postal_code')} onChange={e => updateField('postal_code', e.target.value)}
            placeholder="08001" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
        </div>
      </div>

      <div>
        <Label className="text-zinc-300 text-sm">Zona horaria</Label>
        <Select value={f('timezone')} onValueChange={v => updateField('timezone', v)}>
          <SelectTrigger className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)', maxHeight: 220 }}>
            {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-600 mt-1">Detectada automáticamente. Puedes cambiarla si lo necesitas.</p>
      </div>
    </div>
  );
}