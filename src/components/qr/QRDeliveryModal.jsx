import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  QrCode, CheckCircle, Shield, Smartphone, PackageCheck,
  Camera, X, ImageIcon, AlertTriangle, Loader2
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { sendBookingEmail } from '@/utils/sendBookingEmail';

// ── QRDisplay ─────────────────────────────────────────────────────────────────

function QRDisplay({ value }) {
  const hash = value.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const size = 10;
  const cells = Array.from({ length: size * size }, (_, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    if (x === 0 || x === size - 1 || y === 0 || y === size - 1) return true;
    if ((x < 3 && y < 3) || (x > size - 4 && y < 3) || (x < 3 && y > size - 4)) return true;
    return ((hash ^ (i * 2654435761)) & 1) === 1;
  });

  return (
    <div className="inline-block p-4 bg-white rounded-2xl shadow-xl">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 200, height: 200 }}>
        {cells.map((on, i) => (
          <div key={i} className="rounded-sm" style={{ background: on ? '#0a0a0f' : '#ffffff' }} />
        ))}
      </div>
    </div>
  );
}

// ── PhotoCapture ──────────────────────────────────────────────────────────────

function PhotoCapture({ label, hint, photos, onPhotosChange, uploading, onUpload }) {
  const inputRef = useRef(null);

  return (
    <div className="bg-zinc-800/50 rounded-xl p-4 text-left space-y-3">
      <div>
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-400" />
          {label}
          <span className="text-xs font-normal text-zinc-500 ml-1">opcional</span>
        </p>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onPhotosChange(photos.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-600/80 transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length < 3 && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={onUpload}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-zinc-600 text-zinc-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-colors text-sm disabled:opacity-50"
          >
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
              : <><Camera className="w-4 h-4" /> {photos.length === 0 ? 'Abrir cámara' : 'Añadir otra foto'}</>
            }
          </button>
        </>
      )}
    </div>
  );
}

// ── PhotoGallery ──────────────────────────────────────────────────────────────

function PhotoGallery({ title, photos, emptyText }) {
  if (!photos || photos.length === 0) {
    return (
      <div className="bg-zinc-800/30 rounded-xl p-3 text-left">
        <p className="text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" /> {title}
        </p>
        <p className="text-xs text-zinc-600 italic">{emptyText || 'Sin fotos'}</p>
      </div>
    );
  }
  return (
    <div className="bg-zinc-800/30 rounded-xl p-3 text-left">
      <p className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5" /> {title}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((url, i) => (
          <div key={i} className="aspect-square rounded-md overflow-hidden border border-zinc-700">
            <img src={url} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── QRDeliveryModal ───────────────────────────────────────────────────────────

export default function QRDeliveryModal({ booking, open, onClose, currentUserId }) {
  const queryClient = useQueryClient();
  const [done, setDone]               = useState(false);
  const [deliveryPhotos, setDelivery] = useState([]);
  const [returnPhotos,   setReturn]   = useState([]);
  const [uploading,      setUploading]= useState(false);
  const [disputeNote,    setDispute]  = useState('');
  const [showDispute,    setShowDisp] = useState(false);

  const isRenter = booking?.renter_id === currentUserId;
  const isOwner  = booking?.owner_id  === currentUserId;
  const qrValue  = `BACKLINE-${booking?.id?.slice(-12)}`;

  const updateMutation = useMutation({
    mutationFn: (data) => ({ data, result: db.entities.Booking.update(booking.id, data) }),
    onSuccess: ({ data: mutData }) => {
      queryClient.invalidateQueries(['bookings']);
      const emailExtra = {
        equipmentTitle: booking.equipment_title || `Reserva #${booking.id?.slice(-8)}`,
        renterId:       booking.renter_id,
        ownerId:        booking.owner_id,
      };
      if (mutData.status === 'active') {
        sendBookingEmail('delivery_confirmed', booking, emailExtra);
      } else if (mutData.status === 'completed') {
        sendBookingEmail('return_confirmed', booking, emailExtra);
      }
      setDone(true);
    }
  });

  const handleUpload = (setter) => async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        files.slice(0, 3).map(async (file) => {
          const res = await db.integrations.Core.UploadFile({ file, context: 'handover' });
          return res.file_url;
        })
      );
      setter(prev => [...prev, ...urls].slice(0, 3));
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRenterConfirmDelivery = () => {
    updateMutation.mutate({
      status: 'active',
      pickup_confirmed_at: new Date().toISOString(),
      deposit_status: 'held',
      ...(deliveryPhotos.length > 0 && { pickup_photos: deliveryPhotos }),
    });
  };

  const handleRenterConfirmReturn = () => {
    updateMutation.mutate({
      status: 'completed',
      return_confirmed_at: new Date().toISOString(),
      ...(returnPhotos.length > 0 && { return_photos: returnPhotos }),
    });
  };

  const handleOwnerReleaseEscrow = () => {
    updateMutation.mutate({ status: 'completed', deposit_status: 'released' });
  };

  const handleOwnerDispute = () => {
    updateMutation.mutate({
      status: 'disputed',
      deposit_status: 'held',
      notes: disputeNote,
    });
  };

  if (done) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm text-center">
          <div className="py-8">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Actualizado!</h3>
            <p className="text-zinc-400 text-sm mb-6">
              El estado de la reserva ha sido registrado correctamente.
            </p>
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 w-full">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-blue-400" />
            {booking?.status === 'active' || booking?.status === 'returning'
              ? 'Devolución del equipo'
              : 'Entrega del equipo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Badges */}
          <div className="flex justify-center gap-3">
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Shield className="w-3 h-3 mr-1" /> Escrow activo
            </Badge>
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Seguro incluido
            </Badge>
          </div>

          {/* Resumen fechas */}
          {booking && (
            <div className="bg-zinc-800/60 rounded-xl px-4 py-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-xs uppercase tracking-wider">Entrega</span>
                <span className="text-white font-medium">{booking.start_date}</span>
              </div>
              <div className="h-px bg-zinc-700" />
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-xs uppercase tracking-wider">Devolución</span>
                <span className="text-white font-medium">{booking.end_date}</span>
              </div>
            </div>
          )}

          {/* ══ VISTA RENTER ══════════════════════════════════════════════════ */}
          {isRenter && (
            <>
              {booking?.status === 'confirmed' && (
                <>
                  <div className="flex justify-center">
                    <QRDisplay value={qrValue} />
                  </div>
                  <p className="text-xs text-zinc-500 font-mono bg-zinc-800/50 rounded-lg px-3 py-2 text-center break-all">
                    {qrValue}
                  </p>

                  <PhotoCapture
                    label="Documenta el estado al recoger"
                    hint="Fotografía el equipo antes de aceptarlo. Quedará registrado para ambas partes."
                    photos={deliveryPhotos}
                    onPhotosChange={setDelivery}
                    uploading={uploading}
                    onUpload={handleUpload(setDelivery)}
                  />

                  <div className="bg-zinc-800/50 rounded-xl p-4 text-left space-y-2">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      Pasos
                    </p>
                    <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                      <li>Inspecciona el equipo con el arrendador presente</li>
                      <li>Toma fotos opcionales del estado actual</li>
                      <li>Muestra el QR al arrendador para que lo verifique</li>
                      <li>Pulsa "Confirmar recepción" una vez acordado</li>
                    </ol>
                  </div>

                  <Button
                    onClick={handleRenterConfirmDelivery}
                    disabled={updateMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                  >
                    {updateMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <CheckCircle className="w-4 h-4 mr-2" />
                    }
                    Confirmar recepción del equipo
                  </Button>
                </>
              )}

              {booking?.status === 'active' && (
                <>
                  <PhotoCapture
                    label="Documenta el estado al devolver"
                    hint="Fotografía el equipo antes de entregárselo al arrendador. Te protege ante reclamaciones."
                    photos={returnPhotos}
                    onPhotosChange={setReturn}
                    uploading={uploading}
                    onUpload={handleUpload(setReturn)}
                  />

                  <PhotoGallery
                    title="Estado al recoger (referencia)"
                    photos={booking?.pickup_photos}
                    emptyText="No se tomaron fotos en la entrega"
                  />

                  <Button
                    onClick={handleRenterConfirmReturn}
                    disabled={updateMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
                  >
                    {updateMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <PackageCheck className="w-4 h-4 mr-2" />
                    }
                    Confirmar devolución del equipo
                  </Button>
                </>
              )}
            </>
          )}

          {/* ══ VISTA OWNER ═══════════════════════════════════════════════════ */}
          {isOwner && (
            <>
              {booking?.status === 'confirmed' && (
                <>
                  <div className="bg-zinc-800/50 rounded-xl p-4 text-left">
                    <p className="text-xs text-zinc-400 mb-1">Código del arrendatario:</p>
                    <p className="text-base font-mono text-white font-bold tracking-wider break-all">
                      {qrValue}
                    </p>
                  </div>

                  <PhotoGallery
                    title="Fotos del estado — tomadas por el arrendatario"
                    photos={booking?.pickup_photos}
                    emptyText="El arrendatario aún no ha tomado fotos"
                  />

                  <Button
                    onClick={() => updateMutation.mutate({ status: 'active', deposit_status: 'held', pickup_confirmed_at: new Date().toISOString() })}
                    disabled={updateMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                  >
                    {updateMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <PackageCheck className="w-4 h-4 mr-2" />
                    }
                    Confirmar entrega al arrendatario
                  </Button>
                </>
              )}

              {booking?.status === 'active' && (
                <>
                  <div className="space-y-2">
                    <PhotoGallery
                      title="Estado al entregar"
                      photos={booking?.pickup_photos}
                      emptyText="Sin fotos de entrega"
                    />
                    <PhotoGallery
                      title="Estado al devolver"
                      photos={booking?.return_photos}
                      emptyText="El arrendatario aún no ha confirmado la devolución"
                    />
                  </div>

                  {!showDispute ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handleOwnerReleaseEscrow}
                        disabled={updateMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 h-11 text-sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Todo correcto
                      </Button>
                      <Button
                        onClick={() => setShowDisp(true)}
                        variant="outline"
                        className="border-red-700 text-red-400 hover:bg-red-900/20 h-11 text-sm"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1.5" />
                        Reportar daños
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-white font-medium">Describe los daños observados:</p>
                      <Textarea
                        value={disputeNote}
                        onChange={e => setDispute(e.target.value)}
                        placeholder="Ej: Arañazo en la tapa del amplificador, falta una perilla..."
                        className="bg-zinc-800 border-zinc-700 text-white text-sm min-h-[80px]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowDisp(false)}
                          className="border-zinc-700 text-zinc-400"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleOwnerDispute}
                          disabled={updateMutation.isPending || !disputeNote.trim()}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {updateMutation.isPending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : 'Enviar disputa'
                          }
                        </Button>
                      </div>
                      <p className="text-xs text-zinc-500 text-center">
                        El equipo de Backline Go revisará las fotos y resolverá la disputa en 48h.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Fallback */}
          {!isRenter && !isOwner && (
            <div className="flex justify-center">
              <QRDisplay value={qrValue} />
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}