import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth'; // Asegúrate de que la ruta sea correcta

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  confirmPassword = ''; 
  modoRegistro = false; 
  mensajeError = '';

  // 🔥 NUEVAS VARIABLES PARA EL REGISTRO
  nombre = '';
  telefono = '';

  private router = inject(Router);
  private authService = inject(AuthService); // Inyectamos tu servicio profesional

  toggleModo() {
    this.modoRegistro = !this.modoRegistro;
    this.mensajeError = '';
    this.password = '';
    this.confirmPassword = '';
    // Limpiamos los campos nuevos al cambiar de modo
    this.nombre = '';
    this.telefono = '';
  }

  async procesarFormulario() {
    this.mensajeError = '';

    // Limpieza de datos
    const emailLimpio = this.email.trim().toLowerCase();
    const passLimpio = this.password.trim();
    const nombreLimpio = this.nombre.trim();
    const telLimpio = this.telefono.trim();

    // Validaciones básicas
    if (!emailLimpio.endsWith('@uteq.edu.mx')) {
      this.mensajeError = 'Solo correos @uteq.edu.mx';
      return; 
    }

    if (passLimpio.length < 6) {
      this.mensajeError = 'Mínimo 6 caracteres';
      return;
    }

    try {
      if (!this.modoRegistro) {
        // ================= LOGIN USANDO TU SERVICIO =================
        console.log("⏳ Iniciando sesión vía AuthService...");
        await this.authService.login(emailLimpio, passLimpio);
        
        console.log("✅ Sesión iniciada. El AuthService ya notificó al Guardián.");
        this.router.navigate(['/inicio']); 

      } else {
        // ================= REGISTRO USANDO TU SERVICIO =================
        
        // Validación extra: Obligar a que pongan nombre y teléfono al registrarse
        if (!nombreLimpio || !telLimpio) {
          this.mensajeError = 'Por favor, llena tu nombre y teléfono.';
          return;
        }

        if (passLimpio !== this.confirmPassword.trim()) {
          this.mensajeError = 'Las contraseñas no coinciden';
          return;
        }

        console.log("⏳ Creando cuenta vía AuthService...");
        
        // 🔥 AQUÍ LE PASAMOS LOS 4 DATOS AL SERVICIO
        await this.authService.registro(emailLimpio, passLimpio, nombreLimpio, telLimpio);
        
        console.log("✅ Cuenta creada y perfil guardado en Firestore.");
        this.router.navigate(['/inicio']); 
      }

    } catch (error: any) {
      console.error("❌ Error:", error);
      // Manejo de errores amigable
      if (error.code === 'auth/invalid-credential') {
        this.mensajeError = 'Correo o contraseña incorrectos.';
      } else if (error.code === 'auth/email-already-in-use') {
        this.mensajeError = 'Este correo ya está registrado.';
      } else {
        this.mensajeError = 'Ocurrió un error inesperado.';
      }
    }
  }
}