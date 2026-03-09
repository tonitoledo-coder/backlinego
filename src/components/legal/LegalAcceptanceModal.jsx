import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Shield, CheckCircle2 } from 'lucide-react';

export default function LegalAcceptanceModal({ userProfile, onAccepted }) {
  const [activeTab, setActiveTab] = useState('terms');
  const [termsDoc, setTermsDoc] = useState(null);
  const [privacyDoc, setPrivacyDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const [termsScrolled, setTermsScrolled] = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const termsRef = useRef(null);
  const privacyRef = useRef(null);

  const checkIfAtBottom = useCallback((type, el) => {
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) {
      if (type === 'terms') setTermsScrolled(true);
      if (type === 'privacy') setPrivacyScrolled(true);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [terms, privacy] = await Promise.all([
        base44.entities.LegalDocument.filter({ type: 'terms', is_active: true }),
        base44.entities.LegalDocument.filter({ type: 'privacy', is_active: true }),
      ]);
      const termsResult = terms?.[0] || null;
      const privacyResult = privacy?.[0] || null;
      setTermsDoc(termsResult);
      setPrivacyDoc(privacyResult);
      // If no doc exists, auto-mark as scrolled so checkbox is usable
      if (!termsResult) setTermsScrolled(true);
      if (!privacyResult) setPrivacyScrolled(true);
      setLoading(false);
    })();
  }, []);

  // Check if content is short enough to not need scrolling, on tab change or after load
  useEffect(() => {
    if (loading) return;
    setTimeout(() => {
      if (activeTab === 'terms') checkIfAtBottom('terms', termsRef.current);
      if (activeTab === 'privacy') checkIfAtBottom('privacy', privacyRef.current);
    }, 50);
  }, [activeTab, loading, checkIfAtBottom]);

  const handleScroll = useCallback((type, el) => {
    checkIfAtBottom(type, el);
  }, [checkIfAtBottom]);

  const handleConfirm = async () => {
    if (!termsChecked || !privacyChecked) return;
    setSaving(true);
    await base44.entities.UserProfile.update(userProfile.id, {
      terms_version_accepted: termsDoc?.version || '1.0',
      privacy_version_accepted: privacyDoc?.version || '1.0',
      legal_accepted_at: new Date().toISOString(),
    });
    setSaving(false);
    onAccepted({
      terms_version_accepted: termsDoc?.version || '1.0',
      privacy_version_accepted: privacyDoc?.version || '1.0',
    });
  };

  const canConfirm = termsChecked && privacyChecked;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#0a0a0f',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '90vh',
          boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-xl font-bold text-white mb-1">Revisión de documentos legales</h2>
          <p className="text-sm text-zinc-400">Debes leer y aceptar los siguientes documentos para continuar.</p>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {[
            { key: 'terms', icon: FileText, label: 'Términos y Condiciones', checked: termsChecked },
            { key: 'privacy', icon: Shield, label: 'Política de Privacidad', checked: privacyChecked },
          ].map(({ key, icon: Icon, label, checked }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all"
              style={{
                background: activeTab === key ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: activeTab === key ? '#3b82f6' : '#71717a',
                borderBottom: activeTab === key ? '2px solid #3b82f6' : '2px solid transparent',
              }}
            >
              {checked
                ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                : <Icon className="w-4 h-4 shrink-0" />
              }
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{key === 'terms' ? 'T&C' : 'Privacidad'}</span>
            </button>
          ))}
        </div>

        {/* Document content */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full py-16">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {/* Terms */}
              <div
                ref={termsRef}
                onScroll={() => handleScroll('terms', termsRef.current)}
                className="absolute inset-0 overflow-y-auto px-6 py-4 prose prose-invert prose-sm max-w-none"
                style={{ display: activeTab === 'terms' ? 'block' : 'none' }}
              >
                {termsDoc ? (
                  <>
                    <h3 className="text-white text-base font-semibold mb-1">{termsDoc.title} <span className="text-zinc-500 text-xs font-normal">v{termsDoc.version}</span></h3>
                    {termsDoc.effective_date && (
                      <p className="text-xs text-zinc-500 mb-4">En vigor desde: {termsDoc.effective_date}</p>
                    )}
                    <ReactMarkdown>{termsDoc.content}</ReactMarkdown>
                    <div className="h-8" />
                  </>
                ) : (
                  <p className="text-zinc-400 text-sm">No hay términos activos disponibles.</p>
                )}
              </div>

              {/* Privacy */}
              <div
                ref={privacyRef}
                onScroll={() => handleScroll('privacy', privacyRef.current)}
                className="absolute inset-0 overflow-y-auto px-6 py-4 prose prose-invert prose-sm max-w-none"
                style={{ display: activeTab === 'privacy' ? 'block' : 'none' }}
              >
                {privacyDoc ? (
                  <>
                    <h3 className="text-white text-base font-semibold mb-1">{privacyDoc.title} <span className="text-zinc-500 text-xs font-normal">v{privacyDoc.version}</span></h3>
                    {privacyDoc.effective_date && (
                      <p className="text-xs text-zinc-500 mb-4">En vigor desde: {privacyDoc.effective_date}</p>
                    )}
                    <ReactMarkdown>{privacyDoc.content}</ReactMarkdown>
                    <div className="h-8" />
                  </>
                ) : (
                  <p className="text-zinc-400 text-sm">No hay política de privacidad activa disponible.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Scroll hint */}
        {!loading && (
          <div className="px-6 py-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {activeTab === 'terms' && !termsScrolled && (
              <p className="text-xs text-amber-400 text-center">↓ Desplázate hasta el final para habilitar el checkbox</p>
            )}
            {activeTab === 'privacy' && !privacyScrolled && (
              <p className="text-xs text-amber-400 text-center">↓ Desplázate hasta el final para habilitar el checkbox</p>
            )}
          </div>
        )}

        {/* Checkboxes + CTA */}
        <div className="px-6 pb-6 pt-3 shrink-0 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <label className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 transition-all ${!termsScrolled ? 'opacity-40 pointer-events-none' : ''}`}
            style={{ background: termsChecked ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${termsChecked ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <input
              type="checkbox"
              checked={termsChecked}
              onChange={e => setTermsChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-500 shrink-0"
              disabled={!termsScrolled}
            />
            <span className="text-sm text-zinc-200 leading-snug">
              He leído y acepto los{' '}
              <button type="button" onClick={e => { e.preventDefault(); setActiveTab('terms'); }} className="text-blue-400 font-medium hover:text-blue-300 underline underline-offset-2 cursor-pointer">
                Términos y Condiciones
              </button>
              {termsDoc && <span className="text-zinc-500"> (v{termsDoc.version})</span>}
            </span>
          </label>

          <label className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 transition-all ${!privacyScrolled ? 'opacity-40 pointer-events-none' : ''}`}
            style={{ background: privacyChecked ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${privacyChecked ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <input
              type="checkbox"
              checked={privacyChecked}
              onChange={e => setPrivacyChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-500 shrink-0"
              disabled={!privacyScrolled}
            />
            <span className="text-sm text-zinc-200 leading-snug">
              He leído y acepto la{' '}
              <button type="button" onClick={e => { e.preventDefault(); setActiveTab('privacy'); }} className="text-blue-400 font-medium hover:text-blue-300 underline underline-offset-2 cursor-pointer">
                Política de Privacidad
              </button>
              {privacyDoc && <span className="text-zinc-500"> (v{privacyDoc.version})</span>}
            </span>
          </label>

          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || saving}
            className="w-full h-12 font-semibold text-white mt-1"
            style={{ background: canConfirm ? '#3b82f6' : '#1e293b', opacity: canConfirm ? 1 : 0.6 }}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}