import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
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
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const setFocus = () => {
      inputRef.current?.focus();
    };
    
    setFocus();
    document.addEventListener('click', setFocus);
    return () => document.removeEventListener('click', setFocus);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) {
      setNumCuenta(value);
    }
  };

  const triggerError = (message) => {
    setErrorMessage(message);
    setShowError(true);
    setNumCuenta('');

    setTimeout(() => {
      setShowError(false);
      setErrorMessage('');
    }, 3000);
  };

  const handleRegistro = async () => {
    if (numCuenta.length !== 6) {
      triggerError('El número de cuenta debe tener 6 dígitos');
      return;
    }

    const fechaHoy = new Date().toLocaleDateString();
    const q = query(collection(db, 'alumnos'), where('numCuenta', '==', numCuenta));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      triggerError('No se encontró un alumno con ese número de cuenta.');
      return;
    }

    const alumno = querySnapshot.docs[0].data();
    const registrosHoy = query(
      collection(db, 'registros'),
      where('numCuenta', '==', numCuenta),
      where('fechaHoy', '==', fechaHoy)
    );
    const queryRegistrosHoy = await getDocs(registrosHoy);
    const estado = queryRegistrosHoy.size % 2 === 0 ? 'Entrada' : 'Salida';

    try {
      await addDoc(collection(db, 'registros'), {
        numCuenta,
        nombre: alumno.nombre,
        estado,
        fechaHora: new Date(),
        fechaHoy,
      });

      setNumCuenta('');
      console.log('Registro exitoso');
    } catch (error) {
      triggerError('Error al agregar registro.');
    }
  };

  useEffect(() => {
    document.body.style.backgroundColor = showError ? "#ffffff" : "#000000";
  }, [showError]);

  return (
    <>
      {showError && (
  <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center animate-shake">
    <div className="text-center p-10 rounded-lg">
      <div
        className="font-extrabold mb-4"
        style={{
          fontSize: '12vw',
          color: '#B91116',
          textShadow: '3px 3px 5px black',
          fontWeight: 'bold'
        }}
      >
        🚨 ERROR 🚨
      </div>
      <div
        className="font-bold"
        style={{
          fontSize: '6vw',
          color: '#B91116',
          textShadow: '2px 2px 4px black',
          fontWeight: 'bold'
        }}
      >
        {errorMessage}
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
            className="w-full bg-[#B91116] text-white p-2 mt-4 rounded-lg hover:bg-red-700"
          >
            Registrar
          </button>
{/*  */<br></br>}
          <button className="text-[#B91116] font-bold px-4 py-2 rounded-lg hover:bg-gray-200 mt-2" onClick={() => navigate('/registrar-alumno')}>
            Administración de Alumnos
          </button>
         
          <button className="text-[#B91116] font-bold px-4 py-2 rounded-lg hover:bg-gray-200 mt-2" onClick={() => navigate('/consultar-registros')}>
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
