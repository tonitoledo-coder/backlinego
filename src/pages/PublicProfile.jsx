import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Music, Palette, Megaphone, Briefcase, Building2, Star,
  MapPin, Globe, Instagram, Youtube, Linkedin, Lock, Shield,
  ExternalLink, User, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const USER_TYPE_CONFIG = {
  musico:        { icon: Music,      color: '#a78bfa', label: 'Músico' },
  artista:       { icon: Palette,    color: '#f472b6', label: 'Artista' },
  promotor:      { icon: Megaphone,  color: '#34d399', label: 'Promotor' },
  manager:       { icon: Briefcase,  color: '#fbbf24', label: 'Manager' },
  empresa:       { icon: Building2,  color: '#60a5fa', label: 'Empresa' },
  coleccionista: { icon: Star,       color: '#fb923c', label: 'Coleccionista' },
};

// Simple SoundCloud icon (lucide doesn't have it)
const SoundCloudIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M1.175 12.225c-.015.052-.023.107-.023.164v3.232c0 .232.189.421.421.421s.421-.189.421-.421v-3.232c0-.057-.008-.112-.023-.164-.045-.163-.196-.28-.398-.28-.202 0-.353.117-.398.28zM3.232 10.5c-.015.052-.023.107-.023.164v5.457c0 .232.189.421.421.421s.421-.189.421-.421V10.664c0-.057-.008-.112-.023-.164C3.983 10.337 3.832 10.22 3.63 10.22c-.202 0-.353.117-.398.28zm2.058-1.47c-.015.052-.023.107-.023.164v6.927c0 .232.189.421.421.421s.421-.189.421-.421V9.194c0-.057-.008-.112-.023-.164C6.041 8.867 5.89 8.75 5.688 8.75c-.202 0-.353.117-.398.28zm2.057.938c-.015.052-.023.107-.023.164v5.989c0 .232.189.421.421.421s.421-.189.421-.421v-5.989c0-.057-.008-.112-.023-.164-.045-.163-.196-.28-.398-.28-.202 0-.353.117-.398.28zM21.5 10.22c-.13 0-.257.01-.381.03-.275-2.545-2.43-4.52-5.044-4.52-1.01 0-1.948.298-2.733.807-.286.198-.362.444-.362.684v9.9c0 .246.2.446.446.446H21.5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5z"/>
  </svg>
);

const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.371-.721.49-1.101.24-3.021-1.858-6.832-2.278-11.322-1.237-.418.098-.84-.16-.939-.58-.1-.418.16-.84.58-.939 4.91-1.121 9.12-.64 12.51 1.43.37.24.49.721.25 1.101zm1.47-3.27c-.299.46-.901.6-1.36.3-3.461-2.12-8.731-2.74-12.812-1.5-.491.14-1.011-.139-1.151-.63-.14-.491.139-1.011.63-1.151 4.671-1.41 10.471-.72 14.442 1.71.46.3.6.901.25 1.271zm.13-3.41c-4.15-2.461-11.002-2.689-14.962-1.489-.6.18-1.232-.16-1.41-.76-.18-.6.16-1.23.76-1.41 4.551-1.38 12.12-1.11 16.891 1.72.54.319.721 1.02.4 1.56-.321.54-1.022.721-1.561.4z"/>
  </svg>
);

export default function PublicProfile() {
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      // Get username from URL
      const path = window.location.pathname;
      const username = path.split('/').filter(Boolean).pop();

      try {
        const [allUsers, authStatus] = await Promise.all([
          base44.entities.User.filter({ username }),
          base44.auth.isAuthenticated(),
        ]);

        if (authStatus) {
          const me = await base44.auth.me();
          setCurrentUser(me);
        }

        if (!allUsers || allUsers.length === 0) {
          setNotFound(true);
        } else {
          setProfileUser(allUsers[0]);
        }
      } catch (e) {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d1a' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#a78bfa', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: '#0d0d1a' }}>
        <User className="w-16 h-16 text-zinc-600" />
        <h1 className="text-2xl font-bold text-white">Perfil no encontrado</h1>
        <p className="text-zinc-400">Este usuario no existe o ha eliminado su perfil.</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="border-zinc-700 text-zinc-300">
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
      </div>
    );
  }

  const isOwner = currentUser?.email === profileUser?.email;
  const visibility = profileUser?.profile_visibility || 'public';
  const canView = visibility === 'public' || isOwner || currentUser?.role === 'admin';

  if (!canView) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: '#0d0d1a' }}>
        <Lock className="w-16 h-16" style={{ color: '#a78bfa' }} />
        <h1 className="text-2xl font-bold text-white">Perfil restringido</h1>
        <p className="text-zinc-400 text-center">
          {visibility === 'contacts_only'
            ? 'Este perfil solo es visible para contactos del usuario.'
            : 'Este perfil es privado.'}
        </p>
        <Button onClick={() => navigate(-1)} variant="outline" className="border-zinc-700 text-zinc-300">
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
      </div>
    );
  }

  const typeConfig = USER_TYPE_CONFIG[profileUser?.user_type];
  const TypeIcon = typeConfig?.icon || User;
  const social = profileUser?.social_links || {};

  return (
    <div className="min-h-screen pb-16" style={{ background: '#0d0d1a' }}>
      {/* Hero */}
      <div className="relative" style={{ background: 'linear-gradient(180deg, #1a0a2e 0%, #0d0d1a 100%)' }}>
        <div className="max-w-3xl mx-auto px-4 pt-10 pb-8">
          {/* Back */}
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-zinc-500 hover:text-white mb-6 text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden flex-shrink-0 border-2"
              style={{ borderColor: typeConfig?.color || '#a78bfa', background: '#161625' }}>
              {profileUser?.avatar_url ? (
                <img src={profileUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-12 h-12 text-zinc-600" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{profileUser?.full_name || profileUser?.username || 'Usuario'}</h1>
                {profileUser?.verified && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                    <Shield className="w-3 h-3" /> Verificado
                  </div>
                )}
              </div>

              {profileUser?.username && (
                <p className="text-zinc-500 text-sm mb-2">@{profileUser.username}</p>
              )}

              {typeConfig && (
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${typeConfig.color}20` }}>
                    <TypeIcon className="w-3.5 h-3.5" style={{ color: typeConfig.color }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: typeConfig.color }}>{typeConfig.label}</span>
                </div>
              )}

              {(profileUser?.city || profileUser?.country) && (
                <div className="flex items-center gap-1 text-zinc-500 text-sm mb-3">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{[profileUser.city, profileUser.country].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {profileUser?.bio && (
                <p className="text-zinc-300 text-sm leading-relaxed max-w-lg">{profileUser.bio}</p>
              )}
            </div>
          </div>

          {/* Social links + website */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            {profileUser?.website_url && (
              <a href={profileUser.website_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-500">
                <Globe className="w-4 h-4" /> Web
              </a>
            )}
            {social.instagram && (
              <a href={`https://instagram.com/${social.instagram}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(244,114,182,0.1)', color: '#f472b6' }}>
                <Instagram className="w-4 h-4" /> Instagram
              </a>
            )}
            {social.spotify && (
              <a href={`https://open.spotify.com/artist/${social.spotify}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                <SpotifyIcon /> Spotify
              </a>
            )}
            {social.soundcloud && (
              <a href={`https://soundcloud.com/${social.soundcloud}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c' }}>
                <SoundCloudIcon /> SoundCloud
              </a>
            )}
            {social.youtube && (
              <a href={`https://youtube.com/@${social.youtube}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <Youtube className="w-4 h-4" /> YouTube
              </a>
            )}
            {social.linkedin && (
              <a href={`https://linkedin.com/in/${social.linkedin}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Tags */}
        {profileUser?.professional_tags?.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Especialidades</h2>
            <div className="flex flex-wrap gap-2">
              {profileUser.professional_tags.map((tag, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ background: `${typeConfig?.color || '#a78bfa'}18`, color: typeConfig?.color || '#a78bfa', border: `1px solid ${typeConfig?.color || '#a78bfa'}30` }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {profileUser?.portfolio_url && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Portfolio</h2>
            <a href={profileUser.portfolio_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:border-violet-500/50"
              style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.15)' }}>
                <ExternalLink className="w-5 h-5" style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Ver portfolio</p>
                <p className="text-zinc-500 text-xs truncate max-w-xs">{profileUser.portfolio_url}</p>
              </div>
            </a>
          </div>
        )}

        {/* Agency/Company */}
        {profileUser?.agency_or_company_name && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              {profileUser.user_type === 'manager' ? 'Agencia' : 'Empresa'}
            </h2>
            <p className="text-white font-medium">{profileUser.agency_or_company_name}</p>
          </div>
        )}

        {/* Commission open badge */}
        {profileUser?.commission_open && (
          <div className="flex items-center gap-3 p-4 rounded-xl border"
            style={{ background: 'rgba(52,211,153,0.07)', borderColor: 'rgba(52,211,153,0.25)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#34d399' }} />
            <p className="text-sm font-medium" style={{ color: '#34d399' }}>Acepta encargos ahora mismo</p>
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="pt-4 border-t border-zinc-800">
            <button
              onClick={() => navigate(createPageUrl('CompleteProfile'))}
              className="text-sm transition-colors hover:text-white"
              style={{ color: '#a78bfa' }}
            >
              ✏️ Editar perfil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}