import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // El guardián observa si hay un usuario conectado
  return authService.usuario$.pipe(
    take(1),
    map(usuario => {
      if (usuario) {
        return true; // Si hay sesión, lo deja pasar a la vista (Perfil o Admin)
      } else {
        router.navigate(['/login']); // Si no hay sesión, lo patea al Login
        return false;
      }
    })
  );
};