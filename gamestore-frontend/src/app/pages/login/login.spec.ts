import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Login } from './login';
import { AuthService } from '../../services/auth';
import { FingerprintService } from '../../services/fingerprint.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: { clearLocalSession: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: FingerprintService,
          useValue: {
            hasFingerprintRegistered: vi.fn().mockReturnValue(false),
            isBiometricAvailable: vi.fn().mockResolvedValue(false),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
