import React, { useState } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function ConsultarRegistros() {
  const [busqueda, setBusqueda] = useState('');
  const [registros, setRegistros] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const navigate = useNavigate();

  const handleSearch = async () => {
    try {
      const q1 = query(collection(db, 'registros'), where('numCuenta', '==', busqueda));
      const q2 = query(collection(db, 'registros'), where('nombre', '==', busqueda));

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      let registrosEncontrados = [...snap1.docs, ...snap2.docs].map((doc) => doc.data());

      // Filtrar por el mes seleccionado
      registrosEncontrados = registrosEncontrados.filter((registro) => {
        const fecha = new Date((registro.fechaHora?.seconds ?? 0) * 1000);
        return fecha.getMonth() + 1 === mesSeleccionado;
      });

      // Ordenar los resultados por fechaHora de forma descendente
      registrosEncontrados.sort((a, b) => (b.fechaHora?.seconds ?? 0) - (a.fechaHora?.seconds ?? 0));
      
      setRegistros(registrosEncontrados);
    } catch (error) {
      console.error('Error al buscar registros:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6 text-center">
      <h2 className="text-xl font-bold mb-4">Consultar Registros</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-md w-96 flex flex-col items-center">
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
        className="w-full p-2 border rounded-lg mb-4 bg-[#B91116] text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
        {Array.from({ length: 12 }, (_, i) => (
        <option key={i + 1} value={i + 1} className="text-gray-900">
        {new Date(0, i).toLocaleString('es-ES', { month: 'long' })}
        </option>
        ))} 
        </select>
        
        
      </div>

      {/* Contenedor con tamaño fijo y scroll interno */}
      <div className="bg-white p-4 rounded-lg shadow-md w-96 mt-4 h-64 overflow-y-auto flex flex-col">
        {registros.length > 0 ? (
          <ul className="list-disc flex-grow overflow-y-auto">
            {registros.map((registro, index) => (
              <li key={index} className="mb-2">
                {registro.nombre} - {registro.numCuenta} - {registro.estado} -{' '}
                {new Date((registro.fechaHora?.seconds ?? 0) * 1000).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex-grow flex items-center justify-center">No se encontraron registros.</p>
        )}
      </div>
  
      {/* Botón para regresar a la página principal */}
      <button
        onClick={() => navigate('/')}
        className="mt-4 w-96 bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600"
      >
        Regresar
      </button>
    </div>
  );
}
