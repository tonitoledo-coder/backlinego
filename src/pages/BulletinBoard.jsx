import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, MapPin, MessageSquare, Plus, X, Music, Youtube, Link2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PullToRefresh from '@/components/mobile/PullToRefresh';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'all',             label: 'Todos' },
  { value: 'busco_banda',     label: 'Busco banda' },
  { value: 'busco_musico',    label: 'Busco músico' },
  { value: 'alquila_local',   label: 'Local de ensayo' },
  { value: 'colaboracion',    label: 'Colaboración' },
  { value: 'vendo_material',  label: 'Vendo material' },
  { value: 'oferta_empleo',   label: 'Oferta empleo' },
  { value: 'busco_empleo',    label: 'Busco empleo' },
];

const CAT_STYLES = {
  busco_banda:    { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  busco_musico:   { bg: 'bg-rose-500/15',   text: 'text-rose-300',   border: 'border-rose-500/30' },
  alquila_local:  { bg: 'bg-blue-500/15',   text: 'text-blue-300',   border: 'border-blue-500/30' },
  colaboracion:   { bg: 'bg-green-500/15',  text: 'text-green-300',  border: 'border-green-500/30' },
  vendo_material: { bg: 'bg-amber-500/15',  text: 'text-amber-300',  border: 'border-amber-500/30' },
  oferta_empleo:  { bg: 'bg-emerald-500/15',text: 'text-emerald-300',border: 'border-emerald-500/30' },
  busco_empleo:   { bg: 'bg-cyan-500/15',   text: 'text-cyan-300',   border: 'border-cyan-500/30' },
};

const CAT_LABELS = {
  busco_banda:    'Busco banda',
  busco_musico:   'Busco músico',
  alquila_local:  'Local de ensayo',
  colaboracion:   'Colaboración',
  vendo_material: 'Vendo material',
  oferta_empleo:  'Oferta empleo',
  busco_empleo:   'Busco empleo',
};

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Más reciente' },
  { value: 'replies',  label: 'Más comentado' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es }); }
  catch { return ''; }
}

// ── Link icon helpers ─────────────────────────────────────────────────────────
function linkProvider(url) {
  if (!url) return 'link';
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('spotify.com') || u.includes('open.spotify')) return 'spotify';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  return 'link';
}

function LinkIcon({ provider, className }) {
  if (provider === 'youtube') return <Youtube className={className} />;
  // shadcn lucide doesn't ship Spotify/SoundCloud — use Music icon as a generic audio fallback.
  if (provider === 'spotify' || provider === 'soundcloud') return <Music className={className} />;
  return <Link2 className={className} />;
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onClick }) {
  const cat = CAT_STYLES[post.category] || {};
  const catLabel = CAT_LABELS[post.category] || post.category;
  const firstImage = post.images?.[0];

  const stopAndOpen = (e, url) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={() => onClick(post)}
      className="flex gap-4 p-4 rounded-xl border transition-all cursor-pointer"
      style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.07)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      <div className="flex-1 min-w-0">
        {/* Category + pinned + closed */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full border', cat.bg, cat.text, cat.border)}>
            {catLabel}
          </span>
          {post.is_pinned && <span className="text-xs text-amber-400 font-medium">📌 Fijado</span>}
          {post.status === 'closed' && (
            <span className="text-xs text-zinc-500 italic">Cerrado</span>
          )}
        </div>

        <h3 className="font-semibold text-white text-sm leading-snug mb-1.5 line-clamp-2">
          {post.title}
        </h3>

        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2 mb-3">
          {post.body}
        </p>

        {/* Tags + genres + instrument */}
        {(post.instrument || post.tags?.length > 0 || post.genres?.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {post.instrument && (
              <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25">
                {post.instrument}
              </span>
            )}
            {post.genres?.slice(0, 3).map(g => (
              <span key={g} className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                {g}
              </span>
            ))}
            {post.tags?.slice(0, 3).map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded text-zinc-500">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Links as icons */}
        {post.links?.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            {post.links.slice(0, 4).map((url, i) => (
              <button
                key={i}
                onClick={e => stopAndOpen(e, url)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                title={url}
              >
                <LinkIcon provider={linkProvider(url)} className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {post.city && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="w-3 h-3" />{post.city}
            </span>
          )}
          {post.availability && (
            <span className="text-xs text-zinc-500">{post.availability}</span>
          )}
          <span className="text-xs text-zinc-600">{timeAgo(post.created_at)}</span>
          <span className="flex items-center gap-1 text-xs text-zinc-500 ml-auto">
            <MessageSquare className="w-3 h-3" />
            {post.reply_count ?? 0}
          </span>
        </div>
      </div>

      {firstImage && (
        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-zinc-800 self-center">
          <img src={firstImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="flex gap-4 p-4 rounded-xl border animate-pulse"
      style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 rounded-full bg-zinc-800" />
        <div className="h-4 w-3/4 rounded bg-zinc-800" />
        <div className="h-3 w-full rounded bg-zinc-800" />
        <div className="h-3 w-5/6 rounded bg-zinc-800" />
        <div className="flex gap-3 mt-2">
          <div className="h-3 w-16 rounded bg-zinc-800" />
          <div className="h-3 w-12 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="w-16 h-16 rounded-lg bg-zinc-800 shrink-0 self-center" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BulletinBoard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState('all');
  const [city, setCity] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('newest');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['bulletin', 'posts'],
    queryFn: () => db.entities.BulletinPost.filter({ status: 'active' }, '-created_at', 200),
    staleTime: 30_000,
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['bulletin', 'posts'] });
  }, [queryClient]);

  const handleNewPost = async () => {
    const isAuth = await db.auth.isAuthenticated();
    if (!isAuth) {
      db.auth.redirectToLogin(window.location.href);
      return;
    }
    navigate(createPageUrl('BulletinNewPost'));
  };

  const handleCardClick = (post) => {
    navigate(createPageUrl('BulletinPost') + '?id=' + post.id);
  };

  // Build list of unique genres seen in posts (for filter dropdown)
  const allGenres = useMemo(() => {
    const set = new Set();
    posts.forEach(p => (p.genres || []).forEach(g => g && set.add(g)));
    return Array.from(set).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    let list = posts.filter(p => !p.is_banned);

    if (category !== 'all') list = list.filter(p => p.category === category);

    if (city.trim()) {
      const c = city.trim().toLowerCase();
      list = list.filter(p => p.city?.toLowerCase().includes(c));
    }

    if (genre.trim()) {
      const g = genre.trim().toLowerCase();
      list = list.filter(p => p.genres?.some(pg => pg.toLowerCase() === g));
    }

    // Pinned always first; then by chosen sort
    list = [...list].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      if (sort === 'replies') return (b.reply_count ?? 0) - (a.reply_count ?? 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return list;
  }, [posts, category, city, genre, sort]);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tablón</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Anuncios de la comunidad</p>
        </div>
        <Button
          onClick={handleNewPost}
          className="shrink-0 font-semibold bg-emerald-500 hover:bg-emerald-600 text-black"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo anuncio
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="space-y-3 mb-6">
        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                category === cat.value
                  ? 'border-white/30 bg-white/10 text-white'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* City + genre + sort */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <Input
              placeholder="Ciudad..."
              value={city}
              onChange={e => setCity(e.target.value)}
              className="pl-9 bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 h-10 rounded-xl"
            />
            {city && (
              <button onClick={() => setCity('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative flex-1 min-w-[160px]">
            <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            {allGenres.length > 0 ? (
              <select
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className="w-full pl-9 pr-8 h-10 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white text-sm appearance-none focus:outline-none focus:border-zinc-700"
              >
                <option value="">Todos los géneros</option>
                {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            ) : (
              <Input
                placeholder="Género..."
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className="pl-9 bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 h-10 rounded-xl"
              />
            )}
            {genre && (
              <button onClick={() => setGenre('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex border border-zinc-800 rounded-xl overflow-hidden shrink-0">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSort(opt.value)}
                className={cn(
                  'px-3 h-10 text-xs font-medium transition-colors whitespace-nowrap',
                  sort === opt.value ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!isLoading && (
        <p className="text-zinc-500 text-xs mb-4">
          <span className="text-white font-semibold">{filtered.length}</span> {filtered.length === 1 ? 'anuncio' : 'anuncios'}
        </p>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(post => (
              <PostCard key={post.id} post={post} onClick={handleCardClick} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Sin anuncios</h3>
            <p className="text-zinc-500 mb-6">
              {category !== 'all' || city || genre ? 'Prueba a cambiar los filtros' : 'Sé el primero en publicar un anuncio'}
            </p>
            <Button onClick={handleNewPost} className="font-semibold bg-emerald-500 hover:bg-emerald-600 text-black">
              <Plus className="w-4 h-4 mr-1.5" />
              Crear anuncio
            </Button>
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}
