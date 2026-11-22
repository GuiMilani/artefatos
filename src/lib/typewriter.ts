// Types text letter by letter.
const timers = new WeakMap<HTMLElement, number>();

export function typewrite(el: HTMLElement, text: string, msPerLetter = 28) {
  const previous = timers.get(el);
  if (previous) clearInterval(previous);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = text;
    return;
  }
  let i = 0;
  el.textContent = '';
  const t = window.setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(t);
  }, msPerLetter);
  timers.set(el, t);
}
