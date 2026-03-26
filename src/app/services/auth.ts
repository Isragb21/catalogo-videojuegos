import { inject, Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Firestore, collection, setDoc, doc, collectionData, deleteDoc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router'; // Importamos Router

@Injectable({ providedIn: 'root' })
export class AuthService {
  
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router); // Inyectamos Router

  usuario$ = authState(this.auth);

  async registro(email: string, pass: string, nombre: string, telefono: string) {
    const credenciales = await createUserWithEmailAndPassword(this.auth, email, pass);
    const uid = credenciales.user.uid;

    const usuarioRef = doc(this.firestore, `usuarios/${uid}`);
    return setDoc(usuarioRef, {
      uid: uid,
      email: email,
      nombre: nombre,
      telefono: telefono,
      rol: 'usuario',
      fechaRegistro: new Date().toISOString()
    });
  }

  login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  // ✅ CORRECCIÓN: Ahora limpia el 2FA y redirige
  async logout() {
    try {
      localStorage.removeItem('2fa_aprobado'); // Limpiamos el acceso 2FA
      await signOut(this.auth);               // Cerramos sesión en Firebase
      this.router.navigate(['/login']);       // Mandamos al login
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  async obtenerPerfil(uid: string) {
    try {
      const userDoc = doc(this.firestore, `usuarios/${uid}`);
      const docSnap = await getDoc(userDoc);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error("Error al obtener el perfil:", error);
      return null;
    }
  }

  actualizarPerfil(uid: string, datos: any) {
    const userDoc = doc(this.firestore, `usuarios/${uid}`);
    return setDoc(userDoc, datos, { merge: true });
  }

  obtenerTodosLosUsuarios() {
    const usuariosRef = collection(this.firestore, 'usuarios');
    return collectionData(usuariosRef, { idField: 'id' });
  }

  eliminarUsuarioDB(uid: string) {
    const usuarioDoc = doc(this.firestore, `usuarios/${uid}`);
    return deleteDoc(usuarioDoc);
  }
}