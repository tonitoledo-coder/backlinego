import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, Eye, Loader2 } from 'lucide-react';

function KycBadge({ status }) {
  const cfg = {
    not_submitted: { label: 'No enviado', cls: 'bg-zinc-700 text-zinc-300' },
    pending_review: { label: 'En revisión', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
    verified:       { label: 'Verificado', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
    rejected:       { label: 'Rechazado', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  };
  const c = cfg[status] || cfg.not_submitted;
  return <Badge className={c.cls}>{c.label}</Badge>;
}

function ReviewModal({ profile, open, onClose, onDone }) {
  const [rejectReason, setRejectReason] = useState('');
  const [mode, setMode] = useState(null); // 'reject' | null

  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => base44.entities.UserProfile.update(profile.id, {
      identity_status: 'verified',
      identity_reviewed_at: new Date().toISOString().split('T')[0],
      id_verified: true,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] }); onDone(); onClose(); },
  });

  const rejectMutation = useMutation({
    mutationFn: () => base44.entities.UserProfile.update(profile.id, {
      identity_status: 'rejected',
      identity_reviewed_at: new Date().toISOString().split('T')[0],
      identity_rejection_reason: rejectReason,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] }); onDone(); onClose(); },
  });

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            Revisión KYC — {profile.display_name || profile.email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span>{profile.email}</span>
            <KycBadge status={profile.identity_status} />
            {profile.identity_submitted_at && (
              <span className="text-zinc-500">Enviado: {profile.identity_submitted_at}</span>
            )}
          </div>

          {/* Photos */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'DNI Frontal', url: profile.identity_doc_front },
              { label: 'DNI Trasera', url: profile.identity_doc_back },
              { label: 'Selfie', url: profile.identity_selfie },
            ].map(({ label, url }) => (
              <div key={label}>
                <p className="text-xs text-zinc-400 mb-1.5">{label}</p>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={label} className="w-full aspect-video object-cover rounded-lg border border-zinc-700 hover:border-amber-500/50 transition-colors" />
                  </a>
                ) : (
                  <div className="w-full aspect-video rounded-lg border border-dashed border-zinc-700 flex items-center justify-center">
                    <span className="text-xs text-zinc-600">No subido</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reject reason input */}
          {mode === 'reject' && (
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Motivo del rechazo</label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Ej: La foto del documento es ilegible. Por favor, sube una imagen más nítida."
                rows={3}
                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancelar</Button>
          {mode === 'reject' ? (
            <>
              <Button variant="ghost" onClick={() => setMode(null)} className="text-zinc-400">Atrás</Button>
              <Button
                onClick={() => rejectMutation.mutate()}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                Confirmar rechazo
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setMode('reject')}
                variant="outline"
                className="border-red-800 text-red-400 hover:bg-red-950/40"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rechazar
              </Button>
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                Verificar identidad
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminKycTab({ enabled }) {
  const [reviewing, setReviewing] = useState(null);
  const queryClient = useQueryClient();

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['admin', 'kyc'],
    queryFn: () => base44.entities.UserProfile.filter({ identity_status: 'pending_review' }, '-identity_submitted_at', 200),
    enabled,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-amber-400" />
        <h2 className="text-white font-semibold">Verificaciones pendientes</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">{pending.length}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
        </div>
      ) : pending.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <CheckCircle className="w-12 h-12 text-emerald-500/40 mx-auto mb-3" />
          <p>No hay verificaciones pendientes</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden space-y-2" >
          {pending.map(profile => (
            <div
              key={profile.id}
              className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
              style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Mini photo previews */}
              <div className="flex gap-1.5 shrink-0">
                {[profile.identity_doc_front, profile.identity_doc_back, profile.identity_selfie].map((url, i) => (
                  url
                    ? <img key={i} src={url} alt="" className="w-10 h-10 object-cover rounded-lg border border-zinc-700" />
                    : <div key={i} className="w-10 h-10 rounded-lg border border-dashed border-zinc-700 bg-zinc-800" />
                ))}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{profile.display_name || '—'}</p>
                <p className="text-xs text-zinc-500 truncate">{profile.email}</p>
                {profile.identity_submitted_at && (
                  <p className="text-xs text-zinc-600 mt-0.5">Enviado: {profile.identity_submitted_at}</p>
                )}
              </div>

              <KycBadge status={profile.identity_status} />

              <Button
                size="sm"
                onClick={() => setReviewing(profile)}
                className="shrink-0 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Revisar
              </Button>
            </div>
          ))}
        </div>
      )}

      <ReviewModal
        profile={reviewing}
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] })}
      />
    </div>
  );
}