// src/app/services/fingerprint.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FingerprintService {
  
  // Verificar si el dispositivo soporta WebAuthn
  isWebAuthnSupported(): boolean {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined &&
           typeof window.PublicKeyCredential === 'function';
  }

  // Verificar si el dispositivo tiene biométricos disponibles
  async isBiometricAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) return false;
    
    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error('Error verificando biométricos:', error);
      return false;
    }
  }

  // Registrar dispositivo con huella digital
  async registerFingerprint(userId: string, userName: string): Promise<{ success: boolean; message: string }> {
    if (!this.isWebAuthnSupported()) {
      return {
        success: false,
        message: 'Tu navegador no soporta autenticación biométrica'
      };
    }

    const available = await this.isBiometricAvailable();
    if (!available) {
      return {
        success: false,
        message: 'Tu dispositivo no tiene huella digital configurada. Ve a Configuración > Seguridad y agrega tu huella primero.'
      };
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: 'GameStore',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });

      if (credential) {
        // Guardar que el usuario registró su huella
        const credentialData = {
          id: (credential as any).id,
          userId: userId,
          registeredAt: new Date().toISOString()
        };
        localStorage.setItem('fingerprint_registered', JSON.stringify(credentialData));
        return {
          success: true,
          message: '✅ ¡Huella digital registrada con éxito!'
        };
      }
      return {
        success: false,
        message: 'No se pudo registrar la huella'
      };
    } catch (error: any) {
      console.error('Error registrando huella:', error);
      
      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          message: 'Registro cancelado por el usuario'
        };
      } else {
        return {
          success: false,
          message: 'Error al registrar: ' + (error.message || 'intenta nuevamente')
        };
      }
    }
  }

  // Verificar con huella digital
  async verifyFingerprint(): Promise<{ success: boolean; message: string }> {
    const registered = this.getFingerprintRegistration();
    if (!registered) {
      return {
        success: false,
        message: '🔐 Primero debes registrar tu huella digital en tu perfil'
      };
    }

    if (!this.isWebAuthnSupported()) {
      return {
        success: false,
        message: 'Tu navegador no soporta autenticación biométrica'
      };
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
        allowCredentials: [{
          id: this.base64ToArrayBuffer(registered.id),
          type: 'public-key'
        }]
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      if (credential) {
        return {
          success: true,
          message: '✅ Verificación biométrica exitosa'
        };
      } else {
        return {
          success: false,
          message: 'Verificación cancelada'
        };
      }
    } catch (error: any) {
      console.error('Error en verificación:', error);
      
      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          message: 'Verificación cancelada por el usuario'
        };
      } else {
        return {
          success: false,
          message: 'Error al verificar: coloca tu huella en el sensor'
        };
      }
    }
  }

  // Verificar si ya tiene huella registrada
  hasFingerprintRegistered(): boolean {
    return localStorage.getItem('fingerprint_registered') !== null;
  }

  // Obtener registro de huella
  getFingerprintRegistration(): any {
    const data = localStorage.getItem('fingerprint_registered');
    if (data) {
      return JSON.parse(data);
    }
    return null;
  }

  // Eliminar registro de huella
  clearFingerprintRegistration() {
    localStorage.removeItem('fingerprint_registered');
  }

  // Utilidad: convertir base64 a ArrayBuffer
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}