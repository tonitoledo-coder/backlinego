import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useTranslation } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, MapPin, Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { createPageUrl } from '@/utils';

const CATEGORY_LABELS = {
  cuerdas: 'Cuerdas',
  teclados: 'Teclados',
  percusion: 'Percusión',
  dj_gear: 'DJ Gear',
  sonido_pa: 'Sonido PA',
  estudio_podcast: 'Estudio/Podcast',
};

function SosRequestCard({ request, myEquipment, onAccept }) {
  const [accepting, setAccepting] = useState(false);
  const [selectedEquipId, setSelectedEquipId] = useState('');
  const [showEquipPicker, setShowEquipPicker] = useState(false);

  const isExpired = request.expires_at ? isPast(parseISO(request.expires_at)) : false;
  const isAccepted = request.status === 'accepted';
  const matchingEquipment = myEquipment.filter(
    eq => eq.category === request.category && eq.sos_available && eq.status === 'available'
  );

  const handleAccept = async () => {
    if (!selectedEquipId) { setShowEquipPicker(true); return; }
    setAccepting(true);
    try {
      await db.entities.SosRequest.update(request.id, {
        status: 'accepted',
        accepted_by: (await db.auth.me()).email,
        accepted_equipment_id: selectedEquipId,
      });
      // Notify requester
      await db.integrations.Core.SendEmail({
        to: request.requester_email,
        subject: '✅ Tu solicitud SOS ha sido aceptada',
        body: `¡Buenas noticias! Un propietario ha respondido a tu solicitud de ${CATEGORY_LABELS[request.category] || request.category} en ${request.city}.\n\nContacta con el propietario en BacklineGo para coordinar la entrega.`,
      }).catch(() => {});
      onAccept?.(request.id);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        background: isExpired || isAccepted ? 'rgba(39,39,42,0.4)' : 'rgba(29,223,122,0.04)',
        borderColor: isExpired || isAccepted ? 'rgba(63,63,70,0.5)' : 'rgba(29,223,122,0.2)',
        opacity: isExpired || isAccepted ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CategoryIcon category={request.category} className="w-5 h-5 text-green-400" />
          <span className="font-semibold text-white text-sm">{CATEGORY_LABELS[request.category] || request.category}</span>
        </div>
        <Badge
          className={
            isAccepted ? 'bg-blue-500/20 text-blue-400 border-0' :
            isExpired  ? 'bg-zinc-700/50 text-zinc-500 border-0' :
                         'bg-green-500/20 text-green-400 border-0'
          }
        >
          {isAccepted ? 'Aceptada' : isExpired ? 'Expirada' : 'Activa'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />{request.city}
        </span>
        {request.pickup_time && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />Recogida: {request.pickup_time}
          </span>
        )}
        {request.duration_hours && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />{request.duration_hours}h
          </span>
        )}
        {request.expires_at && !isExpired && !isAccepted && (
          <span className="text-amber-400">
            Expira en {formatDistanceToNow(parseISO(request.expires_at), { locale: es })}
          </span>
        )}
      </div>

      {request.description && (
        <p className="text-sm text-zinc-300 line-clamp-2">{request.description}</p>
      )}

      {/* Action */}
      {!isExpired && !isAccepted && matchingEquipment.length > 0 && (
        <div className="space-y-2">
          {showEquipPicker && (
            <div className="space-y-1">
              <p className="text-xs text-zinc-400">Selecciona el equipo que ofrecerás:</p>
              {matchingEquipment.map(eq => (
                <label key={eq.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`equip-${request.id}`}
                    value={eq.id}
                    checked={selectedEquipId === eq.id}
                    onChange={() => setSelectedEquipId(eq.id)}
                    className="accent-green-500"
                  />
                  <span className="text-sm text-zinc-300">{eq.title}</span>
                  {eq.sos_price_multiplier > 1 && (
                    <span className="text-xs text-amber-400">×{eq.sos_price_multiplier} precio SOS</span>
                  )}
                </label>
              ))}
            </div>
          )}
          <Button
            size="sm"
            className="w-full font-semibold"
            style={{ background: '#1DDF7A', color: '#060E18' }}
            disabled={accepting || (showEquipPicker && !selectedEquipId)}
            onClick={handleAccept}
          >
            {accepting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><CheckCircle className="w-4 h-4 mr-1.5" />Tengo disponible — Contactar</>
            }
          </Button>
        </div>
      )}

      {!isExpired && !isAccepted && matchingEquipment.length === 0 && (
        <p className="text-xs text-zinc-500">No tienes equipo SOS disponible en esta categoría.</p>
      )}
    </div>
  );
}

export default function SosDashboard({ userEmail, myEquipment = [] }) {
  const { t } = useTranslation();
  const [sosRequests, setSosRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const myCity = myEquipment?.[0]?.location?.city || '';
  const myCategories = [...new Set(myEquipment.filter(e => e.sos_available).map(e => e.category))];

  useEffect(() => {
    if (!userEmail) return;
    db.entities.SosRequest.filter({ status: 'active' }, '-created_at', 50)
      .then(requests => {
        // Show requests matching owner's city + categories
        const relevant = requests.filter(r => {
          const cityMatch = !myCity || r.city?.toLowerCase().includes(myCity.toLowerCase()) || myCity.toLowerCase().includes(r.city?.toLowerCase());
          const catMatch = myCategories.length === 0 || myCategories.includes(r.category);
          return cityMatch && catMatch;
        });
        setSosRequests(relevant);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userEmail]);

  const handleAccept = (id) => {
    setSosRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'accepted' } : r));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  const active = sosRequests.filter(r => r.status === 'active');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-xl border"
        style={{ background: 'rgba(29,223,122,0.06)', borderColor: 'rgba(29,223,122,0.2)' }}>
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <p className="text-white font-semibold">Solicitudes SOS activas</p>
          <p className="text-zinc-400 text-xs">
            {active.length > 0
              ? `${active.length} solicitud${active.length !== 1 ? 'es' : ''} urgente${active.length !== 1 ? 's' : ''} cerca de ti`
              : 'No hay solicitudes activas en tu zona ahora mismo'}
          </p>
        </div>
        {active.length > 0 && (
          <div className="ml-auto w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-black text-sm font-bold flex-shrink-0">
            {active.length}
          </div>
        )}
      </div>

      {myCategories.length === 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-medium">Activa el modo SOS en tu equipo</p>
            <p className="text-zinc-400 text-xs mt-1">Para recibir solicitudes urgentes, activa el toggle SOS en tus listings.</p>
          </div>
        </div>
      )}

      {active.length === 0 && myCategories.length > 0 ? (
        <div className="text-center py-10 text-zinc-500 text-sm">
          <Zap className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
          Sin solicitudes activas en tu zona
        </div>
      ) : (
        <div className="space-y-3">
          {sosRequests.map(req => (
            <SosRequestCard
              key={req.id}
              request={req}
              myEquipment={myEquipment}
              onAccept={handleAccept}
            />
          ))}
        </div>
      )}
    </div>
  );
}