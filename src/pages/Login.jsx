import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/db';
import logoHorizontal from '@/assets/logo-horizontal.png';

const TABS = [
  { id: 'signin', label: 'Iniciar sesión' },
  { id: 'signup', label: 'Registrarse' },
];

const INPUT_STYLE = {
  background: '#1a1a2e',
  borderColor: '#3f3f46',
};

export default function Login() {
  const [tab, setTab] = useState('signin');

  // Shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status state for the password form
  const [pwStatus, setPwStatus] = useState('idle'); // idle | submitting | signup_confirm
  const [pwError, setPwError] = useState(null);

  // Status state for the magic link
  const [magicStatus, setMagicStatus] = useState('idle'); // idle | sending | sent
  const [magicError, setMagicError] = useState(null);

  const switchTab = (next) => {
    setTab(next);
    setPwError(null);
    setPwStatus('idle');
    setConfirmPassword('');
  };

  // ── Password sign-in ────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    setPwError(null);

    if (tab === 'signup') {
      if (password.length < 6) {
        setPwError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setPwError('Las contraseñas no coinciden.');
        return;
      }
    }

    setPwStatus('submitting');

    if (tab === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) {
        setPwStatus('idle');
        if (/invalid login credentials/i.test(error.message)) {
          setPwError('Email o contraseña incorrectos.');
        } else if (/email not confirmed/i.test(error.message)) {
          setPwError('Aún no has confirmado tu email. Revisa tu bandeja de entrada.');
        } else {
          setPwError(error.message || 'No se pudo iniciar sesión.');
        }
        return;
      }
      // onAuthStateChange in AuthContext takes over from here.
      setPwStatus('idle');
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) {
        setPwStatus('idle');
        if (/already registered|already exists|user already/i.test(error.message)) {
          setPwError('Este email ya está registrado. Inicia sesión en su lugar.');
        } else if (/weak password|password should/i.test(error.message)) {
          setPwError('Contraseña demasiado débil. Usa al menos 6 caracteres.');
        } else {
          setPwError(error.message || 'No se pudo crear la cuenta.');
        }
        return;
      }
      // If email confirmations are on, session is null and the user gets a confirm email.
      if (!data?.session) {
        setPwStatus('signup_confirm');
        return;
      }
      setPwStatus('idle');
    }
  };

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setMagicError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setMagicError(error.message || 'Error al conectar con Google.');
  };

  // ── Magic link ──────────────────────────────────────────────────────────────
  const handleMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setMagicError('Introduce tu email arriba para enviar el enlace.');
      return;
    }
    setMagicStatus('sending');
    setMagicError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setMagicStatus('idle');
      setMagicError(error.message || 'No se pudo enviar el enlace.');
      return;
    }
    setMagicStatus('sent');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const submitting = pwStatus === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: '#0d0d1a' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoHorizontal} alt="BacklineGo" className="h-28 mx-auto" />
          <p className="text-zinc-400 text-sm mt-2">
            {tab === 'signin' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </p>
        </div>

        <div className="rounded-2xl p-6 border" style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)' }}>
          {/* Magic link sent state */}
          {magicStatus === 'sent' ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(29,223,122,0.15)' }}>
                <CheckCircle2 className="w-7 h-7" style={{ color: '#1DDF7A' }} />
              </div>
              <h2 className="text-white text-lg font-semibold">Revisa tu correo</h2>
              <p className="text-zinc-400 text-sm">
                Te hemos enviado un enlace mágico a <span className="text-white">{email}</span>. Ábrelo desde este dispositivo para entrar.
              </p>
              <button
                type="button"
                onClick={() => { setMagicStatus('idle'); setMagicError(null); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-2"
              >
                Volver
              </button>
            </div>
          ) : pwStatus === 'signup_confirm' ? (
            // Sign-up email confirmation pending
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Mail className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-white text-lg font-semibold">Confirma tu email</h2>
              <p className="text-zinc-400 text-sm">
                Te hemos enviado un correo a <span className="text-white">{email}</span>. Pulsa el enlace para activar la cuenta.
              </p>
              <button
                type="button"
                onClick={() => { setPwStatus('idle'); setTab('signin'); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-2"
              >
                Volver al inicio
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-lg mb-5" style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.06)' }}>
                {TABS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => switchTab(t.id)}
                    className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
                      tab === t.id
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Password form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-300">Email</span>
                  <div className="relative mt-1.5">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      disabled={submitting}
                      className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-500 border focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                      style={INPUT_STYLE}
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-300">Contraseña</span>
                  <div className="relative mt-1.5">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={tab === 'signin' ? 'Tu contraseña' : 'Mínimo 6 caracteres'}
                      minLength={tab === 'signup' ? 6 : undefined}
                      disabled={submitting}
                      className="w-full rounded-lg pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-zinc-500 border focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                      style={INPUT_STYLE}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                {tab === 'signup' && (
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-300">Confirmar contraseña</span>
                    <div className="relative mt-1.5">
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repite la contraseña"
                        minLength={6}
                        disabled={submitting}
                        className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-500 border focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                        style={INPUT_STYLE}
                      />
                    </div>
                  </label>
                )}

                {pwError && <p className="text-sm text-red-400">{pwError}</p>}

                <button
                  type="submit"
                  disabled={submitting || !email.trim() || !password}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 bg-emerald-500 hover:bg-emerald-600 text-black"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {tab === 'signin' ? 'Entrando…' : 'Creando cuenta…'}</>
                  ) : (
                    tab === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-xs text-zinc-500">o continuar con</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={submitting}
                className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-3 border transition-colors hover:bg-zinc-800/50 disabled:opacity-60"
                style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#fff' }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Google
              </button>

              {/* Magic link */}
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={magicStatus === 'sending'}
                className="mt-2 w-full rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 border transition-colors hover:bg-zinc-800/50 disabled:opacity-60"
                style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#fff' }}
              >
                {magicStatus === 'sending' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                ) : (
                  <><Mail className="w-4 h-4" /> Enviar magic link</>
                )}
              </button>

              {magicError && <p className="text-sm text-red-400 mt-3">{magicError}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
