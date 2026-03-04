import React, { useState, useEffect } from 'react';
import { X, Share, Plus } from 'lucide-react';

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = window.navigator.standalone === true;
    const dismissed = localStorage.getItem('ios_banner_dismissed');

    if (isIOS && !isInStandaloneMode && !dismissed) {
      // Small delay for smooth entry
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('ios_banner_dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-3 right-3 z-[9999]"
      style={{
        animation: 'slideUpBanner 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <style>{`
        @keyframes slideUpBanner {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          background: '#0d0d14',
          border: '1px solid #22c55e55',
          boxShadow: '0 0 24px rgba(34, 197, 94, 0.15), 0 8px 32px rgba(0,0,0,0.6)',
          borderRadius: '16px',
          padding: '14px 16px',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a08f2a394db4f3cafbc46f/0a293e3b0_Puedeshacerlaconcalidadmxima_1.png"
              alt="BacklineGo"
              className="h-7 w-auto object-contain"
            />
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#22c55e' }}
            >
              Instalar App
            </span>
          </div>
          <button
            onClick={dismiss}
            className="text-zinc-500 hover:text-white transition-colors mt-0.5 shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-white text-sm leading-snug mb-3">
          Para instalar la app en tu iPhone:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: '#22c55e22', border: '1px solid #22c55e44' }}
            >
              <Share className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
            </div>
            <p className="text-zinc-300 text-xs">
              Pulsa el botón <strong className="text-white">Compartir</strong> en Safari
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: '#22c55e22', border: '1px solid #22c55e44' }}
            >
              <Plus className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
            </div>
            <p className="text-zinc-300 text-xs">
              Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}