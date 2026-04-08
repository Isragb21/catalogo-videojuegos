// src/app/services/fingerprint.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { firstValueFrom } from 'rxjs';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root'
})
export class FingerprintService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfigService);
  get apiUrl() { return `${this.apiConfig.baseUrl}/biometrics`; }

  isWebAuthnSupported(): boolean {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined &&
           typeof window.PublicKeyCredential === 'function';
  }

  async isBiometricAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) return false;
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      return false;
    }
  }

  async registerFingerprint(userId: string, userName: string): Promise<{ success: boolean; message: string }> {
    if (!this.isWebAuthnSupported()) {
      return { success: false, message: 'Tu navegador no soporta autenticación biométrica' };
    }

    try {
      // 1. Obtener opciones de registro del backend
      const options = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/generate-registration-options`, {
        email: userName,
        user_id: userId
      }));

      // 2. Ejecutar WebAuthn en el navegador
      const registrationResponse = await startRegistration({ optionsJSON: options });

      // 3. Enviar respuesta al backend para verificación
      const verificationResp = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/verify-registration`, {
        user_id: userId,
        registrationResponse
      }));

      if (verificationResp.verified) {
        localStorage.setItem('fingerprint_user_id', userId);
        return { success: true, message: '✅ ¡Huella registrada con éxito!' };
      }
      return { success: false, message: 'No se pudo verificar el registro' };
    } catch (error: any) {
      console.error('Error registrando huella:', error);
      return { success: false, message: 'Error al registrar: ' + (error.message || 'intenta nuevamente') };
    }
  }

  async verifyFingerprint(): Promise<{ success: boolean; message: string; userId?: string }> {
    const userId = localStorage.getItem('fingerprint_user_id');
    if (!userId) {
      return { success: false, message: 'Primero registra tu huella en esta PC' };
    }

    if (!this.isWebAuthnSupported()) {
      return { success: false, message: 'Tu navegador no soporta autenticación biométrica' };
    }

    try {
      // 1. Obtener opciones de autenticación
      const options = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/generate-authentication-options`, {
        user_id: userId
      }));

      // 2. Ejecutar WebAuthn
      const authenticationResponse = await startAuthentication({ optionsJSON: options });

      // 3. Enviar al backend para validar
      const verificationResp = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/verify-authentication`, {
        user_id: userId,
        authenticationResponse
      }));

      if (verificationResp.verified) {
        return { success: true, message: '✅ Verificación exitosa', userId };
      } else {
        return { success: false, message: 'Verificación fallida' };
      }
    } catch (error: any) {
      console.error('Error en verificación:', error);
      return { success: false, message: 'Fallo al autenticar huella' };
    }
  }

  hasFingerprintRegistered(): boolean {
    return localStorage.getItem('fingerprint_user_id') !== null;
  }

  clearFingerprintRegistration() {
    localStorage.removeItem('fingerprint_user_id');
  }
}