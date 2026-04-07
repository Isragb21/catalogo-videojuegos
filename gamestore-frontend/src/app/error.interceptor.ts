import { HttpInterceptorFn } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      // status 0 generally indicates a network error (e.g. server down)
      if (error.status === 0) {
        alert('¡Ups! El servidor de GameStore no responde. Revisa tu conexión.');
      }
      return throwError(() => error);
    })
  );
};
