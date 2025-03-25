import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import FormularioRegistro from './FormularioRegistro';
import ConsultarRegistros from './ConsultarRegistros';
import CargarAlumnos from "./CargarAlumnos";
import React from 'react';
import './styles.css';

const LogoUAEH = ({ height = 80 }) => {
  return (
    <img
      src="/registro-alumnos/public/UAEH_Logo.png"
      alt="Logo UAEH"
      className="w-20 object-contain"
      style={{ height: `${height}px` }}
    />
  );
};
const LogoPrepa6 = ({ height = 80 }) => {
  return (
    <img
      src="/registro-alumnos/public/Prepa6.png"
      alt="Logo Prepa6"
      className="w-20 object-contain"
      style={{ height: `${height}px` }}
    />
  );
};



function RegistroAlumnos() {
  const [numCuenta, setNumCuenta] = useState('');
  const [nombreAlumno, setNombreAlumno] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) {
      setNumCuenta(value);
    }
  };

  const handleRegistro = async () => {
    if (numCuenta.length === 6) {
      const fechaHoy = new Date().toLocaleDateString();
      const q = query(collection(db, 'alumnos'), where('numCuenta', '==', numCuenta));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const alumno = querySnapshot.docs[0].data();
        setNombreAlumno(alumno.nombre);

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
          console.error('Error al agregar registro:', error);
        }
      } else {
        alert('No se encontró un alumno con ese número de cuenta.');
      }
    } else {
      alert('El número de cuenta debe tener 6 dígitos');
    }
  };
  return (
    
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#B91116] p-6 text-center text-white">
      <LogoUAEH height={90} />
      {/* Barra de Navegación con Logos */}
    <LogoPrepa6 height={80} />
     {/* Formulario de Registro */}
      <div className="bg-white p-6 rounded-lg shadow-md w-96 flex flex-col items-center text-[#B91116] mt-6">
        <h2 className="text-xl font-bold mb-4">Registro de Entrada/Salida</h2>
        <input
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
        
        <button className="text-[#B91116] font-bold px-4 py-2 rounded-lg hover:bg-gray-200" onClick={() => navigate('/registrar-alumno')}>
      Registro de Alumnos
    </button>
    <button className="text-[#B91116] font-bold px-4 py-2 rounded-lg hover:bg-gray-200" onClick={() => navigate('/consultar-registros')}>
      Consultas 
    </button>
      </div>

    </div>
    
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