import { Component, OnInit, NgZone, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Importamos las funciones nativas de Firebase
import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

// --- TUS NUEVAS CREDENCIALES (Proyecto: gamestore-75936) ---
const firebaseConfig = {
  apiKey: "AIzaSyDfFRXH0bmUx_kAQCoCNKmKSrGfpr36hbQ",
  authDomain: "gamestore-75936.firebaseapp.com",
  projectId: "gamestore-75936",
  storageBucket: "gamestore-75936.firebasestorage.app",
  messagingSenderId: "487531405757",
  appId: "1:487531405757:web:4792de0e61e12e1e7f72d4",
  measurementId: "G-96F1S0RH8W"
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit, OnDestroy {
  
  nuevoTitulo: string = '';
  nuevaPlataforma: string = '';
  nuevaImagen: string = '';
  nuevoPrecio: any = null;

  juegos: Videojuego[] = [];
  mensajeEstado: string = 'Iniciando conexión...';

  private app: any;
  private db: any;
  private unsubscribe: any;
  private ngZone = inject(NgZone);

  constructor() {
    // Usamos un nombre único 'AdminPanel' para asegurar que conectamos
    // con ESTAS credenciales y no con las viejas de Angular
    const nombreApp = 'AdminPanel';
    
    try {
      // Si ya existe la conexión, la reiniciamos para evitar errores
      if (getApps().some(app => app.name === nombreApp)) {
        const appExistente = getApp(nombreApp);
        deleteApp(appExistente); 
      }
      
      // Iniciamos Firebase con tu nuevo proyecto
      this.app = initializeApp(firebaseConfig, nombreApp);
      this.db = getFirestore(this.app);
      console.log("✅ Conexión establecida con: gamestore-75936");
      
    } catch (e) {
      console.error("Error crítico iniciando Firebase:", e);
      this.mensajeEstado = 'Error de conexión: ' + e;
    }
  }

  ngOnInit() {
    this.obtenerJuegos();
  }

  ngOnDestroy() {
    // Cerramos la conexión si sales de la página
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  obtenerJuegos() {
    try {
      const juegosRef = collection(this.db, 'videojuegos');
      this.mensajeEstado = 'Buscando juegos en la nube...';

      // Escuchamos los cambios en tiempo real
      this.unsubscribe = onSnapshot(juegosRef, (snapshot) => {
        this.ngZone.run(() => {
          this.juegos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Videojuego[];
          
          this.mensajeEstado = `✅ Conectado. Juegos encontrados: ${this.juegos.length}`;
          console.log("🔥 Datos recibidos:", this.juegos);
        });
      }, (error) => {
        console.error("Error leyendo datos:", error);
        this.ngZone.run(() => {
           this.mensajeEstado = 'Error leyendo: ' + error.message;
        });
      });

    } catch (e) {
      console.error("Error en obtenerJuegos:", e);
    }
  }

  async agregarJuego() {
    if (!this.nuevoTitulo || !this.nuevaPlataforma) {
      alert('⚠️ Faltan datos obligatorios');
      return;
    }

    this.mensajeEstado = 'Guardando...';

    try {
      const juegosRef = collection(this.db, 'videojuegos');
      
      await addDoc(juegosRef, {
        titulo: this.nuevoTitulo,
        plataforma: this.nuevaPlataforma,
        imagen: this.nuevaImagen || 'https://via.placeholder.com/150',
        precio: Number(this.nuevoPrecio) || 0
      });

      this.resetFormulario();
      // No hace falta poner mensaje de éxito aquí, 
      // porque onSnapshot actualizará la tabla automáticamente

    } catch (error) {
      console.error("Error al guardar:", error);
      alert('Error al guardar. Mira la consola.');
    }
  }

  async borrarJuego(id: string) {
    if (confirm('¿Eliminar juego?')) {
      try {
        const docRef = doc(this.db, 'videojuegos', id);
        await deleteDoc(docRef);
      } catch (error) {
        console.error("Error al borrar:", error);
      }
    }
  }

  resetFormulario() {
    this.nuevoTitulo = '';
    this.nuevaPlataforma = '';
    this.nuevaImagen = '';
    this.nuevoPrecio = null;
  }
}

interface Videojuego {
  id?: string;
  titulo: string;
  plataforma: string;
  imagen: string;
  precio: number;
}