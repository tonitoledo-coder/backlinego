import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Loader2, MessageSquare } from 'lucide-react';

const TYPE_LABELS = {
  damage:        'Daños en el equipo',
  missing_items: 'Elementos faltantes',
  not_returned:  'Equipo no devuelto',
  other:         'Otro motivo',
};

export default function DisputeResponseModal({ dispute, open, onClose, onResponded }) {
  const [response, setResponse] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [opener, setOpener] = useState(null);

  useEffect(() => {
    if (!dispute?.opened_by) return;
    db.entities.UserProfile.get(dispute.opened_by).then(setOpener).catch(() => {});
  }, [dispute?.opened_by]);

  const openerLabel = opener?.display_name || opener?.username || opener?.email || (dispute?.opened_by ? dispute.opened_by.slice(0, 8) : '—');

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 6) { alert('Máximo 6 fotos'); return; }
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await db.integrations.Core.UploadFile({ file, context: 'dispute' });
      uploaded.push(file_url);
    }
    setPhotos(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!response.trim()) return;
    setSubmitting(true);
    try {
      await db.entities.Dispute.update(dispute.id, {
        respondent_response: response,
        respondent_photos: photos,
        status: 'under_review',
      });
      setSuccess(true);
      onResponded?.();
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto">
              <MessageSquare className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Respuesta enviada</h3>
            <p className="text-zinc-400 text-sm">
              BacklineGo revisará tu respuesta junto con las evidencias. Resolución en 48-72h.
            </p>
            <Button onClick={onClose} className="bg-zinc-700 hover:bg-zinc-600">Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Responder a la disputa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Dispute info */}
          <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700 space-y-2">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Disputa abierta por</p>
            <p className="text-sm text-white font-medium">{openerLabel}</p>
            <p className="text-xs text-zinc-400 uppercase tracking-wide mt-2">Motivo</p>
            <p className="text-sm text-amber-300">{TYPE_LABELS[dispute.type] || dispute.type}</p>
            <p className="text-xs text-zinc-400 uppercase tracking-wide mt-2">Descripción</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{dispute.description}</p>
            {dispute.evidence_photos?.length > 0 && (
              <>
                <p className="text-xs text-zinc-400 uppercase tracking-wide mt-2">Fotos de evidencia</p>
                <div className="grid grid-cols-3 gap-2">
                  {dispute.evidence_photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">Tu respuesta *</label>
            <Textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Explica tu versión de los hechos con el mayor detalle posible…"
              rows={5}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">Fotos de tu parte (máx. 6)</label>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < 6 && (
              <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-zinc-700 text-zinc-400 text-sm cursor-pointer hover:border-zinc-500 hover:text-zinc-300 transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Subiendo…' : 'Añadir fotos'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!response.trim() || submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando…</> : 'Enviar respuesta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}