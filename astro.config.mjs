// @ts-check
import { defineConfig } from 'astro/config';

// Published at https://guimilani.github.io/artefatos/
// `base` must match the repository name.
export default defineConfig({
  site: 'https://guimilani.github.io',
  base: '/artefatos',
  trailingSlash: 'always',
});
