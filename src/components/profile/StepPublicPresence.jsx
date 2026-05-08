import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, Instagram, Youtube, Linkedin, Globe } from 'lucide-react';

const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.371-.721.49-1.101.24-3.021-1.858-6.832-2.278-11.322-1.237-.418.098-.84-.16-.939-.58-.1-.418.16-.84.58-.939 4.91-1.121 9.12-.64 12.51 1.43.37.24.49.721.25 1.101zm1.47-3.27c-.299.46-.901.6-1.36.3-3.461-2.12-8.731-2.74-12.812-1.5-.491.14-1.011-.139-1.151-.63-.14-.491.139-1.011.63-1.151 4.671-1.41 10.471-.72 14.442 1.71.46.3.6.901.25 1.271zm.13-3.41c-4.15-2.461-11.002-2.689-14.962-1.489-.6.18-1.232-.16-1.41-.76-.18-.6.16-1.23.76-1.41 4.551-1.38 12.12-1.11 16.891 1.72.54.319.721 1.02.4 1.56-.321.54-1.022.721-1.561.4z"/>
  </svg>
);

const SoundCloudIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M1.175 12.225c-.015.052-.023.107-.023.164v3.232c0 .232.189.421.421.421s.421-.189.421-.421v-3.232c0-.057-.008-.112-.023-.164-.045-.163-.196-.28-.398-.28-.202 0-.353.117-.398.28zM21.5 10.22c-.13 0-.257.01-.381.03-.275-2.545-2.43-4.52-5.044-4.52-1.01 0-1.948.298-2.733.807-.286.198-.362.444-.362.684v9.9c0 .246.2.446.446.446H21.5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5z"/>
  </svg>
);

export default function StepPublicPresence({ formData, updateField }) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'ok' | 'taken'

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const res = await base44.integrations.Core.UploadFile({ file, context: 'avatar' });
    updateField('avatar_url', res.file_url);
    setUploadingAvatar(false);
  };

  const checkUsername = async (value) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    updateField('username', clean);
    if (!clean || clean.length < 3) { setUsernameStatus(null); return; }
    setUsernameStatus('checking');
    const existing = await base44.entities.User.filter({ username: clean });
    setUsernameStatus(existing.length === 0 ? 'ok' : 'taken');
  };

  const social = formData.social_links || {};
  const updateSocial = (key, val) => updateField('social_links', { ...social, [key]: val });

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Foto y presencia pública</h2>
        <p className="text-zinc-400 text-sm">Así te verán otros usuarios en BacklineGo.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border"
          style={{ background: '#161625', borderColor: 'rgba(167,139,250,0.3)' }}>
          {formData.avatar_url ? (
            <img src={formData.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600">
              <Camera className="w-7 h-7" />
            </div>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div>
          <label className="cursor-pointer">
            <span className="px-4 py-2 rounded-lg text-sm font-medium text-white inline-block transition-colors"
              style={{ background: '#7c3aed' }}
              onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
              onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}>
              {uploadingAvatar ? 'Subiendo...' : 'Subir foto'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
          </label>
          <p className="text-xs text-zinc-500 mt-1">JPG, PNG o GIF. Máx. 5 MB.</p>
        </div>
      </div>

      {/* Username */}
      <div>
        <Label className="text-zinc-300 text-sm">Username *</Label>
        <div className="relative mt-1.5">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
          <Input
            value={formData.username}
            onChange={e => checkUsername(e.target.value)}
            placeholder="tu-nombre-de-usuario"
            className="pl-7 text-white border-zinc-700"
            style={{ background: '#161625' }}
          />
          {usernameStatus && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
              style={{ color: usernameStatus === 'ok' ? '#34d399' : usernameStatus === 'taken' ? '#ef4444' : '#a78bfa' }}>
              {usernameStatus === 'checking' ? '...' : usernameStatus === 'ok' ? '✓ Disponible' : '✗ En uso'}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-600 mt-1">Solo minúsculas, números y guiones.</p>
      </div>

      {/* Bio */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <Label className="text-zinc-300 text-sm">Bio</Label>
          <span className="text-xs" style={{ color: (formData.bio?.length || 0) > 280 ? '#ef4444' : '#71717a' }}>
            {formData.bio?.length || 0}/300
          </span>
        </div>
        <Textarea
          value={formData.bio}
          onChange={e => updateField('bio', e.target.value.slice(0, 300))}
          placeholder="Cuéntanos quién eres..."
          rows={3}
          className="text-white border-zinc-700 resize-none"
          style={{ background: '#161625' }}
        />
      </div>

      {/* Website */}
      <div>
        <Label className="text-zinc-300 text-sm flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Web</Label>
        <Input value={formData.website_url} onChange={e => updateField('website_url', e.target.value)}
          placeholder="https://tuweb.com" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
      </div>

      {/* Social Links */}
      <div>
        <Label className="text-zinc-300 text-sm mb-3 block">Redes sociales <span className="text-zinc-600 font-normal">(opcionales)</span></Label>
        <div className="space-y-2.5">
          {[
            { key: 'instagram', icon: <Instagram className="w-4 h-4" />, placeholder: 'tu_usuario', prefix: '@', color: '#f472b6' },
            { key: 'spotify',   icon: <SpotifyIcon />,                    placeholder: 'ID de artista', prefix: '', color: '#34d399' },
            { key: 'soundcloud',icon: <SoundCloudIcon />,                 placeholder: 'tu_usuario', prefix: '', color: '#fb923c' },
            { key: 'youtube',   icon: <Youtube className="w-4 h-4" />,   placeholder: '@canal', prefix: '@', color: '#ef4444' },
            { key: 'linkedin',  icon: <Linkedin className="w-4 h-4" />,  placeholder: 'tu_perfil', prefix: '', color: '#60a5fa' },
          ].map(({ key, icon, placeholder, prefix, color }) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18`, color }}>
                {icon}
              </div>
              <div className="flex-1 relative">
                {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">{prefix}</span>}
                <Input
                  value={social[key] || ''}
                  onChange={e => updateSocial(key, e.target.value)}
                  placeholder={placeholder}
                  className={`text-white border-zinc-700 text-sm ${prefix ? 'pl-6' : ''}`}
                  style={{ background: '#161625' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}