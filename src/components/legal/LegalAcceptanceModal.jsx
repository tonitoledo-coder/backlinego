import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { Loader2, FileText, Shield, CheckCircle2, Check } from 'lucide-react';

export default function LegalAcceptanceModal({ userProfile, onAccepted }) {
  const [activeTab, setActiveTab] = useState('terms');
  const [termsDoc, setTermsDoc] = useState(null);
  const [privacyDoc, setPrivacyDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const [termsScrolled, setTermsScrolled] = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const termsRef = useRef(null);
  const privacyRef = useRef(null);

  const checkIfAtBottom = useCallback((type, el) => {
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 10) {
      if (type === 'terms') setTermsScrolled(true);
      if (type === 'privacy') setPrivacyScrolled(true);
      return;
    }
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
      if (!termsResult) setTermsScrolled(true);
      if (!privacyResult) setPrivacyScrolled(true);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    setTimeout(() => {
      if (activeTab === 'terms') checkIfAtBottom('terms', termsRef.current);
      if (activeTab === 'privacy') checkIfAtBottom('privacy', privacyRef.current);
    }, 50);
  }, [activeTab, loading, checkIfAtBottom]);

  const handleConfirm = async () => {
    if (!termsAccepted || !privacyAccepted) return;
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

  const canContinue = termsAccepted && privacyAccepted;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: '672px',
          display: 'flex', flexDirection: 'column',
          borderRadius: '16px', overflow: 'hidden',
          background: '#0a0a0f',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '90vh',
          boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
          pointerEvents: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <h2 style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem', marginBottom: '4px' }}>Revisión de documentos legales</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Debes leer y aceptar los siguientes documentos para continuar.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          {[
            { key: 'terms', icon: FileText, label: 'Términos y Condiciones', accepted: termsAccepted },
            { key: 'privacy', icon: Shield, label: 'Política de Privacidad', accepted: privacyAccepted },
          ].map(({ key, icon: Icon, label, accepted }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500,
                background: activeTab === key ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: activeTab === key ? '#3b82f6' : '#71717a',
                borderBottom: activeTab === key ? '2px solid #3b82f6' : '2px solid transparent',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {accepted
                ? <CheckCircle2 style={{ width: 16, height: 16, color: '#4ade80', flexShrink: 0 }} />
                : <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              }
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{key === 'terms' ? 'T&C' : 'Privacidad'}</span>
            </button>
          ))}
        </div>

        {/* Document content */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0, pointerEvents: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '64px 0' }}>
              <Loader2 style={{ width: 24, height: 24, color: '#a1a1aa', animation: 'spin 1s linear infinite' }} className="animate-spin" />
            </div>
          ) : (
            <>
              {/* Terms scroll area */}
              <div
                ref={termsRef}
                onScroll={() => checkIfAtBottom('terms', termsRef.current)}
                style={{
                  display: activeTab === 'terms' ? 'block' : 'none',
                  position: 'absolute', inset: 0,
                  overflowY: 'auto', padding: '16px 24px',
                  pointerEvents: 'auto',
                }}
                className="prose prose-invert prose-sm max-w-none"
              >
                {termsDoc ? (
                  <>
                    <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>
                      {termsDoc.title} <span style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 400 }}>v{termsDoc.version}</span>
                    </h3>
                    {termsDoc.effective_date && (
                      <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '16px' }}>En vigor desde: {termsDoc.effective_date}</p>
                    )}
                    <ReactMarkdown>{termsDoc.content}</ReactMarkdown>
                    <div style={{ height: 32 }} />
                  </>
                ) : (
                  <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>No hay términos activos disponibles.</p>
                )}
              </div>

              {/* Privacy scroll area */}
              <div
                ref={privacyRef}
                onScroll={() => checkIfAtBottom('privacy', privacyRef.current)}
                style={{
                  display: activeTab === 'privacy' ? 'block' : 'none',
                  position: 'absolute', inset: 0,
                  overflowY: 'auto', padding: '16px 24px',
                  pointerEvents: 'auto',
                }}
                className="prose prose-invert prose-sm max-w-none"
              >
                {privacyDoc ? (
                  <>
                    <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>
                      {privacyDoc.title} <span style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 400 }}>v{privacyDoc.version}</span>
                    </h3>
                    {privacyDoc.effective_date && (
                      <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '16px' }}>En vigor desde: {privacyDoc.effective_date}</p>
                    )}
                    <ReactMarkdown>{privacyDoc.content}</ReactMarkdown>
                    <div style={{ height: 32 }} />
                  </>
                ) : (
                  <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>No hay política de privacidad activa disponible.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Scroll hint */}
        {!loading && (
          <div style={{ padding: '8px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, minHeight: '32px' }}>
            {activeTab === 'terms' && !termsScrolled && (
              <p style={{ color: '#fbbf24', fontSize: '0.75rem', textAlign: 'center' }}>↓ Desplázate hasta el final para habilitar el checkbox</p>
            )}
            {activeTab === 'privacy' && !privacyScrolled && (
              <p style={{ color: '#fbbf24', fontSize: '0.75rem', textAlign: 'center' }}>↓ Desplázate hasta el final para habilitar el checkbox</p>
            )}
          </div>
        )}

        {/* Checkboxes + CTA */}
        <div style={{ padding: '12px 24px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'auto' }}>

          {/* Terms checkbox */}
          <div
            onClick={() => termsScrolled && setTermsAccepted(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px', borderRadius: '10px',
              background: termsAccepted ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${termsAccepted ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
              cursor: termsScrolled ? 'pointer' : 'default',
              pointerEvents: 'auto',
              userSelect: 'none',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '4px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: termsAccepted ? '#3b82f6' : 'transparent',
              border: `2px solid ${termsScrolled ? '#3b82f6' : '#374151'}`,
              opacity: termsScrolled ? 1 : 0.4,
              transition: 'all 0.15s',
            }}>
              {termsAccepted && <Check style={{ width: 11, height: 11, color: 'white' }} />}
            </div>
            <span style={{ fontSize: '0.875rem', color: termsScrolled ? '#e4e4e7' : '#6b7280', lineHeight: 1.4 }}>
              He leído y acepto los{' '}
              <span
                onClick={e => { e.stopPropagation(); setActiveTab('terms'); }}
                style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', pointerEvents: 'auto' }}
              >
                Términos y Condiciones
              </span>
              {termsDoc && <span style={{ color: '#71717a' }}> (v{termsDoc.version})</span>}
            </span>
          </div>

          {/* Privacy checkbox */}
          <div
            onClick={() => privacyScrolled && setPrivacyAccepted(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px', borderRadius: '10px',
              background: privacyAccepted ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${privacyAccepted ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
              cursor: privacyScrolled ? 'pointer' : 'default',
              pointerEvents: 'auto',
              userSelect: 'none',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '4px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: privacyAccepted ? '#3b82f6' : 'transparent',
              border: `2px solid ${privacyScrolled ? '#3b82f6' : '#374151'}`,
              opacity: privacyScrolled ? 1 : 0.4,
              transition: 'all 0.15s',
            }}>
              {privacyAccepted && <Check style={{ width: 11, height: 11, color: 'white' }} />}
            </div>
            <span style={{ fontSize: '0.875rem', color: privacyScrolled ? '#e4e4e7' : '#6b7280', lineHeight: 1.4 }}>
              He leído y acepto la{' '}
              <span
                onClick={e => { e.stopPropagation(); setActiveTab('privacy'); }}
                style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', pointerEvents: 'auto' }}
              >
                Política de Privacidad
              </span>
              {privacyDoc && <span style={{ color: '#71717a' }}> (v{privacyDoc.version})</span>}
            </span>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            style={{
              background: canContinue ? '#3b82f6' : '#1e3a5f',
              color: canContinue ? 'white' : '#4b6a8a',
              cursor: canContinue ? 'pointer' : 'not-allowed',
              width: '100%', padding: '12px',
              borderRadius: '8px', border: 'none',
              fontWeight: 600, fontSize: '0.95rem',
              pointerEvents: 'auto',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {saving
              ? <><Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> Guardando...</>
              : 'Continuar'
            }
          </button>
        </div>
      </div>
    </div>
  );
}