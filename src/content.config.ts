import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Each artifact is a folder in src/content/artifacts/<slug>/ with an index.md.
// Media paths (./photos/01.jpg etc.) are relative to that folder.
const block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('photo'), src: z.string(), caption: z.string().optional(), pixelated: z.boolean().default(false) }),
  z.object({ type: z.literal('scan'), src: z.string(), caption: z.string().optional() }),
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({ type: z.literal('audio'), src: z.string(), title: z.string().optional(), loop: z.boolean().default(false) }),
  z.object({ type: z.literal('video'), src: z.string(), poster: z.string().optional(), loop: z.boolean().default(true) }),
  z.object({ type: z.literal('model3d'), src: z.string(), poster: z.string().optional(), caption: z.string().optional() }),
]);

const artifacts = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/artifacts' }),
  schema: ({ image }) =>
    z.object({
      number: z.string(),                       // "0001": catalogue number
      title: z.string(),
      year: z.string().default(''),             // shown on the index row
      period: z.string().default(''),           // "2024–2025"
      place: z.string().default(''),
      media: z.array(z.string()).default([]),   // ["photo", "scan", "sound"]
      accent: z.string().default('#ff2a2a'),    // the artifact's single colour
      cover: image(),                           // source of the ASCII cover
      seed: z.number().int().default(1),        // order of the reveal
      charset: z.enum(['default', 'blocks', 'kana']).default('default'),
      brightness: z.enum(['max', 'luma']).default('max'), // max drops colour, luma keeps it
      draft: z.boolean().default(false),
      blocks: z.array(block).default([]),
    }),
});

export const collections = { artifacts };
