import { useState } from "react";
import Papa from "papaparse";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import FormularioRegistro from './FormularioRegistro';
import { useNavigate } from "react-router-dom"; // Importamos useNavigate

export default function CargarAlumnos() {
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const navigate = useNavigate(); // Definimos navigate aquí

  const handleFileChange = (e) => {
    setArchivo(e.target.files[0]);
  };

  const subirDatos = async () => {
    if (!archivo) {
      alert("Selecciona un archivo CSV primero.");
      return;
    }

    setSubiendo(true);
    const reader = new FileReader();

    reader.onload = async ({ target }) => {
      const csvData = Papa.parse(target.result, { header: true });
      const alumnos = csvData.data.filter((alumno) => alumno.numCuenta); // Filtra filas vacías
      
      try {
        for (const alumno of alumnos) {
          // Asegúrate de que los datos están completos y manejados correctamente
          const { numCuenta, nombre, Semestre, Grupo } = alumno;

          // Verificar si los campos necesarios existen y son válidos
          if (!numCuenta || !nombre || !Semestre || !Grupo) {
            console.error("Faltan datos importantes: numCuenta, nombre, Semestre o Grupo");
            continue; // Si falta un dato importante, lo ignoramos
          }

          // Agregar el alumno a Firebase
          await addDoc(collection(db, "alumnos"), {
            numCuenta,
            nombre,
            Semestre,
            Grupo,
          });
        }
        alert("Alumnos registrados correctamente.");
      } catch (error) {
        console.error("Error subiendo datos:", error);
      }

      setSubiendo(false);
    };

    reader.readAsText(archivo);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h2 className="text-xl font-bold mb-4">Subir Alumnos desde CSV</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} className="mb-4" />
      <button
        onClick={subirDatos}
        disabled={subiendo}
        className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
      >
        {subiendo ? "Subiendo..." : "Subir CSV"}
      </button>
      <button
          onClick={() => navigate("/registrar-alumno")}
          className="mt-4 w-full bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600">
          Regresar
        </button>
    </div>
  );
}
