import { inject, Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Firestore, collection, setDoc, doc, collectionData, deleteDoc, getDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class AuthService {
  
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  usuario$ = authState(this.auth);

  async registro(email: string, pass: string) {
    const credenciales = await createUserWithEmailAndPassword(this.auth, email, pass);
    const uid = credenciales.user.uid;

    const usuarioRef = doc(this.firestore, `usuarios/${uid}`);
    return setDoc(usuarioRef, {
      uid: uid,
      email: email,
      nombre: '', 
      telefono: '', 
      fotoUrl: '', 
      rol: 'usuario', 
      fechaRegistro: new Date().toISOString()
    });
  }

  login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  logout() {
    return signOut(this.auth);
  }

  // Obtiene los datos del perfil de usuario mediante una promesa
  async obtenerPerfil(uid: string) {
    const userDoc = doc(this.firestore, `usuarios/${uid}`);
    const docSnap = await getDoc(userDoc);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
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