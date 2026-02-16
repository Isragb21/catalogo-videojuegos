import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Catalogo } from './pages/catalogo/catalogo';
import { Perfil } from './pages/perfil/perfil';
import { Admin } from './pages/admin/admin';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' }, 
  { path: 'inicio', component: Inicio },
  { path: 'catalogo', component: Catalogo },
  { path: 'perfil', component: Perfil },
  { path: 'admin', component: Admin },
  { path: 'login', component: Login },
  { path: '**', redirectTo: 'inicio' } 
];