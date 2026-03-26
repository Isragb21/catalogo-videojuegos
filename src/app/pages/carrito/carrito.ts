// src/app/pages/carrito/carrito.ts
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CarritoService, ProductoCarrito } from '../../services/carrito.service';
import { AuthService } from '../../services/auth';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css'
})
export class CarritoComponent implements OnInit {
  private carritoService = inject(CarritoService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  
  carrito: ProductoCarrito[] = [];
  total: number = 0;
  procesando: boolean = false;
  mostrarModal: boolean = false;
  mensajeModal: string = '';
  modalExito: boolean = false;

  ngOnInit() {
    this.carritoService.carrito$.subscribe(carrito => {
      this.carrito = carrito;
      this.total = this.carritoService.obtenerTotal();
      this.cdr.detectChanges();
    });
  }

  actualizarCantidad(id: string, cantidad: number) {
    this.carritoService.actualizarCantidad(id, cantidad);
  }

  eliminarItem(id: string) {
    this.carritoService.eliminarDelCarrito(id);
  }

  vaciarCarrito() {
    if (confirm('¿Vaciar todo el carrito?')) {
      this.carritoService.vaciarCarrito();
    }
  }

  async procesarPago() {
    const user = await firstValueFrom(this.auth.usuario$);
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.procesando = true;
    this.cdr.detectChanges();
    
    // Simulación de pago
    setTimeout(() => {
      this.procesando = false;
      this.modalExito = true;
      this.mensajeModal = '✅ ¡Pago realizado con éxito! Gracias por tu compra.';
      this.mostrarModal = true;
      this.cdr.detectChanges();
      this.carritoService.vaciarCarrito();
    }, 2000);
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.cdr.detectChanges();
    this.router.navigate(['/catalogo']);
  }
}