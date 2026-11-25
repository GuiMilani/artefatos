// A level meter that never reads the audio. Each column swings between a floor
// and its own random peak, with its own period and phase, so the motion looks
// like sound without analysing any. `energy` eases in on play and out on pause.

const FLOOR = 0.25;
const ATTACK_S = 0.08;
const RELEASE_S = 0.45;

type Column = { peak: number; period: number; phase: number; v: number };

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

export class FakeLevel {
  readonly columns: Column[];
  energy = 0;

  constructor(count: number, seed = 7) {
    const rnd = mulberry32(seed);
    this.columns = Array.from({ length: count }, () => ({
      peak: FLOOR + rnd() * (1 - FLOOR),
      period: 0.42 + rnd() * 0.22, // seconds per swing, never shared
      phase: rnd(),
      v: 0,
    }));
  }

  /** Advances by `dt` seconds at time `t` (seconds). */
  update(t: number, dt: number, playing: boolean) {
    const tau = playing ? ATTACK_S : RELEASE_S;
    this.energy += ((playing ? 1 : 0) - this.energy) * (1 - Math.exp(-dt / tau));
    for (const c of this.columns) {
      const x = (t / c.period + c.phase) % 1;
      const tri = x < 0.5 ? x * 2 : 2 - x * 2; // linear, alternating
      const target = this.energy * (FLOOR + (c.peak - FLOOR) * tri);
      c.v += (target - c.v) * (target > c.v ? 0.6 : 0.18);
    }
  }

  /** Level of the column covering `u` in [0, 1). */
  at(u: number) {
    const i = Math.min(this.columns.length - 1, Math.max(0, Math.floor(u * this.columns.length)));
    return this.columns[i].v;
  }

  average() {
    return this.columns.reduce((s, c) => s + c.v, 0) / this.columns.length;
  }
}
