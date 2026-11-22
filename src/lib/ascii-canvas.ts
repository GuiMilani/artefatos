// Revelação "bit a bit" no canvas, inspirada no year0001:
// fonte bold numa grade mais apertada que a letra (8px em 5px no original),
// então os caracteres se sobrepõem e viram textura.
// Diferente do original (um timer por caractere), aqui é um único loop de
// requestAnimationFrame que desenha um lote por quadro, numa ordem embaralhada pela seed.

export type DadosAscii = { linhas: string[]; seed: number; acento: string };

const PROPORCAO_FONTE = 1.6; // 8px / 5px
const DURACAO_MS = 1400;
const FRACAO_ACENTO = 0.025;

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
  private dados: DadosAscii | null = null;
  private tamanho = 0;
  private reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private canvas: HTMLCanvasElement, private cor = '#000') {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d indisponível');
    this.ctx = ctx;
  }

  /** Ajusta o canvas a um quadrado de `px` pixels CSS. */
  redimensionar(px: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.tamanho = Math.floor(px);
    this.canvas.style.width = `${this.tamanho}px`;
    this.canvas.style.height = `${this.tamanho}px`;
    this.canvas.width = Math.floor(this.tamanho * dpr);
    this.canvas.height = Math.floor(this.tamanho * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.dados) this.desenharTudo();
  }

  revelar(dados: DadosAscii) {
    cancelAnimationFrame(this.raf);
    this.dados = dados;
    this.limpar();
    if (this.reduzirMovimento) return this.desenharTudo();

    const celulas = this.celulas(dados);
    const rnd = mulberry32(dados.seed);
    for (let i = celulas.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [celulas[i], celulas[j]] = [celulas[j], celulas[i]];
    }

    let feito = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const alvo = Math.min(celulas.length, Math.ceil(((agora - inicio) / DURACAO_MS) * celulas.length));
      this.prepararFonte();
      for (; feito < alvo; feito++) this.desenharCelula(celulas[feito]);
      if (feito < celulas.length) this.raf = requestAnimationFrame(passo);
    };
    this.raf = requestAnimationFrame(passo);
  }

  limpar() {
    this.ctx.clearRect(0, 0, this.tamanho, this.tamanho);
  }

  private celulas(d: DadosAscii) {
    const rnd = mulberry32(d.seed ^ 0x9e3779b9);
    const out: { x: number; y: number; c: string; acento: boolean }[] = [];
    d.linhas.forEach((linha, y) => {
      [...linha].forEach((c, x) => {
        if (c !== ' ') out.push({ x, y, c, acento: rnd() < FRACAO_ACENTO });
      });
    });
    return out;
  }

  private prepararFonte() {
    const d = this.dados!;
    const cel = this.tamanho / d.linhas.length;
    this.ctx.font = `bold ${(cel * PROPORCAO_FONTE).toFixed(2)}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
    this.ctx.textBaseline = 'alphabetic';
  }

  private desenharCelula(k: { x: number; y: number; c: string; acento: boolean }) {
    const d = this.dados!;
    const cel = this.tamanho / d.linhas.length;
    this.ctx.fillStyle = k.acento ? d.acento : this.cor;
    this.ctx.fillText(k.c, k.x * cel, (k.y + 1) * cel);
  }

  private desenharTudo() {
    if (!this.dados) return;
    this.limpar();
    this.prepararFonte();
    for (const k of this.celulas(this.dados)) this.desenharCelula(k);
  }
}
