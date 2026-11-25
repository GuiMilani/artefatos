// Ink transition for "special" artifacts.
//
// A link with data-ink="<mark>" doesn't navigate straight away: an identity
// mark (Death's cloak, the dark chao stencil) blooms out of the tap like ink
// soaking into paper, with stencil overspray around it, then floods the
// screen. The next page opens on that black and fades in (see Base.astro).
//
// The mark is a signed-distance PNG in /public/ink/ (0.5 = the edge), so the
// shader can grow it, rough up its edge and spray dots around it for free.

const DURATION = 2300; // ms, tap to navigation
const FLOOD_AT = 0.56; // share of the timeline when the flood starts

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform sampler2D uMask;
uniform vec2 uRes;      // canvas px
uniform vec2 uFrom;     // tap, px (y down)
uniform float uT;       // 0..1
uniform float uSeed;
uniform float uFlood;   // where the flood starts in the timeline

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
float easeOut(float x) { return 1.0 - pow(1.0 - clamp(x, 0.0, 1.0), 3.0); }

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float m = min(uRes.x, uRes.y);
  float t = uT;

  // --- the mark: grows from the tap and drifts to the middle of the screen
  float grow = easeOut(t / uFlood);
  vec2 centre = mix(uFrom, uRes * vec2(0.5, 0.46), easeOut(t / uFlood * 1.2));
  float size = mix(0.04, 1.12, grow) * m;
  vec2 uv = (px - centre) / size + 0.5;
  // the paper drags the ink: low-frequency wobble of the lookup
  uv += (vec2(fbm(px / m * 3.0 + t), fbm(px / m * 3.0 - t + 9.0)) - 0.5) * 0.035;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float d = texture2D(uMask, uv).r * inside;    // 0.5 = edge, 1 = deep inside

  // ragged, fibrous edge; it bleeds a little while it settles
  float grain = fbm(px / m * 22.0) - 0.5;
  float fibre = noise(px * vec2(0.9, 0.18)) - 0.5;   // paper fibres run one way
  float bleed = 0.02 + 0.05 * smoothstep(0.25, 1.0, t / uFlood);
  float edge = d + grain * 0.16 + fibre * 0.05 + bleed;
  float ink = smoothstep(0.495, 0.515, edge);

  // stencil overspray: loose dots that thin out away from the edge
  vec2 cell = floor(px / 1.5);
  float spray = smoothstep(0.08, 0.5, d) * 0.55 * smoothstep(0.0, 0.35, t / uFlood);
  ink = max(ink, 1.0 - step(spray * spray, hash(cell)));

  // --- the flood: a darker wash takes the whole page from the mark outwards
  float f = clamp((t - uFlood) / (1.0 - uFlood), 0.0, 1.0);
  float far = length(px - centre) / length(uRes);   // 0 .. ~0.6
  float front = f * f * (3.0 - 2.0 * f) * 0.95 - far * 1.1 + d * 0.25
              + (fbm(px / m * 5.0 + f * 2.0) - 0.5) * 0.22;
  float flood = smoothstep(0.0, 0.02, front);
  // ahead of the front, a fine mist of dots
  flood = max(flood, 1.0 - step(smoothstep(-0.25, 0.0, front) * 0.6 * f, hash(cell + 3.1)));
  ink = max(ink, flood);

  // the first drop, so the tap answers at once
  float drop = smoothstep(0.0, 0.08, t) * (1.0 - grow) * 26.0;
  ink = max(ink, step(length(px - uFrom) + grain * 18.0, drop));

  // ink pools darker at its edges (coffee ring) and keeps a little grain
  float ring = smoothstep(0.62, 0.5, edge) * (1.0 - flood);
  float tone = 0.085 - ring * 0.06 + (hash(cell * 1.7) - 0.5) * 0.04;
  gl_FragColor = vec4(vec3(tone) * ink, ink);
}
`;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const base = import.meta.env.BASE_URL;
const masks = new Map<string, Promise<HTMLImageElement>>();

function loadMask(mark: string) {
  let p = masks.get(mark);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `${base}ink/ink-${mark}.png`;
    });
    masks.set(mark, p);
  }
  return p;
}

let running = false;

function arrive(url: string) {
  try { sessionStorage.setItem('ink-arrival', '1'); } catch { /* private mode: no fade-in */ }
  window.location.href = url;
}

function prefetch(url: string) {
  const l = document.createElement('link');
  l.rel = 'prefetch';
  l.href = url;
  document.head.appendChild(l);
}

/** Plain black fade, for when WebGL or the mask is not available. */
function fallback(layer: HTMLElement, url: string) {
  layer.style.background = '#161616';
  layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: 'forwards' })
    .finished.then(() => arrive(url));
}

export async function inkTo(url: string, mark: string, x: number, y: number) {
  if (running) return;
  if (reduced()) {
    window.location.href = url;
    return;
  }
  running = true;
  prefetch(url);

  const layer = document.createElement('div');
  layer.className = 'ink-layer';
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '1000', pointerEvents: 'auto' });
  document.body.appendChild(layer);

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
  layer.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  canvas.width = w;
  canvas.height = h;

  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  let img: HTMLImageElement;
  try {
    if (!gl) throw new Error('no webgl');
    img = await loadMask(mark);
  } catch {
    fallback(layer, url);
    return;
  }

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
  } catch {
    fallback(layer, url);
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);

  const u = (n: string) => gl.getUniformLocation(prog, n);
  gl.uniform2f(u('uRes'), w, h);
  gl.uniform2f(u('uFrom'), x * dpr, y * dpr);
  gl.uniform1f(u('uSeed'), Math.random());
  gl.uniform1f(u('uFlood'), FLOOD_AT);
  gl.uniform1i(u('uMask'), 0);
  const uT = u('uT');
  gl.viewport(0, 0, w, h);

  // window.__inkSlow stretches the timeline, to look at single frames
  const length = DURATION * ((window as unknown as { __inkSlow?: number }).__inkSlow ?? 1);
  const start = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / length);
    gl.uniform1f(uT, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (t < 1) requestAnimationFrame(frame);
    else {
      layer.style.background = '#161616';
      arrive(url);
    }
  };
  requestAnimationFrame(frame);
}

/** Warm the mask cache so the first frame isn't empty. */
export function preloadInk(marks: string[]) {
  if (reduced()) return;
  for (const m of new Set(marks)) loadMask(m).catch(() => {});
}

/**
 * Any <a data-ink="mark"> on the page runs the transition. Handlers that
 * already took the click (preventDefault) win, e.g. the index scrolling an
 * inactive row to the reading line.
 */
export function installInk() {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[data-ink]')];
  if (!links.length) return;
  preloadInk(links.map((a) => a.dataset.ink!));
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-ink]');
    if (!a) return;
    e.preventDefault();
    // keyboard activation has no pointer position: start from the link itself
    const r = a.getBoundingClientRect();
    const fromKeys = e.detail === 0;
    inkTo(a.href, a.dataset.ink!, fromKeys ? r.left + r.width / 2 : e.clientX, fromKeys ? r.top + r.height / 2 : e.clientY);
  });
  // Coming back through the back button restores this page as it was left,
  // under a black layer: take it away.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.querySelectorAll('.ink-layer').forEach((n) => n.remove());
    running = false;
  });
}
