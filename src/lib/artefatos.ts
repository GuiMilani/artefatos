import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';

export type Artefato = CollectionEntry<'artefatos'>;

/** Artefatos publicados, do mais novo (número maior) pro mais antigo. */
export async function listarArtefatos(): Promise<Artefato[]> {
  const todos = await getCollection('artefatos', ({ data }) => !data.rascunho);
  return todos.sort((a, b) => b.data.numero.localeCompare(a.data.numero));
}

const imagens = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/artefatos/**/*.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true },
);
const arquivos = import.meta.glob<string>(
  '/src/content/artefatos/**/*.{mp3,wav,m4a,ogg,mp4,webm,mov,glb,gltf}',
  { eager: true, query: '?url', import: 'default' },
);

function chave(id: string, src: string) {
  return `/src/content/artefatos/${id}/${src.replace(/^\.\//, '')}`;
}

export function imagemDo(id: string, src: string): ImageMetadata {
  const m = imagens[chave(id, src)];
  if (!m) throw new Error(`Imagem não encontrada: ${src} (artefato ${id})`);
  return m.default;
}

export function arquivoDo(id: string, src: string): string {
  const url = arquivos[chave(id, src)];
  if (!url) throw new Error(`Arquivo não encontrado: ${src} (artefato ${id})`);
  return url;
}
