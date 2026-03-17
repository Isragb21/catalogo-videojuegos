import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Catalogo } from './pages/catalogo/catalogo';
import { Perfil } from './pages/perfil/perfil';
import { Admin } from './pages/admin/admin';
import { Login } from './pages/login/login';
import { Informacion } from './pages/informacion/informacion';

// Importamos a nuestro "cadenero"
import { authGuard } from './auth.guard'; 

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' }, 
  { path: 'inicio', component: Inicio },
  { path: 'catalogo', component: Catalogo },
  
  // VISTAS PROTEGIDAS (Solo entras si estás logueado)
  { path: 'perfil', component: Perfil, canActivate: [authGuard] },
  { path: 'admin', component: Admin, canActivate: [authGuard] },
  
  { path: 'login', component: Login },
  { path: 'informacion', component: Informacion },
  { path: '**', redirectTo: 'inicio' } 
];