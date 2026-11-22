import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Cada artefato é uma pasta em src/content/artefatos/<slug>/ com um index.md.
// Os caminhos de mídia (./fotos/01.jpg etc.) são relativos a essa pasta.
const bloco = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('foto'), src: z.string(), legenda: z.string().optional() }),
  z.object({ tipo: z.literal('scan'), src: z.string(), legenda: z.string().optional() }),
  z.object({ tipo: z.literal('texto'), conteudo: z.string() }),
  z.object({ tipo: z.literal('audio'), src: z.string(), titulo: z.string().optional(), loop: z.boolean().default(false) }),
  z.object({ tipo: z.literal('video'), src: z.string(), poster: z.string().optional(), loop: z.boolean().default(true) }),
  z.object({ tipo: z.literal('modelo3d'), src: z.string(), poster: z.string().optional(), legenda: z.string().optional() }),
]);

const artefatos = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/artefatos' }),
  schema: ({ image }) =>
    z.object({
      numero: z.string(),                      // "0001": número de catálogo
      titulo: z.string(),
      periodo: z.string(),                     // "2024–2025"
      ano: z.string(),                         // o que aparece na linha da lista
      local: z.string(),
      midias: z.array(z.string()).default([]), // ["foto", "scan", "som"]
      acento: z.string().default('#ff2a2a'),   // a única cor do artefato
      capa: image(),                           // fonte do ASCII
      seed: z.number().int().default(1),       // ordem da revelação
      charset: z.enum(['padrao', 'blocos', 'kana']).default('padrao'),
      brilho: z.enum(['max', 'luma']).default('max'), // max = fiel ao year0001 (apaga cor)
      rascunho: z.boolean().default(false),
      blocos: z.array(bloco).default([]),
    }),
});

export const collections = { artefatos };
