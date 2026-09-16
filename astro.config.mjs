import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  site: 'https://wowforevertalent.app',
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/compare/') && !page.includes('/my-builds/'),
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@domain': r('./src/domain'),
        '@data': r('./src/data'),
        '@components': r('./src/components'),
        '@features': r('./src/features'),
      },
    },
  },
});
