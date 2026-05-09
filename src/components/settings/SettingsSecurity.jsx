import React, { useState } from 'react';
import { Shield, Monitor, Smartphone, Globe, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { db } from '@/lib/db';

const MOCK_SESSIONS = [
  { id: 1, device: 'Chrome · macOS', location: 'Madrid, España', last_seen: 'Ahora', current: true, icon: Monitor },
  { id: 2, device: 'Safari · iPhone', location: 'Barcelona, España', last_seen: 'Hace 2 días', current: false, icon: Smartphone },
];

export default function SettingsSecurity({ user }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'ELIMINAR') return;
    setDeleting(true);
    try {
      if (user?.id) {
        await db.entities.UserProfile.delete(user.id);
      }
      db.auth.logout();
    } catch (e) {
      setDeleting(false);
    }
  };

  const handleLogoutAll = () => {
    setLoggingOut(true);
    setTimeout(() => db.auth.logout(), 1000);
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
          onClick={() => db.auth.redirectToLogin()}
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
      {/* Delete account */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
        <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Zona de peligro</h3>
        <p className="text-sm text-zinc-400">
          Eliminar tu cuenta es permanente. Se borrarán tus datos de perfil y no podrás recuperar el acceso.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-red-800 text-red-400 hover:bg-red-900/20"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar cuenta
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Eliminar cuenta
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Esta acción es irreversible. Escribe <span className="text-white font-mono font-semibold">ELIMINAR</span> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="ELIMINAR"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300" onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(''); }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteConfirm !== 'ELIMINAR' || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}