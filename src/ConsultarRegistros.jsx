import React, { useState } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './scroll.css';


export default function ConsultarRegistros() {
  const [busqueda, setBusqueda] = useState('');
  const [registros, setRegistros] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [anioSeleccionado, setAnioSeleccionado] = useState(currentYear);

  const handleSearch = async () => {
    try {
      const q1 = query(collection(db, 'registros'), where('numCuenta', '==', busqueda));
      const q2 = query(collection(db, 'registros'), where('nombre', '==', busqueda));

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      let registrosEncontrados = [...snap1.docs, ...snap2.docs].map((doc) => doc.data());

      // Filtrar por mes seleccionado
      if (mesSeleccionado !== 0) {
        registrosEncontrados = registrosEncontrados.filter((registro) => {
          const fecha = new Date((registro.fechaHora?.seconds ?? 0) * 1000);
          return fecha.getMonth() + 1 === mesSeleccionado;
        });
      }
      
      if (anioSeleccionado !== 0) {
        registrosEncontrados = registrosEncontrados.filter((registro) => {
          const fecha = new Date((registro.fechaHora?.seconds ?? 0) * 1000);
          return fecha.getFullYear() === anioSeleccionado;
        });
      }
         
      // Ordenar los resultados por fechaHora de mas recientes a menos recientess
        registrosEncontrados.sort((a, b) => (b.fechaHora?.seconds ?? 0) - (a.fechaHora?.seconds ?? 0));

      setRegistros(registrosEncontrados);
    } catch (error) {
      console.error('Error al buscar registros:', error);
    }
  };

  const exportToExcel = () => {
    if (registros.length === 0) {
      alert('No hay registros para exportar.');
      return;
    }

    const data = registros.map((registro) => ({
      Nombre: registro.nombre,
      "Número de Cuenta": registro.numCuenta,
      Estado: registro.estado,
      "Fecha y Hora": new Date((registro.fechaHora?.seconds ?? 0) * 1000).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(dataBlob, `Registros_${busqueda}_${mesSeleccionado}.xlsx`);
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
  <h2 className="text-xl font-bold mb-4">Consultar Registros</h2>

  <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md flex flex-col items-center">
    {/* Formulario de búsqueda */}
    <input
      type="text"
      value={busqueda}
      onChange={(e) => setBusqueda(e.target.value)}
      className="w-full p-2 border rounded-lg mb-4"
      placeholder="Buscar por número de cuenta o nombre"
    />
    <button
      onClick={handleSearch}
      className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
    >
      Buscar
    </button>

    {/* Selección de mes */}
    <select
  value={mesSeleccionado}
  onChange={(e) => setMesSeleccionado(Number(e.target.value))}
  className="w-full p-2 border rounded-lg mb-4 bg-[#B91116] text-black cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value={0} className="text-gray-900">Todos</option>
  {Array.from({ length: 12 }, (_, i) => (
    <option key={i + 1} value={i + 1} className="text-gray-900">
      {new Date(0, i).toLocaleString('es-ES', { month: 'long' })}
    </option>
  ))}
</select>
<select
  value={anioSeleccionado}
  onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
  className="w-full p-2 border rounded-lg mb-4 bg-[#B91116] text-black cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value={0} className="text-gray-900">Todos los años</option>
  {Array.from({ length: 6 }, (_, i) => {
    const year = currentYear - i;
    return (
      <option key={year} value={year} className="text-gray-900">
        {year}
      </option>
    );
  })}
</select>
  </div>
{/*  */<br></br>}
{/* REGISTROS */}
<div className="bg-white p-4 rounded-lg shadow-md w-full max-w-md mt-4">
  {registros.length > 0 ? (
    <div className="scroll-fixed">
      {registros.map((registro, index) => {
        const estilo = {
          color: registro.estado === 'Entrada' ? '#16a34a' : '#dc2626',
          fontWeight: '600',
        };

        return (
          <div key={index} className="text-sm sm:text-base" style={estilo}>
            {registro.nombre} - {registro.numCuenta} - {registro.estado} -{' '}
            {new Date((registro.fechaHora?.seconds ?? 0) * 1000).toLocaleString()}
          </div>
        );
      })}
    </div>
  ) : (
    <div className="h-64 flex items-center justify-center text-gray-400">
      No se encontraron registros.
    </div>
  )}
</div>

  {/* Botón de exportar a Excel */}
  <button
    onClick={exportToExcel}
    className="mt-4 w-full max-w-md bg-green-600 text-white p-2 rounded-lg hover:bg-green-700"
  >
    Generar Reporte
  </button>
  {/* Botón para regresar a la página principal */}
  <button
    onClick={() => navigate('/')}
    className="mt-4 w-full max-w-md bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600"
  >
    Regresar
  </button>
</div>
    );
  }
