// src/app/services/fingerprint.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FingerprintService {
  
  isWebAuthnSupported(): boolean {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined &&
           typeof window.PublicKeyCredential === 'function';
  }

  async isBiometricAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) return false;
    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      return false;
    }
  }

  async registerFingerprint(userId: string, userName: string): Promise<{ success: boolean; message: string; credentialId?: string }> {
    if (!this.isWebAuthnSupported()) {
      return { success: false, message: 'Tu navegador no soporta autenticación biométrica' };
    }

    const available = await this.isBiometricAvailable();
    if (!available) {
      return { success: false, message: 'Configura tu huella en Windows: Configuración > Cuentas > Opciones de inicio de sesión' };
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: { name: 'GameStore', id: window.location.hostname },
        user: { 
          id: new TextEncoder().encode(userId), 
          name: userName, 
          displayName: userName 
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as any;

      if (credential && credential.id) {
        // Guardar la credencial completa
        const credentialData = {
          id: credential.id,
          rawId: this.arrayBufferToBase64(credential.rawId),
          userId: userId,
          registeredAt: new Date().toISOString()
        };
        localStorage.setItem('fingerprint_registered', JSON.stringify(credentialData));
        console.log('Huella registrada con ID:', credential.id);
        return { 
          success: true, 
          message: '✅ ¡Huella registrada con éxito!',
          credentialId: credential.id
        };
      }
      return { success: false, message: 'No se pudo registrar la huella' };
    } catch (error: any) {
      console.error('Error registrando huella:', error);
      if (error.name === 'NotAllowedError') {
        return { success: false, message: 'Registro cancelado por el usuario' };
      } else if (error.name === 'InvalidStateError') {
        return { success: false, message: 'Ya existe una credencial. Reinicia el navegador y prueba de nuevo.' };
      }
      return { success: false, message: 'Error al registrar: ' + (error.message || 'intenta nuevamente') };
    }
  }

  async verifyFingerprint(): Promise<{ success: boolean; message: string }> {
    const registered = this.getFingerprintRegistration();
    if (!registered) {
      return { success: false, message: 'Primero registra tu huella' };
    }

    if (!this.isWebAuthnSupported()) {
      return { success: false, message: 'Tu navegador no soporta autenticación biométrica' };
    }

    try {
      // Convertir el ID guardado a ArrayBuffer
      let credentialId: ArrayBuffer;
      if (registered.rawId) {
        credentialId = this.base64ToArrayBuffer(registered.rawId);
      } else {
        credentialId = this.base64ToArrayBuffer(registered.id);
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
        allowCredentials: [{
          id: credentialId,
          type: 'public-key'
        }]
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      if (credential) {
        console.log('Verificación exitosa');
        return { success: true, message: '✅ Verificación exitosa' };
      } else {
        return { success: false, message: 'Verificación cancelada' };
      }
    } catch (error: any) {
      console.error('Error en verificación:', error);
      if (error.name === 'NotAllowedError') {
        return { success: false, message: 'Verificación cancelada' };
      } else if (error.name === 'InvalidStateError') {
        return { success: false, message: 'Credencial no válida. Vuelve a registrar tu huella.' };
      }
      return { success: false, message: 'Coloca tu dedo en el sensor' };
    }
  }

  hasFingerprintRegistered(): boolean {
    return localStorage.getItem('fingerprint_registered') !== null;
  }

  getFingerprintRegistration(): any {
    const data = localStorage.getItem('fingerprint_registered');
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  clearFingerprintRegistration() {
    localStorage.removeItem('fingerprint_registered');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}