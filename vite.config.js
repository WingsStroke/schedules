import { defineConfig } from 'vite';

export default defineConfig({
  // Requerido para que los assets carguen correctamente en GitHub Pages
  base: '/',
});
//cambiar para test: base: '/schedules'
//cambiar para prod: base: '/'