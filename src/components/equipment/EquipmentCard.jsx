import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Zap, ShieldCheck, Pencil, Trash2, Star } from 'lucide-react';
import { useTranslation } from '../i18n/translations';
import CategoryIcon from '../ui/CategoryIcon';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { calcBookingPrice } from '@/components/booking/calcBookingPrice';

export default function EquipmentCard({ equipment, currentUserEmail, onDeleted, searchStart, searchEnd }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [availability, setAvailability] = useState(null); // null | 'available' | 'occupied'
  const cardRef = useRef(null);
  const fetchedRef = useRef(false);

  const isOwner = currentUserEmail && equipment?.created_by === currentUserEmail;

  const handleEdit = (e) => {
    e.preventDefault();
    navigate(createPageUrl('AddEquipment') + '?edit=' + equipment.id);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!window.confirm('¿Eliminar este equipo?')) return;
    await base44.entities.Equipment.delete(equipment.id);
    onDeleted?.();
  };

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !fetchedRef.current) {
        fetchedRef.current = true;
        const today = format(new Date(), 'yyyy-MM-dd');
        base44.entities.Booking.filter({ equipment_id: equipment.id }, '-created_date', 20)
          .then(bookings => {
            const occupied = bookings.some(b =>
              ['confirmed', 'active'].includes(b.status) &&
              b.start_date <= today && b.end_date >= today
            );
            setAvailability(occupied ? 'occupied' : 'available');
          })
          .catch(() => {});
      }
    }, { threshold: 0.1 });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [equipment?.id]);

  if (!equipment) return null;

  const conditionColor = equipment.condition >= 8 ? 'text-green-400' : 
                         equipment.condition >= 5 ? 'text-yellow-400' : 'text-red-400';
  const conditionStyle = { color: '#a78bfa' };

  const priceResult =
    searchStart && searchEnd
      ? calcBookingPrice(equipment, searchStart, searchEnd)
      : null;

  return (
    <div ref={cardRef}>
    <Link to={(() => {
      const p = new URLSearchParams({ id: equipment.id });
      if (searchStart) p.set('from', format(searchStart, 'yyyy-MM-dd'));
      if (searchEnd)   p.set('to',   format(searchEnd,   'yyyy-MM-dd'));
      return createPageUrl('EquipmentDetail') + '?' + p.toString();
    })()}>
      <Card className="border transition-all duration-300 overflow-hidden group" style={{background:'#161625', borderColor:'rgba(255,255,255,0.08)'}} onMouseEnter={e=>e.currentTarget.style.borderColor='#7c3aed'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}>
        <div className="relative aspect-[4/3] overflow-hidden">
          {equipment.images?.[0] ? (
            <img 
              src={equipment.images[0]} 
              alt={equipment.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <CategoryIcon category={equipment.category} className="w-12 h-12 text-zinc-600" />
            </div>
          )}
          
          {/* Owner action buttons */}
          {isOwner && (
            <div className="absolute top-3 right-3 flex gap-1.5 z-10">
              <button
                onClick={handleEdit}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity"
                style={{ background: 'rgba(0,0,0,0.7)' }}
              >
                <Pencil className="w-3.5 h-3.5 text-zinc-300" />
              </button>
              <button
                onClick={handleDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity"
                style={{ background: 'rgba(0,0,0,0.7)' }}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          )}

          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {equipment.sos_available && (
              <Badge className="text-black font-semibold" style={{background:'#22c55e'}}>
                <Zap className="w-3 h-3 mr-1" />
                SOS 24h
              </Badge>
            )}
            {equipment.owner_type === 'professional' && (
              <Badge className="text-black font-semibold" style={{background:'#eab308'}}>
                PRO
              </Badge>
            )}
          </div>
          
          {/* Price tag */}
          <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg" style={{background:'rgba(0,0,0,0.8)'}}>
            {priceResult ? (
              <div className="text-right">
                {priceResult.hasModifiers && (
                  <div className="text-zinc-400 text-xs line-through leading-none mb-0.5">
                    €{priceResult.basePrice.toFixed(0)}
                  </div>
                )}
                <div>
                  <span className="text-lg font-bold text-white">€{priceResult.totalPrice.toFixed(0)}</span>
                  <span className="text-zinc-400 text-xs ml-1">total</span>
                </div>
                <div className="text-zinc-500 text-xs mt-0.5 leading-none">
                  {priceResult.days} día{priceResult.days !== 1 ? 's' : ''}
                  {priceResult.weekendMultiplier > 1 && ' · fin de semana'}
                  {priceResult.summerMultiplier > 1  && ' · temp. alta'}
                  {priceResult.discountPct > 0       && ` · −${priceResult.discountPct}%`}
                </div>
              </div>
            ) : (
              <>
                <span className="text-zinc-400 text-xs">desde </span>
                <span className="text-lg font-bold text-white">€{equipment.price_per_day}</span>
                <span className="text-zinc-400 text-sm">/día</span>
              </>
            )}
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-white truncate flex-1 transition-colors group-hover:text-violet-400">
              {equipment.title}
            </h3>
            <div className="flex items-center gap-1 text-sm">
              <span style={{color:'#a78bfa'}}>{equipment.condition}/10</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm mb-3" style={{color:'#94a3b8'}}>
            <CategoryIcon category={equipment.category} className="w-4 h-4" style={{color:'#a78bfa', width:16, height:16}} />
            <span>{t(equipment.category)}</span>
            {equipment.brand && (
              <>
                <span>•</span>
                <span>{equipment.brand}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-zinc-500">
              <MapPin className="w-3.5 h-3.5" />
              <span>{equipment.location?.city || 'Location'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {availability === 'available' && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Disponible
                </span>
              )}
              {availability === 'occupied' && (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                  Ocupado
                </span>
              )}
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
          </div>

          {/* Owner rating inline */}
          {equipment._ownerRating && (
            <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-amber-400 font-medium">{equipment._ownerRating.toFixed(1)}</span>
              <span>· {equipment._ownerRatingCount} reseña{equipment._ownerRatingCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
    </div>
  );
}