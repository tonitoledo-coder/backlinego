import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { AlertTriangle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import CancelBookingModal from '@/components/booking/CancelBookingModal';

const BOOKING_STATUS = {
  pending:   { bg: '#fbbf2420', color: '#fbbf24', border: '#fbbf2440', label: 'Pendiente' },
  confirmed: { bg: '#3b82f620', color: '#60a5fa', border: '#3b82f640', label: 'Confirmada' },
  active:    { bg: '#1DDF7A20', color: '#1DDF7A', border: '#1DDF7A40', label: 'Activa' },
  returning: { bg: '#a78bfa20', color: '#a78bfa', border: '#a78bfa40', label: 'En devolución' },
  completed: { bg: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)', label: 'Completada' },
  cancelled: { bg: '#ef444420', color: '#ef4444', border: '#ef444440', label: 'Cancelada' },
  disputed:  { bg: '#f9731620', color: '#f97316', border: '#f9731640', label: 'Disputada' },
};

const ESCROW_STATUS = {
  pending:  { bg: '#fbbf2420', color: '#fbbf24', border: '#fbbf2440', label: 'Pendiente' },
  held:     { bg: '#3b82f620', color: '#60a5fa', border: '#3b82f640', label: 'Retenido' },
  released: { bg: '#1DDF7A20', color: '#1DDF7A', border: '#1DDF7A40', label: 'Liberado' },
  refunded: { bg: '#ef444420', color: '#ef4444', border: '#ef444440', label: 'Reembolsado' },
  disputed: { bg: '#f9731620', color: '#f97316', border: '#f9731640', label: 'Disputado' },
};

function StatusBadge({ status, map }) {
  const s = map[status] || map.pending;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 animate-pulse">
      <div className="h-3 w-20 bg-zinc-800 rounded" />
      <div className="flex-1 h-3 bg-zinc-800 rounded" />
      <div className="h-3 w-16 bg-zinc-800 rounded" />
    </div>
  );
}

function BookingEditModal({ booking, open, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [cancelOpen, setCancelOpen] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (booking) setForm({ status: booking.status, escrow_status: booking.escrow_status, notes: booking.notes || '' });
  }, [booking]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Booking.update(booking.id, data),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err) => console.error('Booking update failed', err),
  });

  if (!booking) return null;

  return (
    <>
      <Dialog open={open && !cancelOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
          <DialogHeader>
            <DialogTitle className="text-white font-mono text-base">
              Reserva #{booking.id?.slice(-8)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Read-only info */}
            <div className="grid grid-cols-2 gap-2 text-xs rounded-lg p-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div><span className="text-zinc-500">Equipo: </span><span className="text-white font-mono">{booking.equipment_id?.slice(-6)}</span></div>
              <div><span className="text-zinc-500">Renter: </span><span className="text-white font-mono">{booking.renter_id?.slice(-6)}</span></div>
              <div><span className="text-zinc-500">Inicio: </span><span className="text-white">{booking.start_date}</span></div>
              <div><span className="text-zinc-500">Fin: </span><span className="text-white">{booking.end_date}</span></div>
              <div><span className="text-zinc-500">Días: </span><span className="text-white">{booking.days}</span></div>
              <div><span className="text-zinc-500">Total: </span><span className="text-white font-medium">€{booking.total_price?.toFixed(2) ?? '—'}</span></div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Estado reserva</label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {Object.entries(BOOKING_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Estado escrow</label>
                <Select value={form.escrow_status} onValueChange={v => set('escrow_status', v)}>
                  <SelectTrigger style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {Object.entries(ESCROW_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.status === 'cancelled' && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
                style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#fca5a5' }}>
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Esto no procesa ningún reembolso automáticamente.
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Notas internas (admin)</label>
              <Textarea rows={3} value={form.notes}
                onChange={e => set('notes', e.target.value)}
                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost"
              className="text-red-400 hover:bg-red-950/30 sm:mr-auto"
              onClick={() => setCancelOpen(true)}>
              <XCircle className="w-4 h-4 mr-1.5" />
              Cancelar reserva
            </Button>
            <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cerrar</Button>
            <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
              style={{ background: '#1DDF7A', color: '#060E18' }}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cancelOpen && (
        <CancelBookingModal
          booking={booking}
          cancelledBy="admin"
          open={cancelOpen}
          onClose={() => {
            setCancelOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin', 'allbookings'] });
            onClose();
          }}
        />
      )}
    </>
  );
}

function BookingRow({ booking, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 rounded-xl transition-all cursor-pointer text-xs"
      style={{ background: hovered ? '#1e1e30' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <span className="font-mono text-white">#{booking.id?.slice(-8)}</span>
      <span className="text-zinc-500">Eq: <span className="text-zinc-300 font-mono">{booking.equipment_id?.slice(-6)}</span></span>
      <span className="text-zinc-500">Renter: <span className="text-zinc-300 font-mono">{booking.renter_id?.slice(-6)}</span></span>
      <span className="text-zinc-400">{booking.start_date} → {booking.end_date}</span>
      <span className="text-zinc-400">{booking.days}d</span>
      <span className="text-white font-medium">€{booking.total_price?.toFixed(0) ?? '—'}</span>
      <StatusBadge status={booking.status} map={BOOKING_STATUS} />
      <StatusBadge status={booking.escrow_status} map={ESCROW_STATUS} />
    </div>
  );
}

export default function AdminBookingsTab({ enabled }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEscrow, setFilterEscrow] = useState('all');
  const [editBooking, setEditBooking] = useState(null);
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin', 'allbookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 500),
    enabled,
  });

  const filtered = useMemo(() => bookings.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (filterEscrow !== 'all' && b.escrow_status !== filterEscrow) return false;
    return true;
  }), [bookings, filterStatus, filterEscrow]);

  const selectStyle = { background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 rounded-xl p-3"
        style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44" style={selectStyle}>
            <SelectValue placeholder="Estado reserva" />
          </SelectTrigger>
          <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(BOOKING_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEscrow} onValueChange={setFilterEscrow}>
          <SelectTrigger className="w-44" style={selectStyle}>
            <SelectValue placeholder="Estado escrow" />
          </SelectTrigger>
          <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
            <SelectItem value="all">Todo el escrow</SelectItem>
            {Object.entries(ESCROW_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-zinc-500 self-center ml-auto">
          <span className="text-white font-medium">{filtered.length}</span> / {bookings.length}
        </span>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.06)' }}>
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">No hay reservas</div>
        ) : (
          filtered.map(b => (
            <BookingRow key={b.id} booking={b} onClick={() => setEditBooking(b)} />
          ))
        )}
      </div>

      <BookingEditModal
        booking={editBooking}
        open={!!editBooking}
        onClose={() => setEditBooking(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin', 'allbookings'] })}
      />
    </div>
  );
}