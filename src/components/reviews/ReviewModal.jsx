import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { db } from '@/lib/db';

const RENTER_QUICK_TAGS = [
  { key: 'good_condition', label: '✅ Equipo en buen estado' },
  { key: 'on_time_delivery', label: '⏱ Entrega puntual' },
  { key: 'recommended', label: '👍 Lo recomendaría' },
];

const OWNER_QUICK_TAGS = [
  { key: 'returned_well', label: '✅ Devolvió en buen estado' },
  { key: 'punctual', label: '⏱ Fue puntual' },
  { key: 'recommended', label: '👍 Lo recomendaría' },
];

export default function ReviewModal({ open, onClose, booking, reviewerRole, reviewerId, reviewedId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const tags = reviewerRole === 'renter' ? RENTER_QUICK_TAGS : OWNER_QUICK_TAGS;

  const toggleTag = (key) => {
    setSelectedTags(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await db.entities.Review.create({
        booking_id: booking.id,
        reviewer_id: reviewerId,
        reviewed_id: reviewedId,
        reviewer_role: reviewerRole,
        rating,
        comment: comment.slice(0, 500),
        quick_tags: selectedTags,
        is_public: true,
      });
      onSubmitted?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Valora tu experiencia</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className="w-9 h-9"
                  fill={(hovered || rating) >= n ? '#f59e0b' : 'none'}
                  stroke={(hovered || rating) >= n ? '#f59e0b' : '#52525b'}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-zinc-400">
              {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][rating]}
            </p>
          )}

          {/* Quick tags */}
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2">Preguntas rápidas</p>
            <div className="flex flex-col gap-2">
              {tags.map(tag => (
                <label key={tag.key} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0"
                    style={{
                      borderColor: selectedTags.includes(tag.key) ? '#1DDF7A' : '#52525b',
                      background: selectedTags.includes(tag.key) ? '#1DDF7A' : 'transparent',
                    }}
                    onClick={() => toggleTag(tag.key)}
                  >
                    {selectedTags.includes(tag.key) && (
                      <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors" onClick={() => toggleTag(tag.key)}>
                    {tag.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2">
              Comentario <span className="text-zinc-500 font-normal">(opcional, recomendado)</span>
            </p>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 500))}
              placeholder="Comparte tu experiencia con la comunidad..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500 resize-none h-24"
            />
            <p className="text-xs text-zinc-600 text-right mt-1">{comment.length}/500</p>
          </div>

          <Button
            className="w-full font-semibold h-11"
            style={{ background: '#1DDF7A', color: '#060E18' }}
            disabled={rating === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar valoración'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}