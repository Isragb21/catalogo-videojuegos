import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// Importaciones de Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // --- AQUÍ ESTÁ TU CONFIGURACIÓN REAL ---
    provideFirebaseApp(() => initializeApp({
      apiKey: "AIzaSyA-Wrp2fOTLrjSMP6dRxlVRLfLf-mCcWLE",
      authDomain: "games-store-666b2.firebaseapp.com",
      projectId: "games-store-666b2",
      storageBucket: "games-store-666b2.firebasestorage.app",
      messagingSenderId: "151273627979",
      appId: "1:151273627979:web:32aa29e843d38f430d88ce",
      measurementId: "G-5TCY4PCZJ2"
    })),

    // Activamos Autenticación y Base de Datos
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ]
};