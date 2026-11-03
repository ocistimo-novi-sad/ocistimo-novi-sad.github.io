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
      // Libraries in their own files: they change rarely, so after a deploy the
      // browser keeps them cached and downloads only the app's own code again.
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: 'map', test: /node_modules[\\/](leaflet|react-leaflet|@react-leaflet|supercluster|kdbush)[\\/]/ },
              { name: 'firebase', test: /node_modules[\\/](firebase|@firebase|idb|tslib)[\\/]/ },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
