import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  
  usuario: any = {
    nombre: '',
    email: '',
    telefono: '',
    fotoUrl: ''
  };
  
  uid: string = '';
  cargando = true;
  editando = false;

  ngOnInit() {
    // Se suscribe al estado de autenticación de Firebase
    this.authService.usuario$.subscribe(async (user) => {
      if (user) {
        this.uid = user.uid;
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

  guardarCambios() {
    // Envía la actualización a Firestore
    this.authService.actualizarPerfil(this.uid, this.usuario).then(() => {
      this.editando = false;
      alert('¡Perfil de Guerrero actualizado! ⚔️');
    }).catch(error => {
      console.error(error);
    });
  }
}