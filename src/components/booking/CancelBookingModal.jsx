import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, XCircle, Loader2, Ban } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { calcCancellationPolicy } from './calcCancellationPolicy';
import { sendBookingEmail } from '@/utils/sendBookingEmail';

/**
 * Modal reutilizable de cancelación.
 * Props:
 *   booking      — objeto Booking completo
 *   cancelledBy  — 'renter' | 'owner' | 'admin'
 *   open         — boolean
 *   onClose      — función
 */
export default function CancelBookingModal({ booking, cancelledBy, open, onClose }) {
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);

  const totalPaid = booking?.total_charged_cents != null ? booking.total_charged_cents / 100 : 0;
  const policy    = calcCancellationPolicy(cancelledBy, booking?.start_date, totalPaid);

  const cancelMutation = useMutation({
    mutationFn: () =>
      db.entities.Booking.update(booking?.id, {
        status:                'cancelled',
        cancellation_reason:   `${cancelledBy} cancelled (${policy.refundPct}% refund)`,
        cancelled_at:          new Date().toISOString(),
        refund_amount_cents:   Math.round((policy.refundAmount || 0) * 100),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      sendBookingEmail('booking_cancelled', booking, {
        equipmentTitle: booking.equipment_title || `Reserva #${booking.id?.slice(-8)}`,
        renterId:       booking.renter_id,
        ownerId:        booking.owner_id,
        cancelledBy,
        refundPct:      policy.refundPct,
        refundAmount:   policy.refundAmount?.toFixed(2),
      });
      setDone(true);
    },
  });

  if (!booking) return null;

  const refundColor =
    policy.refundPct === 100 ? 'text-green-400' :
    policy.refundPct >= 80   ? 'text-amber-400' :
                               'text-red-400';

  if (done) return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm text-center">
        <div className="py-8">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Reserva cancelada</h3>
          <p className="text-zinc-400 text-sm mb-2">{policy.description}</p>
          {policy.cancellationFee > 0 && (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
              Fee de €{policy.cancellationFee} aplicado a Backline Go
            </p>
          )}
          <Button onClick={onClose} variant="outline" className="border-zinc-700 text-zinc-300 w-full mt-2">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Cancelar reserva
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Resumen reserva */}
          <div className="bg-zinc-800/60 rounded-xl px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Reserva</span>
              <span className="text-white font-mono">#{booking.id?.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Fechas</span>
              <span className="text-white">{booking.start_date} → {booking.end_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Total pagado</span>
              <span className="text-white font-semibold">€{totalPaid.toFixed(2)}</span>
            </div>
          </div>

          {/* Política aplicada */}
          <div className="bg-zinc-800/40 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Política de cancelación</span>
              <Badge className={`${refundColor} bg-transparent border border-current text-xs`}>
                {policy.label}
              </Badge>
            </div>
            <p className="text-sm text-zinc-300">{policy.description}</p>
            <div className="flex justify-between items-center pt-1 border-t border-zinc-700">
              <span className="text-sm text-zinc-400">Reembolso al arrendatario</span>
              <span className={`text-base font-bold ${refundColor}`}>
                €{policy.refundAmount.toFixed(2)}
                <span className="text-xs font-normal ml-1 text-zinc-500">({policy.refundPct}%)</span>
              </span>
            </div>
            {policy.cancellationFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Fee penalización (Backline)</span>
                <span className="text-amber-400 font-semibold">€{policy.cancellationFee.toFixed(2)}</span>
              </div>
            )}
          </div>

          {cancelledBy === 'admin' && (
            <p className="text-xs text-zinc-500 text-center">
              Cancelación administrativa — reembolso total, sin penalización a ninguna parte.
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-2">
          <Button
            variant="outline"
            className="flex-1 border-zinc-700 text-zinc-300"
            onClick={onClose}
            disabled={cancelMutation.isPending}
          >
            Volver
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelando...</>
              : <><Ban className="w-4 h-4 mr-2" />Confirmar cancelación</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}