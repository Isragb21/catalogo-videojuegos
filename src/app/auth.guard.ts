import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.usuario$.pipe(
    take(1),
    map(usuario => {
      // 1. Verificamos si pasó la validación del código 2FA en el navegador
      const aprobado2FA = localStorage.getItem('2fa_aprobado') === 'true';

      // 2. Solo dejamos pasar si existe el usuario Y aprobó el 2FA
      if (usuario && aprobado2FA) {
        return true; 
      } else {
        // Si no está autenticado o no ha puesto el código, al login
        router.navigate(['/login']); 
        return false;
      }
    })
  );
};