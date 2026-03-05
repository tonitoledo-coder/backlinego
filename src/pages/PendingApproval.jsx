import React from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

export default function PendingApproval() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0d0d1a' }}
    >
      <div className="w-full max-w-[420px] flex flex-col items-center text-center gap-6">

        {/* Wordmark */}
        <span className="text-2xl font-bold text-white tracking-tight">
          Backline<span style={{ color: '#1DDF7A' }}>Go</span>
        </span>

        {/* Animated icon */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse"
          style={{ background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.3)' }}
        >
          <Clock className="w-12 h-12" style={{ color: '#f59e0b' }} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white">
          Solicitud en revisión
        </h1>

        {/* Subtitle */}
        <p className="text-zinc-400 leading-relaxed">
          Nuestro equipo está revisando tu cuenta. Este proceso suele tardar menos de 24 horas.
        </p>

        {/* Separator */}
        <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />

        {/* Small note */}
        <p className="text-zinc-500 text-sm">
          Te notificaremos por email cuando tu cuenta esté activa.
        </p>

        {/* Logout */}
        <Button
          variant="ghost"
          className="text-zinc-400 hover:text-white mt-2"
          onClick={() => base44.auth.logout(createPageUrl('Home'))}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}