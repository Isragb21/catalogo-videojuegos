import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { CarritoComponent } from './carrito';
import { AuthService } from '../../services/auth';
import { CarritoService } from '../../services/carrito.service';
import { FingerprintService } from '../../services/fingerprint.service';

describe('CarritoComponent', () => {
  let component: CarritoComponent;
  let fixture: ComponentFixture<CarritoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarritoComponent],
      providers: [
        provideRouter([]),
        {
          provide: CarritoService,
          useValue: {
            carrito$: new BehaviorSubject([]),
            obtenerTotal: () => 0,
            actualizarCantidad: vi.fn(),
            eliminarDelCarrito: vi.fn(),
            vaciarCarrito: vi.fn(),
          },
        },
        { provide: AuthService, useValue: { usuario$: of(null) } },
        {
          provide: FingerprintService,
          useValue: {
            isBiometricAvailable: vi.fn().mockResolvedValue(false),
            hasFingerprintRegistered: vi.fn().mockReturnValue(false),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarritoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
