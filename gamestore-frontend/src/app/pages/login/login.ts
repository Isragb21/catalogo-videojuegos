import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth'; 
import { QRCodeComponent } from 'angularx-qrcode';
import * as OTPAuth from 'otpauth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  email = '';
  password = '';
  confirmPassword = ''; 
  modoRegistro = false; 
  mensajeError = '';

  nombre = '';
  telefono = '';

  modo2FA = false;     
  secreto = '';        
  qrCodeUrl = '';      
  codigo2FA = '';      
  mensaje2FA = '';     
  correoActual = '';   

  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    localStorage.removeItem('2fa_aprobado');
  }

  toggleModo() {
    this.modoRegistro = !this.modoRegistro;
    this.mensajeError = '';
    this.password = '';
    this.confirmPassword = '';
    this.nombre = '';
    this.telefono = '';
  }

  async procesarFormulario() {
    this.mensajeError = '';

    const emailLimpio = this.email.trim().toLowerCase();
    const passLimpio = this.password.trim();
    const nombreLimpio = this.nombre.trim();
    const telLimpio = this.telefono.trim();

    if (!emailLimpio.endsWith('@uteq.edu.mx')) {
      this.mensajeError = 'Solo correos @uteq.edu.mx';
      return; 
    }

    if (passLimpio.length < 6) {
      this.mensajeError = 'Minimo 6 caracteres';
      return;
    }

    try {
      if (!this.modoRegistro) {
        await this.authService.login(emailLimpio, passLimpio);
        this.correoActual = emailLimpio;
        this.preparar2FA(emailLimpio);

      } else {
        if (!nombreLimpio || !telLimpio) {
          this.mensajeError = 'Por favor, llena tu nombre y telefono.';
          return;
        }
        if (passLimpio !== this.confirmPassword.trim()) {
          this.mensajeError = 'Las contrasenas no coinciden';
          return;
        }

        await this.authService.registro(emailLimpio, passLimpio, nombreLimpio, telLimpio);
        this.correoActual = emailLimpio;
        this.preparar2FA(emailLimpio);
      }

    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        this.mensajeError = 'Correo o contrasena incorrectos.';
      } else if (error.code === 'auth/email-already-in-use') {
        this.mensajeError = 'Este correo ya esta registrado.';
      } else {
        this.mensajeError = 'Ocurrio un error inesperado.';
      }
    }
  }

  preparar2FA(emailUsuario: string) {
    this.modo2FA = true; 
    
    const totp = new OTPAuth.TOTP({
      issuer: 'GameStore',
      label: emailUsuario,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 }) 
    });
    
    this.secreto = totp.secret.base32;
    this.qrCodeUrl = totp.toString(); 
    
    this.mensaje2FA = 'Escanea este QR desde tu app Microsoft Authenticator.';
  }

  validarCodigo2FA() {
    const tokenLimpio = this.codigo2FA.replace(/\s/g, '');

    const totp = new OTPAuth.TOTP({
      issuer: 'GameStore',
      label: this.correoActual,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(this.secreto)
    });

    const delta = totp.validate({ token: tokenLimpio, window: 3 });

    if (delta !== null) {
      localStorage.setItem('2fa_aprobado', 'true');
      this.router.navigate(['/inicio']); 
    } else {
      this.mensaje2FA = 'Codigo incorrecto o expirado. Intenta de nuevo.';
      this.codigo2FA = ''; 
    }
  }
}