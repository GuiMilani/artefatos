// Bit-by-bit reveal on a canvas:
// a bold font on a grid tighter than the glyphs (8px on 5px in the original),
// so characters overlap and read as texture rather than text.
// A single requestAnimationFrame loop draws a batch per frame, in an order shuffled by the seed.

export type AsciiData = { lines: string[]; seed: number; accent: string };

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
    const start = performance.now();
    const step = (now: number) => {
      const target = Math.min(cells.length, Math.ceil(((now - start) / DURATION_MS) * cells.length));
      this.setFont();
      for (; done < target; done++) this.drawCell(cells[done]);
      if (done < cells.length) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.size, this.size);
  }

  private cells(d: AsciiData): Cell[] {
    const rnd = mulberry32(d.seed ^ 0x9e3779b9);
    const out: Cell[] = [];
    d.lines.forEach((line, y) => {
      [...line].forEach((c, x) => {
        if (c !== ' ') out.push({ x, y, c, accent: rnd() < ACCENT_SHARE });
      });
    });
    return out;
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
