// src/app/services/carrito.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

  constructor() {
    this.cargarCarritoLocal();
  }

  private cargarCarritoLocal() {
    if (typeof localStorage !== 'undefined') {
      const carritoGuardado = localStorage.getItem('carrito');
      if (carritoGuardado) {
        this.carritoSubject.next(JSON.parse(carritoGuardado));
      }
    }
  }

  private guardarCarritoLocal(carrito: ProductoCarrito[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('carrito', JSON.stringify(carrito));
    }
  }

  agregarAlCarrito(producto: ProductoCarrito) {
    const carritoActual = this.carritoSubject.value;
    const index = carritoActual.findIndex(p => p.id === producto.id);
    
    if (index !== -1) {
      carritoActual[index].cantidad += producto.cantidad;
    } else {
      carritoActual.push(producto);
    }
    
    this.carritoSubject.next([...carritoActual]);
    this.guardarCarritoLocal(this.carritoSubject.value);
  }

  eliminarDelCarrito(id: string) {
    const carritoActual = this.carritoSubject.value.filter(p => p.id !== id);
    this.carritoSubject.next(carritoActual);
    this.guardarCarritoLocal(carritoActual);
  }

  actualizarCantidad(id: string, cantidad: number) {
    const carritoActual = this.carritoSubject.value;
    const producto = carritoActual.find(p => p.id === id);
    
    if (producto) {
      if (cantidad <= 0) {
        this.eliminarDelCarrito(id);
      } else {
        producto.cantidad = cantidad;
        this.carritoSubject.next([...carritoActual]);
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

  vaciarCarrito() {
    this.carritoSubject.next([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('carrito');
    }
  }
}