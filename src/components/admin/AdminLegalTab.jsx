import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import {
  ShieldCheck, Plus, ChevronDown, ChevronUp, AlertTriangle,
  FileText, Eye, Edit3, CheckCircle, RotateCcw
} from 'lucide-react';

// ─── New Document Modal ───────────────────────────────────────────────────────
function NewLegalDocumentModal({ open, onClose, defaultType, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    type: defaultType || 'terms',
    version: '',
    title: '',
    effective_date: '',
    content: '',
    activate: false,
  });
  const [preview, setPreview] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.LegalDocument.create({
        type: data.type,
        version: data.version,
        title: data.title,
        effective_date: data.effective_date,
        content: data.content,
        is_active: data.activate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'legal'] });
      onSaved?.();
      onClose();
      setForm({ type: defaultType || 'terms', version: '', title: '', effective_date: '', content: '', activate: false });
    },
  });

  const handleOpen = (open) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent
        className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: '#3b82f6' }} />
            Nueva versión — {form.type === 'terms' ? 'Términos y Condiciones' : 'Política de Privacidad'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 py-2 pr-1">
          {/* Meta fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Tipo</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              >
                <option value="terms">Términos y Condiciones</option>
                <option value="privacy">Política de Privacidad</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Versión</label>
              <Input
                placeholder="ej. 2.0"
                value={form.version}
                onChange={e => set('version', e.target.value)}
                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha de vigencia</label>
              <Input
                type="date"
                value={form.effective_date}
                onChange={e => set('effective_date', e.target.value)}
                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Título visible</label>
            <Input
              placeholder="ej. Términos y Condiciones de BacklineGo"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            />
          </div>

          {/* Editor + Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-400">Contenido (Markdown)</label>
              <button
                onClick={() => setPreview(p => !p)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{ background: preview ? '#3b82f620' : 'rgba(255,255,255,0.05)', color: preview ? '#3b82f6' : '#94a3b8', border: `1px solid ${preview ? '#3b82f640' : 'rgba(255,255,255,0.1)'}` }}
              >
                <Eye className="w-3.5 h-3.5" />
                {preview ? 'Editar' : 'Preview'}
              </button>
            </div>

            {preview ? (
              <div
                className="rounded-lg p-4 overflow-y-auto prose prose-invert prose-sm max-w-none"
                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', minHeight: '260px', maxHeight: '320px', color: '#e4e4e7' }}
              >
                <ReactMarkdown>{form.content || '*Sin contenido aún*'}</ReactMarkdown>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Textarea
                  rows={14}
                  placeholder="# Términos y Condiciones&#10;&#10;## 1. Introducción..."
                  value={form.content}
                  onChange={e => set('content', e.target.value)}
                  style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'none' }}
                />
                <div
                  className="rounded-lg p-4 overflow-y-auto prose prose-invert prose-sm max-w-none"
                  style={{ background: '#0a0a15', border: '1px solid rgba(255,255,255,0.06)', minHeight: '200px', maxHeight: '340px', color: '#e4e4e7' }}
                >
                  <ReactMarkdown>{form.content || '*Escribe Markdown a la izquierda para ver el preview...*'}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Activate checkbox */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.activate}
              onChange={e => set('activate', e.target.checked)}
              className="w-4 h-4 rounded accent-blue-500"
            />
            <span className="text-sm text-zinc-300">Activar inmediatamente (desactiva la versión anterior)</span>
          </label>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-white/8">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancelar</Button>
          <Button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.version || !form.title || !form.content || !form.effective_date}
            style={{ background: '#3b82f6', color: 'white' }}
          >
            {mutation.isPending ? 'Guardando...' : form.activate ? 'Guardar y activar' : 'Guardar borrador'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Force Re-acceptance Confirmation Dialog ───────────────────────────────
function ForceReacceptDialog({ open, type, onClose, onConfirm, isLoading }) {
  const label = type === 'terms' ? 'Términos y Condiciones' : 'Política de Privacidad';
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="max-w-md"
        style={{ background: '#161625', border: '1px solid rgba(239,68,68,0.3)', color: 'white' }}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Forzar re-aceptación
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            <strong>⚠️ Acción irreversible:</strong> Todos los usuarios verán el modal de aceptación de <strong>{label}</strong> en su próximo acceso, independientemente de si ya lo habían aceptado.
          </div>
          <p className="text-sm text-zinc-400">
            Esto resetea el campo <code className="text-xs bg-white/10 px-1 rounded">{type === 'terms' ? 'terms_version_accepted' : 'privacy_version_accepted'}</code> en todos los perfiles de usuario.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancelar</Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            style={{ background: '#ef4444', color: 'white' }}
          >
            {isLoading ? 'Reseteando...' : 'Sí, forzar re-aceptación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Document Type Card ────────────────────────────────────────────────────
function DocTypeCard({ type, docs, profiles, onNew, onActivate }) {
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);

  const label = type === 'terms' ? 'Términos y Condiciones' : 'Política de Privacidad';
  const versionField = type === 'terms' ? 'terms_version_accepted' : 'privacy_version_accepted';

  const activeDoc = docs.find(d => d.is_active);
  const inactiveDocs = docs.filter(d => !d.is_active).sort((a, b) => b.version?.localeCompare(a.version));

  const acceptedCount = activeDoc
    ? profiles.filter(p => p[versionField] === activeDoc.version).length
    : 0;

  const activateMutation = useMutation({
    mutationFn: (docId) => base44.entities.LegalDocument.update(docId, { is_active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'legal'] }),
  });

  const forceReacceptMutation = useMutation({
    mutationFn: async () => {
      const updates = profiles.map(p =>
        base44.entities.UserProfile.update(p.id, { [versionField]: null })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'userprofiles'] });
      setForceOpen(false);
    },
  });

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: '#1a1a2e',
        border: activeDoc ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#3b82f620' }}>
            <ShieldCheck className="w-5 h-5" style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{label}</h3>
            {activeDoc ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}>
                  v{activeDoc.version}
                </span>
                <span className="text-xs text-zinc-500">vigente desde {activeDoc.effective_date}</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-500">Sin versión activa</span>
            )}
          </div>
        </div>
        <Button
          onClick={() => onNew(type)}
          size="sm"
          style={{ background: '#3b82f6', color: 'white', flexShrink: 0 }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Nueva versión
        </Button>
      </div>

      {/* Stats row */}
      {activeDoc && (
        <div className="mx-5 mb-4 rounded-xl px-4 py-3 grid grid-cols-2 gap-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <div>
            <div className="text-xl font-bold text-white">{acceptedCount}</div>
            <div className="text-xs text-zinc-400">usuarios han aceptado v{activeDoc.version}</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">{profiles.length > 0 ? Math.round((acceptedCount / profiles.length) * 100) : 0}%</div>
            <div className="text-xs text-zinc-400">de adopción</div>
          </div>
        </div>
      )}

      {/* Force re-accept */}
      {activeDoc && (
        <div className="mx-5 mb-4">
          <button
            onClick={() => setForceOpen(true)}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg w-full justify-center transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Forzar re-aceptación de todos los usuarios
          </button>
        </div>
      )}

      {/* History toggle */}
      {inactiveDocs.length > 0 && (
        <div className="border-t mx-5 mb-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setHistoryOpen(h => !h)}
            className="flex items-center justify-between w-full py-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Versiones anteriores ({inactiveDocs.length})
            </span>
            {historyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {historyOpen && (
            <div className="pb-4 space-y-2">
              {inactiveDocs.map(doc => {
                const docAccepted = profiles.filter(p => p[versionField] === doc.version).length;
                return (
                  <div key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                        v{doc.version}
                      </span>
                      <span className="text-xs text-zinc-500 truncate">{doc.title}</span>
                      <span className="text-xs text-zinc-600 shrink-0">{doc.effective_date}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-600">{docAccepted} usuarios</span>
                      <button
                        onClick={() => activateMutation.mutate(doc.id)}
                        disabled={activateMutation.isPending}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                        style={{ background: '#3b82f610', color: '#60a5fa', border: '1px solid #3b82f630' }}
                      >
                        <CheckCircle className="w-3 h-3" />
                        Activar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {inactiveDocs.length === 0 && (
        <div className="px-5 pb-4 text-xs text-zinc-600">Sin versiones anteriores</div>
      )}

      <ForceReacceptDialog
        open={forceOpen}
        type={type}
        onClose={() => setForceOpen(false)}
        onConfirm={() => forceReacceptMutation.mutate()}
        isLoading={forceReacceptMutation.isPending}
      />
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function AdminLegalTab({ enabled }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('terms');

  const { data: docs = [], isLoading: docsLoading } = useQuery({
    queryKey: ['admin', 'legal'],
    queryFn: () => base44.entities.LegalDocument.list('-created_date', 100),
    enabled,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin', 'userprofiles'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 500),
    enabled,
  });

  const termsDocs = docs.filter(d => d.type === 'terms');
  const privacyDocs = docs.filter(d => d.type === 'privacy');

  const openNew = (type) => {
    setModalType(type);
    setModalOpen(true);
  };

  if (docsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5" style={{ color: '#3b82f6' }} />
        <h2 className="text-lg font-semibold text-white">Documentos Legales</h2>
        <span className="text-xs text-zinc-500 ml-1">— gestiona versiones de T&C y Privacidad</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DocTypeCard
          type="terms"
          docs={termsDocs}
          profiles={profiles}
          onNew={openNew}
        />
        <DocTypeCard
          type="privacy"
          docs={privacyDocs}
          profiles={profiles}
          onNew={openNew}
        />
      </div>

      <NewLegalDocumentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultType={modalType}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin', 'legal'] })}
      />
    </div>
  );
}