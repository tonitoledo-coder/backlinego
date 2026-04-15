import React, { useEffect, useState } from 'react';
import { Star, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function OwnerRatingBadge({ ownerEmail, identityStatus, size = 'sm' }) {
  const [rating, setRating] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ownerEmail) return;
    base44.entities.Review.filter({ reviewed_email: ownerEmail, is_public: true }, '-created_at', 100)
      .then(reviews => {
        if (reviews?.length) {
          const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
          setRating(avg);
          setCount(reviews.length);
        }
      })
      .catch(() => {});
  }, [ownerEmail]);

  const isVerified = identityStatus === 'verified';

  if (!rating && !isVerified) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {rating !== null && (
        <span className="flex items-center gap-1 text-sm">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-white">{rating.toFixed(1)}</span>
          <span className="text-zinc-500">· {count}</span>
        </span>
      )}
      {isVerified && (
        <span
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: 'rgba(29,223,122,0.12)', color: '#1DDF7A', border: '1px solid rgba(29,223,122,0.25)' }}
        >
          <ShieldCheck className="w-3 h-3" />
          Propietario verificado
        </span>
      )}
    </div>
  );
}