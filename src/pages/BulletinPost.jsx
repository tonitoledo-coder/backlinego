import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ArrowLeft, MapPin, ExternalLink, MoreHorizontal, MessageSquare } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Constants ──────────────────────────────────────────────────────────────────
const CAT_STYLES = {
  busco_banda:    { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  busco_musico:   { bg: 'bg-rose-500/15',   text: 'text-rose-300',   border: 'border-rose-500/30' },
  alquila_local:  { bg: 'bg-blue-500/15',   text: 'text-blue-300',   border: 'border-blue-500/30' },
  colaboracion:   { bg: 'bg-green-500/15',  text: 'text-green-300',  border: 'border-green-500/30' },
  vendo_material: { bg: 'bg-amber-500/15',  text: 'text-amber-300',  border: 'border-amber-500/30' },
};

const CAT_LABELS = {
  busco_banda:    'Busco banda',
  busco_musico:   'Busco músico',
  alquila_local:  'Local de ensayo',
  colaboracion:   'Colaboración',
  vendo_material: 'Vendo material',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es }); }
  catch { return ''; }
}

function obfuscateEmail(email) {
  if (!email) return 'Usuario';
  const [user] = email.split('@');
  return `${user}@***`;
}

function initials(email) {
  if (!email) return '?';
  return email.slice(0, 2).toUpperCase();
}

// ── Reply form (inline & footer) ──────────────────────────────────────────────
function ReplyForm({ onSubmit, onCancel, placeholder = 'Escribe una respuesta...', buttonText = 'Publicar respuesta', buttonClass = 'bg-blue-600 hover:bg-blue-700 text-white' }) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    await onSubmit(body.trim());
    setBody('');
    setSubmitting(false);
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={placeholder}
        className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 min-h-[80px]"
      />
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting || !body.trim()}
          size="sm"
          className={cn('font-semibold', buttonClass)}
        >
          {submitting ? 'Publicando...' : buttonText}
        </Button>
        {onCancel && (
          <Button onClick={onCancel} size="sm" variant="ghost" className="text-zinc-400">
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Reply item ────────────────────────────────────────────────────────────────
function ReplyItem({ reply, children, isPostAuthor, onDelete, onReply, canReply }) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  if (reply.is_deleted) {
    return (
      <div className="py-2">
        <p className="text-zinc-600 italic text-sm">[Respuesta eliminada por el autor]</p>
        {children}
      </div>
    );
  }

  return (
    <div className="py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
            {initials(reply.author_id)}
          </div>
          <span className="text-xs text-zinc-400 font-medium">{obfuscateEmail(reply.author_id)}</span>
          <span className="text-xs text-zinc-600">{timeAgo(reply.created_at)}</span>
        </div>
        {isPostAuthor && (
          <button
            onClick={() => onDelete(reply.id)}
            className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>

      {/* Body */}
      <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed mb-2 ml-8">
        {reply.body}
      </p>

      {/* Reply button (only depth 0) */}
      {canReply && reply.depth === 0 && (
        <div className="ml-8">
          {showReplyForm ? (
            <ReplyForm
              onSubmit={async (body) => { await onReply(body, reply); setShowReplyForm(false); }}
              onCancel={() => setShowReplyForm(false)}
              placeholder="Responde a este comentario..."
              buttonText="Publicar"
              buttonClass="bg-blue-600 hover:bg-blue-700 text-white"
            />
          ) : (
            <button
              onClick={() => setShowReplyForm(true)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Responder
            </button>
          )}
        </div>
      )}

      {/* Nested replies */}
      {children && (
        <div className="ml-8 border-l-2 border-zinc-800 pl-4 mt-3 space-y-0">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-4 animate-pulse">
      <div className="h-4 w-32 rounded bg-zinc-800" />
      <div className="h-6 w-24 rounded-full bg-zinc-800" />
      <div className="h-8 w-3/4 rounded bg-zinc-800" />
      <div className="h-4 w-48 rounded bg-zinc-800" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-zinc-800" />
        <div className="h-4 w-5/6 rounded bg-zinc-800" />
        <div className="h-4 w-4/5 rounded bg-zinc-800" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BulletinPost() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef(null);

  const loadData = async () => {
    const auth = await db.auth.isAuthenticated();
    setIsAuth(auth);
    let user = null;
    if (auth) {
      user = await db.auth.me();
      setCurrentUser(user);
    }

    const [posts, allReplies] = await Promise.all([
      db.entities.BulletinPost.filter({ id }),
      db.entities.BulletinReply.filter({ post_id: id }),
    ]);

    if (!posts.length) { setNotFound(true); setLoading(false); return; }
    const p = posts[0];
    setPost(p);
    const isAuthorNow = user?.id === p.author_id;
    setReplies(allReplies.filter(r => !r.is_deleted || isAuthorNow));
    setLoading(false);
  };

  useEffect(() => {
    if (id) loadData();
    else { setNotFound(true); setLoading(false); }
  }, [id]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAuthor = currentUser?.id === post?.author_id;

  const reloadReplies = async () => {
    const allReplies = await db.entities.BulletinReply.filter({ post_id: id });
    setReplies(allReplies.filter(r => !r.is_deleted || isAuthor));
  };

  const handleToggleStatus = async () => {
    const newStatus = post.status === 'active' ? 'closed' : 'active';
    const updated = await db.entities.BulletinPost.update(post.id, { status: newStatus });
    setPost(prev => ({ ...prev, status: newStatus }));
    setShowMenu(false);
  };

  const handleDeletePost = async () => {
    await db.entities.BulletinPost.update(post.id, { status: 'deleted' });
    navigate(createPageUrl('BulletinBoard'));
  };

  const handleDeleteReply = async (replyId) => {
    await db.entities.BulletinReply.update(replyId, { is_deleted: true });
    setReplies(prev => prev.map(r => r.id === replyId ? { ...r, is_deleted: true } : r));
  };

  const handleTopReply = async (body) => {
    await db.entities.BulletinReply.create({
      post_id: post.id,
      parent_reply_id: null,
      body,
      depth: 0,
      is_deleted: false,
      report_count: 0,
    });
    await db.entities.BulletinPost.update(post.id, { reply_count: (post.reply_count || 0) + 1 });
    setPost(prev => ({ ...prev, reply_count: (prev.reply_count || 0) + 1 }));
    await reloadReplies();
  };

  const handleNestedReply = async (body, parentReply) => {
    await db.entities.BulletinReply.create({
      post_id: post.id,
      parent_reply_id: parentReply.id,
      body,
      depth: 1,
      is_deleted: false,
      report_count: 0,
    });
    await db.entities.BulletinPost.update(post.id, { reply_count: (post.reply_count || 0) + 1 });
    setPost(prev => ({ ...prev, reply_count: (prev.reply_count || 0) + 1 }));
    await reloadReplies();
  };

  // ── Render states ────────────────────────────────────────────────────────────
  if (loading) return <Skeleton />;

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Anuncio no encontrado</h2>
        <p className="text-zinc-500 mb-6">Es posible que haya sido eliminado.</p>
        <Button onClick={() => navigate(createPageUrl('BulletinBoard'))} variant="outline" className="border-zinc-700 text-zinc-300">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver al Tablón
        </Button>
      </div>
    );
  }

  if (post.status === 'deleted') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Este anuncio ha sido eliminado</h2>
        <Button onClick={() => navigate(createPageUrl('BulletinBoard'))} variant="outline" className="border-zinc-700 text-zinc-300 mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver al Tablón
        </Button>
      </div>
    );
  }

  const cat = CAT_STYLES[post.category] || {};
  const catLabel = CAT_LABELS[post.category] || post.category;
  const topReplies = replies.filter(r => !r.parent_reply_id);
  const childReplies = (parentId) => replies.filter(r => r.parent_reply_id === parentId);

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 pb-32">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(createPageUrl('BulletinBoard'))}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Volver al Tablón</span>
        </button>

        {isAuthor && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl py-1 w-48">
                <button
                  onClick={handleToggleStatus}
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  {post.status === 'active' ? 'Cerrar anuncio' : 'Reabrir anuncio'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                >
                  Eliminar anuncio
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Delete confirm ────────────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold text-lg mb-2">¿Eliminar anuncio?</h3>
            <p className="text-zinc-400 text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" className="flex-1 border-zinc-700 text-zinc-300">Cancelar</Button>
              <Button onClick={handleDeletePost} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Eliminar</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Post body ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        {/* Category + closed banner */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full border', cat.bg, cat.text, cat.border)}>
            {catLabel}
          </span>
          {post.is_pinned && <span className="text-xs text-amber-400 font-medium">📌 Fijado</span>}
        </div>

        {post.status === 'closed' && (
          <div className="mb-4 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm font-medium">
            Este anuncio está cerrado
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3 leading-tight">{post.title}</h1>

        {/* Metadata */}
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-[11px] font-bold text-zinc-300 shrink-0">
              {initials(post.author_id)}
            </div>
            <span className="text-sm text-zinc-400">{obfuscateEmail(post.author_id)}</span>
          </div>
          {post.city && (
            <span className="flex items-center gap-1 text-sm text-zinc-500">
              <MapPin className="w-3.5 h-3.5" />{post.city}
            </span>
          )}
          <span className="text-sm text-zinc-600">{timeAgo(post.created_at)}</span>
        </div>

        {/* Body */}
        <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed mb-6">{post.body}</p>

        {/* Images */}
        {post.images?.length > 0 && (
          <div className={cn('grid gap-2 mb-6', post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {post.images.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors">
                <img src={url} alt="" className="w-full object-cover max-h-72" />
              </a>
            ))}
          </div>
        )}

        {/* Links */}
        {post.links?.length > 0 && (
          <div className="space-y-2">
            {post.links.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{link.length > 40 ? link.slice(0, 40) + '…' : link}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Replies ───────────────────────────────────────────────────────────── */}
      <div className="border-t border-zinc-800 pt-6">
        <h2 className="text-sm font-semibold text-zinc-400 mb-4">
          {replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'}
        </h2>

        {topReplies.length > 0 && (
          <div className="space-y-0 divide-y divide-zinc-800/60 mb-6">
            {topReplies.map(reply => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                isPostAuthor={isAuthor}
                onDelete={handleDeleteReply}
                onReply={handleNestedReply}
                canReply={isAuth && post.status === 'active'}
              >
                {childReplies(reply.id).map(child => (
                  <ReplyItem
                    key={child.id}
                    reply={child}
                    isPostAuthor={isAuthor}
                    onDelete={handleDeleteReply}
                    onReply={null}
                    canReply={false}
                  />
                ))}
              </ReplyItem>
            ))}
          </div>
        )}

        {/* Footer reply form */}
        {isAuth && post.status === 'active' ? (
          <div className="border-t border-zinc-800 pt-5">
            <p className="text-sm font-semibold text-zinc-400 mb-3">Añadir respuesta</p>
            <ReplyForm
              onSubmit={handleTopReply}
              placeholder="Escribe una respuesta..."
              buttonText="Publicar respuesta"
              buttonClass="bg-blue-600 hover:bg-blue-700 text-white"
            />
          </div>
        ) : !isAuth && post.status === 'active' ? (
          <div className="border-t border-zinc-800 pt-5 text-center py-8">
            <p className="text-zinc-500 mb-4">Inicia sesión para responder</p>
            <Button
              onClick={() => db.auth.redirectToLogin(window.location.href)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Iniciar sesión
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}