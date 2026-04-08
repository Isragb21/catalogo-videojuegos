import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';

export interface Videogame {
  id?: string;
  title: string;
  platform: string;
  image_url?: string;
  price: number;
  stock?: number;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VideogameService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfigService);
  get apiUrl() { return `${this.apiConfig.baseUrl}/videogames`; }

  getVideogames(): Observable<Videogame[]> {
    return this.http.get<Videogame[]>(this.apiUrl);
  }

  addVideogame(videogame: Videogame): Observable<Videogame> {
    return this.http.post<Videogame>(this.apiUrl, videogame);
  }

  updateVideogame(id: string, videogame: Partial<Videogame>): Observable<Videogame> {
    return this.http.put<Videogame>(`${this.apiUrl}/${id}`, videogame);
  }

  deleteVideogame(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
