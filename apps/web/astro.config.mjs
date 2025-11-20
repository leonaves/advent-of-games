import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      configFile: '../../packages/ui/tailwind.config.mjs',
      applyBaseStyles: false,
    }),
  ],
  vite: {
    server: {
      fs: {
        allow: ['../..']
      }
    }
  }
});
