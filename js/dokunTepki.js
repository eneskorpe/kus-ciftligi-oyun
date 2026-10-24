// Dokununca tepki: oyuncuyu köyü kurcalamaya teşvik eden küçük sürprizler.
// Çalı ve ağaç hışırdar, ara sıra içinden kelebek ya da kuş uçar; çiçeğin yaprakları saçılır; gölete dokununca halka açılır.
import { cevreSesiCal, dokunmaSesi } from './ses.js';

const r = (a, b) => a + Math.random() * (b - a);
const CICEK = /cicek|gelincik|lavanta|aycicegi|kadife/;
const AGAC = /agac|fidan|sogut/;

function dokular(sahne) {
  if (sahne.textures.exists('tac_yaprak')) return;
  const g = sahne.add.graphics();
  g.fillStyle(0x3a2a35, 0.7); g.fillEllipse(7, 5, 14, 10); // çiçek yaprağı: ince koyu kenar + beyaz iç (renk tint ile)
  g.fillStyle(0xffffff); g.fillEllipse(7, 5, 11.5, 7.5);
  g.generateTexture('tac_yaprak', 14, 10); g.clear();
  g.fillStyle(0x7fc8f0); g.fillCircle(3, 3, 3); g.fillStyle(0xffffff); g.fillCircle(2.3, 2.3, 1.6); // su damlası
  g.generateTexture('damla', 6, 6); g.destroy();
}

// Görselin dokunulan noktası boş değilse (saydam değilse) true
function pikselVar(sahne, n, x, y) {
  if (!n || !n.visible || !n.frame || n.type !== 'Image') return false;
  if (!n.getBounds().contains(x, y)) return false;
  const p = n.getLocalPoint(x, y);
  let lx = p.x, ly = p.y;
  if (n.flipX) lx = n.frame.width - lx;
  if (lx < 0 || ly < 0 || lx >= n.frame.width || ly >= n.frame.height) return false;
  return sahne.textures.getPixelAlpha(Math.floor(lx), Math.floor(ly), n.texture.key, n.frame.name) > 60;
}

// Çiçek görselinin baskın (yeşil olmayan, en canlı) rengi; doku başına bir kez bulunur
const renkler = new Map();
function cicekRengi(sahne, n) {
  const key = n.texture.key;
  if (renkler.has(key)) return renkler.get(key);
  const f = n.frame, sayac = new Map();
  let beyaz = 0;
  for (let j = 0; j < 14; j++) for (let i = 0; i < 14; i++) {
    const c = sahne.textures.getPixel(Math.floor(f.width * (i + 0.5) / 14), Math.floor(f.height * 0.6 * (j + 0.5) / 14), key, f.name);
    if (!c || c.alpha < 200) continue;
    const { h, s, v } = c; // h 0-1
    if (s < 0.18 && v > 0.8) { beyaz++; continue; } // papatya gibi beyaz çiçekler
    if (s < 0.35 || v < 0.45 || (h > 0.18 && h < 0.45)) continue; // yeşil, gri, koyu pikselleri atla
    const kova = Math.round(h * 24) % 24;
    const k = sayac.get(kova) || { n: 0, renk: c.color & 0xffffff };
    k.n++; sayac.set(kova, k);
  }
  const en = [...sayac.values()].sort((a, b) => b.n - a.n)[0];
  const renk = en && en.n > beyaz ? en.renk : beyaz ? 0xffffff : 0xffb8d0;
  renkler.set(key, renk);
  return renk;
}

export function dokunmaTepkisiKur(sahne) {
  dokular(sahne);
  sahne.cicekRengi = (n) => cicekRengi(sahne, n); // deneme için
  const gunduz = () => !sahne.gunIsigi || sahne.gunIsigi.gece < 0.5;

  // Dokunulan bitkiyi bulur (en öndeki); yoksa null
  const bitkiBul = (x, y) => {
    const adaylar = (sahne.sallananlar || []).filter((s) => pikselVar(sahne, s.n, x, y));
    return adaylar.sort((a, b) => b.n.depth - a.n.depth)[0] || null;
  };

  const hisirt = (s, guc) => {
    s.tik = guc;
    sahne.tweens.add({ targets: s, tik: 0, duration: 650, ease: 'Sine.easeOut' });
  };

  const yapraklarDussun = (n, adet) => {
    if (!sahne.textures.exists('dekor_yaprak1')) return;
    const w = n.displayWidth, ust = n.y - n.displayHeight * n.originY;
    for (let i = 0; i < adet; i++) {
      const x = n.x + r(-0.3, 0.3) * w, y = ust + n.displayHeight * r(0.15, 0.5);
      const p = sahne.add.image(x, y, 'dekor_yaprak' + (1 + Math.floor(Math.random() * 4))).setDepth(96000).setAngle(r(0, 360)).setAlpha(0);
      p.setScale(r(13, 18) / p.width);
      const sure = r(1600, 2400);
      sahne.tweens.add({ targets: p, alpha: 1, duration: 150 });
      sahne.tweens.add({ targets: p, y: y + r(50, 90), duration: sure, ease: 'Sine.easeIn' });
      sahne.tweens.add({ targets: p, x: x + r(-30, 30), duration: sure / 3, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
      sahne.tweens.add({ targets: p, angle: p.angle + r(-200, 200), duration: sure });
      sahne.tweens.add({ targets: p, alpha: 0, delay: sure - 400, duration: 400, onComplete: () => p.destroy() });
    }
  };

  // Çalının içinden kelebek havalanır, kanat çırparak yukarı doğru uzaklaşır
  const kelebekCikar = (n) => {
    if (!sahne.textures.exists('dekor_kelebek1')) return;
    const x = n.x, y = n.y - n.displayHeight * 0.5, yon = Math.random() < 0.5 ? -1 : 1;
    const k = sahne.add.image(x, y, 'dekor_kelebek1').setOrigin(0.5, 0.75).setDepth(96000);
    const o = 30 / k.width;
    k.setScale(o * yon, o);
    const hedefX = x + yon * r(160, 260), hedefY = y - r(150, 230), sure = 2600;
    const ad = sahne.time.addEvent({ delay: 45, loop: true, callback: () => { ad.kare = ((ad.kare || 0) + 1) % 4; k.setTexture('dekor_kelebek' + [1, 2, 3, 2][ad.kare]); } });
    sahne.tweens.add({ targets: k, x: hedefX, duration: sure, ease: 'Sine.easeIn' });
    sahne.tweens.add({ targets: k, y: hedefY, duration: sure, ease: 'Sine.easeOut',
      onUpdate: (tw) => { k.y += Math.sin(tw.progress * 18) * 1.2; } });
    sahne.tweens.add({ targets: k, alpha: 0, delay: sure - 600, duration: 600, onComplete: () => { ad.remove(); k.destroy(); } });
  };

  // Ağacın tepesinden 1-3 küçük kuş çırpınarak havalanır (uzaktaki sürülerle aynı siluet), bir serçe cıvıldar
  const kuslarUcur = (n) => {
    if (!sahne.textures.exists('siluet')) return;
    const adet = 1 + Math.floor(Math.random() * 3), yon = Math.random() < 0.5 ? -1 : 1;
    const tepe = n.y - n.displayHeight * n.originY + n.displayHeight * 0.3;
    for (let i = 0; i < adet; i++) {
      const x = n.x + r(-0.25, 0.25) * n.displayWidth, y = tepe + r(-10, 20);
      const s = sahne.add.image(x, y, 'siluet').setDepth(97000).setAlpha(0).setScale(0.8);
      const faz = r(0, 6), hiz = r(14, 18), sure = r(2200, 3000);
      sahne.tweens.add({ targets: s, alpha: 0.85, duration: 120, delay: i * 140 });
      sahne.tweens.add({ targets: s, x: x + yon * r(280, 420), y: y - r(220, 320), scale: 0.5, duration: sure, delay: i * 140, ease: 'Quad.easeIn',
        onUpdate: () => { s.scaleY = s.scaleX * (0.4 + 0.6 * Math.abs(Math.sin(sahne.time.now / 1000 * hiz + faz))); } });
      sahne.tweens.add({ targets: s, alpha: 0, delay: i * 140 + sure - 500, duration: 500, onComplete: () => s.destroy() });
    }
    cevreSesiCal(sahne, 0.08);
  };

  // Çiçek: renkli taç yaprakları havaya saçılıp süzülerek düşer
  const yapraklarSac = (n, x, y) => {
    const renk = cicekRengi(sahne, n), adet = 7 + Math.floor(Math.random() * 4);
    const cy = Math.min(y, n.y - n.displayHeight * 0.45);
    for (let i = 0; i < adet; i++) {
      const p = sahne.add.image(x + r(-6, 6), cy + r(-6, 6), 'tac_yaprak').setTint(Math.random() < 0.8 ? renk : 0xffffff)
        .setDepth(96000).setAngle(r(0, 360)).setScale(r(0.7, 1.1));
      const a = -Math.PI / 2 + r(-1.2, 1.2), hiz = r(40, 80), tepeX = p.x + Math.cos(a) * hiz, tepeY = p.y + Math.sin(a) * hiz;
      const sure = r(1400, 2000);
      sahne.tweens.add({ targets: p, x: tepeX, y: tepeY, duration: 350, ease: 'Quad.easeOut', onComplete: () => {
        sahne.tweens.add({ targets: p, y: tepeY + r(60, 100), duration: sure, ease: 'Sine.easeIn' });
        sahne.tweens.add({ targets: p, x: tepeX + r(-20, 20), duration: sure / 4, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
        sahne.tweens.add({ targets: p, scaleY: 0.3, duration: 300, yoyo: true, repeat: -1 }); // dönerek süzülür
        sahne.tweens.add({ targets: p, alpha: 0, delay: sure - 400, duration: 400, onComplete: () => { sahne.tweens.killTweensOf(p); p.destroy(); } });
      } });
    }
  };

  // Gölet: büyük halka, ardından iki küçük halka ve sıçrayan damlalar
  const suyaDokun = (x, y) => {
    if (sahne.halka) {
      sahne.halka(x, y, 44);
      sahne.time.delayedCall(220, () => sahne.halka(x + r(-4, 4), y + r(-2, 2), 30));
      sahne.time.delayedCall(480, () => sahne.halka(x + r(-6, 6), y + r(-3, 3), true));
    }
    for (let i = 0; i < 6; i++) {
      const d = sahne.add.image(x, y, 'damla').setDepth(96000).setScale(r(0.6, 1));
      const dx = r(-28, 28), h = r(18, 34), sure = r(380, 520);
      sahne.tweens.add({ targets: d, x: x + dx, duration: sure });
      sahne.tweens.add({ targets: d, y: y - h, duration: sure / 2, ease: 'Quad.easeOut', yoyo: true, onComplete: () => d.destroy() });
    }
    dokunmaSesi(sahne, 'plop', 0.06);
  };

  // x, y: dokunulan dünya noktası. bina: aynı noktadaki bina (varsa). Tepki verildiyse true döner.
  return (x, y, bina) => {
    const su = sahne.su;
    if (su && ((x - su.x) / su.rx) ** 2 + ((y - su.y) / su.ry) ** 2 < 1) { suyaDokun(x, y); return true; }
    const s = bitkiBul(x, y);
    if (!s) return false;
    // Bina önündeyse bina kazanır; bitki binanın önünde duruyorsa bitki
    if (bina && bina.nesne.depth > s.n.depth && (bina.nesne.type !== 'Image' || pikselVar(sahne, bina.nesne, x, y))) return false;
    const simdi = sahne.time.now, n = s.n, agac = AGAC.test(s.ad); // 'agac_cicekli' çiçek değil ağaçtır
    if (!agac && CICEK.test(s.ad)) {
      hisirt(s, 0.12);
      if (!(s.sonSacma > simdi - 700)) { s.sonSacma = simdi; yapraklarSac(n, x, y); }
      return true;
    }
    hisirt(s, agac ? 0.035 : 0.08);
    dokunmaSesi(sahne, 'hisirti', agac ? 0.05 : 0.04);
    if (!(s.sonYaprak > simdi - 600)) { s.sonYaprak = simdi; yapraklarDussun(n, agac ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2)); }
    // Canlı çıkması ara sıra olur ki sürpriz kalsın (aynı bitkiden en az 8 sn arayla)
    if (gunduz() && !(s.sonCanli > simdi - 8000) && Math.random() < 0.55 && !/^cimen|yonca/.test(s.ad)) {
      s.sonCanli = simdi;
      if (agac) kuslarUcur(n); else kelebekCikar(n);
    }
    return true;
  };
}
