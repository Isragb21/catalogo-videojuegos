import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth'; 
import { QRCodeComponent } from 'angularx-qrcode';
import * as OTPAuth from 'otpauth';
import { FingerprintService } from '../../services/fingerprint.service';

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
  uidActual = '';
  esNuevo2FA = false;

  private router = inject(Router);
  private authService = inject(AuthService);
  public fingerprintService = inject(FingerprintService);

  ngOnInit() {
    this.authService.clearLocalSession();
  }

  async loginConHuella() {
    this.mensajeError = '';
    const result = await this.fingerprintService.verifyFingerprint();
    if (result.success && result.userId) {
      try {
        const userData = await this.authService.loginWithFingerprint(result.userId);
        this.correoActual = userData.email;
        this.preparar2FA(userData);
      } catch (err) {
        this.mensajeError = 'Error al cargar perfil desde la huella.';
      }
    } else {
      this.mensajeError = result.message;
    }
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
        const userData = await this.authService.login(emailLimpio, passLimpio);
        this.correoActual = emailLimpio;
        this.preparar2FA(userData);

      } else {
        if (!nombreLimpio || !telLimpio) {
          this.mensajeError = 'Por favor, llena tu nombre y telefono.';
          return;
        }
        if (passLimpio !== this.confirmPassword.trim()) {
          this.mensajeError = 'Las contrasenas no coinciden';
          return;
        }

        const userData = await this.authService.registro(emailLimpio, passLimpio, nombreLimpio, telLimpio);
        this.correoActual = emailLimpio;
        this.preparar2FA(userData);
      }

    } catch (error: any) {
      const errorMsg = error.error?.error || error.message || '';
      if (errorMsg.includes('Invalid login credentials') || errorMsg.includes('invalid-credential') || error.status === 401) {
        this.mensajeError = 'Correo o contrasena incorrectos.';
      } else if (errorMsg.includes('already registered') || errorMsg.includes('already-in-use') || error.status === 400) {
        this.mensajeError = 'Este correo ya esta registrado.';
      } else {
        this.mensajeError = 'Ocurrio un error inesperado.';
      }
    }
  }

  preparar2FA(userData: any) {
    this.modo2FA = true; 
    this.uidActual = userData.uid || userData.id;
    
    if (userData.two_factor_secret) {
      this.secreto = userData.two_factor_secret;
      this.qrCodeUrl = ''; 
      this.esNuevo2FA = false;
      this.mensaje2FA = 'Ingresa el código de 6 dígitos de tu aplicación autenticadora.';
    } else {
      const totp = new OTPAuth.TOTP({
        issuer: 'GameStore',
        label: userData.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }) 
      });
      
      this.secreto = totp.secret.base32;
      this.qrCodeUrl = totp.toString(); 
      this.esNuevo2FA = true;
      this.mensaje2FA = 'Escanea este QR desde tu app Microsoft Authenticator por única vez.';
    }
  }

  async validarCodigo2FA() {
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
      if (this.esNuevo2FA) {
        await this.authService.guardarSecreto2FA(this.uidActual, this.secreto);
      }
      localStorage.setItem('2fa_aprobado', 'true');
      this.router.navigate(['/inicio']); 
    } else {
      this.mensaje2FA = 'Codigo incorrecto o expirado. Intenta de nuevo.';
      this.codigo2FA = ''; 
    }
  }
}