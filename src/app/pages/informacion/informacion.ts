import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-informacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './informacion.html',
  styleUrl: './informacion.css'
})
export class Informacion {
  // Datos informativos para la página interna
  descripcion = 'GameStore 2026 es una plataforma SPA desarrollada con Angular 21 y Firebase Firestore para la gestión de videojuegos digitales en tiempo real.';
  
  publicos = [
    { perfil: 'Gamers', desc: 'Usuarios que buscan licencias originales con validación de precios oficial.' },
    { perfil: 'Administradores', desc: 'Gestores de inventario que requieren sincronización inmediata con la nube.' }
  ];

  terminos = [
    'Uso de licencias: Todos los códigos vendidos son para uso personal y no comercial.',
    'Seguridad: Los datos de navegación se protegen bajo políticas CSP estrictas.',
    'Garantía: Se ofrece soporte técnico 24/7 para la activación de productos.'
  ];
}