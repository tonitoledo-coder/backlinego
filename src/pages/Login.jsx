import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('sending');
    setError(null);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (otpError) {
      setError(otpError.message || 'No se pudo enviar el enlace. Inténtalo de nuevo.');
      setStatus('idle');
      return;
    }

    setStatus('sent');
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (oauthError) {
      setError(oauthError.message || 'Error al conectar con Google.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0d0d1a' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Backline<span style={{ color: '#1DDF7A' }}>Go</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-2">Accede con tu correo</p>
        </div>

        <div
          className="rounded-2xl p-6 border"
          style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {status === 'sent' ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(29,223,122,0.15)' }}
              >
                <CheckCircle2 className="w-7 h-7" style={{ color: '#1DDF7A' }} />
              </div>
              <h2 className="text-white text-lg font-semibold">Revisa tu correo</h2>
              <p className="text-zinc-400 text-sm">
                Te hemos enviado un enlace mágico a <span className="text-white">{email}</span>.
                Ábrelo desde este dispositivo para entrar.
              </p>
              <button
                type="button"
                onClick={() => { setStatus('idle'); setEmail(''); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-2"
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-3 border transition-colors hover:bg-zinc-800/50"
                style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#fff' }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continuar con Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-xs text-zinc-500">o</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Magic link form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-300">Correo electrónico</span>
                  <div className="relative mt-2">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      disabled={status === 'sending'}
                      className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-500 border focus:outline-none focus:ring-2 disabled:opacity-50"
                      style={{
                        background: '#0d0d1a',
                        borderColor: 'rgba(255,255,255,0.08)',
                      }}
                    />
                  </div>
                </label>

                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending' || !email.trim()}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: '#1DDF7A', color: '#060E18' }}
                >
                  {status === 'sending' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>Enviar magic link</>
                  )}
                </button>

                <p className="text-xs text-zinc-500 text-center">
                  Te enviaremos un enlace para iniciar sesión sin contraseña.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
