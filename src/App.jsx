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

/* ===================== Escáner global =====================
   - Filtrado anti-doble: si el foco está en input/textarea/contentEditable, NO dispara.
   - Si el foco NO está en un campo editable, acumula y al llegar a 6 dispara onScan.
*/
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
      // === FILTRO ANTI-DOBLE DISPARO ===
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
          }, 150);
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
function RegistroAlumnos({ onRegistrarGlobal, bindReflectInput, bindResetInput }) {
  const [numCuenta, setNumCuenta] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Timer para auto-submit cuando el input llega a 6 dígitos
  const submitTimerRef = useRef(null);

  // Fondo en toda la pantalla SOLO mientras este componente está montado.
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'black';
    return () => { document.body.style.backgroundColor = prev || ''; };
  }, []);

  // Auto enfoque
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Permitir que App refleje el número escaneado en este input
  useEffect(() => {
    bindReflectInput?.((v) => {
      clearTimeout(submitTimerRef.current);
      const val = onlyDigits6(v);
      setNumCuenta(val);
      requestAnimationFrame(() => inputRef.current?.focus());
      // Auto-submit si el lector no manda Enter
      if (val.length === 6) {
        submitTimerRef.current = setTimeout(() => {
          onRegistrarGlobal(val);
        }, 150);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Permitir que App limpie el input tras cualquier alerta (éxito/error)
  useEffect(() => {
    bindResetInput?.(() => {
      clearTimeout(submitTimerRef.current);
      setNumCuenta('');
      requestAnimationFrame(() => inputRef.current?.focus());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => clearTimeout(submitTimerRef.current);
  }, []);

  // Solo 6 dígitos + auto-submit si el lector no manda Enter
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (!/^\d{0,6}$/.test(value)) return;

    clearTimeout(submitTimerRef.current);
    setNumCuenta(value);

    if (value.length === 6) {
      submitTimerRef.current = setTimeout(() => {
        onRegistrarGlobal(value);
      }, 150);
    }
  };

  const handleRegistro = () => {
    clearTimeout(submitTimerRef.current);
    onRegistrarGlobal(numCuenta);
  };

  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(submitTimerRef.current);
      onRegistrarGlobal(numCuenta);
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

/* ===================== App con registro GLOBAL + overlays globales ===================== */
function AppInner() {
  // Overlays globales
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const tErr = useRef(null);
  const tOk = useRef(null);

  // Candado contra solicitudes simultáneas por la misma cuenta
  const inFlightByCuenta = useRef(new Set()); // Set<numCuenta>

  // Para reflejar el escaneo en el input de RegistroAlumnos si está montado
  const reflectInputFnRef = useRef(null);
  const bindReflectInput = (fn) => { reflectInputFnRef.current = fn; };
  const reflectInInput = (v) => { reflectInputFnRef.current?.(v); };

  // Para limpiar el input tras cada alerta
  const resetInputFnRef = useRef(null);
  const bindResetInput = (fn) => { resetInputFnRef.current = fn; };
  const resetInput = () => resetInputFnRef.current?.();

  useEffect(() => {
    return () => {
      clearTimeout(tErr.current);
      clearTimeout(tOk.current);
    };
  }, []);

  const triggerError = (message) => {
    // Limpia input para permitir siguiente escaneo
    resetInput();
    clearTimeout(tErr.current);
    setErrorMessage(message);
    setShowError(true);
    tErr.current = setTimeout(() => {
      setShowError(false);
      setErrorMessage('');
    }, 3000);
  };

  const triggerSuccess = (message) => {
    // Limpia input para permitir siguiente escaneo
    resetInput();
    clearTimeout(tOk.current);
    setSuccessMessage(message);
    setShowSuccess(true);
    tOk.current = setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage('');
    }, 3000);
  };

  // === Registrador GLOBAL: idempotente y anti-duplicados ===
  const registrarGlobal = async (numCuentaRaw) => {
    const numCuenta = onlyDigits6(numCuentaRaw);

    // Candado simple en cliente
    if (!numCuenta || numCuenta.length !== 6) {
      triggerError('El número de cuenta debe tener 6 dígitos');
      return;
    }
    if (inFlightByCuenta.current.has(numCuenta)) return;
    inFlightByCuenta.current.add(numCuenta);

    try {
      const fechaHoyBonita = new Date().toLocaleDateString(); // legible local (MX)
      const diaId = yyyymmddLocal();                           // clave estable YYYY-MM-DD

      // 1) Validar alumno
      const qAlumno = query(collection(db, 'alumnos'), where('numCuenta', '==', numCuenta));
      const snapAlumno = await getDocs(qAlumno);
      if (snapAlumno.empty) {
        triggerError('No se encontró un alumno con ese número de cuenta.');
        return;
      }
      const alumno = snapAlumno.docs[0].data();

      // 2) Contar registros de HOY (usa tu campo existente `fechaHoy`)
      const qHoy = query(
        collection(db, 'registros'),
        where('numCuenta', '==', numCuenta),
        where('fechaHoy', '==', fechaHoyBonita)
      );
      const snapHoy = await getDocs(qHoy);
      const registrosHoy = snapHoy.size;

      if (registrosHoy >= 2) {
        triggerError('Ya cuenta con 2 registros el día de hoy.');
        return;
      }

      // 3) Enfriamiento 5 min (último registro por fechaHora)
      let ultimoRegistroFecha = null;
      try {
        const qUltimo = query(
          collection(db, 'registros'),
          where('numCuenta', '==', numCuenta),
          orderBy('fechaHora', 'desc'),
          limit(1)
        );
        const snapUltimo = await getDocs(qUltimo);
        if (!snapUltimo.empty) {
          const fh = snapUltimo.docs[0].data().fechaHora;
          ultimoRegistroFecha = fh?.toDate ? fh.toDate() : new Date(fh);
        }
      } catch {
        // Fallback si no permite orderBy (sin índice)
        const qSoloNum = query(collection(db, 'registros'), where('numCuenta', '==', numCuenta));
        const snapSoloNum = await getDocs(qSoloNum);
        snapSoloNum.forEach((d) => {
          const fh = d.data().fechaHora;
          const f = fh?.toDate ? fh.toDate() : new Date(fh);
          if (!ultimoRegistroFecha || f > ultimoRegistroFecha) ultimoRegistroFecha = f;
        });
      }

      if (ultimoRegistroFecha) {
        const diffMin = (Date.now() - ultimoRegistroFecha.getTime()) / 60000;
        if (diffMin < 5) {
          const faltan = Math.ceil(5 - diffMin);
          triggerError(`Debe esperar ${faltan} minuto(s) antes de volver a registrar.`);
          return;
        }
      }

      // 4) Turno: 0 -> Entrada, 1 -> Salida
      const turno = (registrosHoy % 2 === 0) ? 1 : 2;
      const estado = turno === 1 ? 'Entrada' : 'Salida';

      // 5) Escritura idempotente con transacción + ID determinístico
      //    - {numCuenta}-{diaId}-1  (Entrada de hoy)
      //    - {numCuenta}-{diaId}-2  (Salida  de hoy)
      const doc1 = doc(db, 'registros', `${numCuenta}-${diaId}-1`);
      const doc2 = doc(db, 'registros', `${numCuenta}-${diaId}-2`);

      await runTransaction(db, async (tx) => {
        const s1 = await tx.get(doc1);
        const s2 = await tx.get(doc2);

        // Si ya hay ambos, aborta
        if (s1.exists() && s2.exists()) {
          throw new Error('YA_HAY_DOS');
        }

        if (turno === 1) {
          // Entrada
          if (!s1.exists()) {
            tx.set(doc1, {
              numCuenta,
              nombre: alumno.nombre,
              estado: 'Entrada',
              fechaHora: serverTimestamp(),
              fechaHoy: fechaHoyBonita,
              diaId,
              turno: 1,
            });
          }
        } else {
          // Salida
          if (!s2.exists()) {
            tx.set(doc2, {
              numCuenta,
              nombre: alumno.nombre,
              estado: 'Salida',
              fechaHora: serverTimestamp(),
              fechaHoy: fechaHoyBonita,
              diaId,
              turno: 2,
            });
          }
        }
      });

      // Éxito (post-transacción)
      triggerSuccess(`${estado} registrada para ${alumno.nombre}`);
    } catch (err) {
      if (err?.message === 'YA_HAY_DOS') {
        triggerError('Ya cuenta con 2 registros el día de hoy.');
      } else {
        console.error(err);
        setShowSuccess(false);
        setSuccessMessage('');
        triggerError('Ocurrió un problema al registrar. Intente de nuevo.');
      }
    } finally {
      inFlightByCuenta.current.delete(numCuenta);
    }
  };

  // === Escaneo: REGISTRA SIEMPRE (cualquier pantalla) y refleja en input si procede ===
  const handleScan6 = (cuenta6) => {
    reflectInInput(cuenta6); // ver el número en pantalla si estás en "/"
    registrarGlobal(cuenta6);
  };

  return (
    <>
      {/* Overlays globales */}
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
      <GlobalKeyScanner onScan={handleScan6} reflectInInput={reflectInInput} />

      <Routes>
        <Route
          path="/"
          element={
            <RegistroAlumnos
              onRegistrarGlobal={registrarGlobal}
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
