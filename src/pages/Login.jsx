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
          )}
        </div>
      </div>
    </div>
  );
}
