import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    host: '0.0.0.0',
    port: 5250,
    strictPort: true,
    proxy: {
      '/api': process.env.NEOT_API_URL ?? 'http://127.0.0.1:4250',
    },
  },
});
