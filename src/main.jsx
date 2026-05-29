import * as Sentry from "@sentry/react";
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

Sentry.init({
  dsn: "https://6382dec6c747979372211a8ed5bb70a2@o4510959314862080.ingest.de.sentry.io/4511234509242448",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
});

// ── Recuperación de chunks dinámicos obsoletos tras un deploy ────────────────
// Cuando el usuario tiene cargado un index.html antiguo que referencia chunks
// con hash que ya no existen (porque se ha desplegado una versión nueva), el
// import dinámico de una página lazy falla con "Failed to fetch dynamically
// imported module". En ese caso recargamos UNA vez para obtener el HTML fresco.
const CHUNK_RELOAD_FLAG = 'backlinego:chunk-reload';

function isChunkLoadError(reason) {
  const msg = (reason && (reason.message || reason.toString())) || '';
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

function recoverFromChunkError(reason) {
  if (!isChunkLoadError(reason)) return;
  // Evita bucles de recarga: solo recargamos una vez por sesión de fallo.
  if (sessionStorage.getItem(CHUNK_RELOAD_FLAG)) return;
  try { sessionStorage.setItem(CHUNK_RELOAD_FLAG, String(Date.now())); } catch (_) {}
  window.location.reload();
}

// Evento específico de Vite para fallos de preload de chunks.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  recoverFromChunkError(event.payload);
});

// Red de seguridad: rechazos de promesa no capturados (p.ej. React.lazy).
window.addEventListener('unhandledrejection', (event) => {
  recoverFromChunkError(event.reason);
});

// Una vez la app carga correctamente, limpiamos el flag para permitir futuras
// recuperaciones en el siguiente deploy.
window.addEventListener('load', () => {
  setTimeout(() => {
    try { sessionStorage.removeItem(CHUNK_RELOAD_FLAG); } catch (_) {}
  }, 3000);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)