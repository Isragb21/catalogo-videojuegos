import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { AuthService } from './services/auth'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule], // Ya no necesitas importar 'Navbar' aquí
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  public auth = inject(AuthService);
  private router = inject(Router);

  async cerrarSesion() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}