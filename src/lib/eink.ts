// E-ink transition for "special" artifacts.
//
// Tapping a link with data-special doesn't navigate straight away: the
// screen behaves like an e-reader waking from sleep. The page flashes
// inverted, goes black, goes white (with the old page still ghosting
// through), then a full-screen 1-bit image (the Maria Bonita photo, or a
// huge grin) refreshes in, band by band, each pixel passing through negative
// and black before it settles. Then the artifact opens and that image fades
// softly off it (the arrival is in Base.astro/global.css).

const INK = [27, 27, 27];
const PAPER = [230, 230, 225];

// ms from the tap
const T = {
  invert: 0,      // page shown in negative
  black: 110,     // full black
  white: 230,     // white, old page ghosting through
  draw: 340,      // band refresh of the grin starts
  sweep: 520,     // time for the refresh to travel top to bottom
  pixel: 240,     // one pixel's negative -> black -> image
  glitch: 1450,   // a few blocks flicker while it holds
  end: 1950,      // navigate
};

// 4x4 ordered dither, the classic e-ink greyscale
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** The grin, drawn at grid resolution and dithered to 1 bit (1 = ink). */
function grin(cols: number, rows: number): Uint8Array {
  const c = document.createElement('canvas');
  c.width = cols;
  c.height = rows;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, cols, rows);

  // The mouth is a crescent in a box that fills the screen: as wide as a
  // phone (a little wider), and on a tall screen it opens into a huge maw.
  const bw = Math.min(cols * 1.06, rows * 1.7);
  const bh = Math.min(rows * 0.66, bw * 1.05);
  const left = (cols - bw) / 2;
  const boxTop = rows / 2 - bh * 0.56;
  const s = bh; // line weights and blur
  const X = (u: number) => left + ((u + 1) / 2) * bw;
  const top = (u: number) => boxTop + bh * (0.04 + 0.42 * (1 - u * u));
  const bot = (u: number) => boxTop + bh * (0.04 + 0.96 * Math.pow(Math.max(0, 1 - u * u), 0.55));
  const open = (u: number) => bot(u) - top(u);
  const N = 80;

  const mouth = new Path2D();
  for (let i = 0; i <= N; i++) {
    const u = -1 + (2 * i) / N;
    i ? mouth.lineTo(X(u), top(u)) : mouth.moveTo(X(u), top(u));
  }
  for (let i = N; i >= 0; i--) {
    const u = -1 + (2 * i) / N;
    mouth.lineTo(X(u), bot(u));
  }
  mouth.closePath();

  // faint dithered halo, like ink bled into the paper
  g.save();
  g.filter = `blur(${Math.max(1.5, s * 0.025)}px)`;
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fill(mouth);
  g.restore();

  g.fillStyle = '#000';
  g.fill(mouth);

  // teeth: sharp, interlocking, top row bites down, bottom row bites up
  const tooth = (u0: number, u1: number, down: boolean) => {
    const um = (u0 + u1) / 2;
    const gap = (u1 - u0) * 0.14;
    const a = u0 + gap;
    const b = u1 - gap;
    const edge = down ? top : bot;
    const depth = open(um) * (down ? 0.5 : 0.38) * (down ? 1 : -1);
    const p = new Path2D();
    p.moveTo(X(a), edge(a) + (down ? 1 : -1));
    p.lineTo(X(b), edge(b) + (down ? 1 : -1));
    p.lineTo(X(um), edge(um) + depth);
    p.closePath();
    // white at the gum, greying towards the tip
    const grad = g.createLinearGradient(0, edge(um), 0, edge(um) + depth);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.55, '#f2f2f2');
    grad.addColorStop(1, '#8a8a8a');
    g.fillStyle = grad;
    g.fill(p);
  };
  const upper = 9;
  for (let i = 0; i < upper; i++) {
    const u0 = -0.9 + (1.8 * i) / upper;
    tooth(u0, u0 + 1.8 / upper, true);
  }
  const lower = 8;
  for (let i = 0; i < lower; i++) {
    const u0 = -0.83 + (1.66 * i) / lower;
    tooth(u0, u0 + 1.66 / lower, false);
  }

  // lip line and the creases at the corners
  g.lineWidth = Math.max(1.5, s * 0.03);
  g.lineCap = 'round';
  g.strokeStyle = '#000';
  g.stroke(mouth);
  for (const side of [-1, 1]) {
    // a short crease curling up past each corner
    const x = X(side);
    const y = top(1);
    g.beginPath();
    g.moveTo(x - side * bw * 0.015, y + bh * 0.06);
    g.quadraticCurveTo(x + side * bw * 0.03, y + bh * 0.02, x + side * bw * 0.02, y - bh * 0.07);
    g.stroke();
  }

  const px = g.getImageData(0, 0, cols, rows).data;
  const out = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const darkness = 1 - px[i * 4] / 255;
      out[i] = darkness > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0;
    }
  }
  return out;
}

/**
 * A photo, cropped to cover the screen around a focal point and dithered to
 * 1 bit with Atkinson's error diffusion (the old Mac look; it keeps the
 * highlights open, like e-paper).
 */
function photo(cols: number, rows: number, img: HTMLImageElement, fx: number, fy: number): Uint8Array {
  const c = document.createElement('canvas');
  c.width = cols;
  c.height = rows;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const scale = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = Math.min(0, Math.max(cols - w, cols / 2 - fx * w));
  const y = Math.min(0, Math.max(rows - h, rows / 2 - fy * h));
  g.filter = 'grayscale(1) contrast(1.15)';
  g.drawImage(img, x, y, w, h);
  const px = g.getImageData(0, 0, cols, rows).data;
  const v = new Float32Array(cols * rows);
  for (let i = 0; i < v.length; i++) v[i] = px[i * 4] / 255;
  const out = new Uint8Array(cols * rows);
  const spread = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
  for (let yy = 0; yy < rows; yy++) {
    for (let xx = 0; xx < cols; xx++) {
      const i = yy * cols + xx;
      const ink = v[i] < 0.5;
      out[i] = ink ? 1 : 0;
      const err = (v[i] - (ink ? 0 : 1)) / 8;
      for (const [dx, dy] of spread) {
        const nx = xx + dx;
        const ny = yy + dy;
        if (nx >= 0 && nx < cols && ny < rows) v[ny * cols + nx] += err;
      }
    }
  }
  return out;
}

// The images a special artifact can open with: data-special="<name>".
const IMAGES: Record<string, { src?: string; fx?: number; fy?: number; cells: number }> = {
  'maria-bonita': { src: 'eink/maria-bonita.jpg', fx: 0.48, fy: 0.3, cells: 200 }, // focal point: her face
  grin: { cells: 130 },
};
const loaded = new Map<string, Promise<HTMLImageElement>>();
function load(src: string) {
  let p = loaded.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = import.meta.env.BASE_URL + src;
    });
    loaded.set(src, p);
  }
  return p;
}

function hash(n: number) {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let running = false;

/** Hand the last image to the next page, which fades it off (Base.astro). */
function go(url: string, canvas: HTMLCanvasElement, w: number, h: number) {
  try {
    sessionStorage.setItem('eink-arrival', JSON.stringify({ src: canvas.toDataURL('image/png'), w, h }));
  } catch { /* private mode: plain arrival */ }
  window.location.href = url;
}

export async function einkTo(url: string, name = 'maria-bonita') {
  if (running) return;
  if (reduced()) {
    window.location.href = url;
    return;
  }
  running = true;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);

  const spec = IMAGES[name] ?? IMAGES['maria-bonita'];
  let source: HTMLImageElement | null = null;
  if (spec.src) {
    try { source = await load(spec.src); } catch { /* falls back to the grin */ }
  }

  const W = window.innerWidth;
  const H = window.innerHeight;
  // a photo needs finer pixels than the grin to keep a face
  const cell = Math.max(source ? 2 : 3, Math.round(Math.min(W, H) / (source ? spec.cells : 130)));
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);

  const layer = document.createElement('div');
  layer.className = 'eink-layer';
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {
    position: 'fixed', inset: '0', zIndex: '1000', pointerEvents: 'auto',
    backdropFilter: 'invert(1) grayscale(1)', webkitBackdropFilter: 'invert(1) grayscale(1)',
  });
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  Object.assign(canvas.style, {
    position: 'absolute', left: '0', top: '0',
    width: `${cols * cell}px`, height: `${rows * cell}px`, imageRendering: 'pixelated',
  });
  layer.appendChild(canvas);
  document.body.appendChild(layer);

  const g = canvas.getContext('2d')!;
  const img = g.createImageData(cols, rows);
  const d = img.data;
  const target = source ? photo(cols, rows, source, spec.fx ?? 0.5, spec.fy ?? 0.5) : grin(cols, rows);
  const seed = (Math.random() * 1e9) | 0;

  // when each pixel starts refreshing: a sweep down the screen, broken up
  // into 8x8 blocks that lag a little, like a partial-refresh waveform
  const delay = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const block = hash(seed + (y >> 3) * 977 + (x >> 3));
      delay[y * cols + x] = (y / rows) * T.sweep + block * 130 + hash(seed ^ (y * 131 + x)) * 18;
    }
  }

  const put = (i: number, ink: boolean, alpha = 255) => {
    const c = ink ? INK : PAPER;
    d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = alpha;
  };
  const fill = (ink: boolean, alpha = 255) => { for (let i = 0; i < cols * rows; i++) put(i, ink, alpha); };

  const slow = (window as unknown as { __einkSlow?: number }).__einkSlow ?? 1;
  const start = performance.now();
  let glitch: Set<number> | null = null;

  const frame = (now: number) => {
    const t = (now - start) / slow;

    if (t < T.black) {
      // the page itself in negative (backdrop filter), nothing drawn yet
    } else if (t < T.white) {
      layer.style.backdropFilter = layer.style.webkitBackdropFilter = 'grayscale(1)';
      fill(true);
    } else if (t < T.draw) {
      fill(false, 232); // translucent white: the old page ghosts through
    } else {
      if (t > T.glitch && t < T.glitch + 70 && !glitch) {
        glitch = new Set();
        for (let k = 0; k < 6; k++) glitch.add(Math.floor(hash(seed + k * 7919) * (cols >> 3) * (rows >> 3)));
      }
      if (t >= T.glitch + 70) glitch = null;
      const bcols = cols >> 3;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const lt = t - T.draw - delay[i];
          const on = target[i] === 1;
          if (lt < 0) put(i, false, 232 + Math.min(23, (t - T.draw) / 30));
          else if (lt < T.pixel / 3) put(i, !on);        // negative
          else if (lt < (2 * T.pixel) / 3) put(i, true); // black
          else if (glitch && glitch.has((y >> 3) * bcols + (x >> 3))) put(i, !on);
          else put(i, on);
        }
      }
    }
    g.putImageData(img, 0, 0);

    if (t < T.end) requestAnimationFrame(frame);
    else go(url, canvas, cols * cell, rows * cell);
  };
  requestAnimationFrame(frame);
}

/**
 * Any <a data-special> on the page runs the transition. Handlers that
 * already took the click (preventDefault) win, e.g. the index scrolling an
 * inactive row to the reading line.
 */
export function installEink() {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[data-special]')];
  if (!links.length) return;
  if (!reduced()) {
    for (const a of links) {
      const src = IMAGES[a.dataset.special!]?.src;
      if (src) load(src).catch(() => {});
    }
  }
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-special]');
    if (!a) return;
    e.preventDefault();
    einkTo(a.href, a.dataset.special);
  });
  // Back button restores this page as it was left, under the layer: drop it.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.querySelectorAll('.eink-layer').forEach((n) => n.remove());
    running = false;
  });
}
