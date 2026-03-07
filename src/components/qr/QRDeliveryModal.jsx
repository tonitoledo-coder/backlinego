import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, CheckCircle, Shield, Smartphone, PackageCheck } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

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

export default function QRDeliveryModal({ booking, open, onClose, currentUserId }) {
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);

  const fmtSlot = (h) =>
    h != null ? String(h).padStart(2, '0') + ':00h' : null;

  const isRenter = booking?.renter_id === currentUserId;
  const isOwner = booking?.owner_id === currentUserId;
  const qrValue = booking?.delivery_qr || `BACKLINE-${booking?.id?.slice(-12)}`;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Booking.update(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      setDone(true);
    }
  });

  const handleRenterConfirm = () => {
    updateMutation.mutate({ status: 'active' });
  };

  const handleOwnerReceive = () => {
    updateMutation.mutate({ status: 'active', escrow_status: 'held' });
  };

  const handleOwnerReturn = () => {
    updateMutation.mutate({ status: 'completed', escrow_status: 'released' });
  };

  if (done) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm text-center">
          <div className="py-8">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Actualizado correctamente!</h3>
            <p className="text-zinc-400 text-sm mb-6">El estado de la reserva ha sido actualizado.</p>
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 w-full">Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-blue-400" />
            QR de Entrega Segura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex justify-center gap-3">
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Shield className="w-3 h-3 mr-1" /> Pago Escrow
            </Badge>
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Seguro incluido
            </Badge>
          </div>

          {/* Resumen de fechas y slots */}
          {booking && (
            <div className="bg-zinc-800/60 rounded-xl px-4 py-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-xs uppercase tracking-wider">Entrega</span>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-white font-medium">{booking.start_date}</span>
                  {fmtSlot(booking.delivery_slot) && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/25">
                      {fmtSlot(booking.delivery_slot)}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-px bg-zinc-700" />
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-xs uppercase tracking-wider">Devolución</span>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-white font-medium">{booking.end_date}</span>
                  {fmtSlot(booking.return_slot) && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/25">
                      {fmtSlot(booking.return_slot)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Renter view: show QR */}
          {isRenter && (
            <>
              <div className="flex justify-center">
                <QRDisplay value={qrValue} />
              </div>
              <p className="text-xs text-zinc-500 font-mono bg-zinc-800/50 rounded-lg px-3 py-2">{qrValue}</p>
              <div className="bg-zinc-800/50 rounded-xl p-4 text-left space-y-2">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  Instrucciones
                </p>
                <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                  <li>Muestra este QR al arrendador al recoger el equipo</li>
                  <li>El arrendador lo verifica para confirmar entrega</li>
                  <li>El escrow queda activado y el seguro cubre el alquiler</li>
                </ol>
              </div>
              {booking?.status === 'confirmed' && (
                <Button
                  onClick={handleRenterConfirm}
                  disabled={updateMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  He entregado el equipo al propietario
                </Button>
              )}
            </>
          )}

          {/* Owner view: show code + action buttons */}
          {isOwner && (
            <>
              <div className="bg-zinc-800/50 rounded-xl p-4 text-left">
                <p className="text-xs text-zinc-400 mb-1">Código de verificación del arrendatario:</p>
                <p className="text-base font-mono text-white font-bold tracking-wider break-all">{qrValue}</p>
              </div>
              {booking?.status === 'confirmed' && (
                <Button
                  onClick={handleOwnerReceive}
                  disabled={updateMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                >
                  <PackageCheck className="w-4 h-4 mr-2" />
                  {fmtSlot(booking?.delivery_slot)
                    ? `Confirmar entrega · ${fmtSlot(booking.delivery_slot)}`
                    : 'Confirmar entrega del equipo'}
                </Button>
              )}
              {booking?.status === 'active' && (
                <Button
                  onClick={handleOwnerReturn}
                  disabled={updateMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 h-11"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar devolución y liberar escrow
                </Button>
              )}
            </>
          )}

          {/* Fallback: neither renter nor owner (unknown) — show generic */}
          {!isRenter && !isOwner && (
            <>
              <div className="flex justify-center">
                <QRDisplay value={qrValue} />
              </div>
              <p className="text-xs text-zinc-500 font-mono bg-zinc-800/50 rounded-lg px-3 py-2">{qrValue}</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}