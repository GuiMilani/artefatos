// Page refresh flash for every internal navigation.
//
// A pared-down take on the e-ink transition (eink.ts): no image, just the
// screen dropping to negative for a beat, like an e-reader turning a page.
// The leaving page inverts and stays inverted until the browser swaps it;
// the arriving page opens in negative and snaps back (global.css,
// html.flash-arrival), also when it is reached with back/forward. Special artifacts keep their own transition.

const HOLD = 90; // ms the leaving page sits in negative before navigating

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let leaving = false;

export function flashTo(url: string) {
  if (leaving) return;
  if (reduced()) {
    window.location.href = url;
    return;
  }
  leaving = true;
  const layer = document.createElement('div');
  layer.className = 'flash-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  try { sessionStorage.setItem('flash-arrival', '1'); } catch { /* no arrival flash */ }
  setTimeout(() => { window.location.href = url; }, HOLD);
}

function internal(a: HTMLAnchorElement) {
  if (a.target && a.target !== '_self') return false;
  if (a.hasAttribute('download') || a.hasAttribute('data-special')) return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return false;
  // same page, only the hash changes: no navigation to dress up
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
  return true;
}

export function installFlash() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!a || !internal(a)) return;
    e.preventDefault();
    flashTo(a.href);
  });
  // Leaving by the browser's own buttons (back, forward, refresh): no time
  // to hold, but the page goes negative while the browser takes over.
  window.addEventListener('beforeunload', () => {
    if (leaving || reduced()) return;
    const layer = document.createElement('div');
    layer.className = 'flash-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  });
  // Back/forward can restore the page from memory, as it was left (maybe
  // still inverted): drop the leaving layer and flash in like any arrival.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.querySelectorAll('.flash-layer').forEach((n) => n.remove());
    leaving = false;
    (window as unknown as { __flashIn?: () => void }).__flashIn?.();
  });
}
