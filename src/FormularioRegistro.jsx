import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function FormularioRegistro() {
  const [numCuenta, setNumCuenta] = useState("");
  const [nombre, setNombre] = useState("");
  const [semestre, setSemestre] = useState("");
  const [grupo, setGrupo] = useState("");
  const [nombreFamiliar, setNombreFamiliar] = useState(""); // Nombre del familiar en mayúsculas
  const [parentesco, setParentesco] = useState(""); // Lista de parentesco
  const [telefonoFamiliar, setTelefonoFamiliar] = useState("");
  const navigate = useNavigate();

  // 🖼️ Fondo en <body> SOLO mientras este componente está montado
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'black';
  
    return () => {
      document.body.style.backgroundColor = prev || '';
    };
  }, []);
  

  // Validación
  const validarAlumno = ({ numCuenta, nombre, semestre, grupo, nombreFamiliar, parentesco, telefonoFamiliar }) => {
    const regexCuenta = /^\d{6}$/;
    const regexNombre = /^[A-ZÁÉÍÓÚÑ\s]+$/;
    const regexSemestre = /^[1-6]$/;
    const regexGrupo = /^\d{2}$/;
    const regexTelefono = /^\d{10}$/; // Validación para teléfono

    return (
      regexCuenta.test(numCuenta) &&
      regexNombre.test(nombre) &&
      regexSemestre.test(semestre) &&
      regexGrupo.test(grupo) &&
      regexNombre.test(nombreFamiliar) && // Validación nombre del familiar
      regexTelefono.test(telefonoFamiliar) // Validación teléfono
    );
  };

  // Enviar datos al backend (Firestore)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarAlumno({ numCuenta, nombre, semestre, grupo, nombreFamiliar, parentesco, telefonoFamiliar })) {
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

        // Actualizar datos (incluyendo los datos del familiar)
        await updateDoc(doc(db, "alumnos", alumnoDoc.id), {
          nombre,
          Semestre: semestre,
          Grupo: grupo,
          nombreFamiliar,
          parentesco,
          telefonoFamiliar,
        });

        alert("Datos del alumno actualizados correctamente");
      } else {
        // Alumno nuevo → registrar
        await addDoc(alumnosRef, {
          numCuenta,
          nombre,
          Semestre: semestre,
          Grupo: grupo,
          nombreFamiliar,
          parentesco,
          telefonoFamiliar,
        });

        alert("Alumno registrado exitosamente");
      }

      // Limpiar formulario
      setNumCuenta("");
      setNombre("");
      setSemestre("");
      setGrupo("");
      setNombreFamiliar(""); // Limpiar nombre familiar
      setParentesco(""); // Limpiar parentesco
      setTelefonoFamiliar(""); // Limpiar teléfono

      navigate("/"); // Redirigir a la página principal u otra ruta
    } catch (error) {
      console.error("Error al registrar/editar alumno:", error);
      alert("Error en el proceso. Intenta nuevamente.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center text-white">
      <h2 className="text-xl font-bold mb-4">Registrar o Editar Alumno</h2>
      <div className="bg-white p-6 rounded-lg shadow-md w-96 flex flex-col items-center text-black">
        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="text"
            placeholder="Número de Cuenta (6 dígitos)"
            value={numCuenta}
            onChange={(e) => setNumCuenta(e.target.value.replace(/\D/g, ""))}
            className="w-full p-2 border rounded-lg mb-4"
            maxLength="6"
            required
            style={{ lineHeight: "1.5" }}
          />
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) =>
              setNombre(
                e.target.value
                  .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, "")
                  .toUpperCase() // Asegura que el nombre esté en mayúsculas
              )
            }
            className="w-full p-2 border rounded-lg mb-4"
            required
            style={{ lineHeight: "1.5" }}
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
            style={{ lineHeight: "1.5" }}
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
            style={{ lineHeight: "1.5" }}
          />
          <input
            type="text"
            placeholder="Nombre del Familiar"
            value={nombreFamiliar}
            onChange={(e) => setNombreFamiliar(e.target.value.toUpperCase())} // Nombre familiar en mayúsculas
            className="w-full p-2 border rounded-lg mb-4"
            required
            style={{ lineHeight: "1.5" }}
          />
          <select
            value={parentesco}
            onChange={(e) => setParentesco(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
            required
            style={{
              appearance: "none", // Elimina la flecha predeterminada
              padding: "0.5rem 1rem", // Ajustamos padding superior/inferior e izquierdo/derecho
              fontSize: "1rem", // Ajusta el tamaño de la fuente
              borderRadius: "0.375rem", // Bordes redondeados
              height: "40px", // Altura consistente con los inputs
              lineHeight: "1.5", // Ajusta la línea para el texto
              boxSizing: "border-box", // Ajusta el box-sizing
              width: "100%", // Asegura que ocupe todo el ancho
            }}
          >
            <option value="">Selecciona Parentesco</option>
            <option value="MAMÁ">Mamá</option>
            <option value="PAPÁ">Papá</option>
            <option value="ABUELO">Abuelo</option>
            <option value="ABUELA">Abuela</option>
            <option value="TÍO">Tío</option>
            <option value="TÍA">Tía</option>
            <option value="FAMILIAR">Familiar</option>
          </select>
          <input
            type="text"
            placeholder="Teléfono de Contacto"
            value={telefonoFamiliar}
            onChange={(e) => setTelefonoFamiliar(e.target.value.replace(/\D/g, ""))}
            className="w-full p-2 border rounded-lg mb-4"
            maxLength="10"
            required
            style={{ lineHeight: "1.5" }}
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
