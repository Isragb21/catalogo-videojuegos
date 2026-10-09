import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

// Importamos tus servicios
import { AuthService } from '../../services/auth'; 
import { VideogameService, Videogame } from '../../services/videogame.service'; 
import { ApiConfigService } from '../../services/api-config.service';

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
  private apiConfig = inject(ApiConfigService);

  // Variables de Videojuegos (Adaptadas a Supabase)
  nuevoTitle: string = '';
  nuevaPlatform: string = '';
  nuevaImageUrl: string = '';
  nuevoPrice: number | null = null;
  nuevoStock: number | null = 10;
  nuevaImagenFile: File | null = null;
  previewNuevaImagen: string | null = null;
  subiendoImagen: boolean = false;
  juegos: Videogame[] = [];

  // Campos para editar videojuego
  juegoEditandoId: string | null = null;
  editarTitle: string = '';
  editarPlatform: string = '';
  editarPrice: number | null = null;
  editarStock: number | null = null;
  editarImageUrl: string = '';
  editarImagePath: string = '';
  editarImagenFile: File | null = null;
  previewEditarImagen: string | null = null;
  mostrarModalEdicionJuego: boolean = false;

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
  get apiUsersUrl() { return `${this.apiConfig.baseUrl}/users`; }

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
      
      // Leemos el rol directamente del caché local para no hacer peticiones HTTP extra que retrasen la pantalla
      let rolDelUsuario = usuario.rol;

      // Fallback: Si por alguna razón la sesión es muy antigua y no tiene el rol guardado, lo pedimos al backend
      if (!rolDelUsuario) {
        try {
          const perfil = await this.authService.obtenerPerfil(usuario.uid || usuario.id);
          rolDelUsuario = perfil?.rol;
        } catch (error) {
          console.error("Error pidiendo el perfil a AuthService:", error);
        }
      }

      if (rolDelUsuario === 'admin') {
        console.log("🛡️ Permisos de Administrador concedidos.");
        this.esAdmin = true;
        this.obtenerUsuarios(); 
      } else {
        console.log("🚫 Perfil encontrado, pero NO tiene rol='admin'.");
        this.esAdmin = false;
      }
      
      this.cargandoRol = false;
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

  // Maneja la selección de imagen para un NUEVO juego
  onArchivoNuevo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    this.nuevaImagenFile = file;
    this.previewNuevaImagen = file ? URL.createObjectURL(file) : null;
  }

  // Maneja la selección de imagen al EDITAR un juego
  onArchivoEditar(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    this.editarImagenFile = file;
    this.previewEditarImagen = file ? URL.createObjectURL(file) : null;
  }

  agregarJuego() {
    if (!this.nuevoTitle || !this.nuevaPlatform) return;

    const crearJuego = (image_url: string, image_path: string) => {
      // Armamos el objeto tal cual lo espera Express y Supabase
      const nuevoJuego = {
        title: this.nuevoTitle,
        platform: this.nuevaPlatform,
        image_url: image_url || 'https://via.placeholder.com/150',
        image_path: image_path || '',
        price: Number(this.nuevoPrice) || 0,
        stock: this.nuevoStock === null || this.nuevoStock === undefined ? 10 : Number(this.nuevoStock),
        is_active: true
      };

      this.videogameService.addVideogame(nuevoJuego as any).subscribe({
        next: (juegoCreado: Videogame) => {
          this.juegos.push(juegoCreado); // Lo agregamos visualmente
          this.resetFormularioJuego();
        },
        error: (err: any) => console.error("Error al guardar juego:", err)
      });
    };

    // Si hay archivo, primero lo subimos a Supabase Storage
    if (this.nuevaImagenFile) {
      this.subiendoImagen = true;
      this.videogameService.uploadImage(this.nuevaImagenFile).subscribe({
        next: (res) => {
          this.subiendoImagen = false;
          crearJuego(res.image_url, res.image_path);
        },
        error: (err: any) => {
          this.subiendoImagen = false;
          console.error("Error al subir imagen:", err);
          alert('❌ No se pudo subir la imagen.');
        }
      });
    } else {
      crearJuego('', '');
    }
  }

  // ================= EDITAR VIDEOJUEGO =================

  iniciarEdicionJuego(juego: Videogame) {
    this.juegoEditandoId = juego.id || null;
    this.editarTitle = juego.title;
    this.editarPlatform = juego.platform;
    this.editarPrice = juego.price;
    this.editarStock = juego.stock ?? 0;
    this.editarImageUrl = juego.image_url || '';
    this.editarImagePath = juego.image_path || '';
    this.editarImagenFile = null;
    this.previewEditarImagen = null;
    this.mostrarModalEdicionJuego = true;
  }

  cancelarEdicionJuego() {
    this.juegoEditandoId = null;
    this.editarTitle = '';
    this.editarPlatform = '';
    this.editarPrice = null;
    this.editarStock = null;
    this.editarImageUrl = '';
    this.editarImagePath = '';
    this.editarImagenFile = null;
    this.previewEditarImagen = null;
    this.mostrarModalEdicionJuego = false;
  }

  actualizarJuego() {
    if (!this.juegoEditandoId) return;
    if (!this.editarTitle || !this.editarPlatform) {
      alert('⚠️ El título y la plataforma son obligatorios');
      return;
    }

    const guardar = (image_url: string, image_path: string) => {
      const payload: any = {
        title: this.editarTitle,
        platform: this.editarPlatform,
        price: Number(this.editarPrice) || 0,
        stock: this.editarStock === null || this.editarStock === undefined ? 0 : Number(this.editarStock),
        image_url,
        image_path
      };

      this.videogameService.updateVideogame(this.juegoEditandoId!, payload).subscribe({
        next: (juegoActualizado: Videogame) => {
          const index = this.juegos.findIndex(j => j.id === this.juegoEditandoId);
          if (index !== -1) this.juegos[index] = { ...this.juegos[index], ...juegoActualizado };
          this.cancelarEdicionJuego();
          alert('✅ Videojuego actualizado correctamente');
        },
        error: (err: any) => {
          console.error("Error al actualizar juego:", err);
          alert('❌ No se pudo actualizar el videojuego.');
        }
      });
    };

    // Si se eligió una nueva imagen, la subimos (el backend borra la anterior)
    if (this.editarImagenFile) {
      this.subiendoImagen = true;
      this.videogameService.uploadImage(this.editarImagenFile).subscribe({
        next: (res) => {
          this.subiendoImagen = false;
          guardar(res.image_url, res.image_path);
        },
        error: (err: any) => {
          this.subiendoImagen = false;
          console.error("Error al subir imagen:", err);
          alert('❌ No se pudo subir la imagen.');
        }
      });
    } else {
      guardar(this.editarImageUrl, this.editarImagePath);
    }
  }

  borrarJuego(id: string | undefined) {
    if (!id) return;
    if (confirm('¿Eliminar PERMANENTEMENTE este videojuego? Esta acción no se puede deshacer.')) {
      this.videogameService.deleteVideogame(id).subscribe({
        next: () => {
          this.juegos = this.juegos.filter(j => j.id !== id); // Lo quitamos visualmente
        },
        error: (err: any) => console.error("Error al borrar juego", err)
      });
    }
  }

  inactivarJuego(id: string) {
    if (confirm('¿Dar de BAJA (inactivar) este videojuego?')) {
      this.http.patch(`${this.apiConfig.baseUrl}/videogames/${id}/logical-delete`, {}).subscribe({
        next: () => {
          this.juegos = this.juegos.filter(j => j.id !== id);
          alert('✅ Juego dado de baja (inactivo).');
        },
        error: (err: any) => console.error("Error al inactivar juego", err)
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
    if (confirm('¿Estás seguro de eliminar PERMANENTEMENTE este usuario? Esta acción no se puede deshacer.')) {
      this.http.delete(`${this.apiUsersUrl}/${id}`).subscribe({
        next: () => {
          this.usuarios = this.usuarios.filter(u => u.id !== id);
        },
        error: (err) => console.error('Error al borrar usuario', err)
      });
    }
  }

  inactivarUsuario(id: string) {
    if (confirm('¿Dar de BAJA (inactivar) este usuario?')) {
      this.http.patch(`${this.apiUsersUrl}/${id}/logical-delete`, {}).subscribe({
        next: () => {
          const userIndex = this.usuarios.findIndex(u => u.id === id);
          if (userIndex !== -1) this.usuarios[userIndex].is_active = false;
          alert('✅ Usuario dado de baja (inactivo).');
        },
        error: (err) => console.error('Error al inactivar usuario', err)
      });
    }
  }

  reactivarUsuario(id: string) {
    if (confirm('¿Reactivar este usuario?')) {
      this.http.patch(`${this.apiUsersUrl}/${id}/restore`, {}).subscribe({
        next: () => {
          const userIndex = this.usuarios.findIndex(u => u.id === id);
          if (userIndex !== -1) this.usuarios[userIndex].is_active = true;
          alert('✅ Usuario reactivado.');
        },
        error: (err) => console.error('Error al reactivar usuario', err)
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
    this.nuevoTitle = ''; this.nuevaPlatform = ''; this.nuevaImageUrl = ''; this.nuevoPrice = null; this.nuevoStock = 10;
    this.nuevaImagenFile = null; this.previewNuevaImagen = null;
  }

  resetFormularioUsuario() {
    this.nuevoNombreUser = ''; this.nuevoEmailUser = ''; this.nuevoPasswordUser = ''; this.nuevoRolUser = 'cliente'; this.nuevoTelefonoUser = '';
  }

  formatearFecha(fecha?: string | null): string {
    if (!fecha) return '—';
    try {
      const d = new Date(fecha);
      if (isNaN(d.getTime())) return fecha;
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return fecha;
    }
  }
}

// Interfaces actualizadas para coincidir con tu backend/DB
interface Usuario { id: string; full_name: string; email: string; rol: string; phone_number?: string; is_active?: boolean; created_at?: string; last_sign_in_at?: string | null; }
