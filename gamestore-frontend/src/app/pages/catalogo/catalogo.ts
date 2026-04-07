import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CarritoService, ProductoCarrito } from '../../services/carrito.service';
import { AuthService } from '../../services/auth';
// Importamos tu nuevo servicio conectado a Express
import { VideogameService, Videogame } from '../../services/videogame.service';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css'
})
export class Catalogo implements OnInit {
  // Usamos la interfaz Videogame para tener tipado estricto
  juegos: Videogame[] = []; 
  juegosFiltrados: Videogame[] = []; 
  
  // Variables de Buscador
  busqueda: string = '';
  
  // Servicios inyectados
  private carritoService = inject(CarritoService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private videogameService = inject(VideogameService);

  ngOnInit() {
    this.cargarDatos();
  }

  // --- CONEXIÓN EXPRESS / POSTGRESQL ---
  cargarDatos() {
    this.videogameService.getVideogames().subscribe({
      next: (data) => {
        this.juegos = data;
        this.filtrarJuegos(); // Inicializamos la lista visual
      },
      error: (error) => {
        console.error('❌ Error al cargar el catálogo desde el backend:', error);
      }
    });
  }

  // --- LÓGICA BUSCADOR ---
  filtrarJuegos() {
    const busq = this.busqueda.toLowerCase().trim();
    if (!busq) {
      this.juegosFiltrados = [...this.juegos];
    } else {
      this.juegosFiltrados = this.juegos.filter(juego => 
        // Actualizado a las columnas de Supabase ('title' y 'platform')
        juego.title.toLowerCase().includes(busq) || 
        juego.platform.toLowerCase().includes(busq)
      );
    }
  }

  // --- LÓGICA CARRITO ---
  async agregarAlCarrito(juego: Videogame) {
    // Verificar si el usuario está logueado usando el observable
    const user = await firstValueFrom(this.auth.usuario$);
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Mapeamos los datos de Supabase a la estructura que espera tu CarritoService actual
    const producto: ProductoCarrito = {
      id: juego.id,
      titulo: juego.title, // Adaptación: title (BD) -> titulo (Frontend)
      plataforma: juego.platform, // Adaptación: platform (BD) -> plataforma (Frontend)
      precio: juego.price, // Adaptación: price (BD) -> precio (Frontend)
      imagen: juego.image_url || 'https://via.placeholder.com/150', // Adaptación a image_url
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