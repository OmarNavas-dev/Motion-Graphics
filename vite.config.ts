import {defineConfig} from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist-ui',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    proxy: {
      '/api': 'http://127.0.0.1:4317',
      '/user-assets': 'http://127.0.0.1:4317',
      '/exports': 'http://127.0.0.1:4317',
    },
  },
});
