import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth';

export interface ProductoCarrito {
  id: string;
  titulo: string;
  plataforma: string;
  precio: number;
  imagen: string;
  cantidad: number;
}

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private carritoSubject = new BehaviorSubject<ProductoCarrito[]>([]);
  carrito$ = this.carritoSubject.asObservable();

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = 'http://localhost:3000/api/cart';
  private currentUserId: string | null = null;

  constructor() {
    this.cargarCarritoLocal();
    this.auth.usuario$.subscribe(user => {
      if (user) {
        this.currentUserId = user.uid || user.id;
        this.cargarCarritoBackend();
      } else {
        this.currentUserId = null;
        this.cargarCarritoLocal(); // Resetear al carrito local no autenticado
      }
    });
  }

  private cargarCarritoLocal() {
    if (typeof localStorage !== 'undefined') {
      const carritoGuardado = localStorage.getItem('carrito');
      if (carritoGuardado) {
        this.carritoSubject.next(JSON.parse(carritoGuardado));
      } else {
        this.carritoSubject.next([]);
      }
    }
  }

  private guardarCarritoLocal(carrito: ProductoCarrito[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('carrito', JSON.stringify(carrito));
    }
  }

  private async cargarCarritoBackend() {
    if (!this.currentUserId) return;
    try {
      const data = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/${this.currentUserId}`));
      const carritoMapeado: ProductoCarrito[] = data.map(item => ({
        id: item.videogame_id,
        titulo: item.videogames.title,
        plataforma: item.videogames.platform,
        precio: item.videogames.price,
        imagen: item.videogames.image_url,
        cantidad: item.quantity
      }));
      this.carritoSubject.next(carritoMapeado);
    } catch (error) {
      console.error('Error cargando carrito remoto:', error);
    }
  }

  async agregarAlCarrito(producto: ProductoCarrito) {
    const carritoActual = this.carritoSubject.value;
    const index = carritoActual.findIndex(p => p.id === producto.id);
    
    let nuevaCantidad = producto.cantidad;
    if (index !== -1) {
      nuevaCantidad += carritoActual[index].cantidad;
      carritoActual[index].cantidad = nuevaCantidad;
    } else {
      carritoActual.push({ ...producto });
    }
    
    this.carritoSubject.next([...carritoActual]);

    if (this.currentUserId) {
      try {
        await firstValueFrom(this.http.post(this.apiUrl, {
          user_id: this.currentUserId,
          videogame_id: producto.id,
          quantity: nuevaCantidad
        }));
      } catch (error) {
        console.error('Error guardando en backend:', error);
      }
    } else {
      this.guardarCarritoLocal(this.carritoSubject.value);
    }
  }

  async eliminarDelCarrito(id: string) {
    const carritoActual = this.carritoSubject.value.filter(p => p.id !== id);
    this.carritoSubject.next(carritoActual);

    if (this.currentUserId) {
      try {
        await firstValueFrom(this.http.delete(`${this.apiUrl}/${this.currentUserId}/${id}`));
      } catch (error) {
        console.error('Error eliminando en backend:', error);
      }
    } else {
      this.guardarCarritoLocal(carritoActual);
    }
  }

  async actualizarCantidad(id: string, cantidad: number) {
    if (cantidad <= 0) {
      return this.eliminarDelCarrito(id);
    }

    const carritoActual = this.carritoSubject.value;
    const producto = carritoActual.find(p => p.id === id);
    
    if (producto) {
      producto.cantidad = cantidad;
      this.carritoSubject.next([...carritoActual]);

      if (this.currentUserId) {
        try {
          await firstValueFrom(this.http.post(this.apiUrl, {
            user_id: this.currentUserId,
            videogame_id: id,
            quantity: cantidad
          }));
        } catch (error) {
          console.error('Error actualizando cantidad en backend:', error);
        }
      } else {
        this.guardarCarritoLocal(carritoActual);
      }
    }
  }

  obtenerTotal(): number {
    return this.carritoSubject.value.reduce(
      (total, producto) => total + (producto.precio * producto.cantidad), 
      0
    );
  }

  obtenerCantidadItems(): number {
    return this.carritoSubject.value.reduce(
      (total, producto) => total + producto.cantidad, 
      0
    );
  }

  async vaciarCarrito() {
    this.carritoSubject.next([]);
    
    if (this.currentUserId) {
      try {
        await firstValueFrom(this.http.delete(`${this.apiUrl}/${this.currentUserId}`));
      } catch (error) {
        console.error('Error vaciando carrito en backend:', error);
      }
    } else {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('carrito');
      }
    }
  }
}