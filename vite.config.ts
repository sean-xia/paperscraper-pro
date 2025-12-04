import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    root: '.', // Set root to current directory
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: './index.html' // Specify entry point
      }
    },
    define: {
      // This is crucial: we replace `process.env.API_KEY` in the source code
      // with the actual value from the environment variables during the build.
      // We check both VITE_API_KEY (standard Vite) and API_KEY (standard Node/Vercel).
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY),
      // Polyfill empty process.env for other access patterns if necessary
      'process.env': {}
    }
  };
});