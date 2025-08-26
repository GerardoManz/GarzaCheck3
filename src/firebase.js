// firebase.js
// Caché persistente + (auto) long-polling para redes Wi-Fi mañosas.
// Sin uso de `import.meta` (evita "Expression expected" en TS).

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// --- Config ORIGINAL ---
const firebaseConfig = {
  apiKey: 'AIzaSyAvU7aJfh6OdDP-josJMvhET7e3w_tFXvM',
  authDomain: 'garzacheck3.firebaseapp.com',
  projectId: 'garzacheck3',
  storageBucket: 'garzacheck3.firebasestorage.app',
  messagingSenderId: '629608621775',
  appId: '1:629608621775:web:91393e9fff1c46d4ff79ba',
  measurementId: 'G-F9YXXJR860',
};

const app = initializeApp(firebaseConfig);

// -------- Forzado opcional de long-polling (sin import.meta) --------
// Puedes activar en tiempo de ejecución (en esa PC) con:
//   localStorage.setItem('FORCE_LONG_POLLING', 'true')
function getForceLongPolling() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const v = window.localStorage.getItem('FORCE_LONG_POLLING');
      if (v === 'true') return true;
    }
  } catch {}
  try {
    // CRA / Node-like
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.REACT_APP_FORCE_LONG_POLLING === 'true') return true;
      if (process.env.FORCE_LONG_POLLING === 'true') return true;
    }
  } catch {}
  // También puedes exponer un flag global si quieres:
  try {
    if (typeof window !== 'undefined' && window.FORCE_LONG_POLLING === true) return true;
  } catch {}
  return false;
}
const FORCE_LP = getForceLongPolling();

let db;
try {
  // Inicialización moderna con caché persistente multi-tab
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    // Si la red bloquea WebSockets, autodetecta el fallback (LP) cuando NO se fuerza.
    experimentalAutoDetectLongPolling: !FORCE_LP,
    // Forzar LP si la red es muy mala específicamente en esa máquina.
    experimentalForceLongPolling: FORCE_LP,
    // Nota: no usamos useFetchStreams para evitar warnings en SDKs antiguos.
  });
} catch {
  // Fallback si tu versión de SDK no soporta initializeFirestore/localCache
  db = getFirestore(app);
  enableIndexedDbPersistence(db).catch(() => {
    // Ignorar si no se puede (multi-tab abierto o navegador sin IndexedDB)
  });
}

// Analytics seguro (solo navegador y si está soportado)
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported()
    .then((ok) => { if (ok) getAnalytics(app); })
    .catch(() => {});
}

export { app, db };
