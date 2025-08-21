import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function FormularioRegistro() {
  const [numCuenta, setNumCuenta] = useState("");
  const [nombre, setNombre] = useState("");
  const [semestre, setSemestre] = useState("");
  const [grupo, setGrupo] = useState("");
  const navigate = useNavigate();

  const validarAlumno = ({ numCuenta, nombre, semestre, grupo }) => {
    const regexCuenta = /^\d{6}$/;
    const regexNombre = /^[A-ZÁÉÍÓÚÑ\s]+$/;
    const regexSemestre = /^[1-6]$/;
    const regexGrupo = /^\d{2}$/;

    return (
      regexCuenta.test(numCuenta) &&
      regexNombre.test(nombre) &&
      regexSemestre.test(semestre) &&
      regexGrupo.test(grupo)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarAlumno({ numCuenta, nombre, semestre, grupo })) {
      alert("Datos inválidos. Revisa los campos.");
      return;
    }

    try {
      const alumnosRef = collection(db, "alumnos");
      const q = query(alumnosRef, where("numCuenta", "==", numCuenta));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Alumno existente → obtener datos actuales
        const alumnoDoc = querySnapshot.docs[0];
        const datosActuales = alumnoDoc.data();

        // Mostrar datos y pedir confirmación
        const confirmar = window.confirm(
          `El alumno ya está registrado:\n
Número de Cuenta: ${datosActuales.numCuenta}
Nombre actual: ${datosActuales.nombre}
Semestre actual: ${datosActuales.Semestre}
Grupo actual: ${datosActuales.Grupo}

¿Deseas modificar sus datos con la nueva información ingresada?`
        );

        if (!confirmar) {
          alert("No se realizaron cambios.");
          return;
        }

        // Actualizar datos
        await updateDoc(doc(db, "alumnos", alumnoDoc.id), {
          nombre,
          Semestre: semestre,
          Grupo: grupo,
        });

        alert("Datos del alumno actualizados correctamente");
      } else {
        // Alumno nuevo → registrar
        await addDoc(alumnosRef, {
          numCuenta,
          nombre,
          Semestre: semestre,
          Grupo: grupo,
        });

        alert("Alumno registrado exitosamente");
      }

      // Limpiar formulario
      setNumCuenta("");
      setNombre("");
      setSemestre("");
      setGrupo("");

      navigate("/");
    } catch (error) {
      console.error("Error al registrar/editar alumno:", error);
      alert("Error en el proceso. Intenta nuevamente.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6 text-center">
      <h2 className="text-xl font-bold mb-4">Registrar o Editar Alumno</h2>
      <div className="bg-white p-6 rounded-lg shadow-md w-96 flex flex-col items-center">
        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="text"
            placeholder="Número de Cuenta (6 dígitos)"
            value={numCuenta}
            onChange={(e) => setNumCuenta(e.target.value.replace(/\D/g, ""))}
            className="w-full p-2 border rounded-lg mb-4"
            maxLength="6"
            required
          />
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) =>
              setNombre(
                e.target.value
                  .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, "")
                  .toUpperCase()
              )
            }
            className="w-full p-2 border rounded-lg mb-4"
            required
          />
          <input
            type="text"
            placeholder="Semestre (1-6)"
            value={semestre}
            onChange={(e) =>
              setSemestre(e.target.value.replace(/[^1-6]/g, "").slice(0, 1))
            }
            className="w-full p-2 border rounded-lg mb-4"
            required
          />
          <input
            type="text"
            placeholder="Grupo (2 dígitos)"
            value={grupo}
            onChange={(e) =>
              setGrupo(e.target.value.replace(/\D/g, "").slice(0, 2))
            }
            className="w-full p-2 border rounded-lg mb-4"
            maxLength="2"
            required
          />
          <button
            type="submit"
            style={{
              backgroundColor: "#065f46",
              color: "#fff",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              width: "100%",
            }}
          >
            Guardar Alumno
          </button>
        </form>
        <button
          style={{
            backgroundColor: "#4b5563",
            color: "#fff",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            marginTop: "0.5rem",
            width: "100%",
          }}
          onClick={() => navigate("/subir-alumnos")}
        >
          Subir Alumnos
        </button>
        <button
          onClick={() => navigate("/")}
          style={{
            backgroundColor: "#7f1d1d",
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
