// Köyde rahatsız kuşlar belli olur: nezle olan ara sıra hapşırır (kısa sarsılma ve buhar), tüy döken kuştan
// tüyler süzülür, halsiz kuşun başının üstünde "z" harfleri uçar. Kuralları mekanik.js'de (RAHATSIZLIKLAR).
import { D } from './durum.js';

const r = (a, b) => a + Math.random() * (b - a);

export function rahatsizlikKur(sahne) {
  const hapsir = (kus) => {
    const o = kus.kok.scaleY, x = kus.kok.x, y = kus.kok.y - 48 * kus.carpan / 0.29;
    sahne.tweens.add({ targets: kus.kok, scaleY: o * 0.88, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    for (let n = 0; n < 4; n++) {
      const p = sahne.add.ellipse(x + kus.p.yon * 14, y, 7, 5, 0xffffff, 0.85).setDepth(kus.kok.depth + 1);
      sahne.tweens.add({ targets: p, x: p.x + kus.p.yon * r(14, 26), y: p.y + r(-10, 6), scale: 2, alpha: 0, duration: r(400, 650), onComplete: () => p.destroy() });
    }
  };
  const tuyDok = (kus) => {
    const x = kus.kok.x + r(-8, 8), y = kus.kok.y - 26 * kus.carpan / 0.29;
    const t = sahne.add.ellipse(x, y, 4, 10, 0xf3e3c3).setStrokeStyle(1, 0x3a2a35, 0.6).setDepth(kus.kok.depth + 1).setAngle(r(-40, 40));
    sahne.tweens.add({ targets: t, y: kus.kok.y + 2, x: x + r(-14, 14), angle: t.angle + r(-120, 120), duration: r(1200, 1700), ease: 'Sine.easeInOut',
      onComplete: () => sahne.tweens.add({ targets: t, alpha: 0, duration: 500, onComplete: () => t.destroy() }) });
  };
  const uyukla = (kus) => {
    const z = sahne.add.text(kus.kok.x + 10, kus.kok.y - 50 * kus.carpan / 0.29, 'z', { fontFamily: 'Nunito, system-ui', fontSize: '18px', fontStyle: '800', color: '#6b7fbf' })
      .setOrigin(0.5).setDepth(kus.kok.depth + 1).setAlpha(0);
    sahne.tweens.add({ targets: z, x: z.x + 16, y: z.y - 26, alpha: { from: 1, to: 0 }, scale: 1.6, duration: 1600, onComplete: () => z.destroy() });
  };
  const ETKI = { nezle: [hapsir, 5000, 9000], tuy: [tuyDok, 1800, 3200], halsiz: [uyukla, 2500, 4000] };
  return (dt) => {
    for (const kus of sahne.kuslar || []) {
      const k = D.kuslar.find((x) => x.id === kus.id);
      if (!k || !k.hasta || !kus.kok.visible) continue;
      const [f, a, b] = ETKI[k.hasta.tur];
      kus.rahatsizSayac = (kus.rahatsizSayac ?? r(a, b)) - dt;
      if (kus.rahatsizSayac <= 0) { kus.rahatsizSayac = r(a, b); f(kus); }
    }
  };
}
