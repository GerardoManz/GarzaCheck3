import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom"; // Para redirigir después del registro

export default function FormularioRegistro() {
  const [numCuenta, setNumCuenta] = useState("");
  const [nombre, setNombre] = useState("");
  const [semestre, setSemestre] = useState("");
  const [grupo, setGrupo] = useState("");
  const navigate = useNavigate(); // Redirigir después del registro

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (numCuenta.length === 6 && nombre && semestre && grupo) {
      try {
        // Agregar los datos del alumno a la colección 'alumnos' en Firestore
        await addDoc(collection(db, "alumnos"), {
          numCuenta,
          Nombre: nombre,
          Semestre: semestre,
          Grupo: grupo,
        });

        // Limpiar los campos después de guardar
        setNumCuenta("");
        setNombre("");
        setSemestre("");
        setGrupo("");

        alert("Alumno registrado exitosamente");

        // Redirigir a la página principal o a donde quieras
        navigate("/");
      } catch (error) {
        console.error("Error al registrar alumno:", error);
        alert("Error al registrar alumno. Intenta nuevamente.");
      }
    } else {
      alert("Por favor, completa todos los campos correctamente.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6 text-center">
      <h2 className="text-xl font-bold mb-4">Registrar Nuevo Alumno</h2>
      <div className="bg-white p-6 rounded-lg shadow-md w-96 flex flex-col items-center">
        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="text"
            placeholder="Número de Cuenta (6 dígitos)"
            value={numCuenta}
            onChange={(e) => setNumCuenta(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
            maxLength="6"
            required
          />
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
            required
          />
          <input
            type="text"
            placeholder="Semestre"
            value={semestre}
            onChange={(e) => setSemestre(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
            required
          />
          <input
            type="text"
            placeholder="Grupo"
            value={grupo}
            onChange={(e) => setGrupo(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
          >
            Registrar Alumno
          </button>
        </form>
        <button
          onClick={() => navigate("/")}
          className="mt-4 w-full bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600"
        >
          Regresar
        </button>
      </div>
    </div>
  );
}
