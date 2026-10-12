import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, forward /api calls to the Express server so the browser sees one origin (no CORS setup needed).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
