import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Loader2, Save, CheckCircle, Instagram, Youtube, Linkedin, Globe } from 'lucide-react';

const COUNTRIES = ['España','México','Argentina','Colombia','Chile','Perú','United Kingdom','France','Germany','Italy','Portugal','United States','Canada','Brazil','Japan','Australia','Other'];
const TIMEZONES = ['Europe/Madrid','Europe/London','Europe/Paris','Europe/Berlin','America/New_York','America/Mexico_City','America/Bogota','America/Santiago','America/Buenos_Aires','America/Sao_Paulo','Asia/Tokyo','Australia/Sydney'];

export default function SettingsProfile({ user, onSaved }) {
  const [form, setForm] = useState({
    avatar_url: user?.avatar_url || '',
    username: user?.username || '',
    bio: user?.bio || '',
    website_url: user?.website_url || '',
    social_links: user?.social_links || {},
    phone: user?.phone || '',
    country: user?.country || '',
    city: user?.city || '',
    state_province: user?.state_province || '',
    postal_code: user?.postal_code || '',
    address_line_1: user?.address_line_1 || '',
    address_line_2: user?.address_line_2 || '',
    timezone: user?.timezone || 'Europe/Madrid',
    portfolio_url: user?.portfolio_url || '',
    agency_or_company_name: user?.agency_or_company_name || '',
    professional_tags: user?.professional_tags || [],
    commission_open: user?.commission_open || false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setSocial = (key, val) => setForm(p => ({ ...p, social_links: { ...p.social_links, [key]: val } }));

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    set('avatar_url', res.file_url);
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onSaved?.();
  };

  const addTag = () => {
    const val = tagInput.trim().toLowerCase();
    if (val && !form.professional_tags.includes(val)) {
      set('professional_tags', [...form.professional_tags, val]);
    }
    setTagInput('');
  };

  return (
    <div className="space-y-8">
      <Section title="Foto de perfil">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border" style={{ background: '#161625', borderColor: 'rgba(167,139,250,0.3)' }}>
            {form.avatar_url
              ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-zinc-600"><Camera className="w-7 h-7" /></div>}
            {uploadingAvatar && <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}><Loader2 className="w-5 h-5 animate-spin text-white" /></div>}
          </div>
          <label className="cursor-pointer">
            <span className="px-4 py-2 rounded-lg text-sm font-medium text-white inline-block" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-900">
              {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
          </label>
        </div>
      </Section>

      <Section title="Identidad pública">
        <div className="space-y-4">
          <Field label="Username">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
              <Input value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="tu-usuario" className="pl-7 text-white border-zinc-700" style={{ background: '#1a1a2e' }} />
            </div>
          </Field>
          <Field label={<>Bio <span className="text-zinc-600 font-normal text-xs">{form.bio?.length || 0}/300</span></>}>
            <Textarea value={form.bio} onChange={e => set('bio', e.target.value.slice(0, 300))}
              rows={3} className="text-white border-zinc-700 resize-none" style={{ background: '#1a1a2e' }} />
          </Field>
          <Field label="Web"><Input value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://tuweb.com" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
        </div>
      </Section>

      <Section title="Redes sociales">
        <div className="space-y-2.5">
          {[
            { key: 'instagram', label: 'Instagram', prefix: '@', color: '#f472b6' },
            { key: 'spotify',   label: 'Spotify',   prefix: '',  color: '#34d399' },
            { key: 'soundcloud',label: 'SoundCloud',prefix: '',  color: '#fb923c' },
            { key: 'youtube',   label: 'YouTube',   prefix: '@', color: '#ef4444' },
            { key: 'linkedin',  label: 'LinkedIn',  prefix: '',  color: '#60a5fa' },
          ].map(({ key, label, prefix, color }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-16 text-xs font-medium flex-shrink-0" style={{ color }}>{label}</div>
              <div className="flex-1 relative">
                {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">{prefix}</span>}
                <Input value={form.social_links[key] || ''} onChange={e => setSocial(key, e.target.value)}
                  placeholder={label} className={`text-white border-zinc-700 text-sm ${prefix ? 'pl-6' : ''}`} style={{ background: '#1a1a2e' }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Contacto y ubicación">
        <div className="space-y-3">
          <Field label="Teléfono"><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+34 600 000 000" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
          <Field label="País">
            <Select value={form.country} onValueChange={v => set('country', v)}>
              <SelectTrigger className="text-white border-zinc-700" style={{ background: '#1a1a2e' }}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)', maxHeight: 240 }}>
                {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad"><Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Barcelona" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
            <Field label="Provincia"><Input value={form.state_province} onChange={e => set('state_province', e.target.value)} placeholder="Cataluña" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
          </div>
          <Field label="Dirección"><Input value={form.address_line_1} onChange={e => set('address_line_1', e.target.value)} placeholder="Calle, número" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Piso / Puerta"><Input value={form.address_line_2} onChange={e => set('address_line_2', e.target.value)} placeholder="Opcional" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
            <Field label="CP"><Input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} placeholder="08001" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
          </div>
          <Field label="Zona horaria">
            <Select value={form.timezone} onValueChange={v => set('timezone', v)}>
              <SelectTrigger className="text-white border-zinc-700" style={{ background: '#1a1a2e' }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)', maxHeight: 220 }}>
                {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Perfil profesional">
        <div className="space-y-3">
          <Field label="Portfolio / Enlace profesional"><Input value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} placeholder="https://..." className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
          <Field label="Agencia / Empresa"><Input value={form.agency_or_company_name} onChange={e => set('agency_or_company_name', e.target.value)} placeholder="Nombre de la agencia o empresa" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
          <Field label="Etiquetas profesionales">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Añadir etiqueta..." className="text-white border-zinc-700 text-sm" style={{ background: '#1a1a2e' }} />
                <Button type="button" onClick={addTag} size="sm" className="text-white" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-900">+</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.professional_tags.map((tag, i) => (
                  <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs cursor-pointer"
                    style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
                    onClick={() => set('professional_tags', form.professional_tags.filter((_, idx) => idx !== i))}>
                    {tag} ×
                  </span>
                ))}
              </div>
            </div>
          </Field>
        </div>
      </Section>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="font-semibold text-white" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-900">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saved ? <CheckCircle className="w-4 h-4 mr-2 text-green-400" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.07)' }}>
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-zinc-400 text-xs mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}