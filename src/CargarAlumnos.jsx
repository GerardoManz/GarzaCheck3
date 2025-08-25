import { useState, useEffect } from "react";
import Papa from "papaparse";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function CargarAlumnos() {
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const navigate = useNavigate();

  // 🖼️ Fondo en <body> SOLO mientras este componente está montado
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'black';
  
    return () => {
      document.body.style.backgroundColor = prev || '';
    };
  }, []);
  

  // Manejar cambio de archivo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      alert("El archivo debe ser un CSV válido.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("El archivo es demasiado grande (máximo 2MB).");
      return;
    }

    setArchivo(file);
  };

  // Leer archivo CSV
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

  // Verificar si un alumno ya existe
  const alumnoExiste = async (numCuenta) => {
    const q = query(collection(db, "alumnos"), where("numCuenta", "==", numCuenta));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  // Subir alumnos a Firestore
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

  // Proceso principal de carga
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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center text-white">
      <h2 className="text-xl font-bold mb-6">Subir Alumnos desde CSV</h2>

      {/* Contenedor que resalta la zona de interacción */}
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.9)",
          padding: "1.5rem",
          borderRadius: "0.5rem",
          boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: "400px",
          color: "#000",
        }}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-4 w-full"
        />

        <button
          onClick={subirDatos}
          disabled={subiendo}
          style={{
            backgroundColor: "#065f46",
            color: "#fff",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            cursor: subiendo ? "not-allowed" : "pointer",
            opacity: subiendo ? 0.7 : 1,
            width: "100%",
          }}
        >
          {subiendo ? "Subiendo..." : "Subir CSV"}
        </button>

        <button
          onClick={() => navigate("/registrar-alumno")}
          style={{
            backgroundColor: "#374151",
            color: "#fff",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            marginTop: "1rem",
            width: "100%",
          }}
        >
          Regresar
        </button>
      </div>
    </div>
  );
}
