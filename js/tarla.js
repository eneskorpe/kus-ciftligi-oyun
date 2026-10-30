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

// Gemini ikonu gelene kadar balon ikonu emojiden çizilir
function emojiDoku(sahne, ad, emoji) {
  if (sahne.textures.exists(ad)) return;
  const c = sahne.textures.createCanvas(ad, 128, 128), x = c.getContext();
  x.font = '96px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(emoji, 64, 70); c.refresh();
}

// Değirmenin kanatları: görseli gelene kadar geçici çizimin çatısında döner; öğütürken hızlı, boşta ağır ağır
export function degirmenKur(sahne) {
  const b = sahne.binalar.find((x) => x.tip === 'degirmen' && !x.temel);
  if (!b || b.nesne.type === 'Image') return () => {};
  const g = sahne.add.graphics().setPosition(b.tepe.x, b.tepe.y + 34).setDepth(b.nesne.depth + 2);
  for (let n = 0; n < 4; n++) {
    const a = n * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), p = (u, v) => ({ x: c * u - s * v, y: s * u + c * v });
    g.lineStyle(7, CIZGI); g.lineBetween(0, 0, c * 62, s * 62);
    g.lineStyle(4, 0x9a6b3f); g.lineBetween(0, 0, c * 62, s * 62);
    g.fillStyle(CIZGI); g.fillPoints([p(14, 2), p(62, 2), p(62, 18), p(14, 14)], true);
    g.fillStyle(0xfff3dc); g.fillPoints([p(16, 4), p(60, 4), p(60, 16), p(16, 12)], true);
  }
  g.fillStyle(CIZGI); g.fillCircle(0, 0, 8); g.fillStyle(0xc4553f); g.fillCircle(0, 0, 5);
  return (dt) => { g.rotation += (D.degirmen && simdi() < D.degirmen.bitis ? 3 : 0.35) * dt / 1000; };
}

export function tarlaKur(sahne) {
  emojiDoku(sahne, 'ui_hasat', '🌾'); // hasat balonu ikonu
  emojiDoku(sahne, 'ui_un', '🥣'); // değirmende ürün hazır
  emojiDoku(sahne, 'ui_siparis', '📜'); // teslim edilebilecek sipariş var
  emojiDoku(sahne, 'ui_yavru', '🐤'); // kreşte büyüyen yavru hazır
  emojiDoku(sahne, 'ui_biberon', '🍼'); // kreşte yavru acıktı
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
