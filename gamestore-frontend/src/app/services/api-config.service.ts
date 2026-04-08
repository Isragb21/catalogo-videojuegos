import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  private http = inject(HttpClient);
  
  private renderUrl = 'https://gamestore-api-5qa6.onrender.com/api';
  private localUrl = 'http://localhost:3000/api';
  
  // Inicia por defecto en Render
  private activeUrl = this.renderUrl;
  private verificacionIniciada = false;

  constructor() {
    this.verificarConexion();
  }

  async verificarConexion() {
    if (this.verificacionIniciada) return;
    this.verificacionIniciada = true;

    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        await firstValueFrom(this.http.get(`${this.renderUrl}/test-db`).pipe(timeout(3500)));
        console.log('✅ Conexión principal (Render) activa.');
      } catch (error) {
        console.warn('⚠️ Render no responde o está dormido. Cambiando todas las conexiones a Localhost...');
        this.activeUrl = this.localUrl;
      }
    }
  }

  get baseUrl(): string {
    return this.activeUrl;
  }
}