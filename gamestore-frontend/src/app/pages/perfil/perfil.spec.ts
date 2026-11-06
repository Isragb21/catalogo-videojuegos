import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Perfil } from './perfil';
import { AuthService } from '../../services/auth';
import { FingerprintService } from '../../services/fingerprint.service';

describe('Perfil', () => {
  let component: Perfil;
  let fixture: ComponentFixture<Perfil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        { provide: AuthService, useValue: { usuario$: of(null), obtenerPerfil: vi.fn() } },
        {
          provide: FingerprintService,
          useValue: {
            registerFingerprint: vi.fn(),
            isBiometricAvailable: vi.fn().mockResolvedValue(false),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Perfil);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
