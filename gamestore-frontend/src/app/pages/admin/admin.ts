import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

// Importamos tus servicios
import { AuthService } from '../../services/auth'; 
import { VideogameService, Videogame } from '../../services/videogame.service'; 

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit, OnDestroy {
  
  // ==========================================
  // INYECCIÓN GLOBAL
  // ==========================================
  private authService = inject(AuthService);
  private videogameService = inject(VideogameService);
  private http = inject(HttpClient); // Lo usamos temporalmente para los usuarios

  // Variables de Videojuegos (Adaptadas a Supabase)
  nuevoTitle: string = '';
  nuevaPlatform: string = '';
  nuevaImageUrl: string = '';
  nuevoPrice: number | null = null;
  juegos: Videogame[] = [];

  // Variables de Usuarios
  usuarios: Usuario[] = [];
  nuevoNombreUser: string = ''; 
  nuevoEmailUser: string = '';
  nuevoPasswordUser: string = '';
  nuevoRolUser: string = 'cliente'; 
  nuevoTelefonoUser: string = '';

  // Campos para editar usuario
  usuarioEditandoId: string | null = null;
  editarNombreUser: string = '';
  editarRolUser: string = 'cliente';
  editarTelefonoUser: string = '';
  mostrarModalEdicion: boolean = false;

  // Seguridad
  esAdmin: boolean = false;
  cargandoRol: boolean = true;
  
  private authSubscription: any;
  private apiUsersUrl = 'http://localhost:3000/api/users'; // Nueva ruta para usuarios

  ngOnInit() {
    this.obtenerJuegos();
    this.verificarRolActual();
  }

  async verificarRolActual() {
    // ⚠️ Nota: Esta lógica depende de que tu AuthService ya esté configurado
    // para funcionar con Supabase o que mantengas tu lógica actual temporalmente.
    this.authSubscription = this.authService.usuario$.subscribe(async (usuario) => {
      if (!usuario) {
        console.log("❌ AuthService no detecta sesión activa.");
        this.esAdmin = false;
        this.cargandoRol = false;
        return;
      }

      console.log("✅ AuthService detectó a:", usuario.email);
      
      try {
        const perfil = await this.authService.obtenerPerfil(usuario.uid || usuario.id);
        // Ojo: En tu script SQL de Supabase no vi la columna 'rol'. 
        // Asegúrate de agregarla en Supabase si vas a usar esta validación.
        if (perfil && perfil['rol'] === 'admin') {
          console.log("🛡️ Permisos de Administrador concedidos.");
          this.esAdmin = true;
          this.obtenerUsuarios(); 
        } else {
          console.log("🚫 Perfil encontrado, pero NO tiene rol='admin'.");
          this.esAdmin = false;
        }
        this.cargandoRol = false;
      } catch (error) {
        console.error("Error pidiendo el perfil a AuthService:", error);
        this.esAdmin = false;
        this.cargandoRol = false; 
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) this.authSubscription.unsubscribe();
  }

  // ================= CRUD VIDEOJUEGOS =================

  obtenerJuegos() {
    this.videogameService.getVideogames().subscribe({
      next: (data: Videogame[]) => this.juegos = data,
      error: (err: any) => console.error("Error obteniendo juegos", err)
    });
  }

  agregarJuego() {
    if (!this.nuevoTitle || !this.nuevaPlatform) return;
    
    // Armamos el objeto tal cual lo espera Express y Supabase
    const nuevoJuego = {
      title: this.nuevoTitle,
      platform: this.nuevaPlatform,
      image_url: this.nuevaImageUrl || 'https://via.placeholder.com/150',
      price: Number(this.nuevoPrice) || 0,
      stock: 10, // Valor por defecto
      is_active: true
    };

    // Al agregar, TypeScript se quejará del ID si no lo casteamos correctamente en el servicio,
    // usamos `any` temporalmente para enviar la petición limpia.
    this.videogameService.addVideogame(nuevoJuego as any).subscribe({
      next: (juegoCreado: Videogame) => {
        this.juegos.push(juegoCreado); // Lo agregamos visualmente
        this.resetFormularioJuego();
      },
      error: (err: any) => console.error("Error al guardar juego:", err)
    });
  }

  borrarJuego(id: string | undefined) {
    if (!id) return;
    if (confirm('¿Eliminar este videojuego?')) {
      this.videogameService.deleteVideogame(id).subscribe({
        next: () => {
          this.juegos = this.juegos.filter(j => j.id !== id); // Lo quitamos visualmente
        },
        error: (err: any) => console.error("Error al borrar juego", err)
      });
    }
  }

  // ================= CRUD USUARIOS =================
  // Ahora estas funciones apuntan a tu backend en Express, ya no a Firebase Auth

  obtenerUsuarios() {
    this.http.get<Usuario[]>(this.apiUsersUrl).subscribe({
      next: (data) => this.usuarios = data,
      error: (err) => console.error("Error obteniendo usuarios", err)
    });
  }

  agregarUsuario() {
    if (!this.nuevoEmailUser || !this.nuevoNombreUser || !this.nuevoPasswordUser) {
      alert('⚠️ Faltan datos obligatorios');
      return;
    }

    const payload = {
      email: this.nuevoEmailUser,
      password: this.nuevoPasswordUser,
      full_name: this.nuevoNombreUser,
      rol: this.nuevoRolUser,
      phone_number: this.nuevoTelefonoUser
    };

    this.http.post<Usuario>(this.apiUsersUrl, payload).subscribe({
      next: (userCreado) => {
        this.usuarios.push(userCreado);
        alert('✅ ¡Usuario creado con éxito en la base de datos!');
        this.resetFormularioUsuario();
      },
      error: (err) => {
        console.error("Error al crear usuario:", err);
        alert('❌ No se pudo crear el usuario.');
      }
    });
  }

  cambiarRol(id: string, nuevoRol: string) {
    this.http.put(`${this.apiUsersUrl}/${id}`, { rol: nuevoRol }).subscribe({
      next: () => {
        console.log('Rol actualizado');
        // Actualizamos el rol localmente para que la vista cambie de inmediato
        const userIndex = this.usuarios.findIndex(u => u.id === id);
        if (userIndex !== -1) {
          this.usuarios[userIndex].rol = nuevoRol;
        }
        alert(`✅ Rol actualizado exitosamente a: ${nuevoRol.toUpperCase()}`);
      },
      error: (err) => console.error('Error al cambiar rol', err)
    });
  }

  iniciarEdicionUsuario(user: Usuario) {
    this.usuarioEditandoId = user.id;
    this.editarNombreUser = user.full_name;
    this.editarRolUser = user.rol;
    this.editarTelefonoUser = user.phone_number || '';
    this.mostrarModalEdicion = true;
  }

  actualizarUsuario() {
    if (!this.usuarioEditandoId) return;
    if (!this.editarNombreUser) {
      alert('⚠️ El nombre es obligatorio');
      return;
    }

    const payload = {
      full_name: this.editarNombreUser,
      rol: this.editarRolUser,
      phone_number: this.editarTelefonoUser
    };

    this.http.put<Usuario>(`${this.apiUsersUrl}/${this.usuarioEditandoId}`, payload).subscribe({
      next: (userActualizado) => {
        // Actualizamos la lista visual
        const index = this.usuarios.findIndex(u => u.id === this.usuarioEditandoId);
        if (index !== -1) {
          this.usuarios[index] = { ...this.usuarios[index], ...payload };
        }
        this.cancelarEdicionUsuario();
        alert('✅ Usuario actualizado correctamente');
      },
      error: (err) => {
        console.error('Error al actualizar usuario:', err);
        alert('❌ No se pudo actualizar el usuario.');
      }
    });
  }

  cancelarEdicionUsuario() {
    this.usuarioEditandoId = null;
    this.editarNombreUser = '';
    this.editarRolUser = 'cliente';
    this.editarTelefonoUser = '';
    this.mostrarModalEdicion = false;
  }

  borrarUsuario(id: string) {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      this.http.delete(`${this.apiUsersUrl}/${id}`).subscribe({
        next: () => {
          this.usuarios = this.usuarios.filter(u => u.id !== id);
        },
        error: (err) => console.error('Error al borrar usuario', err)
      });
    }
  }

  resetear2FA(id: string) {
    if (confirm('¿Estás seguro de resetear el 2FA de este usuario? Tendrá que volver a escanear el código QR en su próximo inicio de sesión.')) {
      this.authService.resetear2FA(id).then(() => {
        alert('✅ 2FA reseteado exitosamente para este usuario.');
      }).catch(err => {
        console.error('Error al resetear 2FA', err);
        alert('❌ Ocurrió un error al resetear el 2FA.');
      });
    }
  }

  // ================= RESETS =================

  resetFormularioJuego() {
    this.nuevoTitle = ''; this.nuevaPlatform = ''; this.nuevaImageUrl = ''; this.nuevoPrice = null;
  }

  resetFormularioUsuario() {
    this.nuevoNombreUser = ''; this.nuevoEmailUser = ''; this.nuevoPasswordUser = ''; this.nuevoRolUser = 'cliente'; this.nuevoTelefonoUser = '';
  }
}

// Interfaces actualizadas para coincidir con tu backend/DB
interface Usuario { id: string; full_name: string; email: string; rol: string; phone_number?: string; }
