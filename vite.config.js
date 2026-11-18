import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' => funziona su GitHub Pages in qualsiasi repository (user.github.io/nome-repo/)
export default defineConfig({ plugins: [react()], base: './' });
