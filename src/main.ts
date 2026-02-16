import 'zone.js';  // <--- ¡ESTA ES LA LÍNEA MÁGICA QUE FALTABA!
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
  