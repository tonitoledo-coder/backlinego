import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, MapPin, MessageSquare, Plus, X, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PullToRefresh from '@/components/mobile/PullToRefresh';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'all',             label: 'Todos' },
  { value: 'busco_banda',     label: 'Busco banda' },
  { value: 'alquila_local',   label: 'Local de ensayo' },
  { value: 'colaboracion',    label: 'Colaboración' },
  { value: 'vendo_material',  label: 'Vendo material' },
];

const CAT_STYLES = {
  busco_banda:    { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  alquila_local:  { bg: 'bg-blue-500/15',   text: 'text-blue-300',   border: 'border-blue-500/30' },
  colaboracion:   { bg: 'bg-green-500/15',  text: 'text-green-300',  border: 'border-green-500/30' },
  vendo_material: { bg: 'bg-amber-500/15',  text: 'text-amber-300',  border: 'border-amber-500/30' },
};

const CAT_LABELS = {
  busco_banda:    'Busco banda',
  alquila_local:  'Local de ensayo',
  colaboracion:   'Colaboración',
  vendo_material: 'Vendo material',
};

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Más reciente' },
  { value: 'replies',  label: 'Más comentado' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onClick }) {
  const cat = CAT_STYLES[post.category] || {};
  const catLabel = CAT_LABELS[post.category] || post.category;
  const firstImage = post.images?.[0];
  const authorName = post.display_name || post.created_by || 'Anónimo';
  const initials = authorName.slice(0, 2).toUpperCase();

  return (
    <div
      onClick={() => onClick(post)}
      className="flex gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 hover:bg-zinc-900/90 transition-all cursor-pointer"
    >
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Category badge + pinned */}
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full border', cat.bg, cat.text, cat.border)}>
            {catLabel}
          </span>
          {post.is_pinned && (
            <span className="text-xs text-amber-400 font-medium">📌 Fijado</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-white text-sm leading-snug mb-1.5 line-clamp-2">
          {post.title}
        </h3>

        {/* Body preview */}
        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2 mb-3">
          {post.body}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Avatar + author */}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300 shrink-0">
              {initials}
            </div>
            <span className="text-xs text-zinc-500 truncate max-w-[120px]">{authorName}</span>
          </div>

          {post.city && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="w-3 h-3" />{post.city}
            </span>
          )}

          <span className="text-xs text-zinc-600">{timeAgo(post.created_date)}</span>

          <span className="flex items-center gap-1 text-xs text-zinc-500 ml-auto">
            <MessageSquare className="w-3 h-3" />
            {post.reply_count ?? 0}
          </span>
        </div>
      </div>

      {/* Thumbnail */}
      {firstImage && (
        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-zinc-800 self-center">
          <img src={firstImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="flex gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse">
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
  const [sort, setSort] = useState('newest');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['bulletin', 'posts'],
    queryFn: () => base44.entities.BulletinPost.filter({ status: 'active' }, '-created_date', 50),
    staleTime: 30_000,
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['bulletin', 'posts'] });
  }, [queryClient]);

  const handleNewPost = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    navigate(createPageUrl('BulletinNewPost'));
  };

  const handleCardClick = (post) => {
    navigate(createPageUrl('BulletinPost') + '?id=' + post.id);
  };

  const filtered = useMemo(() => {
    let list = posts.filter(p => !p.is_banned);

    if (category !== 'all') {
      list = list.filter(p => p.category === category);
    }

    if (city.trim()) {
      const c = city.trim().toLowerCase();
      list = list.filter(p => p.city?.toLowerCase().includes(c));
    }

    if (sort === 'replies') {
      list = [...list].sort((a, b) => (b.reply_count ?? 0) - (a.reply_count ?? 0));
    } else {
      // newest: pinned first, then by created_date (already sorted from API)
      list = [...list].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0;
      });
    }

    return list;
  }, [posts, category, city, sort]);

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
          className="shrink-0 font-semibold"
          style={{ background: '#1DDF7A', color: '#060E18' }}
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

        {/* City + sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <Input
              placeholder="Filtrar por ciudad..."
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

          {/* Sort toggle */}
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

      {/* ── Results count ────────────────────────────────────────────────── */}
      {!isLoading && (
        <p className="text-zinc-500 text-xs mb-4">
          <span className="text-white font-semibold">{filtered.length}</span> {filtered.length === 1 ? 'anuncio' : 'anuncios'}
        </p>
      )}

      {/* ── Post list ────────────────────────────────────────────────────── */}
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
              {category !== 'all' || city ? 'Prueba a cambiar los filtros' : 'Sé el primero en publicar un anuncio'}
            </p>
            <Button
              onClick={handleNewPost}
              className="font-semibold"
              style={{ background: '#1DDF7A', color: '#060E18' }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Crear anuncio
            </Button>
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}