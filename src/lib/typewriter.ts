// Types text letter by letter. `msPerLetter` 0 writes it at once.
const timers = new WeakMap<HTMLElement, number>();

export function typewrite(el: HTMLElement, text: string, msPerLetter = 28, done?: () => void) {
  const previous = timers.get(el);
  if (previous) clearInterval(previous);
  timers.delete(el);
  if (msPerLetter <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = text;
    done?.();
    return;
  }
  let i = 0;
  el.textContent = '';
  const t = window.setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) {
      clearInterval(t);
      timers.delete(el);
      done?.();
    }
  }, msPerLetter);
  timers.set(el, t);
}
