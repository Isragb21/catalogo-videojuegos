import { Component, OnInit, NgZone, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// 1. IMPORTAMOS ANGULARFIRE: Para el CRUD en tiempo real
import { Firestore, collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, setDoc } from '@angular/fire/firestore';

// 2. IMPORTAMOS TU SERVICIO (⚠️ Asegúrate de que la ruta sea correcta)
import { AuthService } from '../../services/auth'; 

// 3. Mantenemos estos nativos SOLO para el truco de crear usuarios nuevos sin sacarte de tu sesión
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'; 

const firebaseConfig = {
  apiKey: "AIzaSyDfFRXH0bmUx_kAQCoCNKmKSrGfpr36hbQ",
  authDomain: "gamestore-75936.firebaseapp.com",
  projectId: "gamestore-75936",
  storageBucket: "gamestore-75936.firebasestorage.app",
  messagingSenderId: "487531405757",
  appId: "1:487531405757:web:4792de0e61e12e1e7f72d4",
  measurementId: "G-96F1S0RH8W"
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit, OnDestroy {
  
  // Variables de Videojuegos
  nuevoTitulo: string = '';
  nuevaPlataforma: string = '';
  nuevaImagen: string = '';
  nuevoPrecio: any = null;
  juegos: Videojuego[] = [];

  // Variables de Usuarios
  usuarios: Usuario[] = [];
  nuevoNombreUser: string = ''; 
  nuevoEmailUser: string = '';
  nuevoPasswordUser: string = '';
  nuevoRolUser: string = 'cliente'; 
  nuevoTelefonoUser: string = '';

  // Campos para editar usuario
  usuarioEditandoUid: string | null = null;
  editarNombreUser: string = '';
  editarRolUser: string = 'cliente';
  editarTelefonoUser: string = '';

  // Seguridad
  esAdmin: boolean = false;
  cargandoRol: boolean = true;

  // ==========================================
  // INYECCIÓN GLOBAL
  // ==========================================
  private db = inject(Firestore);
  private ngZone = inject(NgZone);
  private authService = inject(AuthService); // Usamos tu servicio profesional
  
  private authSubscription: any;
  private unsubscribeJuegos: any;
  private unsubscribeUsuarios: any;

  ngOnInit() {
    this.obtenerJuegos();
    this.verificarRolActual();
  }

  async verificarRolActual() {
    // Usamos el flujo de usuario de tu servicio, que ya está protegido y estable
    this.authSubscription = this.authService.usuario$.subscribe(async (usuario) => {
      if (!usuario) {
        console.log("❌ AuthService no detecta sesión activa.");
        this.ngZone.run(() => {
          this.esAdmin = false;
          this.cargandoRol = false;
        });
        return;
      }

      console.log("✅ AuthService detectó a:", usuario.email);
      
      try {
        // Usamos tu función obtenerPerfil que ya está en auth.ts
        const perfil = await this.authService.obtenerPerfil(usuario.uid);

        this.ngZone.run(() => {
          if (perfil && perfil['rol'] === 'admin') {
            console.log("🛡️ Permisos de Administrador concedidos por AuthService.");
            this.esAdmin = true;
            this.obtenerUsuarios(); // Solo carga usuarios si es admin
          } else {
            console.log("🚫 Perfil encontrado, pero NO tiene rol='admin'.");
            this.esAdmin = false;
          }
          this.cargandoRol = false;
        });
      } catch (error) {
        console.error("Error pidiendo el perfil a AuthService:", error);
        this.ngZone.run(() => { 
          this.esAdmin = false;
          this.cargandoRol = false; 
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) this.authSubscription.unsubscribe();
    if (this.unsubscribeJuegos) this.unsubscribeJuegos();
    if (this.unsubscribeUsuarios) this.unsubscribeUsuarios();
  }

  // ================= CRUD VIDEOJUEGOS =================

  obtenerJuegos() {
    const juegosRef = collection(this.db, 'videojuegos');
    this.unsubscribeJuegos = onSnapshot(juegosRef, (snapshot) => {
      this.ngZone.run(() => {
        this.juegos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Videojuego[];
      });
    });
  }

  async agregarJuego() {
    if (!this.nuevoTitulo || !this.nuevaPlataforma) return;
    try {
      await addDoc(collection(this.db, 'videojuegos'), {
        titulo: this.nuevoTitulo,
        plataforma: this.nuevaPlataforma,
        imagen: this.nuevaImagen || 'https://via.placeholder.com/150',
        precio: Number(this.nuevoPrecio) || 0
      });
      this.resetFormularioJuego();
    } catch (error) {
      console.error("Error al guardar juego:", error);
    }
  }

  async borrarJuego(id: string) {
    if (confirm('¿Eliminar este videojuego?')) {
      await deleteDoc(doc(this.db, 'videojuegos', id));
    }
  }

  // ================= CRUD USUARIOS =================

  obtenerUsuarios() {
    const usuariosRef = collection(this.db, 'usuarios');
    this.unsubscribeUsuarios = onSnapshot(usuariosRef, (snapshot) => {
      this.ngZone.run(() => {
        this.usuarios = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as Usuario[];
      });
    });
  }

  async agregarUsuario() {
    if (!this.nuevoEmailUser || !this.nuevoNombreUser || !this.nuevoPasswordUser) {
      alert('⚠️ Faltan datos obligatorios');
      return;
    }

    try {
      const tempAppName = 'TempAuthApp_' + new Date().getTime();
      const tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);

      const credenciales = await createUserWithEmailAndPassword(tempAuth, this.nuevoEmailUser, this.nuevoPasswordUser);
      const uidGenerado = credenciales.user.uid;

      await signOut(tempAuth);
      await deleteApp(tempApp);

      await setDoc(doc(this.db, 'usuarios', uidGenerado), {
        nombre: this.nuevoNombreUser,
        email: this.nuevoEmailUser,
        rol: this.nuevoRolUser,
        telefono: this.nuevoTelefonoUser,
        fechaRegistro: new Date()
      });

      alert('✅ ¡Usuario creado con éxito en la base de datos!');
      this.resetFormularioUsuario();

    } catch (error: any) {
      console.error("Error al crear usuario:", error);
      if (error.code === 'auth/email-already-in-use') alert('❌ Ese correo ya está registrado.');
      else if (error.code === 'auth/weak-password') alert('❌ La contraseña debe tener al menos 6 caracteres.');
      else alert('❌ Error: ' + error.message);
    }
  }

  async cambiarRol(uid: string, nuevoRol: string) {
    await updateDoc(doc(this.db, 'usuarios', uid), { rol: nuevoRol });
  }

  iniciarEdicionUsuario(user: Usuario) {
    this.usuarioEditandoUid = user.uid;
    this.editarNombreUser = user.nombre;
    this.editarRolUser = user.rol;
    this.editarTelefonoUser = user.telefono || '';
  }

  async actualizarUsuario() {
    if (!this.usuarioEditandoUid) return;
    if (!this.editarNombreUser) {
      alert('⚠️ El nombre es obligatorio');
      return;
    }

    try {
      await updateDoc(doc(this.db, 'usuarios', this.usuarioEditandoUid), {
        nombre: this.editarNombreUser,
        rol: this.editarRolUser,
        telefono: this.editarTelefonoUser || ''
      });
      this.cancelarEdicionUsuario();
      alert('✅ Usuario actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      alert('❌ No se pudo actualizar el usuario.');
    }
  }

  cancelarEdicionUsuario() {
    this.usuarioEditandoUid = null;
    this.editarNombreUser = '';
    this.editarRolUser = 'cliente';
    this.editarTelefonoUser = '';
  }

  async borrarUsuario(uid: string) {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      await deleteDoc(doc(this.db, 'usuarios', uid));
    }
  }

  // ================= RESETS =================

  resetFormularioJuego() {
    this.nuevoTitulo = ''; this.nuevaPlataforma = ''; this.nuevaImagen = ''; this.nuevoPrecio = null;
  }

  resetFormularioUsuario() {
    this.nuevoNombreUser = ''; this.nuevoEmailUser = ''; this.nuevoPasswordUser = ''; this.nuevoRolUser = 'cliente'; this.nuevoTelefonoUser = '';
  }
}

interface Videojuego { id?: string; titulo: string; plataforma: string; imagen: string; precio: number; }
interface Usuario { uid: string; nombre: string; email: string; rol: string; telefono?: string; }