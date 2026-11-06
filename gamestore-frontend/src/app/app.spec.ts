import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './services/auth';
import { CarritoService } from './services/carrito.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: { usuario$: of(null), obtenerPerfil: vi.fn() } },
        {
          provide: CarritoService,
          useValue: { carrito$: new BehaviorSubject([]), obtenerCantidadItems: () => 0 },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the GameStore navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.logo-text')?.textContent).toContain('GameStore');
  });
});
