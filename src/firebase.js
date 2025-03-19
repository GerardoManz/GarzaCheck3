// Importa las funciones necesarias de Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Agregamos Firestore
import { getAnalytics } from "firebase/analytics";

// Configuración de tu aplicación en Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAvU7aJfh6OdDP-josJMvhET7e3w_tFXvM",
  authDomain: "garzacheck3.firebaseapp.com",
  projectId: "garzacheck3",
  storageBucket: "garzacheck3.firebasestorage.app",
  messagingSenderId: "629608621775",
  appId: "1:629608621775:web:91393e9fff1c46d4ff79ba",
  measurementId: "G-F9YXXJR860"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

// Inicializar Analytics (si lo necesitas)
const analytics = getAnalytics(app);

// Exporta la referencia a Firestore para usarla en otros archivos
export { db };
