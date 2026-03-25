import { inject, Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Firestore, collection, setDoc, doc, collectionData, deleteDoc, getDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class AuthService {
  
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  usuario$ = authState(this.auth);

  // 🔥 AQUÍ ESTÁ LA CORRECCIÓN: Ahora acepta los 4 datos (email, pass, nombre, telefono)
  async registro(email: string, pass: string, nombre: string, telefono: string) {
    const credenciales = await createUserWithEmailAndPassword(this.auth, email, pass);
    const uid = credenciales.user.uid;

    const usuarioRef = doc(this.firestore, `usuarios/${uid}`);
    return setDoc(usuarioRef, {
      uid: uid,
      email: email,
      nombre: nombre,       // Se guarda el nombre
      telefono: telefono,   // Se guarda el teléfono
      rol: 'usuario',       // Entra como usuario normal por defecto
      fechaRegistro: new Date().toISOString()
    });
  }

  login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  logout() {
    return signOut(this.auth);
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