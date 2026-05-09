import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle, Loader2, Scale } from 'lucide-react';
import { sendBookingEmail } from '@/utils/sendBookingEmail';

const STATUS_LABELS = {
  open:         { label: 'Abierta',     color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  under_review: { label: 'En revisión', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  resolved:     { label: 'Resuelta',    color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  dismissed:    { label: 'Desestimada', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
};

const TYPE_LABELS = {
  damage:             'Daños',
  late_return:        'Devolución tardía',
  no_show:            'No se presentó',
  condition_mismatch: 'Estado distinto al declarado',
  other:              'Otro',
};

const DEPOSIT_ACTION_LABELS = {
  release_to_renter: 'Devolver fianza al arrendatario',
  capture_to_owner:  'Transferir fianza al propietario',
  split:             'Dividir fianza a partes iguales',
  pending:           'Sin acción en fianza',
};

const RESOLUTION_LABELS = {
  release_to_renter: 'Razón dada al arrendatario',
  capture_to_owner:  'Razón dada al propietario',
  split:             'Resolución parcial acordada',
  pending:           'Disputa cerrada sin acción',
};

function DisputeRow({ dispute, adminId, onResolved }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [depositAction, setDepositAction] = useState('pending');
  const [opener, setOpener] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!dispute.opened_by) return;
    db.entities.UserProfile.get(dispute.opened_by).then(setOpener).catch(() => {});
  }, [dispute.opened_by]);

  const openerLabel = opener?.display_name || opener?.username || opener?.email || dispute.opened_by?.slice(0, 8);

  const resolveMutation = useMutation({
    mutationFn: ({ action }) => db.entities.Dispute.update(dispute.id, {
      status:           action === null ? 'dismissed' : 'resolved',
      resolution_notes: notes,
      resolved_by:      adminId,
      resolved_at:      new Date().toISOString(),
      deposit_action:   action ?? 'pending',
    }),
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      // Fetch the booking + party profiles for the notification email
      (async () => {
        const bookings = await db.entities.Booking.filter({ id: dispute.booking_id });
        const booking = bookings?.[0];
        if (!booking) return;
        const [renter, owner] = await Promise.all([
          db.entities.UserProfile.get(booking.renter_id).catch(() => null),
          db.entities.UserProfile.get(booking.owner_id).catch(() => null),
        ]);
        const key = action ?? 'pending';
        sendBookingEmail('dispute_resolved', booking, {
          equipmentTitle:     booking.equipment_title || `Reserva #${dispute.booking_id?.slice(-8)}`,
          renterEmail:        renter?.email,
          ownerEmail:         owner?.email,
          resolutionLabel:    RESOLUTION_LABELS[key] || key,
          resolutionNotes:    notes,
          depositActionLabel: DEPOSIT_ACTION_LABELS[key] || key,
        });
      })();
      onResolved?.();
    },
  });

  const isResolved = ['resolved', 'dismissed'].includes(dispute.status);
  const st = STATUS_LABELS[dispute.status] || STATUS_LABELS.open;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-white font-medium">Reserva #{dispute.booking_id?.slice(-8)}</span>
            <Badge className={`text-[10px] border ${st.color}`}>{st.label}</Badge>
            <span className="text-xs text-zinc-500">{TYPE_LABELS[dispute.type] || dispute.type}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Por {openerLabel} · {dispute.created_at?.split('T')[0]}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5 border-t border-white/[0.05]">
          {/* Who opened */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Abierta por</p>
              <p className="text-sm text-white">{openerLabel}</p>
              <p className="text-xs text-zinc-500 mt-2 uppercase tracking-wide">Descripción</p>
              <p className="text-sm text-zinc-300 mt-1 leading-relaxed">{dispute.description}</p>
              {dispute.evidence_photos?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Fotos del abridor</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {dispute.evidence_photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              {dispute.respondent_response ? (
                <>
                  <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Respuesta de la otra parte</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{dispute.respondent_response}</p>
                  {dispute.respondent_photos?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Fotos de la respuesta</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {dispute.respondent_photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[80px] rounded-lg bg-zinc-800/40 border border-dashed border-zinc-700">
                  <p className="text-xs text-zinc-500">Sin respuesta aún de la otra parte</p>
                </div>
              )}
            </div>
          </div>

          {/* Resolution area */}
          {isResolved ? (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-green-400 font-medium uppercase tracking-wide">Resuelta por admin {dispute.resolved_by?.slice(0, 8)}</p>
              <p className="text-sm text-zinc-300 mt-1">{dispute.resolution_notes}</p>
              <p className="text-xs text-zinc-500 mt-1">Acción fianza: {DEPOSIT_ACTION_LABELS[dispute.deposit_action] || dispute.deposit_action}</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-white/[0.05]">
              <p className="text-xs text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                Resolución del admin
              </p>

              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas de resolución (obligatorio)…"
                rows={3}
                className="text-sm"
                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              />

              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Acción sobre la fianza</p>
                <Select value={depositAction} onValueChange={setDepositAction}>
                  <SelectTrigger style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {Object.entries(DEPOSIT_ACTION_LABELS).map(([val, lbl]) => (
                      <SelectItem key={val} value={val}>{lbl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={!notes.trim() || resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate({ action: 'capture_to_owner' })}
                  className="bg-green-700 hover:bg-green-600 text-white text-xs"
                >
                  {resolveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                  Dar la razón al propietario
                </Button>
                <Button
                  size="sm"
                  disabled={!notes.trim() || resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate({ action: 'release_to_renter' })}
                  className="bg-blue-700 hover:bg-blue-600 text-white text-xs"
                >
                  {resolveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                  Dar la razón al arrendatario
                </Button>
                <Button
                  size="sm"
                  disabled={!notes.trim() || resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate({ action: 'split' })}
                  className="bg-purple-700 hover:bg-purple-600 text-white text-xs"
                >
                  {resolveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Scale className="w-3 h-3 mr-1" />}
                  Resolución parcial
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!notes.trim() || resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate({ action: null })}
                  className="border-zinc-600 text-zinc-400 text-xs"
                >
                  Desestimar disputa
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDisputesTab({ enabled, adminId }) {
  const queryClient = useQueryClient();

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: () => db.entities.Dispute.list('-created_at', 200),
    enabled,
  });

  const openCount = useMemo(() => disputes.filter(d => !['resolved', 'dismissed'].includes(d.status)).length, [disputes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1DDF7A', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          <span className="text-white font-semibold">{disputes.length}</span> disputas totales ·{' '}
          <span className="text-amber-400 font-semibold">{openCount}</span> pendientes
        </p>
      </div>

      {disputes.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay disputas registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => (
            <DisputeRow
              key={d.id}
              dispute={d}
              adminId={adminId}
              onResolved={() => queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}