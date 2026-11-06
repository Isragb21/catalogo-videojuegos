import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { Admin } from './admin';
import { AuthService } from '../../services/auth';
import { VideogameService } from '../../services/videogame.service';
import { ApiConfigService } from '../../services/api-config.service';

describe('Admin', () => {
  let component: Admin;
  let fixture: ComponentFixture<Admin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Admin],
      providers: [
        {
          provide: AuthService,
          useValue: {
            usuario$: of({ uid: 'cliente-1', email: 'cliente@example.com', rol: 'cliente' }),
            obtenerPerfil: vi.fn(),
          },
        },
        { provide: VideogameService, useValue: { getVideogames: () => of([]) } },
        { provide: HttpClient, useValue: { get: () => of([]) } },
        { provide: ApiConfigService, useValue: { baseUrl: 'http://test/api' } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Admin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('RF-14 hides administration controls from a customer role', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Acceso Restringido');
    expect(fixture.nativeElement.querySelector('.add-game-form')).toBeNull();
  });
});
