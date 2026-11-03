import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves project sites from /<repository-name>/.
// The deployment workflow sets VITE_BASE_PATH to that path. Local dev stays at "/".
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || '/';

  return {
    base,
    plugins: [react()],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
