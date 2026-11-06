import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { Catalogo } from './catalogo';
import { AuthService } from '../../services/auth';
import { CarritoService } from '../../services/carrito.service';
import { VideogameService } from '../../services/videogame.service';

describe('Catalogo', () => {
  let component: Catalogo;
  let fixture: ComponentFixture<Catalogo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Catalogo],
      providers: [
        { provide: CarritoService, useValue: { agregarAlCarrito: vi.fn() } },
        { provide: AuthService, useValue: { usuario$: of(null) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: VideogameService, useValue: { getVideogames: () => of([]) } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Catalogo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
