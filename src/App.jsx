import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { db } from './firebase'; // Asegúrate de importar la configuración de Firebase
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import FormularioRegistro from './FormularioRegistro'; // Importa el componente de formulario de registro
import ConsultarRegistros from './ConsultarRegistros'; // Importa el componente de consulta
import CargarAlumnos from "./CargarAlumnos";

import React from 'react';
import './styles.css'; // Importa el archivo CSS


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
      // Obtener la fecha actual
      const fechaHoy = new Date().toLocaleDateString();

      // Buscar el alumno en la base de datos para obtener su nombre
      const q = query(collection(db, 'alumnos'), where('numCuenta', '==', numCuenta));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const alumno = querySnapshot.docs[0].data();
        setNombreAlumno(alumno.nombre); 

        // Consultar cuántos registros tiene el alumno en ese día
        const registrosHoy = query(
          collection(db, 'registros'),
          where('numCuenta', '==', numCuenta),
          where('fechaHoy', '==', fechaHoy) // Añadir filtro por la fecha de hoy
        );
        const queryRegistrosHoy = await getDocs(registrosHoy);

        // Alternar entre "Entrada" y "Salida" según el número de registros
        const estado = queryRegistrosHoy.size % 2 === 0 ? 'Entrada' : 'Salida';

        try {
          // Registrar el evento de entrada o salida
          await addDoc(collection(db, 'registros'), {
            numCuenta,
            nombre: alumno.nombre,
            estado,
            fechaHora: new Date(),
            fechaHoy, // Almacenar la fecha en el documento
          });

          setNumCuenta('');
          console.log('Registro exitoso');
        } catch (error) {
          console.error('Error al agregar registro:', error);
        }
        //SE COMENTARON LAS ALERTAS PARA EVITAR INTERRUMPIR EL PROCESO EN CASO DE ERRORES CON UN CODIGO QR
      } //else {                                                           
        //alert('No se encontró un alumno con ese número de cuenta.');
      //}
    } //else {
      //alert('El número de cuenta debe tener 6 dígitos');
    //}
  };
  


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#B91116] p-6 text-center text-white">
      <nav className="bg-white w-full p-4 mb-6 flex justify-center space-x-4 shadow-md">
        <button className="text-[#B91116] font-bold px-4 py-2 rounded-lg hover:bg-gray-200" onClick={() => navigate('/registrar-alumno')}>
          Registro de Alumnos
        </button>
        <button className="text-[#B91116] font-bold px-4 py-2 rounded-lg hover:bg-gray-200" onClick={() => navigate('/consultar-registros')}>
          Consultas
        </button>
      </nav>

      <div className="bg-white p-6 rounded-lg shadow-md w-96 flex flex-col items-center text-[#B91116]">
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
        <button className="text-white" onClick={() => navigate('/subir-alumnos')}>
  Subir Alumnos
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
