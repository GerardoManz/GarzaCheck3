import React, { useState } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './scroll.css';

export default function ConsultarRegistros() {
  const [busqueda, setBusqueda] = useState('');
  const [registros, setRegistros] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const navigate = useNavigate();

  const [mesSeleccionado, setMesSeleccionado] = useState(0);
  const [anioSeleccionado, setAnioSeleccionado] = useState(0);
  const [diaSeleccionado, setDiaSeleccionado] = useState(0);

  const currentYear = new Date().getFullYear();

  const handleSearch = async () => {
    try {
      const registrosSnap = await getDocs(collection(db, 'registros'));
      const registrosData = registrosSnap.docs.map(doc => doc.data());

      const alumnosSnap = await getDocs(collection(db, 'alumnos'));
      const alumnosData = alumnosSnap.docs.map(doc => doc.data());

      const alumnosMap = {};
      alumnosData.forEach(alumno => {
        alumnosMap[alumno.numCuenta] = alumno;
      });

      const registrosCompletos = registrosData.map(registro => {
        const datosAlumno = alumnosMap[registro.numCuenta] || {};
        return {
          ...registro,
          Grupo: datosAlumno.Grupo ?? registro.Grupo ?? 'N/A',
          Semestre: datosAlumno.Semestre ?? registro.Semestre ?? 'N/A',
          nombre: registro.nombre ?? datosAlumno.nombre ?? '',
        };
      });

      const textoBusqueda = busqueda.toLowerCase();

      let registrosFiltrados = registrosCompletos.filter(registro => {
        const numCuenta = (registro.numCuenta ?? '').toString().toLowerCase();
        const semestre = (registro.Semestre ?? '').toString().toLowerCase();
        const grupo = (registro.Grupo ?? '').toString().toLowerCase();
        const nombre = (registro.nombre ?? '').toLowerCase();
        const apellidos = (registro.apellidos ?? '').toLowerCase();

        return (
          numCuenta.includes(textoBusqueda) ||
          semestre.includes(textoBusqueda) ||
          grupo.includes(textoBusqueda) ||
          apellidos.includes(textoBusqueda) ||
          nombre.includes(textoBusqueda)
        );
      });

      if (estadoFiltro !== 'Todos') {
        registrosFiltrados = registrosFiltrados.filter(registro => registro.estado === estadoFiltro);
      }

      registrosFiltrados.sort((a, b) => (b.fechaHora?.seconds ?? 0) - (a.fechaHora?.seconds ?? 0));

      setRegistros(registrosFiltrados);
    } catch (error) {
      console.error('Error al buscar registros:', error);
    }
  };

  const exportToExcel = () => {
    if (registros.length === 0) {
      alert('No hay registros para exportar.');
      return;
    }

    let registrosExportar = registros;

    if (mesSeleccionado !== 0) {
      registrosExportar = registrosExportar.filter(registro => {
        const fecha = new Date((registro.fechaHora?.seconds ?? 0) * 1000);
        return fecha.getMonth() + 1 === mesSeleccionado;
      });
    }
    if (anioSeleccionado !== 0) {
      registrosExportar = registrosExportar.filter(registro => {
        const fecha = new Date((registro.fechaHora?.seconds ?? 0) * 1000);
        return fecha.getFullYear() === anioSeleccionado;
      });
    }
    if (diaSeleccionado !== 0) {
      registrosExportar = registrosExportar.filter(registro => {
        const fecha = new Date((registro.fechaHora?.seconds ?? 0) * 1000);
        return fecha.getDate() === diaSeleccionado;
      });
    }

    const data = registrosExportar.map(registro => ({
      "Número de Cuenta": registro.numCuenta ?? '',
      "Semestre": registro.Semestre ?? '',
      "Grupo": registro.Grupo ?? '',
      "Nombre": registro.nombre ?? '',
      "Apellidos": registro.apellidos ?? '',
      Estado: registro.estado ?? '',
      "Fecha y Hora": new Date((registro.fechaHora?.seconds ?? 0) * 1000).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });

    saveAs(dataBlob, `Registros_${busqueda}.xlsx`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
      <h2 className="text-xl font-bold mb-4">Consultar Registros</h2>

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md flex flex-col items-center">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full p-2 border rounded-lg mb-4"
          placeholder="Buscar por número de cuenta, semestre, grupo o nombre"
        />
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="w-full p-2 border rounded-lg mb-4 bg-red-800 text-white cursor-pointer"
        >
          <option value="Todos">Todos</option>
          <option value="Entrada">Entrada</option>
          <option value="Salida">Salida</option>
        </select>
      </div>

      {/* Filtros para exportación */}
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md flex flex-col items-center mt-2">
        <select
          value={mesSeleccionado}
          onChange={(e) => setMesSeleccionado(Number(e.target.value))}
          className="w-full p-2 border rounded-lg mb-2 bg-red-800 text-white"
        >
          <option value={0}>Todos los meses</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString('es-ES', { month: 'long' })}
            </option>
          ))}
        </select>

        <select
          value={anioSeleccionado}
          onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
          className="w-full p-2 border rounded-lg mb-2 bg-red-800 text-white"
        >
          <option value={0}>Todos los años</option>
          {Array.from({ length: 7 }, (_, i) => currentYear + i).map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          value={diaSeleccionado}
          onChange={(e) => setDiaSeleccionado(Number(e.target.value))}
          className="w-full p-2 border rounded-lg mb-4 bg-red-800 text-white"
        >
          <option value={0}>Todos los días</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
            <option key={dia} value={dia}>
              {dia}
            </option>
          ))}
        </select>
      </div>

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
                  {registro.numCuenta ?? 'N/A'} - {registro.Semestre ?? 'N/A'}° - Grupo {registro.Grupo ?? 'N/A'} - {registro.nombre ?? ''} {registro.apellidos ?? ''} - {registro.estado ?? ''} -{' '}
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

      {/* Botones con colores inline (Actualizado: colores intercambiados) */}
      <div className="w-full max-w-md mt-4 flex justify-between gap-4">
        <button
          onClick={handleSearch}
          style={{
            backgroundColor: '#374151', // ahora gris oscuro
            color: '#fff',
            padding: '0.5rem',
            borderRadius: '0.5rem',
          }}
          className="flex-1"
        >
          Actualizar
        </button>

        <div className="flex flex-1 gap-4">
          <button
            onClick={exportToExcel}
            style={{
              backgroundColor: '#065f46', // verde oscuro
              color: '#fff',
              padding: '0.5rem',
              borderRadius: '0.5rem',
            }}
            className="flex-1"
          >
            Generar Reporte
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#7f1d1d', // ahora rojo oscuro
              color: '#fff',
              padding: '0.5rem',
              borderRadius: '0.5rem',
            }}
            className="flex-1"
          >
            Regresar
          </button>
        </div>
      </div>
    </div>
  );
}
