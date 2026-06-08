import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base: set to repo name for GitHub Pages
  base: process.env.GITHUB_PAGES ? '/smart-task-/' : '/',
  server: {
    proxy: {
      // For local dev only (won't be used in production)
      '/api': 'http://localhost:5000'
    }
  }
});
