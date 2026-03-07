import React, { useState, useEffect } from 'react';
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
import { Guitar, Package, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_STYLES = {
  available:   { bg: '#1DDF7A20', color: '#1DDF7A', border: '#1DDF7A40', label: 'Disponible' },
  rented:      { bg: '#3b82f620', color: '#60a5fa', border: '#3b82f640', label: 'Alquilado' },
  maintenance: { bg: '#fbbf2420', color: '#fbbf24', border: '#fbbf2440', label: 'Mantenimiento' },
  unavailable: { bg: '#ef444420', color: '#ef4444', border: '#ef444440', label: 'No disponible' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.unavailable;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-zinc-800" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-40 bg-zinc-800 rounded" />
        <div className="h-2.5 w-24 bg-zinc-800 rounded" />
      </div>
      <div className="h-3 w-16 bg-zinc-800 rounded" />
    </div>
  );
}

function EquipmentEditModal({ equipment, open, onClose, onSaved }) {
  const [form, setForm] = useState({});

  React.useEffect(() => {
    if (equipment) setForm({ ...equipment });
  }, [equipment]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.update(equipment.id, data),
    onSuccess: () => { onSaved(); onClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Equipment.delete(equipment.id),
    onSuccess: () => { onSaved(); onClose(); },
  });

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${equipment.title}"? Esta acción no se puede deshacer.`)) {
      deleteMutation.mutate();
    }
  };

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            Editar anuncio — {equipment.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Estado</label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="rented">Alquilado</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="unavailable">No disponible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Precio/día (€)</label>
              <Input type="number" min={0} step={0.01} value={form.price_per_day ?? ''}
                onChange={e => set('price_per_day', Number(e.target.value))}
                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Condición (1–10)</label>
            <Input type="number" min={1} max={10} value={form.condition ?? ''}
              onChange={e => set('condition', Number(e.target.value))}
              style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Descripción</label>
            <Textarea rows={4} value={form.description || ''}
              onChange={e => set('description', e.target.value)}
              style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
          </div>

          <div className="rounded-lg p-3 text-xs text-zinc-500"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-zinc-400">Propietario: </span>
            <span className="text-white font-mono">{equipment.created_by}</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30 sm:mr-auto">
            <Trash2 className="w-4 h-4 mr-1.5" />
            Eliminar anuncio
          </Button>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancelar</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
            style={{ background: '#1DDF7A', color: '#060E18' }}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EquipmentRow({ item, onEdit, onToggleStatus }) {
  const [hovered, setHovered] = useState(false);
  const thumb = item.images?.[0];

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer"
      style={{ background: hovered ? '#1e1e30' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit(item)}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
        {thumb
          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
          : <Guitar className="w-5 h-5 text-zinc-600" />}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{item.title}</div>
        <div className="text-xs text-zinc-500 truncate">{item.created_by}</div>
      </div>

      {/* Badges */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <StatusBadge status={item.status} />
        <span className="text-xs text-zinc-400">€{item.price_per_day}/día</span>
        <span className="text-xs text-zinc-500">{item.condition ?? '—'}/10</span>
      </div>

      {/* Date */}
      <div className="hidden lg:block text-xs text-zinc-600 shrink-0">
        {item.created_date ? format(new Date(item.created_date), 'dd/MM/yy') : '—'}
      </div>

      {/* Quick toggle on hover */}
      {hovered && (
        <button
          className="px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={e => { e.stopPropagation(); onToggleStatus(item); }}
        >
          {item.status === 'available' ? 'Desactivar' : 'Activar'}
        </button>
      )}
    </div>
  );
}

export default function AdminEquipmentTab({ enabled }) {
  const [editItem, setEditItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['admin', 'equipment'],
    queryFn: () => base44.entities.Equipment.list('-created_date', 500),
    enabled,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Equipment.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'equipment'] }),
    onError: (err) => console.error('Toggle status failed', err),
  });

  const handleToggle = (item) => {
    const next = item.status === 'available' ? 'unavailable' : 'available';
    toggleMutation.mutate({ id: item.id, status: next });
  };

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-3">
        <span className="text-white font-medium">{equipment.length}</span> anuncios totales
      </p>

      <div className="rounded-xl overflow-hidden" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.06)' }}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
        ) : equipment.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">No hay anuncios</div>
        ) : (
          equipment.map(item => (
            <EquipmentRow
              key={item.id}
              item={item}
              onEdit={setEditItem}
              onToggleStatus={handleToggle}
            />
          ))
        )}
      </div>

      <EquipmentEditModal
        equipment={editItem}
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin', 'equipment'] })}
      />
    </div>
  );
}