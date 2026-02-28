import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Loader2, CheckCircle, Wrench, Zap } from 'lucide-react';

export default function QuoteRequestModal({ specialist, open, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    description: '',
    equipment_type: '',
    urgency: 'normal'
  });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data) => {
      // Save the request
      const created = await base44.entities.QuoteRequest.create(data);
      // In-app notification for specialist
      if (specialist.email) {
        await base44.entities.Notification.create({
          user_email: specialist.email,
          type: 'quote_request',
          title: `Nueva solicitud de ${data.requester_name}`,
          body: `${data.equipment_type} — ${data.urgency === 'urgente' ? '⚡ Urgente' : 'Normal'}`,
          link_page: 'Chat',
          link_params: `id=${created.id}`,
          read: false,
        });
      }
      // Send email notification to specialist
      if (specialist.email) {
        await base44.integrations.Core.SendEmail({
          to: specialist.email,
          subject: `Nueva solicitud de presupuesto - BacklineGo`,
          body: `Hola ${specialist.name},\n\nHas recibido una nueva solicitud de presupuesto en BacklineGo:\n\n` +
                `👤 Cliente: ${data.requester_name} (${data.requester_email})\n` +
                `📱 Teléfono: ${data.requester_phone || 'No indicado'}\n` +
                `🔧 Equipo: ${data.equipment_type}\n` +
                `⚡ Urgencia: ${data.urgency === 'urgente' ? 'URGENTE' : 'Normal'}\n\n` +
                `📝 Descripción:\n${data.description}\n\n` +
                `Accede a la app para ver las fotos y responder con tu presupuesto.\n\n` +
                         `BacklineGo Team`
                });
                }
                return created;
                },
    onSuccess: (createdRequest) => {
      setSuccess(true);
      // Navigate to chat after short delay
      setTimeout(() => {
        navigate(createPageUrl('Chat') + `?id=${createdRequest.id}`);
      }, 1500);
    }
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = await Promise.all(
      files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url))
    );
    setPhotos(prev => [...prev, ...urls].slice(0, 5));
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await mutation.mutateAsync({
      ...form,
      specialist_id: specialist.id,
      specialist_email: specialist.email,
      specialist_name: specialist.name,
      photos,
      status: 'pending'
    });
  };

  const handleClose = () => {
    setSuccess(false);
    setForm({ requester_name: '', requester_email: '', requester_phone: '', description: '', equipment_type: '', urgency: 'normal' });
    setPhotos([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-purple-400" />
            Presupuesto — {specialist?.name}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">¡Solicitud enviada!</h3>
            <p className="text-zinc-400 text-sm mb-4">
              {specialist?.name} ha recibido tu solicitud. Abriendo chat...
            </p>
            <div className="flex items-center justify-center gap-2 text-purple-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirigiendo al chat
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300 text-sm">Tu nombre *</Label>
                <Input
                  value={form.requester_name}
                  onChange={e => setForm(p => ({ ...p, requester_name: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm">Email *</Label>
                <Input
                  type="email"
                  value={form.requester_email}
                  onChange={e => setForm(p => ({ ...p, requester_email: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300 text-sm">Teléfono</Label>
                <Input
                  value={form.requester_phone}
                  onChange={e => setForm(p => ({ ...p, requester_phone: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm">Tipo de equipo *</Label>
                <Input
                  value={form.equipment_type}
                  onChange={e => setForm(p => ({ ...p, equipment_type: e.target.value }))}
                  placeholder="Ej: Guitarra eléctrica"
                  className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-zinc-300 text-sm">Describe la avería *</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Explica qué falla, cuándo empezó..."
                className="bg-zinc-800/50 border-zinc-700 text-white mt-1 min-h-[90px]"
                required
              />
            </div>

            {/* Photos */}
            <div>
              <Label className="text-zinc-300 text-sm mb-2 block">Fotos de la avería (máx. 5)</Label>
              <div className="flex gap-2 flex-wrap">
                {photos.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-700 hover:border-purple-500 flex items-center justify-center cursor-pointer transition-colors">
                    {uploading ? (
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-zinc-500" />
                    )}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>

            {/* Urgency */}
            <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-white text-sm font-medium">Urgente</span>
                <span className="text-zinc-500 text-xs">(respuesta prioritaria)</span>
              </div>
              <Switch
                checked={form.urgency === 'urgente'}
                onCheckedChange={v => setForm(p => ({ ...p, urgency: v ? 'urgente' : 'normal' }))}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 h-11"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                'Enviar solicitud de presupuesto'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}