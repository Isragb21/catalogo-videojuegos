import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from './auth';
import { ApiConfigService } from './api-config.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: {} },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ApiConfigService, useValue: { baseUrl: 'http://test/api' } },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('clears both authentication markers and emits a signed-out state', () => {
    localStorage.setItem('usuario_sesion', JSON.stringify({ uid: 'user-1' }));
    localStorage.setItem('2fa_aprobado', 'true');
    let emittedUser: unknown = { uid: 'user-1' };
    service.usuario$.subscribe((user) => (emittedUser = user));

    service.clearLocalSession();

    expect(localStorage.getItem('usuario_sesion')).toBeNull();
    expect(localStorage.getItem('2fa_aprobado')).toBeNull();
    expect(emittedUser).toBeNull();
  });
});
