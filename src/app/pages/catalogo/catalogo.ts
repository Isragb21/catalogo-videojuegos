import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

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
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css'
})
export class Catalogo implements OnInit {
  // Datos de Firebase
  juegos: any[] = []; 
  juegosFiltrados: any[] = []; 
  
  // Variables de Carrito y Buscador
  busqueda: string = '';
  carrito: any[] = [];
  mostrarCarrito: boolean = false;
  totalCarrito: number = 0;

  private db: any;
  private ngZone = inject(NgZone);

  constructor() {
    const nombreApp = 'CatalogoApp';
    const app = getApps().some(a => a.name === nombreApp) 
                ? getApp(nombreApp) 
                : initializeApp(firebaseConfig, nombreApp);
    this.db = getFirestore(app);
  }

  ngOnInit() {
    this.cargarDatos();
  }

  // --- CONEXIÓN FIREBASE ---
  cargarDatos() {
    const juegosRef = collection(this.db, 'videojuegos');
    onSnapshot(juegosRef, (snapshot) => {
      this.ngZone.run(() => {
        this.juegos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        this.filtrarJuegos(); // Actualiza la lista al recibir datos
      });
    });
  }

  // --- LÓGICA BUSCADOR ---
  filtrarJuegos() {
    const busq = this.busqueda.toLowerCase().trim();
    if (!busq) {
      this.juegosFiltrados = [...this.juegos];
    } else {
      this.juegosFiltrados = this.juegos.filter(juego => 
        juego.titulo.toLowerCase().includes(busq) || 
        juego.plataforma.toLowerCase().includes(busq)
      );
    }
  }

  // --- LÓGICA CARRITO ---
  toggleCarrito() {
    this.mostrarCarrito = !this.mostrarCarrito;
  }

  comprar(juego: any) {
    this.carrito.push(juego);
    this.calcularTotal();
  }

  eliminarDelCarrito(index: number) {
    this.carrito.splice(index, 1);
    this.calcularTotal();
  }

  calcularTotal() {
    this.totalCarrito = this.carrito.reduce((acc, item) => acc + Number(item.precio), 0);
  }

  pagar() {
    alert(`¡Gracias por tu compra! Total pagado: $${this.totalCarrito.toFixed(2)}`);
    this.carrito = [];
    this.totalCarrito = 0;
    this.mostrarCarrito = false;
  }
}