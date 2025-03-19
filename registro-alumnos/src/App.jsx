import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { db } from "./firebase"; // Asegúrate de importar la configuración de Firebase
import { collection, addDoc } from "firebase/firestore";

function RegistroAlumnos() {
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) {
      setNumeroCuenta(value);
    }
  };

  const handleRegistro = async () => {
    if (numeroCuenta.length === 6) {
      const fechaHora = new Date();
      const estado = Math.random() < 0.5 ? "Entrada" : "Salida"; // Alterna entre entrada y salida (esto se puede ajustar más)

      try {
        // Aquí obtienes el nombre del alumno, puedes obtenerlo de la base de datos o desde un estado
        const nombreAlumno = "Hebert Obregon Ceron"; // Esto debe ser consultado desde Firebase

        // Agrega el registro en la colección 'registros'
        await addDoc(collection(db, "registros"), {
          numeroCuenta,
          nombre: nombreAlumno,
          estado,
          fechaHora,
        });

        // Después de registrar, reseteas el campo
        setNumeroCuenta("");
        console.log("Registro exitoso");
      } catch (error) {
        console.error("Error al agregar registro:", error);
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
          type="text"
          value={numeroCuenta}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && handleRegistro()}
          className="w-full p-2 border rounded-lg text-center"
          placeholder="Ingrese número de cuenta"
        />
        <button
          onClick={handleRegistro}
          className="w-full bg-blue-500 text-white p-2 mt-4 rounded-lg hover:bg-blue-600"
        >
          Registrar
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
        {/* Aquí se incluirían las otras rutas, por ejemplo: */}
        <Route path="/registrar-alumno" element={<FormularioRegistro />} />
      </Routes>
    </Router>
  );
}
