import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";

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

      try {
        // 1. Consultar el último registro de este alumno
        const registrosRef = collection(db, "registros");
        const q = query(
          registrosRef,
          where("numeroCuenta", "==", numeroCuenta),
          orderBy("fechaHora", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const ultimoRegistro = querySnapshot.docs[0].data();
          const ultimoTiempo = ultimoRegistro.fechaHora.toDate
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
            return; // No registrar
          }
        }

        // 2. Asignar Entrada o Salida (puedes ajustar la lógica)
        const estado = Math.random() < 0.5 ? "Entrada" : "Salida";

        // 3. Aquí deberías obtener el nombre real desde la base de datos
        const nombreAlumno = "Hebert Obregon Ceron";

        // 4. Registrar en Firestore
        await addDoc(collection(db, "registros"), {
          numeroCuenta,
          nombre: nombreAlumno,
          estado,
          fechaHora,
        });

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
        {/* Otras rutas */}
      </Routes>
    </Router>
  );
}
