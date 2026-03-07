import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { CreditCard, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

const TX_STATUS = {
  pending:   { bg: '#fbbf2420', color: '#fbbf24', border: '#fbbf2440', label: 'Pendiente' },
  completed: { bg: '#1DDF7A20', color: '#1DDF7A', border: '#1DDF7A40', label: 'Completado' },
  refunded:  { bg: '#ef444420', color: '#ef4444', border: '#ef444440', label: 'Reembolsado' },
  failed:    { bg: '#6b728020', color: '#9ca3af', border: '#6b728040', label: 'Fallido' },
};

function StatusBadge({ status }) {
  const s = TX_STATUS[status] || TX_STATUS.pending;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 animate-pulse">
      <div className="h-3 w-24 bg-zinc-800 rounded" />
      <div className="flex-1 h-3 bg-zinc-800 rounded" />
      <div className="h-3 w-16 bg-zinc-800 rounded" />
    </div>
  );
}

function TransactionDetailModal({ tx, open, onClose, onSaved }) {
  const queryClient = useQueryClient();

  const refundMutation = useMutation({
    mutationFn: () => base44.entities.PaymentLog.update(tx.id, { status: 'refunded' }),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err) => console.error('Refund failed', err),
  });

  const handleRefund = () => {
    if (window.confirm('¿Marcar este pago como reembolsado? Esta acción es solo informativa.')) {
      refundMutation.mutate();
    }
  };

  if (!tx) return null;

  const canRefund = tx.status !== 'refunded';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md"
        style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-400" />
            Transacción
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <Row label="ID" value={<span className="font-mono text-xs">{tx.id}</span>} />
          <Row label="Usuario" value={tx.user_email || tx.user_id} />
          <Row label="Importe" value={<span className="text-white font-bold">€{tx.amount?.toFixed(2) ?? '—'}</span>} />
          <Row label="Moneda" value={tx.currency || 'EUR'} />
          <Row label="Estado" value={<StatusBadge status={tx.status} />} />
          {tx.description && <Row label="Descripción" value={tx.description} />}
          {tx.stripe_payment_id && (
            <Row label="Stripe ID" value={<span className="font-mono text-xs text-zinc-400 break-all">{tx.stripe_payment_id}</span>} />
          )}
          {tx.created_date && (
            <Row label="Fecha" value={format(new Date(tx.created_date), 'dd/MM/yyyy HH:mm')} />
          )}
        </div>

        <DialogFooter className="gap-2">
          {canRefund && (
            <Button variant="ghost"
              className="text-red-400 hover:bg-red-950/30 mr-auto"
              onClick={handleRefund}
              disabled={refundMutation.isPending}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Marcar como reembolsado
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-zinc-500 text-xs shrink-0">{label}</span>
      <span className="text-zinc-200 text-xs text-right">{value}</span>
    </div>
  );
}

function TxRow({ tx, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 rounded-xl transition-all cursor-pointer text-xs"
      style={{ background: hovered ? '#1e1e30' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <span className="font-mono text-zinc-400">{tx.id?.slice(-8)}</span>
      <span className="text-zinc-500 truncate max-w-[120px]">{tx.user_email || tx.user_id?.slice(-8)}</span>
      <span className="text-white font-medium">€{tx.amount?.toFixed(2) ?? '—'}</span>
      <StatusBadge status={tx.status} />
      {tx.stripe_payment_id && (
        <span className="text-zinc-600 font-mono hidden sm:block">{tx.stripe_payment_id?.slice(-12)}</span>
      )}
      <span className="text-zinc-600 ml-auto hidden md:block">
        {tx.created_date ? format(new Date(tx.created_date), 'dd/MM/yy') : '—'}
      </span>
    </div>
  );
}

export default function AdminTransactionsTab({ enabled }) {
  const [detailTx, setDetailTx] = useState(null);
  const queryClient = useQueryClient();

  const { data: transactions, isLoading, isError } = useQuery({
    queryKey: ['admin', 'transactions'],
    queryFn: () => base44.entities.PaymentLog.list('-created_date', 500),
    enabled,
    retry: 1,
  });

  if (isError || (transactions !== undefined && transactions === null)) {
    return (
      <div className="rounded-xl p-8 text-center"
        style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.06)' }}>
        <CreditCard className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 text-sm">
          Las transacciones aparecerán aquí una vez se integre el procesamiento de pagos.
        </p>
      </div>
    );
  }

  const txList = transactions || [];

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-3">
        <span className="text-white font-medium">{txList.length}</span> transacciones
      </p>

      <div className="rounded-xl overflow-hidden" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.06)' }}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
        ) : txList.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Las transacciones aparecerán aquí una vez se integre el procesamiento de pagos.
            </p>
          </div>
        ) : (
          txList.map(tx => (
            <TxRow key={tx.id} tx={tx} onClick={() => setDetailTx(tx)} />
          ))
        )}
      </div>

      <TransactionDetailModal
        tx={detailTx}
        open={!!detailTx}
        onClose={() => setDetailTx(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] })}
      />
    </div>
  );
}