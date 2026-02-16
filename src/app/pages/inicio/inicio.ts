import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio {
  // SCRIPT DE CREACIÓN DE MENÚ DE ENLACES EXTERNOS
  enlacesExternos = [
    { nombre: 'Steam Store', url: 'https://store.steampowered.com', icono: '🎮', desc: 'Precios globales PC' },
    { nombre: 'Metacritic', url: 'https://www.metacritic.com', icono: '⭐', desc: 'Reseñas de expertos' },
    { nombre: 'PlayStation Store', url: 'https://store.playstation.com', icono: '🟦', desc: 'Catálogo de consola' },
    { nombre: 'YouTube Gaming', url: 'https://www.youtube.com/gaming', icono: '📺', desc: 'Trailers oficiales' }
  ];

  // INFORMACIÓN DE VENTA Y RELEVANCIA
  infoVenta = [
    { titulo: 'Pagos 100% Seguros', detalle: 'Encriptación SSL para proteger tus datos bancarios.' },
    { titulo: 'Soporte Especializado', detalle: 'Expertos listos para ayudarte con la instalación de tus juegos.' },
    { titulo: 'Catálogo Actualizado', detalle: 'Sincronizado directamente con las últimas novedades del mercado.' }
  ];
}