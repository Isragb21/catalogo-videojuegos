import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:3000/api';

  private usuarioSubject = new BehaviorSubject<any>(null);
  usuario$ = this.usuarioSubject.asObservable();

  constructor() {
    const storedUser = localStorage.getItem('usuario_sesion');
    if (storedUser) {
      this.usuarioSubject.next(JSON.parse(storedUser));
    }
  }

  async registro(email: string, pass: string, nombre: string, telefono: string) {
    await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/users`, {
        email,
        password: pass,
        full_name: nombre,
        phone_number: telefono,
        rol: 'cliente'
      })
    );
    
    // Auto login después del registro
    return this.login(email, pass);
  }

  async login(email: string, pass: string) {
    const res = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/login`, { email, password: pass })
    );
    
    const userData = {
      uid: res.user.id,
      email: res.user.email,
      ...res.profile
    };
    
    localStorage.setItem('usuario_sesion', JSON.stringify(userData));
    this.usuarioSubject.next(userData);
    return userData;
  }

  async loginWithFingerprint(userId: string) {
    const perfil = await this.obtenerPerfil(userId);
    if (!perfil) throw new Error("Perfil no encontrado");

    const userData = {
      uid: perfil.id,
      email: perfil.email,
      ...perfil
    };
    
    localStorage.setItem('usuario_sesion', JSON.stringify(userData));
    this.usuarioSubject.next(userData);
    return userData;
  }

  async logout() {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/logout`, {}));
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
    
    this.clearLocalSession();
    this.router.navigate(['/login']);
  }

  clearLocalSession() {
    localStorage.removeItem('2fa_aprobado');
    localStorage.removeItem('usuario_sesion');
    this.usuarioSubject.next(null);
  }

  async obtenerPerfil(uid: string) {
    try {
      const perfil = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/users/${uid}`)
      );
      return perfil;
    } catch (error) {
      console.error("Error al obtener el perfil:", error);
      return null;
    }
  }

  async isAdmin(): Promise<boolean> {
    const user = this.usuarioSubject.value;
    if (!user) return false;
    
    try {
      const perfil = await this.obtenerPerfil(user.uid);
      return perfil?.rol === 'admin';
    } catch (error) {
      console.error("Error al verificar admin:", error);
      return false;
    }
  }

  async actualizarPerfil(uid: string, datos: any) {
    const updatedProfile = await firstValueFrom(
      this.http.put<any>(`${this.apiUrl}/users/${uid}`, datos)
    );
    
    const currentUser = this.usuarioSubject.value;
    const newUserData = { ...currentUser, ...updatedProfile };
    localStorage.setItem('usuario_sesion', JSON.stringify(newUserData));
    this.usuarioSubject.next(newUserData);
    
    return updatedProfile;
  }

  async guardarSecreto2FA(uid: string, secret: string) {
    return await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/users/${uid}/2fa`, { secret })
    );
  }

  async resetear2FA(uid: string) {
    return await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/users/${uid}/reset-2fa`, {})
    );
  }

  obtenerTodosLosUsuarios() {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  eliminarUsuarioDB(uid: string) {
    return this.http.delete(`${this.apiUrl}/users/${uid}`);
  }
}
