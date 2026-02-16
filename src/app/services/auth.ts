import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Inyectamos las herramientas de Firebase y el Router
  private auth = inject(Auth);
  private router = inject(Router);

  // Esta variable 'usuario$' nos dirá en todo momento quién está conectado
  // Si es null, es que no hay nadie.
  usuario$: Observable<User | null> = user(this.auth);

  constructor() { }

  // Función para INICIAR SESIÓN
  async login(correo: string, pass: string) {
    try {
      await signInWithEmailAndPassword(this.auth, correo, pass);
      // Si todo sale bien, nos manda al inicio
      this.router.navigate(['/inicio']);
    } catch (error) {
      console.error('Error al entrar:', error);
      alert('Error: Correo o contraseña incorrectos.');
    }
  }

  // Función para CERRAR SESIÓN
  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}