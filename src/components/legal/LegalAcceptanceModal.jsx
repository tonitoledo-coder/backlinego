import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import ReactMarkdown from 'react-markdown';
import { Loader2, FileText, Shield, CheckCircle2, Check } from 'lucide-react';

export default function LegalAcceptanceModal({ userProfile, onAccepted }) {
  const [activeTab, setActiveTab] = useState('terms');
  const [termsDoc, setTermsDoc] = useState(null);
  const [privacyDoc, setPrivacyDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Sort by published_at desc so we always pick the most recent published
        // version when multiple is_published=true rows exist for a doc_type.
        const [terms, privacy] = await Promise.all([
          db.entities.LegalDocument.filter({ doc_type: 'terms', is_published: true }, '-published_at', 1),
          db.entities.LegalDocument.filter({ doc_type: 'privacy', is_published: true }, '-published_at', 1),
        ]);
        if (!mounted) return;
        const termsResult = terms?.[0] || null;
        const privacyResult = privacy?.[0] || null;
        setTermsDoc(termsResult);
        setPrivacyDoc(privacyResult);
        setLoading(false);
        if (!termsResult && !privacyResult) {
          onAccepted({ terms_version_accepted: null, privacy_version_accepted: null });
        }
      } catch (e) {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleConfirm = async () => {
    if (!termsAccepted || !privacyAccepted) return;
    setSaving(true);
    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

      // 1. Persist an audit trail in legal_acceptance for each document.
      const acceptancePromises = [];
      if (termsDoc?.id) {
        acceptancePromises.push(
          db.entities.LegalAcceptance.create({
            user_id: userProfile.id,
            document_id: termsDoc.id,
            user_agent: userAgent,
          }).catch(err => console.warn('[LegalModal] could not record terms acceptance:', err?.message))
        );
      }
      if (privacyDoc?.id) {
        acceptancePromises.push(
          db.entities.LegalAcceptance.create({
            user_id: userProfile.id,
            document_id: privacyDoc.id,
            user_agent: userAgent,
          }).catch(err => console.warn('[LegalModal] could not record privacy acceptance:', err?.message))
        );
      }
      await Promise.all(acceptancePromises);

      // 2. Update the user_profile snapshot of the latest accepted versions.
      await db.entities.UserProfile.update(userProfile.id, {
        terms_version_accepted: termsDoc?.version || '1.0',
        privacy_version_accepted: privacyDoc?.version || '1.0',
        legal_accepted_at: new Date().toISOString(),
      });

      onAccepted({
        terms_version_accepted: termsDoc?.version || '1.0',
        privacy_version_accepted: privacyDoc?.version || '1.0',
      });
    } catch (e) {
      console.error('[LegalModal] Error guardando aceptación:', e);
      setSaving(false);
    }
  };

  const canContinue = termsAccepted && privacyAccepted;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        width: '100%', maxWidth: '672px',
        display: 'flex', flexDirection: 'column',
        borderRadius: '16px',
        background: '#0a0a0f',
        border: '1px solid rgba(255,255,255,0.1)',
        maxHeight: '90vh',
        boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <h2 style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem', marginBottom: '4px' }}>
            Revisión de documentos legales
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>
            Debes leer y aceptar los siguientes documentos para continuar.
          </p>
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
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                cursor: 'pointer', transition: 'all 0.2s',
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', minHeight: 0, background: '#ffffff', color: '#111827' }}
          className="prose prose-sm max-w-none">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
              <Loader2 style={{ width: 24, height: 24, color: '#a1a1aa' }} className="animate-spin" />
            </div>
          ) : activeTab === 'terms' ? (
            termsDoc ? (
              <>
                <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>
                  {termsDoc.title}{' '}
                  <span style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 400 }}>v{termsDoc.version}</span>
                </h3>
                {termsDoc.published_at && (
                  <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '16px' }}>
                    En vigor desde: {termsDoc.published_at.split('T')[0]}
                  </p>
                )}
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                        {children}
                      </a>
                    ),
                  }}
                >{termsDoc.content_md}</ReactMarkdown>
              </>
            ) : (
              <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>No hay términos activos disponibles.</p>
            )
          ) : (
            privacyDoc ? (
              <>
                <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>
                  {privacyDoc.title}{' '}
                  <span style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 400 }}>v{privacyDoc.version}</span>
                </h3>
                {privacyDoc.published_at && (
                  <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '16px' }}>
                    En vigor desde: {privacyDoc.published_at.split('T')[0]}
                  </p>
                )}
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                        {children}
                      </a>
                    ),
                  }}
                >{privacyDoc.content_md}</ReactMarkdown>
              </>
            ) : (
              <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>No hay política de privacidad activa disponible.</p>
            )
          )}
        </div>

        {/* Checkboxes + CTA */}
        <div style={{
          padding: '16px 24px 24px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '10px',
          background: '#0a0a0f',
        }}>
          {/* Terms checkbox */}
          <div
            role="checkbox"
            aria-checked={termsAccepted}
            tabIndex={0}
            onClick={() => setTermsAccepted(v => !v)}
            onKeyDown={e => e.key === ' ' && setTermsAccepted(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px', borderRadius: '10px',
              background: termsAccepted ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${termsAccepted ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '4px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: termsAccepted ? '#3b82f6' : 'transparent',
              border: `2px solid ${termsAccepted ? '#3b82f6' : '#4b5563'}`,
              transition: 'all 0.15s',
            }}>
              {termsAccepted && <Check style={{ width: 11, height: 11, color: 'white' }} />}
            </div>
            <span style={{ fontSize: '0.875rem', color: '#e4e4e7', lineHeight: 1.4 }}>
              He leído y acepto los{' '}
              <span
                onClick={e => { e.stopPropagation(); setActiveTab('terms'); }}
                style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Términos y Condiciones
              </span>
              {termsDoc && <span style={{ color: '#71717a' }}> (v{termsDoc.version})</span>}
            </span>
          </div>

          {/* Privacy checkbox */}
          <div
            role="checkbox"
            aria-checked={privacyAccepted}
            tabIndex={0}
            onClick={() => setPrivacyAccepted(v => !v)}
            onKeyDown={e => e.key === ' ' && setPrivacyAccepted(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px', borderRadius: '10px',
              background: privacyAccepted ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${privacyAccepted ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '4px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: privacyAccepted ? '#3b82f6' : 'transparent',
              border: `2px solid ${privacyAccepted ? '#3b82f6' : '#4b5563'}`,
              transition: 'all 0.15s',
            }}>
              {privacyAccepted && <Check style={{ width: 11, height: 11, color: 'white' }} />}
            </div>
            <span style={{ fontSize: '0.875rem', color: '#e4e4e7', lineHeight: 1.4 }}>
              He leído y acepto la{' '}
              <span
                onClick={e => { e.stopPropagation(); setActiveTab('privacy'); }}
                style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Política de Privacidad
              </span>
              {privacyDoc && <span style={{ color: '#71717a' }}> (v{privacyDoc.version})</span>}
            </span>
          </div>

          <button
            type="button"
            disabled={!canContinue || saving}
            onClick={handleConfirm}
            style={{
              background: canContinue ? '#3b82f6' : '#1e3a5f',
              color: canContinue ? 'white' : '#4b6a8a',
              cursor: canContinue ? 'pointer' : 'not-allowed',
              width: '100%', padding: '12px',
              borderRadius: '8px', border: 'none',
              fontWeight: 600, fontSize: '0.95rem',
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