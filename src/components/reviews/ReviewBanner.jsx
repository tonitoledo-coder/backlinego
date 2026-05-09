import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { db } from '@/lib/db';
import { differenceInDays, differenceInHours, parseISO } from 'date-fns';
import ReviewModal from './ReviewModal';

export default function ReviewBanner({ booking, currentUserId }) {
  const [existingReview, setExistingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const reviewerRole = currentUserId === booking.owner_id ? 'owner' : 'renter';
  const reviewedId = reviewerRole === 'renter' ? booking.owner_id : booking.renter_id;

  // Window: completed and within 14 days, past 48h dispute window
  const completedAt = booking.updated_at ? parseISO(booking.updated_at) : null;
  const hoursSinceCompletion = completedAt ? differenceInHours(new Date(), completedAt) : 0;
  const daysSinceCompletion = completedAt ? differenceInDays(new Date(), completedAt) : 0;
  const inWindow = hoursSinceCompletion >= 48 && daysSinceCompletion <= 14;

  useEffect(() => {
    if (!inWindow) { setLoading(false); return; }
    db.entities.Review.filter({
      booking_id: booking.id,
      reviewer_id: currentUserId,
    }).then(reviews => {
      setExistingReview(reviews?.[0] || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [booking.id, currentUserId, inWindow]);

  if (booking.status !== 'completed' || !inWindow || loading) return null;
  if (existingReview) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 flex items-center gap-3">
        <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
        <p className="text-sm text-zinc-300">Ya has valorado este alquiler. ¡Gracias!</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border px-4 py-4 flex items-center justify-between gap-3"
        style={{ background: 'rgba(29,223,122,0.06)', borderColor: 'rgba(29,223,122,0.25)' }}>
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">¡Alquiler completado!</p>
            <p className="text-xs text-zinc-400">Valora tu experiencia · {14 - daysSinceCompletion} días restantes</p>
          </div>
        </div>
        <Button
          size="sm"
          className="font-semibold flex-shrink-0"
          style={{ background: '#1DDF7A', color: '#060E18' }}
          onClick={() => setShowModal(true)}
        >
          Valorar
        </Button>
      </div>

      <ReviewModal
        open={showModal}
        onClose={() => setShowModal(false)}
        booking={booking}
        reviewerRole={reviewerRole}
        reviewerId={currentUserId}
        reviewedId={reviewedId}
        onSubmitted={() => setExistingReview({ id: 'done' })}
      />
    </>
  );
}