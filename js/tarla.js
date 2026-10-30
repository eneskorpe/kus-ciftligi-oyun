// Tohum Tarlası'nda ekinler: ekilince arsanın sıralarında minik filizler belirir, süre ilerledikçe büyür,
// hasada hazır olunca başları (darı salkımı, ayçiçeği, kenevir yaprağı) görünür ve rüzgârda hafifçe sallanır.
// Hasat balonunun ikonu (ui_hasat) Gemini ikonu gelene kadar emojiden çizilir.
import { D, simdi } from './durum.js';
import { lerpN } from './izo.js';

const CIZGI = 0x3a2a35;
const RENK = { dari: [0x8fbf4a, 0xe8c25a], aycicek: [0x6fae45, 0xffcf3a], kenevir: [0x5d9e3e, 0x7cc35a] };

function bitkiCiz(g, ekin) {
  const [sap, bas] = RENK[ekin];
  g.lineStyle(4, CIZGI); g.lineBetween(0, 0, 0, -26);
  g.lineStyle(2.5, sap); g.lineBetween(0, 0, 0, -26);
  g.fillStyle(CIZGI); g.fillEllipse(-7, -12, 13, 7); g.fillEllipse(7, -16, 13, 7);
  g.fillStyle(sap); g.fillEllipse(-7, -12, 10, 5); g.fillEllipse(7, -16, 10, 5);
  if (ekin === 'aycicek') { // sarı taç yapraklar, kahve göbek
    g.fillStyle(CIZGI); g.fillCircle(0, -30, 10);
    g.fillStyle(bas); for (let a = 0; a < 8; a++) g.fillCircle(Math.cos(a * 0.785) * 5.5, -30 + Math.sin(a * 0.785) * 5.5, 4);
    g.fillStyle(0x7a4f2e); g.fillCircle(0, -30, 4);
  } else if (ekin === 'dari') { // sarkık altın salkım
    g.fillStyle(CIZGI); g.fillEllipse(4, -30, 10, 18);
    g.fillStyle(bas); g.fillEllipse(4, -30, 7, 15);
  } else { // kenevir: yelpaze yaprak
    g.fillStyle(CIZGI); for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) g.fillEllipse(Math.sin(a) * 8, -30 - Math.cos(a) * 5, 6, 14);
    g.fillStyle(bas); for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) g.fillEllipse(Math.sin(a) * 8, -30 - Math.cos(a) * 5, 4, 11);
  }
}

export function tarlaKur(sahne) {
  if (!sahne.textures.exists('ui_hasat')) { // hasat balonu ikonu
    const c = sahne.textures.createCanvas('ui_hasat', 128, 128), x = c.getContext();
    x.font = '96px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('🌾', 64, 70); c.refresh();
  }
  const b = sahne.binalar.find((x) => x.tip === 'tarla' && !x.temel);
  if (!b) return () => {};
  // Arsanın iç kısmında 4 sıra × 5 bitki
  const k = b.k, m = lerpN(k.ust, k.alt, 0.5), ic = (n) => ({ x: m.x + (n.x - m.x) * 0.72, y: m.y + (n.y - m.y) * 0.72 });
  const [U, S, A, L] = [ic(k.ust), ic(k.sag), ic(k.alt), ic(k.sol)];
  const noktalar = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const u = (r + 0.5) / 4, v = (c + 0.5) / 5;
    noktalar.push(lerpN(lerpN(L, U, v), lerpN(A, S, v), u));
  }
  let ekin = null, bitkiler = [];
  return () => {
    const T = D.tarla;
    if ((T && T.ekin) !== ekin) { // ekin değişti: bitkileri yeniden çiz
      bitkiler.forEach((g) => g.destroy());
      ekin = T && T.ekin;
      bitkiler = ekin ? noktalar.map((p) => { const g = sahne.add.graphics().setPosition(p.x, p.y).setDepth(b.nesne.depth + 1 + (p.y - k.ust.y) * 0.001); bitkiCiz(g, ekin); return g; }) : []; // arsanın üstünde, arkadakiler önce
    }
    if (!T) return;
    const oran = Math.min(1, (simdi() - T.bas) / Math.max(1, T.bitis - T.bas)), z = sahne.time.now / 1000;
    bitkiler.forEach((g, n) => {
      g.setScale(0.25 + 0.75 * oran);
      g.rotation = oran >= 1 ? Math.sin(z * 1.6 + n * 0.7) * 0.08 : 0; // olgun başaklar rüzgârda
    });
  };
}
