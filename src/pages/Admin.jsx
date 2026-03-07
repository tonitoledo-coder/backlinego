import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Crown, Calendar, XCircle, RefreshCw, Users, ShieldCheck, Ban, AlertTriangle,
  Star, UserCog, User, Package, BookOpen, DollarSign, Edit2
} from 'lucide-react';
import CancelBookingModal from '@/components/booking/CancelBookingModal';

// ─── Access Guard ────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0d0d1a' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
        <Ban className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-white">Acceso denegado</h1>
      <p className="text-zinc-400">Solo los administradores pueden acceder a esta sección.</p>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-bold text-white">{value}</div>
        <div className="text-xs text-zinc-400">{label}</div>
      </div>
    </div>
  );
}

// ─── Toggle Button ───────────────────────────────────────────────────────────
function ToggleBtn({ active, onToggle, label, activeColor }) {
  return (
    <button
      onClick={onToggle}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: active ? `${activeColor}20` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.1)'}`,
        color: active ? activeColor : '#94a3b8',
      }}
    >
      {label}
    </button>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ profile, open, onClose, onSaved }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (profile) setForm({ ...profile });
  }, [profile]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(profile.id, data),
    onSuccess: () => { onSaved(); onClose(); },
  });

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserCog className="w-5 h-5" style={{ color: '#a78bfa' }} />
            Editar perfil — {profile.display_name || profile.email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Role & Plan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Rol</label>
              <Select value={form.role} onValueChange={v => set('role', v)}>
                <SelectTrigger style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <SelectItem value="user">user</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="moderator">moderator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Plan</label>
              <Select value={form.subscription_plan} onValueChange={v => set('subscription_plan', v)}>
                <SelectTrigger style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <SelectItem value="free">free</SelectItem>
                  <SelectItem value="pro">pro</SelectItem>
                  <SelectItem value="business">business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggle flags */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Flags</label>
            <div className="flex flex-wrap gap-2">
              <ToggleBtn active={form.is_verified} onToggle={() => set('is_verified', !form.is_verified)} label="Verificado" activeColor="#1DDF7A" />
              <ToggleBtn active={form.id_verified} onToggle={() => set('id_verified', !form.id_verified)} label="ID Verificado" activeColor="#1DDF7A" />
              <ToggleBtn active={form.is_banned} onToggle={() => set('is_banned', !form.is_banned)} label="Baneado" activeColor="#ef4444" />
              <ToggleBtn active={form.flagged} onToggle={() => set('flagged', !form.flagged)} label="Flagged" activeColor="#fbbf24" />
              <ToggleBtn active={form.profile_complete} onToggle={() => set('profile_complete', !form.profile_complete)} label="Perfil completo" activeColor="#a78bfa" />
            </div>
          </div>

          {/* Conditional inputs */}
          {form.is_banned && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Motivo del ban</label>
              <Input value={form.ban_reason || ''} onChange={e => set('ban_reason', e.target.value)}
                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
            </div>
          )}
          {form.flagged && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Motivo del flag</label>
              <Input value={form.flag_reason || ''} onChange={e => set('flag_reason', e.target.value)}
                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
            </div>
          )}

          {/* Access level */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nivel de acceso (1–10)</label>
            <Input type="number" min={1} max={10} value={form.access_level ?? 1}
              onChange={e => set('access_level', Number(e.target.value))}
              style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notas internas</label>
            <Textarea rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)}
              style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
          </div>

          {/* Read-only stats */}
          <div className="grid grid-cols-3 gap-3 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{profile.equipment_count ?? 0}</div>
              <div className="text-xs text-zinc-400">Equipos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{profile.bookings_count ?? 0}</div>
              <div className="text-xs text-zinc-400">Reservas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">€{profile.total_revenue ?? 0}</div>
              <div className="text-xs text-zinc-400">Ingresos</div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancelar</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
            style={{ background: '#1DDF7A', color: '#060E18' }}>
            {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Profile Row ──────────────────────────────────────────────────────────────
function ProfileRow({ profile, onEdit, onVerify, onBan }) {
  const [hovered, setHovered] = useState(false);

  const roleBadgeStyle = {
    admin: { background: '#fbbf2420', color: '#fbbf24', border: '1px solid #fbbf2440' },
    moderator: { background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f640' },
    user: { background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' },
  };
  const planBadgeStyle = {
    free: { background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' },
    pro: { background: '#1DDF7A20', color: '#1DDF7A', border: '1px solid #1DDF7A40' },
    business: { background: '#a78bfa20', color: '#a78bfa', border: '1px solid #a78bfa40' },
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{ background: hovered ? '#1e1e30' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(167,139,250,0.15)' }}>
        <User className="w-4 h-4" style={{ color: '#a78bfa' }} />
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {profile.display_name || '—'}
          {profile.is_verified && <ShieldCheck className="w-3.5 h-3.5 inline ml-1 text-green-400" />}
          {profile.is_banned && <Ban className="w-3.5 h-3.5 inline ml-1 text-red-400" />}
          {profile.flagged && <AlertTriangle className="w-3.5 h-3.5 inline ml-1 text-amber-400" />}
        </div>
        <div className="text-xs text-zinc-500 truncate">{profile.email}</div>
      </div>

      {/* Badges */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={roleBadgeStyle[profile.role] || roleBadgeStyle.user}>
          {profile.role || 'user'}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={planBadgeStyle[profile.subscription_plan] || planBadgeStyle.free}>
          {profile.subscription_plan || 'free'}
        </span>
      </div>

      {/* Stats (lg only) */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-zinc-500 shrink-0">
        <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />{profile.equipment_count ?? 0}</span>
        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{profile.bookings_count ?? 0}</span>
        {profile.rating && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{profile.rating.toFixed(1)}</span>}
      </div>

      {/* Actions */}
      {hovered && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onVerify(profile)}
            className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
            style={{ background: profile.is_verified ? '#1DDF7A20' : 'rgba(255,255,255,0.05)', color: profile.is_verified ? '#1DDF7A' : '#94a3b8', border: `1px solid ${profile.is_verified ? '#1DDF7A40' : 'rgba(255,255,255,0.1)'}` }}>
            {profile.is_verified ? 'Desverificar' : 'Verificar'}
          </button>
          <button onClick={() => onBan(profile)}
            className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
            style={{ background: profile.is_banned ? '#ef444420' : 'rgba(255,255,255,0.05)', color: profile.is_banned ? '#ef4444' : '#94a3b8', border: `1px solid ${profile.is_banned ? '#ef444440' : 'rgba(255,255,255,0.1)'}` }}>
            {profile.is_banned ? 'Desbanear' : 'Banear'}
          </button>
          <button onClick={() => onEdit(profile)}
            className="p-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Admin() {
  const [authState, setAuthState] = useState('loading'); // loading | denied | ok
  const [editProfile, setEditProfile] = useState(null);
  const [adminCancelBooking, setAdminCancelBooking] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');

  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { base44.auth.redirectToLogin(); return; }
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ email: user.email });
      if (!profiles?.length || profiles[0].role !== 'admin') {
        setAuthState('denied');
      } else {
        setAuthState('ok');
      }
    })();
  }, []);

  const { data: activeBookings = [] } = useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: () => base44.entities.Booking.filter(
      { status: 'confirmed' },
      '-created_date',
      200
    ),
    enabled: authState === 'ok',
  });

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'userprofiles'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 500),
    enabled: authState === 'ok',
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, val }) => base44.entities.UserProfile.update(id, { is_verified: val }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'userprofiles'] }),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, val }) => base44.entities.UserProfile.update(id, { is_banned: val }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'userprofiles'] }),
  });

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      const q = search.toLowerCase();
      if (q && !p.email?.toLowerCase().includes(q) && !p.display_name?.toLowerCase().includes(q)) return false;
      if (filterRole !== 'all' && p.role !== filterRole) return false;
      if (filterPlan !== 'all' && p.subscription_plan !== filterPlan) return false;
      if (filterStatus === 'verificados' && !p.is_verified) return false;
      if (filterStatus === 'sin_verificar' && p.is_verified) return false;
      if (filterStatus === 'baneados' && !p.is_banned) return false;
      if (filterStatus === 'flagged' && !p.flagged) return false;
      return true;
    });
  }, [profiles, search, filterRole, filterStatus, filterPlan]);

  const stats = useMemo(() => ({
    total: profiles.length,
    active: profiles.filter(p => !p.is_banned).length,
    verified: profiles.filter(p => p.is_verified).length,
    banned: profiles.filter(p => p.is_banned).length,
    flagged: profiles.filter(p => p.flagged).length,
    premium: profiles.filter(p => ['pro', 'business'].includes(p.subscription_plan)).length,
    admins: profiles.filter(p => p.role === 'admin').length,
  }), [profiles]);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d1a' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#1DDF7A', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (authState === 'denied') return <AccessDenied />;

  return (
    <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto" style={{ background: '#0d0d1a' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Crown className="w-7 h-7" style={{ color: '#fbbf24' }} />
          <h1 className="text-2xl font-bold text-white">Panel de administración</h1>
        </div>
        <Button variant="ghost" onClick={() => refetch()} className="text-zinc-400 hover:text-white">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={Users} value={stats.total} label="Total usuarios" color="#a78bfa" />
        <StatCard icon={ShieldCheck} value={stats.active} label="Activos" color="#1DDF7A" />
        <StatCard icon={ShieldCheck} value={stats.verified} label="Verificados" color="#60a5fa" />
        <StatCard icon={Ban} value={stats.banned} label="Baneados" color="#ef4444" />
        <StatCard icon={AlertTriangle} value={stats.flagged} label="Flagged" color="#fbbf24" />
        <StatCard icon={Star} value={stats.premium} label="Pro / Business" color="#a78bfa" />
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 mb-4 flex flex-wrap gap-3" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Input
          placeholder="Buscar por email o nombre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px]"
          style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
        />
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-36" style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="user">user</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
            <SelectItem value="moderator">moderator</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40" style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="verificados">Verificados</SelectItem>
            <SelectItem value="sin_verificar">Sin verificar</SelectItem>
            <SelectItem value="baneados">Baneados</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-36" style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
            <SelectItem value="all">Todos los planes</SelectItem>
            <SelectItem value="free">free</SelectItem>
            <SelectItem value="pro">pro</SelectItem>
            <SelectItem value="business">business</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-zinc-500 mb-3">
        Mostrando <span className="text-white font-medium">{filtered.length}</span> de <span className="text-white font-medium">{profiles.length}</span> usuarios
      </p>

      {/* User list */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.06)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1DDF7A', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">No se encontraron usuarios</div>
        ) : (
          <div className="divide-y divide-transparent">
            {filtered.map(p => (
              <ProfileRow
                key={p.id}
                profile={p}
                onEdit={setEditProfile}
                onVerify={profile => verifyMutation.mutate({ id: profile.id, val: !profile.is_verified })}
                onBan={profile => banMutation.mutate({ id: profile.id, val: !profile.is_banned })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditModal
        profile={editProfile}
        open={!!editProfile}
        onClose={() => setEditProfile(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin', 'userprofiles'] })}
      />

      {/* ── Reservas activas ── */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          Reservas confirmadas
          <span className="text-sm font-normal text-zinc-500 ml-1">
            ({activeBookings.length})
          </span>
        </h2>

        {activeBookings.length === 0 ? (
          <p className="text-zinc-500 text-sm">No hay reservas confirmadas en este momento.</p>
        ) : (
          <div className="space-y-2">
            {activeBookings.map(booking => (
              <div
                key={booking.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-white text-sm font-mono font-semibold">
                    #{booking.id?.slice(-8)}
                  </p>
                  <p className="text-zinc-400 text-xs">
                    {booking.start_date} → {booking.end_date}
                    {' · '}
                    <span className="text-white font-medium">
                      €{booking.total_price?.toFixed(0) ?? '—'}
                    </span>
                  </p>
                  <p className="text-zinc-600 text-xs font-mono">
                    renter: {booking.renter_id?.slice(-8)}
                    {' · '}
                    owner: {booking.owner_id?.slice(-8)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-800 text-red-400 hover:bg-red-950/40 flex-shrink-0"
                  onClick={() => setAdminCancelBooking(booking)}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Cancelar reserva
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {adminCancelBooking && (
        <CancelBookingModal
          booking={adminCancelBooking}
          cancelledBy="admin"
          open={!!adminCancelBooking}
          onClose={() => setAdminCancelBooking(null)}
        />
      )}
    </div>
  );
}