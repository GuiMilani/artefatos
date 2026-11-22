// Texto datilografado letra por letra, com cursor de bloco (como a tag do year0001).
const timers = new WeakMap<HTMLElement, number>();

export function datilografar(el: HTMLElement, texto: string, msPorLetra = 28) {
  const anterior = timers.get(el);
  if (anterior) clearInterval(anterior);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = texto;
    return;
  }
  let i = 0;
  el.textContent = '';
  const t = window.setInterval(() => {
    el.textContent = texto.slice(0, ++i);
    if (i >= texto.length) clearInterval(t);
  }, msPorLetra);
  timers.set(el, t);
}
