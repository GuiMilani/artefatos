// @ts-check
import { defineConfig } from 'astro/config';

// O site é publicado em https://guimilani.github.io/artefatos/
// `base` precisa bater com o nome do repositório.
export default defineConfig({
  site: 'https://guimilani.github.io',
  base: '/artefatos',
  trailingSlash: 'always',
});
