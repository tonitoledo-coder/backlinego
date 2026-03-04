import React, { useState } from 'react';
import { Shield, Monitor, Smartphone, Globe, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const MOCK_SESSIONS = [
  { id: 1, device: 'Chrome · macOS', location: 'Madrid, España', last_seen: 'Ahora', current: true, icon: Monitor },
  { id: 2, device: 'Safari · iPhone', location: 'Barcelona, España', last_seen: 'Hace 2 días', current: false, icon: Smartphone },
];

export default function SettingsSecurity({ user }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutAll = () => {
    setLoggingOut(true);
    setTimeout(() => base44.auth.logout(), 1000);
  };

  return (
    <div className="space-y-5">
      {/* Password change */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.07)' }}>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Contraseña</h3>
        <p className="text-sm text-zinc-400">
          El cambio de contraseña se gestiona a través de tu proveedor de autenticación. Puedes solicitar un correo de restablecimiento.
        </p>
        <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'rgba(167,139,250,0.07)', borderColor: 'rgba(167,139,250,0.2)' }}>
          <Shield className="w-4 h-4 flex-shrink-0" style={{ color: '#a78bfa' }} />
          <span className="text-xs text-zinc-400">Email asociado: <span className="text-white font-medium">{user?.email}</span></span>
        </div>
        <Button
          onClick={() => base44.auth.redirectToLogin()}
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          size="sm"
        >
          Restablecer contraseña
        </Button>
      </div>

      {/* Active sessions */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: '#161625', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Sesiones activas</h3>
          <Button onClick={handleLogoutAll} disabled={loggingOut} size="sm" variant="outline" className="border-red-900 text-red-400 hover:bg-red-900/20 text-xs gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Cerrar todas
          </Button>
        </div>
        <div className="space-y-3">
          {MOCK_SESSIONS.map(session => {
            const Icon = session.icon;
            return (
              <div key={session.id} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <Icon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{session.device}</p>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Globe className="w-3 h-3" />
                      <span>{session.location}</span>
                      <span>·</span>
                      <span>{session.last_seen}</span>
                    </div>
                  </div>
                </div>
                {session.current && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                    Actual
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}