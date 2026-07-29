// Générateur pseudo-aléatoire déterministe (mulberry32).
// L'état tient dans un seul entier 32 bits : la sauvegarde est donc exacte,
// et rejouer la même partie depuis la même graine donne le même monde.

export class Rng {
  constructor(seed = 1) {
    this.s = seed >>> 0;
  }

  u32() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Flottant dans [0, 1) */
  f() {
    return this.u32() / 4294967296;
  }

  /** Entier dans [0, n) */
  int(n) {
    return Math.floor(this.f() * n);
  }

  /** Entier dans [a, b] inclus */
  irange(a, b) {
    if (b < a) return a;
    return a + this.int(b - a + 1);
  }

  /** Flottant dans [a, b) */
  range(a, b) {
    return a + this.f() * (b - a);
  }

  chance(p) {
    return this.f() < p;
  }

  pick(arr) {
    return arr[this.int(arr.length)];
  }

  /** Tirage pondéré : [[valeur, poids], ...] */
  weighted(entries) {
    let total = 0;
    for (const e of entries) total += e[1];
    if (total <= 0) return entries.length ? entries[0][0] : null;
    let r = this.f() * total;
    for (const e of entries) {
      r -= e[1];
      if (r <= 0) return e[0];
    }
    return entries[entries.length - 1][0];
  }

  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /** Loi normale approchée (somme de 3 uniformes), bornée à ±3 écarts-types */
  gauss(mean = 0, sd = 1) {
    const u = (this.f() + this.f() + this.f()) / 3;
    return mean + (u - 0.5) * 3.464 * sd;
  }

  save() {
    return this.s >>> 0;
  }
}

/** Graine à partir d'une chaîne (pour les graines saisies par le joueur). */
export function seedFromString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
