import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare(),
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
