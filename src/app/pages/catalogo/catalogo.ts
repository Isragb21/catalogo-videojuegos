import { Component, OnInit, inject, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { CarritoService, ProductoCarrito } from '../../services/carrito.service';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

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
export class Catalogo implements OnInit, OnDestroy {
  // Datos de Firebase
  juegos: any[] = []; 
  juegosFiltrados: any[] = []; 
  
  // Variables de Buscador
  busqueda: string = '';
  
  // Servicios inyectados
  private carritoService = inject(CarritoService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private db: any;
  private ngZone = inject(NgZone);
  private unsubscribeJuegos: any;

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

  ngOnDestroy() {
    if (this.unsubscribeJuegos) {
      this.unsubscribeJuegos();
    }
  }

  // --- CONEXIÓN FIREBASE ---
  cargarDatos() {
    const juegosRef = collection(this.db, 'videojuegos');
    this.unsubscribeJuegos = onSnapshot(juegosRef, (snapshot) => {
      this.ngZone.run(() => {
        this.juegos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        this.filtrarJuegos();
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
  async agregarAlCarrito(juego: any) {
    // Verificar si el usuario está logueado usando el observable
    const user = await firstValueFrom(this.auth.usuario$);
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const producto: ProductoCarrito = {
      id: juego.id,
      titulo: juego.titulo,
      plataforma: juego.plataforma,
      precio: juego.precio,
      imagen: juego.imagen || 'https://via.placeholder.com/150',
      cantidad: 1
    };
    
    this.carritoService.agregarAlCarrito(producto);
    
    // Feedback visual con animación en el botón
    const btn = document.getElementById(`btn-${juego.id}`);
    if (btn) {
      const textoOriginal = btn.textContent;
      btn.textContent = '✓ AGREGADO';
      (btn as HTMLElement).style.background = '#00c853';
      setTimeout(() => {
        btn.textContent = '🛒 AGREGAR';
        (btn as HTMLElement).style.background = '#00ed64';
      }, 1500);
    }
  }
}