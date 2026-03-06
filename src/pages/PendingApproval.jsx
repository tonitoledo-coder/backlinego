import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Ban } from 'lucide-react';

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

        {/* Icon */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)' }}
        >
          <Ban className="w-12 h-12" style={{ color: '#ef4444' }} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white">
          Cuenta suspendida
        </h1>

        {/* Message */}
        <p className="text-zinc-400 leading-relaxed">
          Tu cuenta ha sido suspendida temporalmente. Si crees que es un error, contacta con nosotros en{' '}
          <a href="mailto:hola@backlinego.com" className="text-white underline underline-offset-2">
            hola@backlinego.com
          </a>
        </p>

        {/* Logout */}
        <Button
          variant="ghost"
          className="text-zinc-400 hover:text-white mt-2"
          onClick={() => base44.auth.logout()}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}