import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ExternalLink, AlertCircle, CheckCircle, Loader2, Save, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SettingsBilling({ user, onSaved, paymentResult }) {
  const [form, setForm] = useState({
    billing_name: user?.billing_name || '',
    billing_email: user?.billing_email || user?.email || '',
    billing_type: user?.billing_type || 'individual',
    tax_id: user?.tax_id || '',
    billing_address: user?.billing_address || {},
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [paymentConfirm, setPaymentConfirm] = useState(null);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setBillingAddr = (key, val) => setForm(p => ({ ...p, billing_address: { ...p.billing_address, [key]: val } }));

  const { data: paymentLogs = [] } = useQuery({
    queryKey: ['payment_logs', user?.id],
    queryFn: () => base44.entities.PaymentLog.filter({ user_id: user.id }, '-created_date', 10),
    enabled: !!user?.id,
  });

  // Verify payment if returning from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    if (paymentResult === 'success' && sessionId) {
      (async () => {
        const res = await base44.functions.invoke('stripeCheckout', { action: 'verify_payment', session_id: sessionId });
        if (res.data?.success) {
          setPaymentConfirm({ amount: res.data.amount, currency: res.data.currency });
          onSaved?.();
        }
      })();
    }
  }, [paymentResult]);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onSaved?.();
  };

  const handleConnectStripe = async () => {
    setStripeConnecting(true);
    await base44.functions.invoke('stripeCheckout', { action: 'create_customer' });
    setStripeConnecting(false);
    onSaved?.();
  };

  const handleSimulatePayment = async () => {
    setStripeLoading(true);
    const res = await base44.functions.invoke('stripeCheckout', {
      action: 'create_checkout',
      origin: window.location.origin,
    });
    if (res.data?.url) {
      window.location.href = res.data.url;
    }
    setStripeLoading(false);
  };

  const handlePortal = async () => {
    setStripeLoading(true);
    const res = await base44.functions.invoke('stripeCheckout', {
      action: 'customer_portal',
      origin: window.location.origin,
    });
    if (res.data?.url) window.open(res.data.url, '_blank');
    setStripeLoading(false);
  };

  const showTaxId = form.billing_type === 'empresa' || form.billing_type === 'autonomo';
  const hasStripe = !!user?.stripe_customer_id;

  return (
    <div className="space-y-5">
      {/* Sandbox Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: 'rgba(251,191,36,0.07)', borderColor: 'rgba(251,191,36,0.2)' }}>
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
        <p className="text-xs" style={{ color: '#fbbf24' }}>
          Stripe está en modo <strong>sandbox</strong>. Usa la tarjeta <span className="font-mono bg-black/30 px-1 rounded">4242 4242 4242 4242</span> con cualquier fecha futura y CVC para simular pagos.
        </p>
      </div>

      {/* Payment confirmation */}
      {paymentConfirm && (
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)' }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#34d399' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#34d399' }}>¡Pago simulado completado!</p>
            <p className="text-xs text-zinc-400">Importe: {paymentConfirm.amount} {paymentConfirm.currency?.toUpperCase()}</p>
          </div>
        </div>
      )}

      {/* Stripe Status */}
      <div className="rounded-xl border p-5" style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.07)' }}>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">Stripe Connect</h3>
        {hasStripe ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" style={{ color: '#34d399' }} />
              <span className="text-zinc-300">Cuenta conectada</span>
              <span className="text-xs text-zinc-600 font-mono ml-1">{user.stripe_customer_id}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePortal} disabled={stripeLoading} size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Ver historial en Stripe
              </Button>
              <Button onClick={handleSimulatePayment} disabled={stripeLoading} size="sm" className="text-white gap-1.5" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-900">
                {stripeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                Simular pago de prueba
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">Conecta tu cuenta de Stripe para recibir pagos y gestionar suscripciones.</p>
            <div className="flex gap-2">
              <Button onClick={handleConnectStripe} disabled={stripeConnecting} size="sm" className="text-white gap-1.5" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-900">
                {stripeConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                Conectar Stripe (Sandbox)
              </Button>
              <Link to={createPageUrl('CompleteProfile') + '?step=5'}>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400">Completar onboarding</Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Payment logs */}
      {paymentLogs.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">Historial de pagos</h3>
          <div className="space-y-2">
            {paymentLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-xs text-zinc-400">{log.description || 'Pago'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-white">{log.amount} {log.currency}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    log.status === 'completed' ? 'bg-green-900/40 text-green-400' :
                    log.status === 'failed' ? 'bg-red-900/40 text-red-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>{log.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing form */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.07)' }}>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Datos de facturación</h3>

        <Field label="Nombre fiscal"><Input value={form.billing_name} onChange={e => set('billing_name', e.target.value)} placeholder="Juan García" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
        <Field label="Email de facturas"><Input type="email" value={form.billing_email} onChange={e => set('billing_email', e.target.value)} className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} /></Field>
        <Field label="Tipo">
          <Select value={form.billing_type} onValueChange={v => set('billing_type', v)}>
            <SelectTrigger className="text-white border-zinc-700" style={{ background: '#1a1a2e' }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)' }}>
              <SelectItem value="individual">Individual / Particular</SelectItem>
              <SelectItem value="autonomo">Autónomo / Freelance</SelectItem>
              <SelectItem value="empresa">Empresa / Sociedad</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {showTaxId && (
          <Field label={form.billing_type === 'empresa' ? 'CIF' : 'NIF'}>
            <Input value={form.tax_id} onChange={e => set('tax_id', e.target.value)} placeholder={form.billing_type === 'empresa' ? 'B12345678' : '12345678A'} className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} />
          </Field>
        )}
        <div className="space-y-2 pt-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Dirección fiscal</p>
          <Input value={form.billing_address.line1 || ''} onChange={e => setBillingAddr('line1', e.target.value)} placeholder="Calle y número" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} />
          <div className="grid grid-cols-2 gap-2">
            <Input value={form.billing_address.city || ''} onChange={e => setBillingAddr('city', e.target.value)} placeholder="Ciudad" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} />
            <Input value={form.billing_address.postal_code || ''} onChange={e => setBillingAddr('postal_code', e.target.value)} placeholder="CP" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} />
          </div>
          <Input value={form.billing_address.country || ''} onChange={e => setBillingAddr('country', e.target.value)} placeholder="País" className="text-white border-zinc-700" style={{ background: '#1a1a2e' }} />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="font-semibold text-white" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-900">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saved ? '¡Guardado!' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-zinc-400 text-xs mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}