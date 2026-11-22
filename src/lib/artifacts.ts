import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';

export type Artifact = CollectionEntry<'artifacts'>;

/** Published artifacts, newest (highest number) first. */
export async function listArtifacts(): Promise<Artifact[]> {
  const all = await getCollection('artifacts', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.number.localeCompare(a.data.number));
}

const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/artifacts/**/*.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true },
);
const files = import.meta.glob<string>(
  '/src/content/artifacts/**/*.{mp3,wav,m4a,ogg,mp4,webm,mov,glb,gltf}',
  { eager: true, query: '?url', import: 'default' },
);

function key(id: string, src: string) {
  return `/src/content/artifacts/${id}/${src.replace(/^\.\//, '')}`;
}

export function imageOf(id: string, src: string): ImageMetadata {
  const m = images[key(id, src)];
  if (!m) throw new Error(`Image not found: ${src} (artifact ${id})`);
  return m.default;
}

export function fileOf(id: string, src: string): string {
  const url = files[key(id, src)];
  if (!url) throw new Error(`File not found: ${src} (artifact ${id})`);
  return url;
}
