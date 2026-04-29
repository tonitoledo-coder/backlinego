import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, CreditCard, Lock, ChevronDown, ChevronUp, Loader2, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { calcBookingPrice } from './calcBookingPrice';

const PLATFORM_FEE_RATE = 0.12;

export default function PaymentModal({ open, onClose, equipment, startDate, endDate, bookingId }) {
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [error, setError] = useState(null);

  if (!equipment || !startDate || !endDate) return null;

  const pricing = calcBookingPrice(equipment, startDate, endDate);
  const deposit = equipment.deposit || Math.round((equipment.declared_value || 0) * 0.25);
  const platformFee = pricing.base_price * PLATFORM_FEE_RATE;
  const ownerReceives = pricing.finalPrice - platformFee;

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken')
        || localStorage.getItem('token')
        || localStorage.getItem('base44_token');

      // 1. Obtener connect account del propietario
      let ownerConnectId = null;
      try {
        const profileRes = await fetch('/api/functions/stripeCheckout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'create_owner_connect_account',
            owner_email: equipment.created_by,
            origin: window.location.origin,
          }),
        });
        const profileData = await profileRes.json();
        ownerConnectId = profileData.account_id || null;
      } catch {
        // No bloqueante: el pago funciona sin connect (manual payout)
      }

      // 2. Crear Booking en estado pending_payment
      let currentBookingId = bookingId;
      if (!currentBookingId) {
        const user = await base44.auth.me();
        const booking = await base44.entities.Booking.create({
          equipment_id: equipment.id,
          equipment_title: equipment.title,
          owner_email: equipment.created_by,
          renter_email: user.email,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          days: pricing.days,
          base_price: pricing.finalPrice,
          protection_fee: pricing.insuranceFee,
          protection_rate: pricing.insuranceFee / pricing.finalPrice,
          platform_fee: platformFee,
          deposit_amount: deposit,
          total_charged: pricing.totalPrice,
          owner_payout: ownerReceives,
          status: 'pending_payment',
          protection_plan: 'damage_waiver',
          is_sos: equipment.sos_available || false,
        });
        currentBookingId = booking.id;
      }

      // 3. Crear Checkout Session en Stripe
      const res = await fetch('/api/functions/stripeCheckout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'create_booking_checkout',
          booking_id: currentBookingId,
          equipment_id: equipment.id,
          equipment_title: equipment.title,
          owner_email: equipment.created_by,
          base_price: pricing.finalPrice,
          protection_fee: pricing.insuranceFee,
          deposit_amount: deposit,
          owner_connect_account_id: ownerConnectId,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();

      if (data.url) {
        // Redirigir a Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Error al crear la sesión de pago');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            Confirmar reserva
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen equipo */}
          <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700">
            <p className="text-zinc-400 text-xs mb-1">Equipo</p>
            <p className="text-white font-semibold">{equipment.title}</p>
            <p className="text-zinc-500 text-xs mt-1">
              {pricing.days} día{pricing.days !== 1 ? 's' : ''} ·{' '}
              {startDate?.toLocaleDateString('es-ES')} → {endDate?.toLocaleDateString('es-ES')}
            </p>
          </div>

          {/* Desglose de precios */}
          <div className="space-y-2">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full flex items-center justify-between text-zinc-400 text-sm hover:text-white transition-colors"
            >
              <span>Ver desglose</span>
              {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showBreakdown && (
              <div className="space-y-1.5 text-sm p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/50">
                <div className="flex justify-between text-zinc-400">
                  <span>Alquiler ({pricing.days}d × €{equipment.price_per_day}/día)</span>
                  <span>€{pricing.finalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-400">
                  <span>Protection Fee</span>
                  <span>€{pricing.insuranceFee.toFixed(2)}</span>
                </div>
                {deposit > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Depósito retenido *</span>
                    <span>€{deposit.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="bg-zinc-700 my-1" />
                <div className="flex justify-between text-white font-semibold">
                  <span>Total a pagar ahora</span>
                  <span>€{pricing.totalPrice.toFixed(2)}</span>
                </div>
                {deposit > 0 && (
                  <p className="text-zinc-600 text-[10px] mt-1">
                    * El depósito se autoriza pero no se cobra. Se libera automáticamente tras la devolución.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700">
            <span className="text-zinc-300 font-medium">Total</span>
            <span className="text-white text-xl font-bold">€{pricing.totalPrice.toFixed(2)}</span>
          </div>

          {/* Protección */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-green-400 text-xs">
              Pago protegido · Damage Waiver incluido · Depósito liberado en devolución
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              {error}
            </p>
          )}

          {/* CTA */}
          <Button
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-12"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparando pago...</>
            ) : (
              <><ExternalLink className="w-4 h-4 mr-2" /> Pagar con Stripe · €{pricing.totalPrice.toFixed(2)}</>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-zinc-600 text-xs">
            <Lock className="w-3 h-3" />
            <span>Pago seguro procesado por Stripe</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}