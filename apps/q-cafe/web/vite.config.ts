import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwind()], server: { host: '0.0.0.0', port: 5180, strictPort: true, allowedHosts: ['q-cafe.localhost'], proxy: { '/api': process.env.QCAFE_API_URL ?? 'http://127.0.0.1:4180' } } });
