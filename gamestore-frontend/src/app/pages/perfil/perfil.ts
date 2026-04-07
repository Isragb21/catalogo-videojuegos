import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { FingerprintService } from '../../services/fingerprint.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  private authService = inject(AuthService);
  private fingerprintService = inject(FingerprintService);
  private cdr = inject(ChangeDetectorRef);
  
  usuario: any = {
    full_name: '',
    email: '',
    phone_number: '',
    fotoUrl: ''
  };
  
  uid: string = '';
  cargando = true;
  editando = false;

  ngOnInit() {
    // Se suscribe al estado de autenticación
    this.authService.usuario$.subscribe(async (user) => {
      if (user) {
        this.uid = user.uid || user.id;
        this.usuario.email = user.email;
        
        try {
          // Resuelve la promesa de los datos del usuario
          const perfil = await this.authService.obtenerPerfil(this.uid);
          if (perfil) {
            this.usuario = { ...this.usuario, ...perfil };
          }
        } catch (error) {
          console.error(error);
        }
        
        // Desactiva el estado de carga y fuerza la actualización de la vista
        this.cargando = false;
        this.cdr.detectChanges();
      } else {
        // Desactiva el estado de carga si no hay usuario y fuerza la actualización
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  async registrarHuella() {
    try {
      const result = await this.fingerprintService.registerFingerprint(this.uid, this.usuario.email);
      alert(result.message);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al registrar la huella.');
    }
  }

  guardarCambios() {
    // Envía la actualización al backend
    this.authService.actualizarPerfil(this.uid, {
      full_name: this.usuario.full_name,
      phone_number: this.usuario.phone_number
    }).then(() => {
      this.editando = false;
      alert('¡Perfil de Guerrero actualizado! ⚔️');
    }).catch(error => {
      console.error(error);
    });
  }
}