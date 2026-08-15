import { defineConfig } from 'vite';

export default defineConfig({
  // Requerido para que los assets carguen correctamente en GitHub Pages
  base: '/schedules',
});
//cambiar para test: base: '/schedules'
//cambiar para prod: base: '/'