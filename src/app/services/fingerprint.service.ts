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

  // Solicitar verificación de huella digital
  async verifyFingerprint(): Promise<{ success: boolean; message: string }> {
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
        message: 'Tu dispositivo no tiene configurada huella digital o reconocimiento facial'
      };
    }

    try {
      // Crear un challenge aleatorio
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Opciones para la verificación biométrica
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
      };

      // Solicitar verificación biométrica
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      if (credential) {
        return {
          success: true,
          message: '✅ Identificación biométrica exitosa'
        };
      } else {
        return {
          success: false,
          message: '❌ Verificación biométrica cancelada'
        };
      }
    } catch (error: any) {
      console.error('Error en verificación biométrica:', error);
      
      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          message: '❌ Verificación cancelada por el usuario'
        };
      } else if (error.name === 'NotSupportedError') {
        return {
          success: false,
          message: '❌ Tu dispositivo no soporta autenticación biométrica'
        };
      } else {
        return {
          success: false,
          message: '❌ Error en la verificación biométrica'
        };
      }
    }
  }

  // Registrar un nuevo dispositivo para biometría (opcional)
  async registerDevice(userId: string, userName: string): Promise<boolean> {
    if (!this.isWebAuthnSupported()) return false;

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
        localStorage.setItem('biometric_registered', 'true');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error registrando dispositivo:', error);
      return false;
    }
  }

  // Verificar si el usuario ya tiene biometría registrada
  hasBiometricRegistered(): boolean {
    return localStorage.getItem('biometric_registered') === 'true';
  }
}