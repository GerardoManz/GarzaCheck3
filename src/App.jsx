import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import FormularioRegistro from './FormularioRegistro';
import ConsultarRegistros from './ConsultarRegistros';
import CargarAlumnos from "./CargarAlumnos";
import React from 'react';
import './styles.css';

const LogoUAEH = ({ height = 80 }) => (
  <img src="/UAEH_Logo.png" alt="Logo UAEH" className="w-20 object-contain" style={{ height: `${height}px` }} />
);

const LogoPrepa6 = ({ height = 80 }) => (
  <img src="/Prepa6.png" alt="Logo Prepa6" className="w-20 object-contain" style={{ height: `${height}px` }} />
);

function RegistroAlumnos() {
  const [numCuenta, setNumCuenta] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Autoenfoque en el input
  useEffect(() => {
    const setFocus = () => {
      inputRef.current?.focus();
    };
    setFocus();
    document.addEventListener('click', setFocus);
    return () => document.removeEventListener('click', setFocus);
  }, []);

  // Control estricto del input: solo 6 dígitos
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) {
      setNumCuenta(value);
    }
  };

  // Mostrar error
  const triggerError = (message) => {
    setErrorMessage(message);
    setShowError(true);
    setNumCuenta('');
    setTimeout(() => {
      setShowError(false);
      setErrorMessage('');
    }, 3000);
  };

  // Mostrar éxito
  const triggerSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setNumCuenta('');
    setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage('');
    }, 3000);
  };

  // Registro de entrada/salida con 5 min de enfriamiento y tope de 2 registros por día
  const handleRegistro = async () => {
    try {
      if (numCuenta.length !== 6) {
        triggerError('El número de cuenta debe tener 6 dígitos');
        return;
      }

      const fechaHoy = new Date().toLocaleDateString();

      // 1) Validar que el alumno exista
      const qAlumno = query(collection(db, 'alumnos'), where('numCuenta', '==', numCuenta));
      const snapAlumno = await getDocs(qAlumno);
      if (snapAlumno.empty) {
        triggerError('No se encontró un alumno con ese número de cuenta.');
        return;
      }
      const alumno = snapAlumno.docs[0].data();

      // 2) Traer registros de hoy para alternar Entrada/Salida y limitar a 2 por día
      const qHoy = query(
        collection(db, 'registros'),
        where('numCuenta', '==', numCuenta),
        where('fechaHoy', '==', fechaHoy)
      );
      const snapHoy = await getDocs(qHoy);

      if (snapHoy.size >= 2) {
        triggerError('Ya cuenta con 2 registros el día de hoy.');
        return;
      }

      // Determinar estado por alternancia (0->Entrada, 1->Salida)
      const estado = snapHoy.size % 2 === 0 ? 'Entrada' : 'Salida';

      // 3) Enfriamiento de 5 minutos contra el ÚLTIMO registro (de cualquier día)
      let ultimoRegistroFecha = null;

      // Intento principal: numCuenta == y orderBy fechaHora desc limit 1
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
      } catch (e) {
        // Fallback (por si Firestore pide índice): consultar todos por numCuenta y calcular el más reciente en memoria
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

      // 👉 Mostrar ÉXITO de inmediato (optimista) porque ya pasó todas las validaciones
      //    Si la escritura fallara, ocultamos este éxito y mostramos error en el catch.
      triggerSuccess(`${estado} registrada para ${alumno.nombre}`);

      // 4) Guardar en Firestore
      await addDoc(collection(db, 'registros'), {
        numCuenta,
        nombre: alumno.nombre,
        estado,
        fechaHora: new Date(), // Firestore lo guarda como Timestamp
        fechaHoy,
      });

      // Reenfocar input
      inputRef.current?.focus();
    } catch (err) {
      console.error(err);
      // Si llega aquí, la escritura falló ⇒ ocultamos el éxito (si quedó visible) y mostramos error
      setShowSuccess(false);
      setSuccessMessage('');
      triggerError('Ocurrió un problema al registrar. Intente de nuevo.');
    }
  };

  // Cambiar fondo según mensaje
  useEffect(() => {
    if (showError) {
      document.body.style.backgroundColor = "#ffffff";
    } else if (showSuccess) {
      document.body.style.backgroundColor = "#065f46";
    } else {
      document.body.style.backgroundColor = "#000000";
    }
  }, [showError, showSuccess]);

  return (
    <>
      {showError && (
        <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center animate-shake">
          <div className="text-center p-10 rounded-lg">
            <div
              className="font-extrabold mb-4"
              style={{ fontSize: '12vw', color: '#B91116', textShadow: '3px 3px 5px black' }}
            >
              🚨 ERROR 🚨
            </div>
            <div
              className="font-bold"
              style={{ fontSize: '6vw', color: '#B91116', textShadow: '2px 2px 4px black' }}
            >
              {errorMessage}
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[9999] bg-green-700 flex items-center justify-center">
          <div className="text-center p-10 rounded-lg">
            <div
              className="font-extrabold mb-4"
              style={{ fontSize: '12vw', color: '#ffffff', textShadow: '3px 3px 5px black' }}
            >
              ✅ REGISTRO
            </div>
            <div
              className="font-bold"
              style={{ fontSize: '6vw', color: '#ffffff', textShadow: '2px 2px 4px black' }}
            >
              {successMessage}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center min-h-screen bg-[#B91116] p-6 text-center text-white">
        <LogoUAEH height={90} />
        <LogoPrepa6 height={80} />

        <div className="bg-white p-6 rounded-lg shadow-md w-96 flex flex-col items-center text-[#B91116] mt-6">
          <h2 className="text-xl font-bold mb-4">Registro de Entrada/Salida</h2>
          <input
            ref={inputRef}
            type="text"
            value={numCuenta}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleRegistro()}
            className="w-full p-2 border rounded-lg text-center text-black"
            placeholder="Ingrese número de cuenta"
          />

        <button
            onClick={handleRegistro}
            style={{
              backgroundColor: '#7f1d1d',
              color: '#fff',
              padding: '0.5rem',
              marginTop: '1rem',
              borderRadius: '0.5rem',
              fontWeight: 'bold'
            }}
            className="w-full"
          >
            Registrar
          </button>

          <button
            onClick={() => navigate('/registrar-alumno')}
            style={{
              backgroundColor: '#065f46',
              color: '#fff',
              padding: '0.5rem',
              marginTop: '0.5rem',
              borderRadius: '0.5rem',
              fontWeight: 'bold'
            }}
            className="w-full"
          >
            Administración de Alumnos
          </button>

          <button
            onClick={() => navigate('/consultar-registros')}
            style={{
              backgroundColor: '#374151',
              color: '#fff',
              padding: '0.5rem',
              marginTop: '0.5rem',
              borderRadius: '0.5rem',
              fontWeight: 'bold'
            }}
            className="w-full"
          >
            Consultas
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RegistroAlumnos />} />
        <Route path="/registrar-alumno" element={<FormularioRegistro />} />
        <Route path="/consultar-registros" element={<ConsultarRegistros />} />
        <Route path="/subir-alumnos" element={<CargarAlumnos />} />
      </Routes>
    </Router>
  );
}
