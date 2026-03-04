import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { CreditCard, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';

export default function StepBilling({ formData, updateField }) {
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeSuccess, setStripeSuccess] = useState(formData.stripe_onboarding_completed || false);

  const billing = formData.billing_address || {};
  const updateBilling = (key, val) => updateField('billing_address', { ...billing, [key]: val });

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    // Simulate stripe sandbox customer creation
    await new Promise(r => setTimeout(r, 1800));
    const fakeCustomerId = `cus_test_${Math.random().toString(36).slice(2, 12)}`;
    updateField('stripe_customer_id', fakeCustomerId);
    updateField('stripe_onboarding_completed', true);
    setStripeSuccess(true);
    setStripeLoading(false);
  };

  const billingType = formData.billing_type || 'individual';
  const showTaxId = billingType === 'empresa' || billingType === 'autonomo';

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Facturación</h2>
        <p className="text-zinc-400 text-sm">Configura tus datos fiscales y conecta con Stripe para recibir pagos.</p>
      </div>

      {/* Sandbox banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border"
        style={{ background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.25)' }}>
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: '#fbbf24' }}>Modo de prueba activo</p>
          <p className="text-xs text-zinc-400 mt-0.5">Los pagos están en modo sandbox. Puedes simular transacciones sin cargos reales.</p>
        </div>
      </div>

      <div>
        <Label className="text-zinc-300 text-sm">Nombre fiscal o razón social</Label>
        <Input value={formData.billing_name || ''} onChange={e => updateField('billing_name', e.target.value)}
          placeholder="Juan García García" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
      </div>

      <div>
        <Label className="text-zinc-300 text-sm">Email de facturas</Label>
        <Input type="email" value={formData.billing_email || ''} onChange={e => updateField('billing_email', e.target.value)}
          placeholder="facturas@tuemail.com" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
      </div>

      <div>
        <Label className="text-zinc-300 text-sm">Tipo de facturación</Label>
        <Select value={billingType} onValueChange={v => updateField('billing_type', v)}>
          <SelectTrigger className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)' }}>
            <SelectItem value="individual">Individual / Particular</SelectItem>
            <SelectItem value="autonomo">Autónomo / Freelance</SelectItem>
            <SelectItem value="empresa">Empresa / Sociedad</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showTaxId && (
        <div>
          <Label className="text-zinc-300 text-sm">{billingType === 'empresa' ? 'CIF' : 'NIF'}</Label>
          <Input value={formData.tax_id || ''} onChange={e => updateField('tax_id', e.target.value)}
            placeholder={billingType === 'empresa' ? 'B12345678' : '12345678A'}
            className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
        </div>
      )}

      {/* Billing address */}
      <div className="space-y-3">
        <Label className="text-zinc-300 text-sm block">Dirección fiscal</Label>
        <Input value={billing.line1 || ''} onChange={e => updateBilling('line1', e.target.value)}
          placeholder="Calle y número" className="text-white border-zinc-700" style={{ background: '#161625' }} />
        <div className="grid grid-cols-2 gap-3">
          <Input value={billing.city || ''} onChange={e => updateBilling('city', e.target.value)}
            placeholder="Ciudad" className="text-white border-zinc-700" style={{ background: '#161625' }} />
          <Input value={billing.postal_code || ''} onChange={e => updateBilling('postal_code', e.target.value)}
            placeholder="Código postal" className="text-white border-zinc-700" style={{ background: '#161625' }} />
        </div>
        <Input value={billing.country || ''} onChange={e => updateBilling('country', e.target.value)}
          placeholder="País" className="text-white border-zinc-700" style={{ background: '#161625' }} />
      </div>

      {/* Stripe connect */}
      <div className="rounded-xl border p-5 space-y-4"
        style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.2)' }}>
            <CreditCard className="w-5 h-5" style={{ color: '#a78bfa' }} />
          </div>
          <div>
            <p className="text-white font-medium text-sm">Conectar con Stripe</p>
            <p className="text-xs text-zinc-500">Para recibir pagos de forma segura</p>
          </div>
        </div>

        {stripeSuccess ? (
          <div className="flex items-center gap-2 p-3 rounded-lg"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#34d399' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#34d399' }}>¡Conectado! Cuenta Stripe creada.</p>
              <p className="text-xs text-zinc-500 mt-0.5">Tarjeta de prueba: 4242 4242 4242 4242 · Exp: cualquiera · CVV: cualquiera</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Shield className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <p className="text-xs text-zinc-500">Tarjeta de prueba sandbox: <span className="font-mono text-zinc-300">4242 4242 4242 4242</span></p>
            </div>
            <Button onClick={handleStripeConnect} disabled={stripeLoading}
              className="w-full font-semibold text-white"
              style={{ background: '#7c3aed' }}>
              {stripeLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Conectando...</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" /> Conectar con Stripe (Sandbox)</>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}