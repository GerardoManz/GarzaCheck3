
# 🦅 GarzaCheck3

**GarzaCheck3** es una aplicación web para el registro de entradas y salidas de alumnos de una institución educativa, desarrollada con **React** y **Firebase**. Permite gestionar alumnos, consultar registros históricos y exportar reportes.

---

## 🚀 Funcionalidades

- ✅ Registro de entradas y salidas por número de cuenta (automático según historial del día)
- 🔍 Consulta de registros por nombre o número de cuenta
- 📅 Filtro por mes y año de los registros
- 📤 Exportación de registros a Excel
- 👤 Administración de alumnos (agregar nuevos alumnos)
- ⚠️ Mensajes de error llamativos a pantalla completa
- 📱 Interfaz adaptable y centrada en la experiencia del usuario

---

## 🧑‍💻 Tecnologías usadas

- [React](https://reactjs.org/) (Vite)
- [Firebase](https://firebase.google.com/) (Firestore)
- [Tailwind CSS](https://tailwindcss.com/)
- [XLSX](https://sheetjs.com/) para exportar a Excel
- [FileSaver.js](https://github.com/eligrey/FileSaver.js) para descarga de archivos

---

## 🛠️ Instalación y uso local

1. **Clona este repositorio:**

```bash
git clone https://github.com/HebertObregonCeron/GarzaCheck3.git
cd GarzaCheck3
```

2. **Instala las dependencias:**

```bash
npm install
```

3. **Agrega tus credenciales de Firebase en un archivo `.env.local`:**

```env
VITE_API_KEY=tu_api_key
VITE_AUTH_DOMAIN=...
VITE_PROJECT_ID=...
VITE_STORAGE_BUCKET=...
VITE_MESSAGING_SENDER_ID=...
VITE_APP_ID=...
```

4. **Ejecuta el proyecto:**

```bash
npm run dev
```

---

## 🗂️ Estructura del proyecto

```
GarzaCheck3/
├── firebase.js           # Configuración de Firebase
├── App.jsx               # Rutas de la aplicación
├── RegistroAlumnos.jsx   # Registro de entradas/salidas
├── FormularioRegistro.jsx# Formulario para agregar alumnos
├── ConsultarRegistros.jsx# Módulo de consulta y exportación
├── CargarAlumnos.jsx     # Carga masiva (si aplica)
├── styles.css            # Estilos globales
├── scroll.css            # Estilos para scroll personalizado
└── ...
```

---

## Estructura de la Base de Datos en Firebase

La base de datos está organizada en dos colecciones principales: `alumnos` y `registros`. A continuación se describen los campos que deben contener los documentos en cada colección.

### Colección `alumnos`

Cada documento representa a un alumno y tiene los siguientes campos:

| Campo       | Tipo   | Descripción                           |
|-------------|--------|-------------------------------------|
| `numCuenta` | String | Número de cuenta único (6 dígitos)  |
| `nombre`    | String | Nombre completo del alumno           |
| `Grupo`     | String | Grupo al que pertenece el alumno     |
| `Semestre`  | String | Semestre que cursa el alumno         |

### Colección `registros`

Cada documento representa un registro de entrada o salida de un alumno y contiene:

| Campo       | Tipo      | Descripción                              |
|-------------|-----------|----------------------------------------|
| `numCuenta` | String    | Número de cuenta del alumno             |
| `nombre`    | String    | Nombre completo del alumno               |
| `estado`    | String    | `"Entrada"` o `"Salida"` indicando el tipo de registro |
| `fechaHora` | Timestamp | Marca de tiempo con fecha y hora exacta del registro  |
| `fechaHoy`  | String    | Fecha del día en formato `DD/MM/YYYY` para filtrar registros diarios |



### Ejemplo de documento en `alumnos`

```json
{
  "numCuenta": "448921",
  "nombre": "Obregon Ceron Hebert",
  "Grupo": "9",
  "Semestre": "9"
}
---
## ✨ Mejora futura

- Autenticación de usuarios con Firebase Auth
- Control de acceso por roles (admin, maestro, etc.)
- Reportes en PDF
- Dashboard visual con estadísticas

---

## 📧 Contacto

Proyecto realizado por **Hebert Obregón Cerón**  
📫 ob448921@uaeh.edu.mx

---    
