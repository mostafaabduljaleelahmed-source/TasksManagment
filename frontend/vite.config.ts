import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// Detect Vercel environment automatically (Vercel sets VERCEL=1 during build)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || Boolean(process.env.VERCEL_ENV);

// Target output directory: 'dist' for Vercel, '../backend/Platform.Api/wwwroot' for local/MonsterASP
const outDir = isVercel
  ? path.resolve(__dirname, 'dist')
  : path.resolve(__dirname, '../backend/Platform.Api/wwwroot');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5115',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
              return 'vendor-monaco';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
  },
})



