import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        },
        manifest: {
          name: 'Converter',
          short_name: 'Converter',
          description: 'A comprehensive, beautifully designed file converter platform.',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          icons: [
            {
              src: 'https://raw.githubusercontent.com/dapidd12/storage/main/tes/1777687843806-Screenshot_20260502_090914.jpg',
              sizes: '192x192',
              type: 'image/jpeg'
            },
            {
              src: 'https://raw.githubusercontent.com/dapidd12/storage/main/tes/1777687843806-Screenshot_20260502_090914.jpg',
              sizes: '512x512',
              type: 'image/jpeg'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
