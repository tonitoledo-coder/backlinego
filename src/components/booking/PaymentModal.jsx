import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, CreditCard, Lock, CheckCircle } from 'lucide-react';

export default function PaymentModal({ open, onClose, onConfirm, equipment, days, basePrice, insuranceFee, totalPrice, isLoading }) {
  const [step, setStep] = useState('form'); // 'form' | 'processing' | 'success'
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const handlePay = async () => {
    setStep('processing');
    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 2000));
    setStep('success');
    await new Promise(r => setTimeout(r, 1500));
    onConfirm();
    setStep('form');
  };

  const formatCardNumber = (val) =>
    val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExpiry = (val) =>
    val.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2');

  if (step === 'processing') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-14 h-14 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-zinc-300 font-medium">Procesando pago...</p>
            <p className="text-zinc-500 text-sm">No cierres esta ventana</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'success') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-white font-semibold text-lg">¡Pago confirmado!</p>
            <p className="text-zinc-400 text-sm text-center">Tu reserva ha sido creada con éxito</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-400" />
            Pago seguro simulado
          </DialogTitle>
        </DialogHeader>

        {/* Order Summary */}
        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-medium text-white">{equipment?.title}</p>
          <div className="flex justify-between text-zinc-400">
            <span>€{equipment?.price_per_day}/día × {days} días</span>
            <span>€{basePrice?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Seguro (8%)</span>
            <span>€{insuranceFee?.toFixed(2)}</span>
          </div>
          {equipment?.deposit > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Fianza (reembolsable)</span>
              <span>€{equipment.deposit}</span>
            </div>
          )}
          <Separator className="bg-zinc-700" />
          <div className="flex justify-between text-white font-semibold">
            <span>Total a pagar</span>
            <span>€{(totalPrice + (equipment?.deposit || 0)).toFixed(2)}</span>
          </div>
        </div>

        {/* Simulated Card Form */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <CreditCard className="w-3 h-3" />
            <span>Datos de tarjeta (simulación)</span>
          </div>

          <Input
            placeholder="Nombre en la tarjeta"
            value={card.name}
            onChange={e => setCard({ ...card, name: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          />
          <Input
            placeholder="1234 5678 9012 3456"
            value={card.number}
            onChange={e => setCard({ ...card, number: formatCardNumber(e.target.value) })}
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 font-mono"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="MM/AA"
              value={card.expiry}
              onChange={e => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 font-mono"
            />
            <Input
              placeholder="CVV"
              value={card.cvv}
              onChange={e => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span>Pago retenido en escrow hasta la devolución del equipo</span>
        </div>

        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 font-semibold h-12"
          onClick={handlePay}
          disabled={!card.name || card.number.replace(/\s/g, '').length < 16 || card.expiry.length < 5 || card.cvv.length < 3}
        >
          Confirmar pago · €{(totalPrice + (equipment?.deposit || 0)).toFixed(2)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}