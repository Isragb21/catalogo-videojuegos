import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common'; // Necesario para pipes como async
import { AuthService } from './services/auth';  // Importamos tu servicio

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Inyectamos el servicio de autenticación y lo hacemos público
  // para poder usarlo en el HTML
  public auth = inject(AuthService);

  // Función para cerrar sesión desde el menú
  cerrarSesion() {
    this.auth.logout();
  }
}