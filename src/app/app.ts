// src/app/app.ts
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { AuthService } from './services/auth'; 
import { CarritoService } from './services/carrito.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  public auth = inject(AuthService);
  public carritoService = inject(CarritoService);
  private router = inject(Router);
  
  esAdmin: boolean = false;
  cantidadCarrito: number = 0;
  private authSubscription?: Subscription;
  private carritoSubscription?: Subscription;

  async ngOnInit() {
    // Suscripción para verificar admin
    this.authSubscription = this.auth.usuario$.subscribe(async (user) => {
      if (user) {
        const perfil = await this.auth.obtenerPerfil(user.uid);
        this.esAdmin = perfil?.['rol'] === 'admin';
      } else {
        this.esAdmin = false;
      }
    });

    // Suscripción para actualizar el contador del carrito
    this.carritoSubscription = this.carritoService.carrito$.subscribe(() => {
      this.cantidadCarrito = this.carritoService.obtenerCantidadItems();
    });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
    this.carritoSubscription?.unsubscribe();
  }

  async cerrarSesion() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}