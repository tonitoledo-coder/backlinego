import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ShieldCheck, CreditCard, Lock, CheckCircle, ChevronDown, ChevronUp, Info, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PLATFORM_FEE_RATE = 0.12;
const VAT_RATE = 0.21;

export default function PaymentModal({ open, onClose, onConfirm, equipment, days, basePrice, insuranceFee, totalPrice }) {
  // step: 'billing' | 'form' | 'processing' | 'success'
  const [step, setStep] = useState('form');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billing, setBilling] = useState({
    billing_name: '', billing_email: '', billing_type: 'particular',
    company_name: '', cif_nif: '',
    billing_address: '', billing_city: '', billing_postal_code: '', billing_country: 'ES',
  });

  // When modal opens, check if billing data already saved
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const user = await base44.auth.me();
        if (user?.billing_name) {
          setStep('form');
        } else {
          setBilling(b => ({
            ...b,
            billing_name: user?.full_name || '',
            billing_email: user?.email || '',
          }));
          setStep('billing');
        }
      } catch {
        setStep('form');
      }
    })();
  }, [open]);

  // Commission breakdown
  const platformFee = basePrice * PLATFORM_FEE_RATE;
  const vatOnFee = platformFee * VAT_RATE;
  const ownerReceives = basePrice - platformFee;
  const deposit = equipment?.deposit || 0;
  const grandTotal = totalPrice + deposit;

  const handleSaveBilling = async () => {
    setBillingLoading(true);
    try {
      await base44.auth.updateMe({
        billing_name: billing.billing_name,
        billing_email: billing.billing_email,
        billing_type: billing.billing_type,
        billing_address: {
          address: billing.billing_address,
          city: billing.billing_city,
          postal_code: billing.billing_postal_code,
          country: billing.billing_country,
          company_name: billing.billing_type === 'empresa' ? billing.company_name : undefined,
          cif_nif: billing.billing_type === 'empresa' ? billing.cif_nif : undefined,
        },
        stripe_onboarding_completed: true,
      });
      setStep('form');
    } finally {
      setBillingLoading(false);
    }
  };

  const handlePay = async () => {
    setStep('processing');
    await new Promise(r => setTimeout(r, 2200));
    setStep('success');
    await new Promise(r => setTimeout(r, 1800));
    onConfirm();
    setStep('form');
    setCard({ number: '', expiry: '', cvv: '', name: '' });
    setShowBreakdown(false);
  };

  const formatCardNumber = (val) =>
    val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExpiry = (val) =>
    val.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2');

  const isCardValid = card.name && card.number.replace(/\s/g, '').length === 16 
    && card.expiry.length === 5 && card.cvv.length === 3;

  const isBillingValid = billing.billing_name && billing.billing_email &&
    billing.billing_address && billing.billing_city && billing.billing_postal_code &&
    (billing.billing_type === 'particular' || (billing.company_name && billing.cif_nif));

  if (step === 'billing') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              Método de pago
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400 text-xs mb-1 block">Nombre</Label>
                <Input value={billing.billing_name} onChange={e => setBilling({...billing, billing_name: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" placeholder="Nombre completo" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs mb-1 block">Email de facturación</Label>
                <Input value={billing.billing_email} onChange={e => setBilling({...billing, billing_email: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" placeholder="email@ejemplo.com" />
              </div>
            </div>

            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Tipo</Label>
              <div className="flex gap-2">
                {['particular', 'empresa'].map(type => (
                  <button key={type} onClick={() => setBilling({...billing, billing_type: type})}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                      billing.billing_type === type
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                    }`}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {billing.billing_type === 'empresa' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-400 text-xs mb-1 block">Nombre empresa</Label>
                  <Input value={billing.company_name} onChange={e => setBilling({...billing, company_name: e.target.value})}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" placeholder="Razón social" />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs mb-1 block">CIF/NIF</Label>
                  <Input value={billing.cif_nif} onChange={e => setBilling({...billing, cif_nif: e.target.value})}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" placeholder="B12345678" />
                </div>
              </div>
            )}

            <Separator className="bg-zinc-800" />

            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Dirección</Label>
              <Input value={billing.billing_address} onChange={e => setBilling({...billing, billing_address: e.target.value})}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 mb-2" placeholder="Calle y número" />
              <div className="grid grid-cols-3 gap-2">
                <Input value={billing.billing_city} onChange={e => setBilling({...billing, billing_city: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" placeholder="Ciudad" />
                <Input value={billing.billing_postal_code} onChange={e => setBilling({...billing, billing_postal_code: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" placeholder="CP" />
                <Input value={billing.billing_country} onChange={e => setBilling({...billing, billing_country: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" placeholder="País" maxLength={2} />
              </div>
            </div>

            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Save className="w-3 h-3" />
              Tus datos se guardan para futuras reservas
            </p>

            <Button className="w-full bg-blue-600 hover:bg-blue-700 font-semibold h-11"
              disabled={!isBillingValid || billingLoading}
              onClick={handleSaveBilling}>
              {billingLoading ? 'Guardando...' : 'Continuar al pago'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'processing') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <div className="flex flex-col items-center justify-center py-14 gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-zinc-700" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Procesando pago...</p>
              <p className="text-zinc-500 text-sm mt-1">Verificando con la pasarela de pago</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Lock className="w-3 h-3" />
              <span>Conexión segura SSL/TLS</span>
            </div>
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
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/30 flex items-center justify-center animate-pulse">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-xl">¡Pago completado!</p>
              <p className="text-zinc-400 text-sm mt-1">Reserva confirmada. Recibirás el QR de entrega en tu perfil.</p>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-3 w-full text-sm space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Total cobrado</span>
                <span className="text-white font-semibold">€{grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-500 text-xs">
                <span>Fianza retenida (escrow)</span>
                <span>€{deposit.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Lock className="w-4 h-4 text-green-400" />
            Pago seguro
            <span className="ml-auto text-xs text-zinc-500 font-normal bg-zinc-800 px-2 py-0.5 rounded">SIMULACIÓN</span>
          </DialogTitle>
        </DialogHeader>

        {/* Order Summary */}
        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2 text-sm border border-zinc-700/50">
          <p className="font-semibold text-white">{equipment?.title}</p>
          <div className="flex justify-between text-zinc-400">
            <span>€{equipment?.price_per_day}/día × {days} día{days !== 1 ? 's' : ''}</span>
            <span>€{basePrice?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Seguro BacklineGo (8%)</span>
            <span>€{insuranceFee?.toFixed(2)}</span>
          </div>
          {deposit > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Fianza (reembolsable)</span>
              <span>€{deposit.toFixed(2)}</span>
            </div>
          )}
          <Separator className="bg-zinc-700" />
          <div className="flex justify-between text-white font-bold text-base">
            <span>Total a pagar</span>
            <span>€{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Commission Breakdown (collapsible) */}
        <button
          className="w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-800/30 rounded-lg px-3 py-2"
          onClick={() => setShowBreakdown(!showBreakdown)}
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            Ver desglose de comisiones
          </span>
          {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showBreakdown && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-2 text-xs">
            <p className="text-blue-300 font-semibold text-sm mb-3">Distribución del pago</p>
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal alquiler</span>
              <span>€{basePrice?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-orange-400">
              <span>Comisión plataforma (12%)</span>
              <span>−€{platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span className="pl-3">IVA sobre comisión (21%)</span>
              <span>€{vatOnFee.toFixed(2)}</span>
            </div>
            <Separator className="bg-zinc-700/50" />
            <div className="flex justify-between text-green-400 font-semibold">
              <span>Propietario recibe</span>
              <span>€{ownerReceives.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>+ Seguro (BacklineGo)</span>
              <span>€{insuranceFee?.toFixed(2)}</span>
            </div>
            {deposit > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Fianza en escrow</span>
                <span>€{deposit.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-zinc-700/50 text-zinc-500 italic">
              La fianza se libera al confirmar la devolución del equipo con el QR.
            </div>
          </div>
        )}

        {/* Card Form */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <CreditCard className="w-3 h-3" />
            <span>Datos de tarjeta (entorno de prueba)</span>
            <div className="ml-auto flex gap-1">
              {['VISA', 'MC'].map(b => (
                <span key={b} className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{b}</span>
              ))}
            </div>
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
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 font-mono tracking-wider"
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
              maxLength={3}
              value={card.cvv}
              onChange={e => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 font-mono"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-zinc-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <span>El pago queda retenido en <strong className="text-green-400">escrow</strong> hasta que el propietario confirme la devolución del equipo con el código QR.</span>
        </div>

        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 font-semibold h-12 text-base disabled:opacity-40"
          onClick={handlePay}
          disabled={!isCardValid}
        >
          <Lock className="w-4 h-4 mr-2" />
          Pagar €{grandTotal.toFixed(2)} de forma segura
        </Button>

        <p className="text-center text-xs text-zinc-600">
          Entorno simulado · Sin cargos reales · Stripe Connect™ próximamente
        </p>
      </DialogContent>
    </Dialog>
  );
}