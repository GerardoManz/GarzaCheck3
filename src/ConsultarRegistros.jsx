import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './scroll.css';

export default function ConsultarRegistros() {
  const [busqueda, setBusqueda] = useState('');
  const [registros, setRegistros] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [mesSeleccionado, setMesSeleccionado] = useState(0);
  const [anioSeleccionado, setAnioSeleccionado] = useState(0);
  const [diaSeleccionado, setDiaSeleccionado] = useState(0);

  const currentYear = new Date().getFullYear();
  const fmtFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

  // 🖼️ Fondo en <body> y estilos de tarjeta (se limpian al desmontar)
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.id = 'consultar-registros-forzado';
    styleTag.innerHTML = `
      body {
        background-color: #000 !important;
        background-image: none !important;
      }
      .consulta-card {
        background: rgba(255,255,255,0.94) !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 35px rgba(0,0,0,0.35) !important;
        border: 1px solid rgba(0,0,0,0.06) !important;
        max-width: 640px !important;
        width: 100% !important;
        padding: 24px !important;
        color: #000 !important;
        position: relative !important;
        z-index: 999 !important;
      }
      .btn-dark { background:#374151 !important; color:#fff !important; border-radius:8px !important; padding:8px 12px !important; }
      .btn-green { background:#065f46 !important; color:#fff !important; border-radius:8px !important; padding:8px 12px !important; }
      .btn-red   { background:#b91c1c !important; color:#fff !important; border-radius:8px !important; padding:8px 12px !important; }
      .btn-sky   { background:#0ea5e9 !important; color:#fff !important; border-radius:8px !important; padding:8px 12px !important; }

      .select-entrada { background:#065f46 !important; color:#fff !important; border-radius:8px !important; padding:6px 10px !important; }
      .select-salida  { background:#b91c1c !important; color:#fff !important; border-radius:8px !important; padding:6px 10px !important; }
      .select-gray    { background:#6b7280 !important; color:#fff !important; border-radius:8px !important; padding:6px 10px !important; }

      .campo { background:#fff !important; color:#000 !important; }
    `;
    document.head.appendChild(styleTag);
    return () => {
      styleTag.remove();
    };
  }, []);

  // Utilidades
  const toDate = (ts) => {
    if (!ts) return new Date(0);
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  const coincideTexto = (registro, texto) => {
    const t = texto.trim().toLowerCase();
    if (!t) return true;
    const f = (v = '') => v.toString().toLowerCase();
    return (
      f(registro.numCuenta).includes(t) ||
      f(registro.nombre).includes(t)
    );
  };

  const coincideEstado = (registro) => {
    if ((estadoFiltro ?? '').toLowerCase() === 'todos') return true;
    const norm = (registro.estado ?? '').toString().toLowerCase().trim();
    return norm === estadoFiltro.toLowerCase().trim();
  };

  const coincideFecha = (registro) => {
    if (anioSeleccionado === 0 && mesSeleccionado === 0 && diaSeleccionado === 0) return true;

    const d = toDate(registro.fechaHora);
    if (isNaN(d.getTime())) return false;

    if (anioSeleccionado !== 0 && d.getFullYear() !== anioSeleccionado) return false;
    if (mesSeleccionado !== 0 && (d.getMonth() + 1) !== mesSeleccionado) return false;
    if (diaSeleccionado !== 0 && d.getDate() !== diaSeleccionado) return false;

    return true;
  };

  // Carga + filtros (texto/estado/fecha) aplicados a la vista — SIGUE IGUAL
  const handleSearch = async () => {
    setLoading(true);
    try {
      // Descarga ambas colecciones (con id)
      const registrosSnap = await getDocs(collection(db, 'registros'));
      const registrosData = registrosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const alumnosSnap = await getDocs(collection(db, 'alumnos'));
      const alumnosData = alumnosSnap.docs.map(doc => doc.data());

      // Mapa por numCuenta
      const alumnosMap = {};
      alumnosData.forEach(alumno => {
        if (alumno && alumno.numCuenta != null) {
          alumnosMap[alumno.numCuenta] = alumno;
        }
      });

      // "Join" para completar datos faltantes (sin apellidos)
      const registrosCompletos = registrosData.map(registro => {
        const datosAlumno = alumnosMap[registro.numCuenta] || {};
        return {
          ...registro,
          Grupo: datosAlumno.Grupo ?? registro.Grupo ?? 'N/A',
          Semestre: datosAlumno.Semestre ?? registro.Semestre ?? 'N/A',
          nombre: registro.nombre ?? datosAlumno.nombre ?? '',
        };
      });

      // Aplica todos los filtros: texto + estado + fecha
      const texto = busqueda || '';
      let filtrados = registrosCompletos.filter(r =>
        coincideTexto(r, texto) && coincideEstado(r) && coincideFecha(r)
      );

      // Orden por fecha descendente
      filtrados.sort((a, b) => toDate(b.fechaHora) - toDate(a.fechaHora));

      setRegistros(filtrados);
    } catch (error) {
      console.error('Error al buscar registros:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Helper para traer alumnos de cuentas específicas ---
  const fetchAlumnosMapByCuentas = async (cuentasUnicas = []) => {
    const map = {};
    const cuentas = cuentasUnicas.filter(x => x !== undefined && x !== null);
    if (cuentas.length === 0) return map;

    const CHUNK = 10; // Firestore 'in' máximo 10
    for (let i = 0; i < cuentas.length; i += CHUNK) {
      const slice = cuentas.slice(i, i + CHUNK);
      const qAlu = query(collection(db, 'alumnos'), where('numCuenta', 'in', slice));
      const snap = await getDocs(qAlu);
      snap.docs.forEach(doc => {
        const a = doc.data();
        if (a?.numCuenta != null) map[a.numCuenta] = a;
      });
    }
    return map;
  };

  // --- NUEVO: botón rápido -> TODOS los registros del DÍA ACTUAL ---
  const handleQuick200 = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

      const qReg = query(
        collection(db, 'registros'),
        where('fechaHora', '>=', start),
        where('fechaHora', '<', end),
        orderBy('fechaHora', 'desc')
      );
      const regSnap = await getDocs(qReg);
      const base = regSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const cuentasUnicas = Array.from(new Set(base.map(r => r.numCuenta).filter(Boolean)));
      const alumnosMap = await fetchAlumnosMapByCuentas(cuentasUnicas);

      const completos = base.map(r => {
        const a = alumnosMap[r.numCuenta] || {};
        return {
          ...r,
          Grupo: r.Grupo ?? a.Grupo ?? 'N/A',
          Semestre: r.Semestre ?? a.Semestre ?? 'N/A',
          nombre: r.nombre ?? a.nombre ?? '',
        };
      });

      setRegistros(completos);
    } catch (e) {
      console.error('Error en rápido (hoy):', e);
    } finally {
      setLoading(false);
    }
  };

  // Exporta EXACTAMENTE lo que se ve en pantalla — SIGUE IGUAL
  const exportToExcel = () => {
    if (registros.length === 0) {
      alert('No hay registros para exportar.');
      return;
    }

    const data = registros.map(r => ({
      'Número de Cuenta': r.numCuenta ?? '',
      'Semestre': r.Semestre ?? '',
      'Grupo': r.Grupo ?? '',
      'Nombre': r.nombre ?? '',
      'Estado': r.estado ?? '',
      'Fecha y Hora': fmtFecha.format(toDate(r.fechaHora)),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, `Registros_${Date.now()}_vista.xlsx`);
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
      style={{ position: 'relative', zIndex: 1 }}
    >
      <div className="consulta-card">
        <h2 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
          Consultar Registros
        </h2>

        {/* Buscador y filtro de estado */}
        <div className="w-full">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4 campo"
            placeholder="Buscar por número de cuenta o nombre"
          />
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4 select-red cursor-pointer"
          >
            <option value="Todos">Todos</option>
            <option value="Entrada">Entrada</option>
            <option value="Salida">Salida</option>
          </select>
        </div>

        {/* Filtros para exportación y también aplican a la vista */}
        <div className="w-full">
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(Number(e.target.value))}
            className="w-full p-2 border rounded-lg mb-2 select-red"
          >
            <option value={0}>Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('es-MX', { month: 'long' })}
              </option>
            ))}
          </select>

          <select
            value={anioSeleccionado}
            onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
            className="w-full p-2 border rounded-lg mb-2 select-red"
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
            className="w-full p-2 border rounded-lg mb-4 select-red"
          >
            <option value={0}>Todos los días</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
              <option key={dia} value={dia}>
                {dia}
              </option>
            ))}
          </select>
        </div>

        {/* Resultados */}
        <div
          className="w-full"
          style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            padding: '1rem',
          }}
        >
          {loading ? (
            <div className="h-64 flex items-center justify-center" style={{ color: '#6b7280' }} role="status" aria-live="polite">
              Cargando...
            </div>
          ) : registros.length > 0 ? (
            <>
              <div className="text-left text-sm mb-2" style={{ color: '#374151' }}>
                Resultados: <strong>{registros.length}</strong>
              </div>
              <div className="scroll-fixed">
                {registros.map((registro) => {
                  const color = (registro.estado ?? '') === 'Entrada' ? '#16a34a' : '#dc2626';
                  return (
                    <div key={registro.id || `${registro.numCuenta}-${registro.fechaHora?.seconds || Math.random()}`} className="text-sm sm:text-base" style={{ color, fontWeight: 600 }}>
                      {registro.numCuenta ?? 'N/A'} - {registro.Semestre ?? 'N/A'}° - Grupo {registro.Grupo ?? 'N/A'} - {registro.nombre ?? ''}  - {registro.estado ?? ''} - {fmtFecha.format(toDate(registro.fechaHora))}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center" style={{ color: '#6b7280' }}>
              No se encontraron registros.
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="w-full mt-4 flex flex-wrap gap-4">
          <button onClick={handleSearch} className="flex-1 btn-dark" disabled={loading}>
            {loading ? 'Buscando...' : 'Actualizar'}
          </button>

          {/* NUEVO botón rápido -> hoy */}
          <button onClick={handleQuick200} className="flex-1 btn-sky" disabled={loading}>
            {loading ? 'Cargando...' : 'Rápido (hoy)'}
          </button>

          <button onClick={exportToExcel} className="flex-1 btn-green" disabled={loading || registros.length === 0}>
            Generar Reporte
          </button>

          <button onClick={() => navigate('/')} className="flex-1 btn-red">
            Regresar
          </button>
        </div>
      </div>
    </div>
  );
}
