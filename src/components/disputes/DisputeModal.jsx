import React, { useState } from 'react';
import { db } from '@/lib/db';
import { sendBookingEmail } from '@/utils/sendBookingEmail';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Upload, X, Loader2 } from 'lucide-react';

const DISPUTE_TYPES = [
  { value: 'damage',        label: 'Daños en el equipo' },
  { value: 'missing_items', label: 'Elementos faltantes' },
  { value: 'not_returned',  label: 'Equipo no devuelto' },
  { value: 'other',         label: 'Otro motivo' },
];

export default function DisputeModal({ booking, currentUserId, otherPartyEmail, open, onClose, onDisputeOpened }) {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 6) {
      alert('Máximo 6 fotos de evidencia');
      return;
    }
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
    if (!type || description.length < 50) return;
    setSubmitting(true);
    try {
      await db.entities.Dispute.create({
        booking_id: booking.id,
        opened_by: currentUserId,
        type,
        description,
        evidence_photos: photos,
        status: 'open',
      });

      await db.entities.Booking.update(booking.id, { status: 'disputed' });

      sendBookingEmail('dispute_opened', booking, {
        equipmentTitle:  booking.equipment_title,
        otherPartyEmail: otherPartyEmail,
        openedBy:        currentUserId,
        disputeType:     DISPUTE_TYPES.find(dt => dt.value === type)?.label || type,
      });

      setSuccess(true);
      onDisputeOpened?.();
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = type && description.length >= 50 && !submitting && !uploading;

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Disputa abierta</h3>
            <p className="text-zinc-400 text-sm">
              El equipo de BacklineGo revisará las evidencias en un plazo de 48-72h. Te notificaremos por email con el resultado.
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
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Abrir disputa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            Solo puedes abrir una disputa durante las primeras 48h tras la devolución. BacklineGo mediará y resolverá en 48-72h.
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">Tipo de problema *</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Selecciona el motivo…" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {DISPUTE_TYPES.map(dt => (
                  <SelectItem key={dt.value} value={dt.value} className="text-white hover:bg-zinc-800">
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Descripción * <span className="text-zinc-500 font-normal">({description.length}/50 mínimo)</span>
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe el problema con detalle: qué sucedió, cuándo lo detectaste, qué daños hay…"
              rows={5}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
            />
            {description.length > 0 && description.length < 50 && (
              <p className="text-xs text-amber-400 mt-1">Necesitas al menos 50 caracteres ({50 - description.length} más)</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">Fotos de evidencia (máx. 6)</label>
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
            disabled={!canSubmit}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando…</> : 'Abrir disputa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}