import React from 'react';
import { base44 } from '@/api/base44Client';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 px-4">
      <div className="max-w-md w-full p-8 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-500/10 border border-orange-500/20">
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Acceso restringido</h1>
          <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
            No estás registrado en esta aplicación. Contacta con el administrador para solicitar acceso.
          </p>
          <div className="p-4 bg-zinc-800/60 rounded-xl text-sm text-zinc-400 text-left mb-6">
            <p className="font-medium text-zinc-300 mb-2">Si crees que es un error:</p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Verifica que has iniciado sesión con la cuenta correcta</li>
              <li>Contacta con el administrador para solicitar acceso</li>
              <li>Cierra sesión y vuelve a entrar</li>
            </ul>
          </div>
          <button
            onClick={() => base44.auth.logout()}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;