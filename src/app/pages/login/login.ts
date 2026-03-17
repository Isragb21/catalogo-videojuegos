import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

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

  private authService = inject(AuthService);
  private router = inject(Router);

  toggleModo() {
    this.modoRegistro = !this.modoRegistro;
    this.mensajeError = '';
    this.password = '';
    this.confirmPassword = '';
  }

  procesarFormulario() {
    this.mensajeError = '';

    // --- VALIDACIÓN DE ACCESO ESTRICTO ---
    const esInstitucional = this.email.endsWith('@uteq.edu.mx');
    const esAdminTest = this.email.toLowerCase() === '@test.com';

    // Si NO es institucional Y tampoco es el correo de prueba exacto, bloqueamos
    if (!esInstitucional && !esAdminTest) {
      this.mensajeError = 'Acceso denegado: Solo correos @uteq.edu.mx o el administrador autorizado.';
      return; 
    }

    if (this.password.length < 6) {
      this.mensajeError = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.modoRegistro && this.password !== this.confirmPassword) {
      this.mensajeError = 'Las contraseñas no coinciden.';
      return;
    }

    if (!this.modoRegistro) {
      this.authService.login(this.email, this.password)
        .then(() => {
          // Si es isra@test.com, lo mandamos directo al Admin, si no, al Inicio
          if (esAdminTest) {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/inicio']);
          }
        })
        .catch(() => this.mensajeError = 'Credenciales incorrectas.');
    } else {
      this.authService.registro(this.email, this.password)
        .then(() => this.router.navigate(['/inicio']))
        .catch(() => this.mensajeError = 'Error al registrar usuario.');
    }
  }
}