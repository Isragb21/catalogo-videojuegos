import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
// OJO: Importamos desde 'auth' (sin .service)
import { AuthService } from '../../services/auth'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  
  correo: string = '';
  pass: string = '';

  // Inyectamos nuestro servicio de autenticación
  private authService = inject(AuthService);

  iniciarSesion() {
    this.authService.login(this.correo, this.pass);
  }
}