import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Upload, Loader2, CheckCircle, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  not_submitted: {
    label: 'No enviado',
    badge: 'bg-zinc-700 text-zinc-300',
    icon: AlertCircle,
    iconColor: 'text-zinc-400',
  },
  pending_review: {
    label: 'En revisión',
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    icon: Clock,
    iconColor: 'text-amber-400',
  },
  verified: {
    label: 'Verificado ✓',
    badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    icon: CheckCircle,
    iconColor: 'text-emerald-400',
  },
  rejected: {
    label: 'Rechazado',
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
    icon: XCircle,
    iconColor: 'text-red-400',
  },
};

function DocUploadSlot({ label, hint, value, onChange, uploading }) {
  const [slotUploading, setSlotUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlotUploading(true);
    try {
      const result = await db.integrations.Core.UploadFile({ file, context: 'identity' });
      onChange(result.file_url);
    } finally {
      setSlotUploading(false);
    }
  };

  const isLoading = slotUploading || uploading;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-zinc-300">{label}</p>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      <label className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden aspect-video
        ${value ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/30'}`}>
        {isLoading ? (
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        ) : value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover absolute inset-0" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-zinc-500 mb-1" />
            <span className="text-xs text-zinc-500">Subir foto</span>
          </>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={isLoading} />
      </label>
    </div>
  );
}

export default function IdentityVerificationForm({ userProfile, onUpdated }) {
  const status = userProfile?.identity_status || 'not_submitted';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_submitted;
  const StatusIcon = config.icon;

  const [front, setFront] = useState(userProfile?.identity_doc_front || '');
  const [back, setBack] = useState(userProfile?.identity_doc_back || '');
  const [selfie, setSelfie] = useState(userProfile?.identity_selfie || '');
  const [uploading] = useState(false);

  const canSubmit = front && back && selfie;
  const canResubmit = status === 'rejected' || status === 'not_submitted';

  const submitMutation = useMutation({
    mutationFn: () => db.entities.UserProfile.update(userProfile.id, {
      identity_doc_front: front,
      identity_doc_back: back,
      identity_selfie: selfie,
      identity_status: 'pending_review',
      identity_submitted_at: new Date().toISOString().split('T')[0],
    }),
    onSuccess: (updated) => {
      if (onUpdated) onUpdated(updated);
    },
  });

  if (!userProfile) return null;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between gap-2 text-base">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Verificación de identidad
          </div>
          <Badge className={config.badge}>
            <StatusIcon className={`w-3 h-3 mr-1 ${config.iconColor}`} />
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === 'verified' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">Tu identidad está verificada. Puedes publicar equipos con total confianza.</p>
          </div>
        )}

        {status === 'pending_review' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">Tus documentos están siendo revisados. Te notificaremos en 24-48h.</p>
          </div>
        )}

        {status === 'rejected' && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300 font-medium">Verificación rechazada</p>
              {userProfile.identity_rejection_reason && (
                <p className="text-xs text-red-400 mt-1">{userProfile.identity_rejection_reason}</p>
              )}
              <p className="text-xs text-zinc-400 mt-1">Puedes volver a enviar tus documentos a continuación.</p>
            </div>
          </div>
        )}

        {(status === 'not_submitted' || status === 'rejected') && (
          <p className="text-sm text-zinc-400">
            Sube una foto de tu DNI o pasaporte (frontal y trasera) y una selfie sosteniéndolo. Esto protege a la comunidad y activa tu perfil de propietario.
          </p>
        )}

        {canResubmit && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DocUploadSlot
                label="DNI / Pasaporte — Frontal"
                hint="Cara con foto y nombre"
                value={front}
                onChange={setFront}
                uploading={uploading}
              />
              <DocUploadSlot
                label="DNI / Pasaporte — Trasera"
                hint="Cara con datos adicionales"
                value={back}
                onChange={setBack}
                uploading={uploading}
              />
              <DocUploadSlot
                label="Selfie con documento"
                hint="Sostén el documento junto a tu cara"
                value={selfie}
                onChange={setSelfie}
                uploading={uploading}
              />
            </div>

            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!canSubmit || submitMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {submitMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" /> Enviar para verificación</>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}