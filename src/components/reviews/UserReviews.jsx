import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';

function StarRating({ rating, size = 'sm' }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'}
          fill={rating >= n ? '#f59e0b' : 'none'}
          stroke={rating >= n ? '#f59e0b' : '#52525b'}
        />
      ))}
    </div>
  );
}

const TAG_LABELS = {
  good_condition: '✅ Buen estado',
  on_time_delivery: '⏱ Entrega puntual',
  recommended: '👍 Recomendado',
  returned_well: '✅ Devolvió bien',
  punctual: '⏱ Puntual',
};

function ReviewCard({ review, isOwner, onResponseSaved }) {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveResponse = async () => {
    if (!responseText.trim()) return;
    setSaving(true);
    await base44.entities.Review.update(review.id, { response: responseText.trim().slice(0, 300) });
    onResponseSaved?.({ ...review, response: responseText.trim() });
    setShowResponseForm(false);
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-zinc-800 p-4 space-y-3" style={{ background: '#161625' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
            {review.reviewer_email?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{review.reviewer_email?.split('@')[0]}</p>
            <p className="text-xs text-zinc-500">
              {review.reviewer_role === 'renter' ? 'Inquilino' : 'Propietario'}
              {review.created_at && ` · ${format(parseISO(review.created_at), 'MMM yyyy')}`}
            </p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>

      {review.quick_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.quick_tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
              {TAG_LABELS[tag] || tag}
            </span>
          ))}
        </div>
      )}

      {review.comment && (
        <p className="text-sm text-zinc-300 leading-relaxed">{review.comment}</p>
      )}

      {/* Response */}
      {review.response && (
        <div className="rounded-lg bg-zinc-800/60 border border-zinc-700 px-3 py-2.5">
          <p className="text-xs text-zinc-500 mb-1">Respuesta del propietario:</p>
          <p className="text-sm text-zinc-300">{review.response}</p>
        </div>
      )}

      {isOwner && !review.response && (
        <div>
          {!showResponseForm ? (
            <button
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              onClick={() => setShowResponseForm(true)}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Responder
            </button>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={responseText}
                onChange={e => setResponseText(e.target.value.slice(0, 300))}
                placeholder="Tu respuesta (máx. 300 caracteres)..."
                className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500 resize-none h-20 text-sm"
              />
              <div className="flex items-center gap-2 justify-end">
                <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 text-zinc-400" onClick={() => setShowResponseForm(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  style={{ background: '#1DDF7A', color: '#060E18' }}
                  disabled={!responseText.trim() || saving}
                  onClick={handleSaveResponse}
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar respuesta'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UserReviews({ userEmail, isOwner = false }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.Review.filter({ reviewed_email: userEmail, is_public: true }, '-created_at', 20)
      .then(data => setReviews(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userEmail]);

  const handleResponseSaved = (updatedReview) => {
    setReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        <Star className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
        Sin valoraciones aún
      </div>
    );
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-1.5">
          <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          <span className="text-xl font-bold text-white">{avg.toFixed(1)}</span>
        </div>
        <span className="text-zinc-500 text-sm">· {reviews.length} valoración{reviews.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Last 5 */}
      {reviews.slice(0, 5).map(review => (
        <ReviewCard
          key={review.id}
          review={review}
          isOwner={isOwner}
          onResponseSaved={handleResponseSaved}
        />
      ))}
    </div>
  );
}