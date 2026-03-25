import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// Importaciones de Firebase
import { initializeApp, provideFirebaseApp, getApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { provideFirestore } from '@angular/fire/firestore';

// 🔥 IMPORTACIÓN CLAVE PARA EL PLAN C (Bypass de Offline)
import { initializeFirestore } from 'firebase/firestore'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // Configuración oficial y definitiva de tu proyecto gamestore-75936
    provideFirebaseApp(() => initializeApp({
      apiKey: "AIzaSyDfFRXH0bmUx_kAQCoCNKmKSrGfpr36hbQ",
      authDomain: "gamestore-75936.firebaseapp.com",
      projectId: "gamestore-75936",
      storageBucket: "gamestore-75936.firebasestorage.app",
      messagingSenderId: "487531405757",
      appId: "1:487531405757:web:4792de0e61e12e1e7f72d4",
      measurementId: "G-96F1S0RH8W"
    })),

    // Activamos Autenticación
    provideAuth(() => getAuth()),
    
    // 🔥 EL PLAN C: Inicializamos Firestore forzando el "Long Polling".
    // Esto obliga a Angular a usar peticiones web normales y evita que tu computadora bloquee la base de datos.
    provideFirestore(() => {
      const app = getApp();
      return initializeFirestore(app, {
        experimentalForceLongPolling: true
      });
    })
  ]
};