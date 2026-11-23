import sharp from 'sharp';
import path from 'node:path';

import { RAMPS } from './ramps';

export { RAMPS };

export const COLUMNS = 120;

/**
 * Turns a cover image into lines of text at build time. The browser only
 * animates the reveal, so the index page downloads no images at all.
 */
export async function coverToAscii(
  cover: { src: string; fsPath?: string },
  opts: { charset?: string; brightness?: 'max' | 'luma'; columns?: number } = {},
): Promise<string[]> {
  const columns = opts.columns ?? COLUMNS;
  const ramp = RAMPS[opts.charset ?? 'default'] ?? RAMPS.default;
  const { data, info } = await sharp(resolveFile(cover))
    .resize(columns, columns, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const lines: string[] = [];
  const steps = ramp.length - 1;
  for (let y = 0; y < info.height; y++) {
    let line = '';
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const v = opts.brightness === 'luma'
        ? (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
        : Math.max(r, g, b) / 255;
      line += ramp[Math.floor(v * steps)];
    }
    lines.push(line);
  }
  return lines;
}

function resolveFile(cover: { src: string; fsPath?: string }): string {
  if (cover.fsPath) return cover.fsPath;
  // In dev the src looks like /@fs/absolute/path?origWidth=...
  const clean = decodeURIComponent(cover.src.split('?')[0]);
  if (clean.startsWith('/@fs/')) return clean.slice(4);
  return path.resolve(clean.replace(/^\//, ''));
}
