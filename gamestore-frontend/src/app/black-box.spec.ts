import { HttpClient, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import * as OTPAuth from 'otpauth';
import { firstValueFrom, of, throwError, BehaviorSubject, Observable } from 'rxjs';
import { Catalogo } from './pages/catalogo/catalogo';
import { Login } from './pages/login/login';
import { authGuard } from './auth.guard';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from './services/auth';
import { ApiConfigService } from './services/api-config.service';
import { CarritoService, ProductoCarrito } from './services/carrito.service';
import { VideogameService, Videogame } from './services/videogame.service';
import { FingerprintService } from './services/fingerprint.service';

const juegosPrueba: Videogame[] = [
  {
    id: 'elden-ring',
    title: 'Elden Ring',
    platform: 'PC',
    price: 799,
    stock: 4,
    image_url: 'elden-ring.jpg',
  },
  {
    id: 'zelda-totk',
    title: 'Tears of the Kingdom',
    platform: 'Nintendo Switch',
    price: 1199,
    stock: 2,
    image_url: 'zelda.jpg',
  },
];

describe('Pruebas de caja negra - catálogo', () => {
  let fixture: ComponentFixture<Catalogo>;
  let authState: BehaviorSubject<{ id: string } | null>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let carrito: { agregarAlCarrito: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authState = new BehaviorSubject<{ id: string } | null>(null);
    router = { navigate: vi.fn() };
    carrito = { agregarAlCarrito: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [Catalogo],
      providers: [
        { provide: AuthService, useValue: { usuario$: authState.asObservable() } },
        { provide: CarritoService, useValue: carrito },
        { provide: Router, useValue: router },
        { provide: VideogameService, useValue: { getVideogames: () => of(juegosPrueba) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalogo);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('RF-01 muestra los juegos recibidos y sus precios', () => {
    const cards = fixture.nativeElement.querySelectorAll('.game-card') as NodeListOf<HTMLElement>;
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Elden Ring');
    expect(cards[0].textContent).toContain('$799');
    expect(cards[1].textContent).toContain('Tears of the Kingdom');
  });

  it('RF-02 busca títulos sin distinguir mayúsculas y espacios externos', async () => {
    const input = fixture.nativeElement.querySelector('.search-bar input') as HTMLInputElement;
    input.value = '  ELDEN  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    const cards = fixture.nativeElement.querySelectorAll('.game-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Elden Ring');
  });

  it('RF-03 busca por plataforma y deja cero resultados si no hay coincidencias', async () => {
    const input = fixture.nativeElement.querySelector('.search-bar input') as HTMLInputElement;
    input.value = 'switch';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.game-card')).toHaveLength(1);

    input.value = 'juego inexistente';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.game-card')).toHaveLength(0);
  });

  it('RF-04 redirige al acceso si un visitante intenta agregar un juego', async () => {
    const button = fixture.nativeElement.querySelector('.btn-add-cart') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(carrito.agregarAlCarrito).not.toHaveBeenCalled();
  });

  it('RF-05 transfiere al carrito el producto y la cantidad esperados', async () => {
    authState.next({ id: 'usuario-1' });
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.btn-add-cart') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(carrito.agregarAlCarrito).toHaveBeenCalledWith({
      id: 'elden-ring',
      titulo: 'Elden Ring',
      plataforma: 'PC',
      precio: 799,
      imagen: 'elden-ring.jpg',
      cantidad: 1,
    });
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe('Pruebas de caja negra - acceso', () => {
  let fixture: ComponentFixture<Login>;
  let auth: {
    clearLocalSession: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    registro: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    auth = {
      clearLocalSession: vi.fn(),
      login: vi.fn(),
      registro: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: FingerprintService,
          useValue: {
            hasFingerprintRegistered: vi.fn().mockReturnValue(false),
            isBiometricAvailable: vi.fn().mockResolvedValue(false),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('RF-06 rechaza contraseñas con menos de seis caracteres', async () => {
    fixture.componentInstance.email = 'jugador@example.com';
    fixture.componentInstance.password = 'abc12';

    await fixture.componentInstance.procesarFormulario();

    expect(fixture.componentInstance.mensajeError).toBe('Minimo 6 caracteres');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('RF-07 normaliza el correo y permite avanzar a la verificación 2FA', async () => {
    auth.login.mockResolvedValue({ uid: 'u1', email: 'jugador@example.com' });
    fixture.componentInstance.email = '  JUGADOR@EXAMPLE.COM ';
    fixture.componentInstance.password = ' clave12 ';

    await fixture.componentInstance.procesarFormulario();

    expect(auth.login).toHaveBeenCalledWith('jugador@example.com', 'clave12');
    expect(fixture.componentInstance.modo2FA).toBe(true);
  });

  it('RF-08 rechaza un registro si las contraseñas no coinciden', async () => {
    const login = fixture.componentInstance;
    login.toggleModo();
    login.email = 'nuevo@example.com';
    login.password = 'clave123';
    login.confirmPassword = 'clave456';
    login.nombre = 'Nuevo usuario';
    login.telefono = '4420000000';

    await login.procesarFormulario();

    expect(login.mensajeError).toBe('Las contrasenas no coinciden');
    expect(auth.registro).not.toHaveBeenCalled();
  });

  it('RF-09 muestra un mensaje entendible ante credenciales rechazadas', async () => {
    auth.login.mockRejectedValue(new Error('Invalid login credentials'));
    fixture.componentInstance.email = 'jugador@example.com';
    fixture.componentInstance.password = 'clave123';

    await fixture.componentInstance.procesarFormulario();

    expect(fixture.componentInstance.mensajeError).toBe('Correo o contrasena incorrectos.');
  });

  it('RF-10 rechaza un código 2FA fuera de la ventana de validez', async () => {
    const login = fixture.componentInstance;
    login.secreto = 'JBSWY3DPEHPK3PXP';
    login.correoActual = 'jugador@example.com';
    login.esNuevo2FA = false;

    const totp = new OTPAuth.TOTP({
      issuer: 'GameStore',
      label: login.correoActual,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(login.secreto),
    });
    const timestamp = Date.now();
    const codigosValidos = new Set(
      [-3, -2, -1, 0, 1, 2, 3].map((periodo) =>
        totp.generate({ timestamp: timestamp + periodo * 30_000 }),
      ),
    );
    let codigoInvalido = 0;
    while (codigosValidos.has(codigoInvalido.toString().padStart(6, '0'))) {
      codigoInvalido += 1;
    }
    login.codigo2FA = codigoInvalido.toString().padStart(6, '0');

    await login.validarCodigo2FA();

    expect(login.mensaje2FA).toBe('Codigo incorrecto o expirado. Intenta de nuevo.');
    expect(login.codigo2FA).toBe('');
    expect(localStorage.getItem('2fa_aprobado')).toBeNull();
  });
});

describe('Pruebas de caja negra - control de acceso', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authState: BehaviorSubject<{ id: string } | null>;

  beforeEach(() => {
    localStorage.clear();
    router = { navigate: vi.fn() };
    authState = new BehaviorSubject<{ id: string } | null>(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { usuario$: authState.asObservable() } },
        { provide: Router, useValue: router },
      ],
    });
  });

  async function verificarGuard(): Promise<boolean> {
    const decision = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/carrito' } as RouterStateSnapshot),
    );
    return firstValueFrom(decision as Observable<boolean>);
  }

  it('RF-11 bloquea el acceso si no hay sesión', async () => {
    expect(await verificarGuard()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('RF-12 exige aprobación 2FA aunque haya sesión', async () => {
    authState.next({ id: 'u1' });
    expect(await verificarGuard()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('RF-13 permite el acceso con sesión y 2FA aprobada', async () => {
    authState.next({ id: 'u1' });
    localStorage.setItem('2fa_aprobado', 'true');
    expect(await verificarGuard()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe('Pruebas de caja negra - consistencia del carrito local', () => {
  const producto: ProductoCarrito = {
    id: 'juego-1',
    titulo: 'Juego de prueba',
    plataforma: 'PC',
    precio: 40,
    imagen: 'juego.jpg',
    cantidad: 1,
  };
  let carrito: CarritoService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HttpClient,
          useValue: { get: () => of([]), post: () => of([]), delete: () => of([]) },
        },
        { provide: AuthService, useValue: { usuario$: of(null) } },
        { provide: ApiConfigService, useValue: { baseUrl: 'http://test/api' } },
      ],
    });
    carrito = TestBed.inject(CarritoService);
  });

  it('RF-15 combina duplicados y conserva subtotal, total y cantidad en almacenamiento', async () => {
    await carrito.agregarAlCarrito(producto);
    await carrito.agregarAlCarrito(producto);

    expect(carrito.obtenerCantidadItems()).toBe(2);
    expect(carrito.obtenerTotal()).toBe(80);
    expect(JSON.parse(localStorage.getItem('carrito') || '[]')[0].cantidad).toBe(2);
  });

  it('RF-16 elimina el producto al reducir la cantidad a cero', async () => {
    await carrito.agregarAlCarrito(producto);
    await carrito.actualizarCantidad(producto.id, 0);

    expect(carrito.obtenerCantidadItems()).toBe(0);
    expect(JSON.parse(localStorage.getItem('carrito') || '[]')).toEqual([]);
  });

  it('RF-17 restaura los productos guardados al volver a inicializar el servicio', () => {
    localStorage.setItem('carrito', JSON.stringify([producto]));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HttpClient,
          useValue: { get: () => of([]), post: () => of([]), delete: () => of([]) },
        },
        { provide: AuthService, useValue: { usuario$: of(null) } },
        { provide: ApiConfigService, useValue: { baseUrl: 'http://test/api' } },
      ],
    });

    const restored = TestBed.inject(CarritoService);
    expect(restored.obtenerTotal()).toBe(40);
    expect(restored.obtenerCantidadItems()).toBe(1);
  });

  it('RF-18 elimina el registro al vaciar el carrito', async () => {
    await carrito.agregarAlCarrito(producto);
    await carrito.vaciarCarrito();

    expect(carrito.obtenerTotal()).toBe(0);
    expect(localStorage.getItem('carrito')).toBeNull();
  });
});

describe('Pruebas de caja negra - respuesta ante errores', () => {
  it('RF-19 alerta ante una falla de red y propaga el error HTTP', async () => {
    const alerta = vi.fn();
    vi.stubGlobal('alert', alerta);
    const request = new HttpRequest('GET', '/api/videogames');
    const response = errorInterceptor(request, () =>
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    const error = await firstValueFrom(response).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(0);
    expect(alerta).toHaveBeenCalledWith(
      '¡Ups! El servidor de GameStore no responde. Revisa tu conexión.',
    );
    vi.unstubAllGlobals();
  });
});
