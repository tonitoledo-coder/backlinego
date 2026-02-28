import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, CheckCircle, Shield, Smartphone } from 'lucide-react';

// Simple QR visual using CSS grid pattern (no external lib needed)
function QRDisplay({ value }) {
  // Generate a deterministic visual pattern from the booking ID
  const hash = value.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const size = 10;
  const cells = Array.from({ length: size * size }, (_, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    // Border cells always on (QR finder pattern style)
    if (x === 0 || x === size - 1 || y === 0 || y === size - 1) return true;
    if ((x < 3 && y < 3) || (x > size - 4 && y < 3) || (x < 3 && y > size - 4)) return true;
    // Pseudo-random interior
    return ((hash ^ (i * 2654435761)) & 1) === 1;
  });

  return (
    <div className="inline-block p-4 bg-white rounded-2xl shadow-xl">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 200, height: 200 }}
      >
        {cells.map((on, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{ background: on ? '#0a0a0f' : '#ffffff' }}
          />
        ))}
      </div>
    </div>
  );
}

export default function QRDeliveryModal({ booking, open, onClose }) {
  const [step, setStep] = useState('show'); // show | confirmed

  const qrValue = booking?.delivery_qr || `BACKLINE-${booking?.id?.slice(-12)}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-blue-400" />
            QR de Entrega Segura
          </DialogTitle>
        </DialogHeader>

        {step === 'confirmed' ? (
          <div className="py-8">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Entrega confirmada!</h3>
            <p className="text-zinc-400 text-sm mb-6">
              El escrow se liberará automáticamente al finalizar el alquiler.
            </p>
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 w-full">
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Trust badges */}
            <div className="flex justify-center gap-3">
              <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Shield className="w-3 h-3 mr-1" /> Pago Escrow
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" /> Seguro incluido
              </Badge>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <QRDisplay value={qrValue} />
            </div>

            <p className="text-xs text-zinc-500 font-mono bg-zinc-800/50 rounded-lg px-3 py-2">
              {qrValue}
            </p>

            <div className="bg-zinc-800/50 rounded-xl p-4 text-left space-y-2">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                Instrucciones
              </p>
              <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                <li>Muestra este QR al arrendador al recoger el equipo</li>
                <li>El arrendador escanea con la app para confirmar entrega</li>
                <li>El escrow queda activado y el seguro cubre el alquiler</li>
                <li>Al devolver el equipo, se escanea de nuevo para cerrar</li>
              </ol>
            </div>

            <Button
              onClick={() => setStep('confirmed')}
              className="w-full bg-blue-600 hover:bg-blue-700 h-11"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar entrega recibida
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}