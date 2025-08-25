import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import FormularioRegistro from "./FormularioRegistro";
import ConsultarRegistros from "./ConsultarRegistros";
import CargarAlumnos from "./CargarAlumnos";
import React from "react";
import "./styles.css";

/* ========== Utils ========= */
const onlyDigits6 = (s) => (s ?? "").toString().replace(/\D+/g, "").slice(0, 6);

/* ========== Logos ========= */
const LogoUAEH = ({ height = 80 }) => (
  <img src="/UAEH_Logo.png" alt="Logo UAEH" className="w-20 object-contain" style={{ height: `${height}px` }} />
);
const LogoPrepa6 = ({ height = 80 }) => (
  <img src="/Prepa6.png" alt="Logo Prepa6" className="w-20 object-contain" style={{ height: `${height}px` }} />
);

/* ========== Escáner global =========
   - Junta dígitos desde el teclado/escáner.
   - Al tener 6, pone el número en el input y llama a la función de registro del hijo con ese número.
*/
function GlobalKeyScanner({ setNumeroCuentaFromParent, registrarFromParent }) {
  const bufferRef = useRef("");
  const timerRef = useRef(null);

  useEffect(() => {
    const flushIfReady = () => {
      const v = onlyDigits6(bufferRef.current);
      if (v.length === 6) {
        setNumeroCuentaFromParent?.(v); // refleja en el input
        registrarFromParent?.(v);       // registra AUTOMÁTICAMENTE
      }
      bufferRef.current = "";
    };

    const onKeyDown = (e) => {
      // Si quieres ignorar cuando escribes en inputs/textarea, descomenta:
      // const tag = (e.target?.tagName || "").toLowerCase();
      // if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;

      if (e.key === "Enter") {
        flushIfReady();
        clearTimeout(timerRef.current);
        timerRef.current = null;
        return;
      }
      if (/^\d$/.test(e.key)) {
        bufferRef.current = onlyDigits6(bufferRef.current + e.key);
        if (bufferRef.current.length === 6) {
          flushIfReady();
          clearTimeout(timerRef.current);
          timerRef.current = null;
        } else {
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            flushIfReady();
            timerRef.current = null;
          }, 150);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timerRef.current);
    };
  }, [setNumeroCuentaFromParent, registrarFromParent]);

  return null;
}

/* ========== Pantalla de registro (tu lógica original, con mejora: acepta cuentaOverride) ========== */
function RegistroAlumnos({ bindSetNumeroCuenta, bindRegistrar }) {
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Fondo como en tu código
  useEffect(() => {
    const prev = {
      backgroundImage: document.body.style.backgroundImage,
      backgroundSize: document.body.style.backgroundSize,
      backgroundPosition: document.body.style.backgroundPosition,
      backgroundRepeat: document.body.style.backgroundRepeat,
      backgroundAttachment: document.body.style.backgroundAttachment,
    };
    document.body.style.backgroundImage = 'url("/fondo.jpg")';
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";

    return () => {
      document.body.style.backgroundImage = prev.backgroundImage || "";
      document.body.style.backgroundSize = prev.backgroundSize || "";
      document.body.style.backgroundPosition = prev.backgroundPosition || "";
      document.body.style.backgroundRepeat = prev.backgroundRepeat || "";
      document.body.style.backgroundAttachment = prev.backgroundAttachment || "";
    };
  }, []);

  // Auto enfoque
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Exponemos al padre cómo setear el número y cómo registrar (con soporte de cuentaOverride)
  useEffect(() => {
    bindSetNumeroCuenta?.((value) => {
      const v = onlyDigits6(value);
      setNumeroCuenta(v);
      requestAnimationFrame(() => inputRef.current?.focus());
    });
    bindRegistrar?.((cuentaOverride) => {
      handleRegistro(cuentaOverride);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Solo 6 dígitos
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) {
      setNumeroCuenta(value);
    }
  };

  // 👉 Ahora acepta cuentaOverride (del escáner) o usa el estado local
  const handleRegistro = async (cuentaOverride) => {
    const cuenta = onlyDigits6(cuentaOverride ?? numeroCuenta);

    if (cuenta.length === 6) {
      const fechaHora = new Date();

      try {
        // 1. Consultar el último registro de este alumno
        const registrosRef = collection(db, "registros");
        const q = query(
          registrosRef,
          where("numeroCuenta", "==", cuenta),
          orderBy("fechaHora", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const ultimoRegistro = querySnapshot.docs[0].data();
          const ultimoTiempo = ultimoRegistro.fechaHora?.toDate
            ? ultimoRegistro.fechaHora.toDate()
            : new Date(ultimoRegistro.fechaHora);

          const diferenciaMinutos = (fechaHora - ultimoTiempo) / (1000 * 60);

          if (diferenciaMinutos < 5) {
            alert(
              `Este alumno ya fue registrado hace ${Math.floor(
                diferenciaMinutos
              )} minutos. Intente de nuevo más tarde.`
            );
            setNumeroCuenta("");
            inputRef.current?.focus();
            return; // No registrar
          }
        }

        // 2. Asignar Entrada o Salida (misma lógica que tenías)
        const estado = Math.random() < 0.5 ? "Entrada" : "Salida";

        // 3. Nombre hardcodeado (igual que tu ejemplo)
        const nombreAlumno = "Hebert Obregon Ceron";

        // 4. Registrar en Firestore
        await addDoc(collection(db, "registros"), {
          numeroCuenta: cuenta,
          nombre: nombreAlumno,
          estado,
          fechaHora,
        });

        setNumeroCuenta("");
        inputRef.current?.focus();
        alert("Registro exitoso"); // 👉 se mantiene el mensaje que ya veías
      } catch (error) {
        console.error("Error al agregar registro:", error);
        alert("Ocurrió un error al registrar.");
      }
    } else {
      alert("El número de cuenta debe tener 6 dígitos");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6 text-center">
      <nav className="bg-blue-500 w-full p-4 mb-6 flex justify-center space-x-4">
        <button className="text-white" onClick={() => navigate("/registrar-alumno")}>
          Registro de Alumnos
        </button>
        <button className="text-white" onClick={() => navigate("/consultas")}>
          Consultas
        </button>
      </nav>

      <div className="bg-white p-6 rounded-lg shadow-md w-96 flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4">Registro de Entrada/Salida</h2>
        <input
          ref={inputRef}
          type="text"
          value={numeroCuenta}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && handleRegistro()}
          className="w-full p-2 border rounded-lg text-center"
          placeholder="Ingrese número de cuenta o escanee"
        />
        <button
          onClick={() => handleRegistro()}
          className="w-full bg-blue-500 text-white p-2 mt-4 rounded-lg hover:bg-blue-600"
        >
          Registrar
        </button>
      </div>
    </div>
  );
}

/* ========== App con Router + escáner global conectado al hijo ========== */
export default function App() {
  // Refs donde el hijo nos “presta” funciones
  const setNumeroCuentaFromChildRef = useRef(null);
  const registrarFromChildRef = useRef(null);

  // Binders: el hijo nos pasa sus funciones aquí
  const bindSetNumeroCuenta = (fn) => (setNumeroCuentaFromChildRef.current = fn);
  const bindRegistrar = (fn) => (registrarFromChildRef.current = fn);

  // Estas funciones las usa el escáner global
  const setNumeroCuentaFromParent = (value) => {
    setNumeroCuentaFromChildRef.current?.(value);
  };
  const registrarFromParent = (value) => {
    // 👉 ahora acepta el número y se lo pasa directo al hijo
    registrarFromChildRef.current?.(value);
  };

  return (
    <Router>
      {/* Escáner global: al juntar 6 dígitos, registra en automático */}
      <GlobalKeyScanner
        setNumeroCuentaFromParent={setNumeroCuentaFromParent}
        registrarFromParent={registrarFromParent}
      />

      <Routes>
        <Route
          path="/"
          element={
            <RegistroAlumnos
              bindSetNumeroCuenta={bindSetNumeroCuenta}
              bindRegistrar={bindRegistrar}
            />
          }
        />
        {/* Otras rutas (si las usas) */}
        <Route path="/registrar-alumno" element={<FormularioRegistro />} />
        <Route path="/consultar-registros" element={<ConsultarRegistros />} />
        <Route path="/subir-alumnos" element={<CargarAlumnos />} />
      </Routes>
    </Router>
  );
}
