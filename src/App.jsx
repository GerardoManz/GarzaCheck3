import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import FormularioRegistro from './FormularioRegistro';
import ConsultarRegistros from './ConsultarRegistros';
import CargarAlumnos from "./CargarAlumnos";
import React from 'react';
import './styles.css';

/* ===================== Logos ===================== */
const LogoUAEH = ({ height = 80 }) => (
  <img src="/garza.png" alt="Logo UAEH" className="w-20 object-contain" style={{ height: `${height}px` }} />
);
const LogoPrepa6 = ({ height = 80 }) => (
  <img src="/Prepa6.png" alt="Logo Prepa6" className="w-20 object-contain" style={{ height: `${height}px` }} />
);

/* ===================== Utils ===================== */
const onlyDigits6 = (s) => (s ?? '').toString().replace(/\D+/g, '').slice(0, 6);
const yyyymmddLocal = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isRetryableFirestoreError = (err) => {
  const code = err?.code || err?.message || '';
  return ['unavailable', 'deadline-exceeded', 'aborted', 'internal'].some(k => code.includes(k));
};
async function withRetry(fn, { retries = 4, base = 300 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries || !isRetryableFirestoreError(err)) throw err;
      await sleep(base * Math.pow(2, attempt - 1)); // 300, 600, 1200, 2400...
    }
  }
}
const humanFirestoreError = (err) => {
  const code = err?.code || '';
  if (!navigator.onLine || code.includes('unavailable')) return 'Sin conexión o red inestable. Reintentaremos...';
  if (code.includes('deadline-exceeded')) return 'Servidor tardó demasiado. Reintentando...';
  if (code.includes('permission-denied')) return 'Permisos denegados por reglas de Firestore.';
  if (code.includes('FAILED_PRECONDITION')) return 'Falta un índice/condición en Firestore.';
  if (err?.message === 'YA_HAY_DOS') return 'Ya cuenta con 2 registros el día de hoy.';
  return err?.message || 'Ocurrió un problema al registrar.';
};
const waitUntilOnline = () => new Promise((resolve) => {
  if (navigator.onLine) return resolve();
  const on = () => { window.removeEventListener('online', on); resolve(); };
  window.addEventListener('online', on);
});

/* ===================== Escáner global ===================== */
function GlobalKeyScanner({ onScan, reflectInInput }) {
  const bufRef = useRef('');
  const tRef = useRef(null);

  useEffect(() => {
    const flushIfReady = () => {
      const v = onlyDigits6(bufRef.current);
      if (v.length === 6) {
        reflectInInput?.(v);
        onScan?.(v);
      }
      bufRef.current = '';
    };

    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (e.key === 'Enter') {
        flushIfReady();
        clearTimeout(tRef.current);
        tRef.current = null;
        return;
      }
      if (/^\d$/.test(e.key)) {
        bufRef.current = onlyDigits6(bufRef.current + e.key);
        if (bufRef.current.length === 6) {
          flushIfReady();
          clearTimeout(tRef.current);
          tRef.current = null;
        } else {
          clearTimeout(tRef.current);
          tRef.current = setTimeout(() => {
            flushIfReady();
            tRef.current = null;
          }, 120);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(tRef.current);
    };
  }, [onScan, reflectInInput]);

  return null;
}

/* ===================== Pantalla de registro (UI) ===================== */
function RegistroAlumnos({ onEnqueueRegistro, bindReflectInput, bindResetInput }) {
  const [numCuenta, setNumCuenta] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const submitTimerRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'black';
    return () => { document.body.style.backgroundColor = prev || ''; };
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    bindReflectInput?.((v) => {
      clearTimeout(submitTimerRef.current);
      const val = onlyDigits6(v);
      setNumCuenta(val);
      requestAnimationFrame(() => inputRef.current?.focus());
      if (val.length === 6) {
        submitTimerRef.current = setTimeout(() => {
          onEnqueueRegistro(val);
        }, 100);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bindResetInput?.(() => {
      clearTimeout(submitTimerRef.current);
      setNumCuenta('');
      requestAnimationFrame(() => inputRef.current?.focus());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimeout(submitTimerRef.current), []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (!/^\d{0,6}$/.test(value)) return;
    clearTimeout(submitTimerRef.current);
    setNumCuenta(value);
    if (value.length === 6) {
      submitTimerRef.current = setTimeout(() => onEnqueueRegistro(value), 100);
    }
  };

  const handleRegistro = () => {
    clearTimeout(submitTimerRef.current);
    onEnqueueRegistro(numCuenta);
  };

  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(submitTimerRef.current);
      onEnqueueRegistro(numCuenta);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-6 text-center text-white">
      <LogoUAEH height={90} />
      <LogoPrepa6 height={80} />

      <div className="bg-white p-6 rounded-lg shadow-md w-96 flex flex-col items-center text-[#B91116] mt-6">
        <h2 className="text-xl font-bold mb-4">Registro de Entrada/Salida</h2>
        <input
          ref={inputRef}
          type="text"
          value={numCuenta}
          onChange={handleInputChange}
          onKeyDown={handleEnter}
          className="w-full p-2 border rounded-lg text-center text-black"
          placeholder="Ingrese número de cuenta"
          maxLength={6}
          inputMode="numeric"
          pattern="\d*"
        />

        <button
          onClick={handleRegistro}
          style={{ backgroundColor: '#7f1d1d', color: '#fff', padding: '0.5rem', marginTop: '1rem', borderRadius: '0.5rem', fontWeight: 'bold' }}
          className="w-full"
        >
          Registrar
        </button>

        <button
          onClick={() => navigate('/registrar-alumno')}
          style={{ backgroundColor: '#065f46', color: '#fff', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '0.5rem', fontWeight: 'bold' }}
          className="w-full"
        >
          Administración de Alumnos
        </button>

        <button
          onClick={() => navigate('/consultar-registros')}
          style={{ backgroundColor: '#374151', color: '#fff', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '0.5rem', fontWeight: 'bold' }}
          className="w-full"
        >
          Consultas
        </button>
      </div>
    </div>
  );
}

/* ===================== App con registro GLOBAL + cola + overlays ===================== */
function AppInner() {
  // Overlays globales
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const tErr = useRef(null);
  const tOk = useRef(null);
  const tInfo = useRef(null);

  // Online/offline
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Candados y funciones de UI
  const reflectInputFnRef = useRef(null);
  const bindReflectInput = (fn) => { reflectInputFnRef.current = fn; };
  const reflectInInput = (v) => { reflectInputFnRef.current?.(v); };

  const resetInputFnRef = useRef(null);
  const bindResetInput = (fn) => { resetInputFnRef.current = fn; };
  const resetInput = () => resetInputFnRef.current?.();

  const inFlightByCuenta = useRef(new Set());

  const triggerError = (message) => {
    resetInput();
    clearTimeout(tErr.current);
    setErrorMessage(message);
    setShowError(true);
    tErr.current = setTimeout(() => {
      setShowError(false);
      setErrorMessage('');
    }, 2200);
  };
  const triggerSuccess = (message) => {
    resetInput();
    clearTimeout(tOk.current);
    setSuccessMessage(message);
    setShowSuccess(true);
    tOk.current = setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage('');
    }, 1200);
  };
  const triggerInfo = (message) => {
    clearTimeout(tInfo.current);
    setInfoMessage(message);
    setShowInfo(true);
    tInfo.current = setTimeout(() => {
      setShowInfo(false);
      setInfoMessage('');
    }, 900);
  };

  /* =========== COLA =========== */
  const queueRef = useRef([]);         // [{ numCuenta, enqueuedAt }]
  const processingRef = useRef(false);
  const lastEnqueueRef = useRef({ num: null, t: 0 });

  const processQueue = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        if (!navigator.onLine) {
          triggerInfo('Sin conexión. En cola…');
          await waitUntilOnline();
        }
        const item = queueRef.current[0];

        try {
          const res = await registrarGlobalOnline(item.numCuenta);
          triggerSuccess(`${res.estado} registrada para ${res.nombre}`);
          queueRef.current.shift();
        } catch (err) {
          if (isRetryableFirestoreError(err)) {
            triggerInfo(humanFirestoreError(err));
            await sleep(600);
            continue; // reintenta el mismo
          }
          triggerError(humanFirestoreError(err));
          queueRef.current.shift(); // descarta para no bloquear
        }
      }
    } finally {
      processingRef.current = false;
    }
  };

  const enqueueRegistro = (numCuentaRaw) => {
    const numCuenta = onlyDigits6(numCuentaRaw);
    if (!numCuenta || numCuenta.length !== 6) {
      triggerError('El número de cuenta debe tener 6 dígitos');
      return;
    }
    // anti-rebote de mismo número en < 350ms
    const now = Date.now();
    if (lastEnqueueRef.current.num === numCuenta && now - lastEnqueueRef.current.t < 350) return;
    lastEnqueueRef.current = { num: numCuenta, t: now };

    queueRef.current.push({ numCuenta, enqueuedAt: now });
    triggerInfo(`En cola (#${queueRef.current.length})`);
    resetInput();
    processQueue();
  };

  /* =========== LÓGICA REAL DE ESCRITURA (flexible + robusta) =========== */

  // 1) Busca alumno por numCuenta como STRING y si no sale, prueba como NUMBER.
  const buscarAlumnoFlexible = async (numCuenta) => {
    // Primero como string
    const qStr = query(
      collection(db, 'alumnos'),
      where('numCuenta', '==', numCuenta),
      limit(1)
    );
    const sStr = await withRetry(() => getDocs(qStr));
    if (!sStr.empty) return sStr.docs[0].data() || {};

    // Luego como number (por si tu dataset mezcla tipos)
    const n = Number(numCuenta);
    if (!Number.isNaN(n)) {
      const qNum = query(
        collection(db, 'alumnos'),
        where('numCuenta', '==', n),
        limit(1)
      );
      const sNum = await withRetry(() => getDocs(qNum));
      if (!sNum.empty) return sNum.docs[0].data() || {};
    }

    // Si quieres cubrir otros fields alternos, los intentas aquí (ej. 'cuenta')
    return null;
  };

  // 2) Cuenta registros de HOY usando rango por fechaHora; si falla índice, fallback a fechaHoy string.
  const contarRegistrosHoy = async (numCuenta, fechaHoyBonita) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date();   end.setHours(23, 59, 59, 999);

    try {
      const qRange = query(
        collection(db, 'registros'),
        where('numCuenta', '==', numCuenta),
        where('fechaHora', '>=', start),
        where('fechaHora', '<=', end),
        orderBy('fechaHora', 'desc')
      );
      const snap = await withRetry(() => getDocs(qRange));
      return snap.size;
    } catch {
      const qHoy = query(
        collection(db, 'registros'),
        where('numCuenta', '==', numCuenta),
        where('fechaHoy', '==', fechaHoyBonita)
      );
      const snap2 = await withRetry(() => getDocs(qHoy));
      return snap2.size;
    }
  };

  // 3) Último registro para cooldown (intenta ordenado; si no hay índice, fallback simple)
  const obtenerUltimoRegistroFecha = async (numCuenta) => {
    try {
      const qUltimo = query(
        collection(db, 'registros'),
        where('numCuenta', '==', numCuenta),
        orderBy('fechaHora', 'desc'),
        limit(1)
      );
      const s = await withRetry(() => getDocs(qUltimo));
      if (!s.empty) {
        const fh = s.docs[0].data().fechaHora;
        return fh?.toDate ? fh.toDate() : new Date(fh);
      }
      return null;
    } catch {
      const qSoloNum = query(collection(db, 'registros'), where('numCuenta', '==', numCuenta));
      const s2 = await withRetry(() => getDocs(qSoloNum));
      let last = null;
      s2.forEach((d) => {
        const fh = d.data().fechaHora;
        const f = fh?.toDate ? fh.toDate() : new Date(fh);
        if (!last || f > last) last = f;
      });
      return last;
    }
  };

  // 4) Escritura idempotente con transacción (no toca UI; devuelve datos para el overlay)
  const registrarGlobalOnline = async (numCuentaRaw) => {
    const numCuenta = onlyDigits6(numCuentaRaw);
    if (inFlightByCuenta.current.has(numCuenta)) {
      const e = new Error('Procesando esta cuenta, intenta en un momento.');
      e.code = 'in-flight';
      throw e;
    }
    inFlightByCuenta.current.add(numCuenta);

    try {
      const fechaHoyBonita = new Date().toLocaleDateString();
      const diaId = yyyymmddLocal();

      // Alumno flexible
      const alumno = await buscarAlumnoFlexible(numCuenta);
      if (!alumno) {
        const e = new Error('No se encontró un alumno con ese número de cuenta.');
        e.code = 'not-found';
        throw e;
      }
      const nombreAlumno = alumno.nombre ?? alumno.nombreCompleto ?? 'Alumno';

      // Conteo de hoy (robusto a locales)
      const registrosHoy = await contarRegistrosHoy(numCuenta, fechaHoyBonita);
      if (registrosHoy >= 2) {
        const e = new Error('YA_HAY_DOS');
        e.code = 'limit';
        throw e;
      }

      // Cooldown 5 min
      const ultimoRegistroFecha = await obtenerUltimoRegistroFecha(numCuenta);
      if (ultimoRegistroFecha) {
        const diffMin = (Date.now() - ultimoRegistroFecha.getTime()) / 60000;
        if (diffMin < 5) {
          const e = new Error(`Debe esperar ${Math.ceil(5 - diffMin)} minuto(s) antes de volver a registrar.`);
          e.code = 'cooldown';
          throw e;
        }
      }

      // Turno por conteo
      const turno = (registrosHoy % 2 === 0) ? 1 : 2;
      const estado = turno === 1 ? 'Entrada' : 'Salida';

      // Transacción idempotente
      const doc1 = doc(db, 'registros', `${numCuenta}-${diaId}-1`);
      const doc2 = doc(db, 'registros', `${numCuenta}-${diaId}-2`);

      await withRetry(() =>
        runTransaction(db, async (tx) => {
          const s1 = await tx.get(doc1);
          const s2 = await tx.get(doc2);

          if (s1.exists() && s2.exists()) throw new Error('YA_HAY_DOS');

          if (turno === 1) {
            if (!s1.exists()) {
              tx.set(doc1, {
                numCuenta,
                nombre: nombreAlumno,
                estado: 'Entrada',
                fechaHora: serverTimestamp(),
                fechaHoy: fechaHoyBonita,
                diaId,
                turno: 1,
              });
            }
          } else {
            if (!s2.exists()) {
              tx.set(doc2, {
                numCuenta,
                nombre: nombreAlumno,
                estado: 'Salida',
                fechaHora: serverTimestamp(),
                fechaHoy: fechaHoyBonita,
                diaId,
                turno: 2,
              });
            }
          }
        })
      );

      return { estado, nombre: nombreAlumno };
    } finally {
      inFlightByCuenta.current.delete(numCuenta);
    }
  };

  // Escaneo global → encola
  const handleScan6 = (cuenta6) => {
    reflectInInput(cuenta6);
    enqueueRegistro(cuenta6);
  };

  return (
    <>
      {/* Banner offline */}
      {offline && (
        <div className="fixed top-0 inset-x-0 z-[10000] text-center py-2 bg-yellow-500 text-black font-semibold">
          Sin conexión. Los registros se enviarán al reconectar…
        </div>
      )}

      {/* Overlays */}
      {showInfo && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
          <div className="text-center p-8 rounded-lg bg-white shadow-lg">
            <div className="font-extrabold mb-2" style={{ fontSize: '6vw', color: '#1f2937' }}>
              ⏳ {infoMessage}
            </div>
          </div>
        </div>
      )}
      {showError && (
        <div className="fixed inset-0 z-[9999] bg-white/80 flex items-center justify-center animate-shake">
          <div className="text-center p-10 rounded-lg">
            <div className="font-extrabold mb-4" style={{ fontSize: '12vw', color: '#B91116', textShadow: '3px 3px 5px black' }}>
              🚨 ERROR 🚨
            </div>
            <div className="font-bold" style={{ fontSize: '6vw', color: '#B91116', textShadow: '2px 2px 4px black' }}>
              {errorMessage}
            </div>
          </div>
        </div>
      )}
      {showSuccess && (
        <div className="fixed inset-0 z-[9999] bg-green-700/80 flex items-center justify-center">
          <div className="text-center p-10 rounded-lg">
            <div className="font-extrabold mb-4" style={{ fontSize: '12vw', color: '#ffffff', textShadow: '3px 3px 5px black' }}>
              ✅ REGISTRO
            </div>
            <div className="font-bold" style={{ fontSize: '6vw', color: '#ffffff', textShadow: '2px 2px 4px black' }}>
              {successMessage}
            </div>
          </div>
        </div>
      )}

      {/* Escáner global */}
      <GlobalKeyScanner onScan={handleScan6} reflectInInput={(v) => reflectInInput(v)} />

      <Routes>
        <Route
          path="/"
          element={
            <RegistroAlumnos
              onEnqueueRegistro={enqueueRegistro}
              bindReflectInput={bindReflectInput}
              bindResetInput={bindResetInput}
            />
          }
        />
        <Route path="/registrar-alumno" element={<FormularioRegistro />} />
        <Route path="/consultar-registros" element={<ConsultarRegistros />} />
        <Route path="/subir-alumnos" element={<CargarAlumnos />} />
      </Routes>
    </>
  );
}

/* ===================== Router raíz ===================== */
export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}
