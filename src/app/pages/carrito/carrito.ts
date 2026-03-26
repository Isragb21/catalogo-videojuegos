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
  mostrarModalRegistro: boolean = false;
  biometricoDisponible: boolean = false;
  tieneHuellaRegistrada: boolean = false;
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
    this.tieneHuellaRegistrada = this.fingerprintService.hasFingerprintRegistered();
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

    // Verificar si la biometría está disponible
    if (!this.biometricoDisponible) {
      // Si no hay biometría disponible, pago normal
      await this.ejecutarPago();
      return;
    }

    // Si hay biometría pero no tiene huella registrada, mostrar modal de registro
    if (!this.tieneHuellaRegistrada) {
      this.mostrarModalRegistro = true;
      this.cdr.detectChanges();
      return;
    }

    // Si ya tiene huella registrada, solicitar verificación
    this.mostrarModalBiometrico = true;
    this.cdr.detectChanges();
  }

  async registrarHuella() {
    const user = await firstValueFrom(this.auth.usuario$);
    if (!user) return;
    
    const resultado = await this.fingerprintService.registerFingerprint(user.uid, user.email || 'usuario');
    
    if (resultado.success) {
      this.tieneHuellaRegistrada = true;
      this.mensajeModal = resultado.message;
      this.modalExito = true;
      this.mostrarModal = true;
      this.mostrarModalRegistro = false;
      this.cdr.detectChanges();
      
      // Después de registrar, pedir verificación para el pago actual
      setTimeout(() => {
        this.mostrarModalBiometrico = true;
        this.cdr.detectChanges();
      }, 1500);
    } else {
      this.mensajeModal = resultado.message;
      this.modalExito = false;
      this.mostrarModal = true;
      this.mostrarModalRegistro = false;
      this.cdr.detectChanges();
    }
  }

  cancelarRegistro() {
    this.mostrarModalRegistro = false;
    // Si cancela el registro, proceder con pago normal
    this.ejecutarPago();
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