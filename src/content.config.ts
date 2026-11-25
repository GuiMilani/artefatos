import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Each artifact is a folder in src/content/artifacts/<slug>/ with an index.md.
// Media paths (./photos/01.jpg etc.) are relative to that folder.
const block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('photo'), src: z.string(), caption: z.string().optional(), pixelated: z.boolean().default(false) }),
  // turn: show the scan rotated 90° on phones so a wide scan fills the screen;
  // left out, wide scans turn and tall ones don't.
  z.object({ type: z.literal('scan'), src: z.string(), caption: z.string().optional(), turn: z.boolean().optional() }),
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({ type: z.literal('audio'), src: z.string(), title: z.string().optional(), loop: z.boolean().default(false) }),
  z.object({ type: z.literal('video'), src: z.string(), poster: z.string().optional(), loop: z.boolean().default(true) }),
  z.object({ type: z.literal('model3d'), src: z.string(), poster: z.string().optional(), caption: z.string().optional() }),
]);

const artifacts = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/artifacts' }),
  schema: ({ image }) =>
    z.object({
      number: z.string(),                       // "001": catalogue number, in order of creation
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
      chao: z.boolean().default(false),         // drifting chao column on the right edge
      // Opens through the e-ink transition (src/lib/eink.ts), showing an image:
      // true = the Maria Bonita photo, or name it: 'maria-bonita' | 'grin'.
      special: z
        .union([z.boolean(), z.enum(['maria-bonita', 'grin'])])
        .default(false)
        .transform((v) => (v === true ? 'maria-bonita' : v || undefined)),
      blocks: z.array(block).default([]),
    }),
});

export const collections = { artifacts };
