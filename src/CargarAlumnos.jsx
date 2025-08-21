import { useState } from "react";
import Papa from "papaparse";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function CargarAlumnos() {
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const navigate = useNavigate();

  // 1️⃣ Manejar cambio de archivo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      alert("El archivo debe ser un CSV válido.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      alert("El archivo es demasiado grande (máximo 2MB).");
      return;
    }

    setArchivo(file);
  };

  // 2️⃣ Leer archivo CSV y convertir a objetos
  const leerArchivoCSV = () => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = ({ target }) => {
        const csvData = Papa.parse(target.result, {
          header: true,
          skipEmptyLines: true,
        });

        const alumnos = csvData.data
          .map((alumno) => ({
            numCuenta: alumno.numCuenta?.trim(),
            nombre: alumno.nombre?.trim(),
            Semestre: alumno.Semestre?.trim(),
            Grupo: alumno.Grupo?.trim(),
          }))
          .filter((a) => a.numCuenta && a.nombre && a.Semestre && a.Grupo);

        resolve(alumnos);
      };

      reader.onerror = () => reject("Error al leer el archivo CSV");
      reader.readAsText(archivo);
    });
  };

  // 3️⃣ Verificar si un alumno ya existe en Firestore
  const alumnoExiste = async (numCuenta) => {
    const q = query(collection(db, "alumnos"), where("numCuenta", "==", numCuenta));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  // 4️⃣ Subir alumnos a Firestore con batch
  const subirAlumnos = async (alumnos) => {
    const batch = writeBatch(db);
    let duplicados = 0;
    let nuevos = 0;

    for (const alumno of alumnos) {
      const existe = await alumnoExiste(alumno.numCuenta);
      if (existe) {
        duplicados++;
        continue;
      }

      const ref = doc(collection(db, "alumnos"));
      batch.set(ref, alumno);
      nuevos++;
    }

    await batch.commit();
    return { duplicados, nuevos };
  };

  // 5️⃣ Función principal de carga
  const subirDatos = async () => {
    if (!archivo) {
      alert("Selecciona un archivo CSV primero.");
      return;
    }

    setSubiendo(true);

    try {
      const alumnos = await leerArchivoCSV();
      const { duplicados, nuevos } = await subirAlumnos(alumnos);

      alert(`Carga finalizada: ${nuevos} nuevos, ${duplicados} duplicados.`);
    } catch (error) {
      console.error("Error subiendo datos:", error);
      alert("Ocurrió un error durante la carga.");
    }

    setSubiendo(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h2 className="text-xl font-bold mb-4">Subir Alumnos desde CSV</h2>

      <input type="file" accept=".csv" onChange={handleFileChange} className="mb-4" />

      {/* Botón subir CSV en verde */}
      <button
        onClick={subirDatos}
        disabled={subiendo}
        style={{
          backgroundColor: "#065f46", // verde oscuro
          color: "#fff",
          padding: "0.5rem",
          borderRadius: "0.5rem",
          cursor: subiendo ? "not-allowed" : "pointer",
          opacity: subiendo ? 0.7 : 1
        }}
      >
        {subiendo ? "Subiendo..." : "Subir CSV"}
      </button>

      <button
        onClick={() => navigate("/registrar-alumno")}
        style={{
          backgroundColor: "#374151", // gris oscuro
          color: "#fff",
          padding: "0.5rem",
          borderRadius: "0.5rem",
          marginTop: "1rem"
        }}
        className="w-full"
      >
        Regresar
      </button>
    </div>
  );
}
