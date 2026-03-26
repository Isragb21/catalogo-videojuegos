// src/app/pages/carrito/carrito.ts
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CarritoService, ProductoCarrito } from '../../services/carrito.service';
import { AuthService } from '../../services/auth';
import { FingerprintService } from '../../services/fingerprint.service';
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
  private fingerprintService = inject(FingerprintService);
  
  carrito: ProductoCarrito[] = [];
  total: number = 0;
  procesando: boolean = false;
  mostrarModal: boolean = false;
  mensajeModal: string = '';
  modalExito: boolean = false;
  
  // Variables para huella digital
  mostrarModalBiometrico: boolean = false;
  biometricoDisponible: boolean = false;
  biometricoRegistrado: boolean = false;
  verificandoBiometrico: boolean = false;

  ngOnInit() {
    this.carritoService.carrito$.subscribe(carrito => {
      this.carrito = carrito;
      this.total = this.carritoService.obtenerTotal();
      this.cdr.detectChanges();
    });
    
    // Verificar disponibilidad de biometría
    this.verificarBiometrico();
  }

  async verificarBiometrico() {
    this.biometricoDisponible = await this.fingerprintService.isBiometricAvailable();
    this.biometricoRegistrado = this.fingerprintService.hasBiometricRegistered();
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

    // Si hay biometría disponible y registrada, solicitar verificación
    if (this.biometricoDisponible && this.biometricoRegistrado) {
      this.mostrarModalBiometrico = true;
      this.cdr.detectChanges();
      return;
    }

    // Si no hay biometría, continuar con pago normal
    await this.ejecutarPago();
  }

  async confirmarConBiometrico() {
    this.verificandoBiometrico = true;
    this.cdr.detectChanges();
    
    const resultado = await this.fingerprintService.verifyFingerprint();
    
    this.verificandoBiometrico = false;
    
    if (resultado.success) {
      this.mostrarModalBiometrico = false;
      await this.ejecutarPago();
    } else {
      this.mensajeModal = resultado.message;
      this.modalExito = false;
      this.mostrarModal = true;
      this.mostrarModalBiometrico = false;
      this.cdr.detectChanges();
    }
  }

  async registrarBiometrico() {
    const user = await firstValueFrom(this.auth.usuario$);
    if (!user) return;
    
    const registrado = await this.fingerprintService.registerDevice(user.uid, user.email || 'usuario');
    
    if (registrado) {
      this.biometricoRegistrado = true;
      this.mensajeModal = '✅ ¡Huella digital registrada con éxito! Ahora puedes pagar con biometría.';
      this.modalExito = true;
      this.mostrarModal = true;
      this.mostrarModalBiometrico = false;
    } else {
      this.mensajeModal = '❌ No se pudo registrar la huella digital.';
      this.modalExito = false;
      this.mostrarModal = true;
    }
    this.cdr.detectChanges();
  }

  cancelarBiometrico() {
    this.mostrarModalBiometrico = false;
  }

  async ejecutarPago() {
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