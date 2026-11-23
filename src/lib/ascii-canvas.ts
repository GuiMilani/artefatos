// Bit-by-bit reveal on a canvas:
// a bold font on a grid tighter than the glyphs (8px on 5px in the original),
// so characters overlap and read as texture rather than text.
// A single requestAnimationFrame loop draws a batch per frame, in an order shuffled by the seed.

import { RAMPS } from './ramps';
import type { FakeLevel } from './fake-level';

export type AsciiData = { lines: string[]; seed: number; accent: string; charset?: string };

/** What a playing sound passes to `breathe`. */
export type Breath = { level: FakeLevel; progress: number; t: number };

const FONT_RATIO = 1.6;
const DURATION_MS = 1400;
const ACCENT_SHARE = 0.025;

type Cell = { x: number; y: number; c: string; accent: boolean };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class AsciiCanvas {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private data: AsciiData | null = null;
  private size = 0;
  private revealing = false;
  private breathing = false;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private canvas: HTMLCanvasElement, private ink = '#000') {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas unavailable');
    this.ctx = ctx;
  }

  /** Resizes the canvas to a square of `px` CSS pixels. */
  resize(px: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.size = Math.floor(px);
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;
    this.canvas.width = Math.floor(this.size * dpr);
    this.canvas.height = Math.floor(this.size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.data) this.drawAll();
  }

  reveal(data: AsciiData) {
    cancelAnimationFrame(this.raf);
    this.data = data;
    this.clear();
    if (this.reducedMotion) return this.drawAll();

    const cells = this.cells(data);
    const rnd = mulberry32(data.seed);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    let done = 0;
    this.revealing = true;
    const start = performance.now();
    const step = (now: number) => {
      const target = Math.min(cells.length, Math.ceil(((now - start) / DURATION_MS) * cells.length));
      this.setFont();
      for (; done < target; done++) this.drawCell(cells[done]);
      if (done < cells.length) this.raf = requestAnimationFrame(step);
      else this.revealing = false;
    };
    this.raf = requestAnimationFrame(step);
  }

  /**
   * Redraws the cover shaken by a sound: characters move along the ramp in
   * proportion to the level of the column above them, most of all in a band
   * that travels down the image with the track's progress. Passing null puts
   * the cover back at rest.
   */
  breathe(b: Breath | null) {
    if (!this.data || this.revealing || this.reducedMotion) return;
    if (!b || b.level.energy < 0.02) {
      if (this.breathing) this.drawAll();
      this.breathing = false;
      return;
    }
    this.breathing = true;
    const d = this.data;
    const ramp = RAMPS[d.charset ?? 'default'] ?? RAMPS.default;
    const last = ramp.findIndex((c) => c === ' ') - 1; // darkest-to-lightest, spaces excluded
    const rows = d.lines.length;
    const band = b.progress * rows;
    const avg = b.level.average();
    const frame = Math.floor(b.t * 9);
    const energy = b.level.energy;

    this.clear();
    this.setFont();
    for (const k of this.cells(d)) {
      let c = k.c;
      let accent = k.accent;
      const near = Math.max(0, 1 - Math.abs(k.y - band) / 10);
      const push = b.level.at(k.x / d.lines[0].length) * energy * (0.35 + near * 1.6);
      const h = ((k.x * 73856093) ^ (k.y * 19349663) ^ frame) >>> 0;
      if ((h % 1000) / 1000 < push * 0.45) {
        const i = ramp.indexOf(c);
        if (i >= 0) c = ramp[Math.max(0, Math.min(last, i + ((h >> 10) & 1 ? -2 : 1)))];
      }
      if (near > 0.6 && h % 97 < avg * 6 * energy) accent = true;
      this.drawCell({ ...k, c, accent });
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.size, this.size);
  }

  private cache: { d: AsciiData; cells: Cell[] } | null = null;

  private cells(d: AsciiData): Cell[] {
    if (this.cache?.d === d) return this.cache.cells.slice();
    const rnd = mulberry32(d.seed ^ 0x9e3779b9);
    const out: Cell[] = [];
    d.lines.forEach((line, y) => {
      [...line].forEach((c, x) => {
        if (c !== ' ') out.push({ x, y, c, accent: rnd() < ACCENT_SHARE });
      });
    });
    this.cache = { d, cells: out };
    return out.slice();
  }

  private setFont() {
    const cell = this.size / this.data!.lines.length;
    this.ctx.font = `bold ${(cell * FONT_RATIO).toFixed(2)}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
    this.ctx.textBaseline = 'alphabetic';
  }

  private drawCell(k: Cell) {
    const d = this.data!;
    const cell = this.size / d.lines.length;
    this.ctx.fillStyle = k.accent ? d.accent : this.ink;
    this.ctx.fillText(k.c, k.x * cell, (k.y + 1) * cell);
  }

  private drawAll() {
    if (!this.data) return;
    this.clear();
    this.setFont();
    for (const k of this.cells(this.data)) this.drawCell(k);
  }
}
