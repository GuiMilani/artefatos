import sharp from 'sharp';
import path from 'node:path';

// Rampas do escuro pro claro. A "padrao" é a mesma do year0001.
export const RAMPAS: Record<string, string[]> = {
  padrao: ['@', '#', '$', '=', '*', '!', ';', ':', '~', '-', ',', '.', ' ', ' '],
  blocos: ['█', '▓', '▒', '░', ':', '.', ' ', ' '],
  kana: ['ﾎ', 'ﾈ', 'ﾇ', 'ｦ', 'ﾂ', 'ﾐ', 'ｼ', 'ｰ', 'ｨ', '･', ' ', ' '],
};

export const COLUNAS = 120;

/**
 * Converte a capa em linhas de texto no build. O navegador só anima a revelação,
 * então a home não baixa nenhuma imagem.
 */
export async function capaParaAscii(
  capa: { src: string; fsPath?: string },
  opts: { charset?: string; brilho?: 'max' | 'luma'; colunas?: number } = {},
): Promise<string[]> {
  const colunas = opts.colunas ?? COLUNAS;
  const rampa = RAMPAS[opts.charset ?? 'padrao'] ?? RAMPAS.padrao;
  const arquivo = resolverArquivo(capa);
  const { data, info } = await sharp(arquivo)
    .resize(colunas, colunas, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const linhas: string[] = [];
  const passo = rampa.length - 1;
  for (let y = 0; y < info.height; y++) {
    let linha = '';
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const v = opts.brilho === 'luma'
        ? (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
        : Math.max(r, g, b) / 255;
      linha += rampa[Math.floor(v * passo)];
    }
    linhas.push(linha);
  }
  return linhas;
}

function resolverArquivo(capa: { src: string; fsPath?: string }): string {
  if (capa.fsPath) return capa.fsPath;
  // Em dev o src vem como /@fs/caminho/absoluto?origWidth=...
  const limpo = decodeURIComponent(capa.src.split('?')[0]);
  if (limpo.startsWith('/@fs/')) return limpo.slice(4);
  return path.resolve(limpo.replace(/^\//, ''));
}
