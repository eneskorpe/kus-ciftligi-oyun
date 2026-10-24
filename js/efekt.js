// Ortak efektler (kalp, nota, tohum, yıldız, tüy). Her sahne efektleriKur(this) ile kullanır,
// kuşlar da sahne.efekt(...) üzerinden çağırır.
const CIZGI = 0x3a2a35;

function dokuUret(sahne) {
  if (sahne.textures.exists('kalp')) return;
  const g = sahne.add.graphics();
  const kaydet = (ad, w, h) => { g.generateTexture(ad, w, h); g.clear(); };
  g.fillStyle(CIZGI); g.fillCircle(11, 11, 10); g.fillCircle(25, 11, 10); g.fillTriangle(2, 15, 34, 15, 18, 33);
  g.fillStyle(0xff5d7a); g.fillCircle(11, 11, 7.5); g.fillCircle(25, 11, 7.5); g.fillTriangle(5, 14, 31, 14, 18, 29);
  g.fillStyle(0xffffff, 0.8); g.fillCircle(9, 9, 2.5);
  kaydet('kalp', 36, 36);
  g.fillStyle(0xffffff); g.fillEllipse(9, 25, 14, 10); g.fillRect(13, 4, 3.5, 21); g.fillTriangle(16.5, 4, 26, 10, 16.5, 13);
  kaydet('nota', 28, 32);
  g.fillStyle(0xe9c46a); g.fillEllipse(5, 4, 9, 6); g.lineStyle(1.5, 0x9a7a3a); g.strokeEllipse(5, 4, 9, 6);
  kaydet('tohum', 11, 9);
  g.fillStyle(0xffffff); g.fillPoints([{ x: 12, y: 0 }, { x: 15, y: 9 }, { x: 24, y: 12 }, { x: 15, y: 15 }, { x: 12, y: 24 }, { x: 9, y: 15 }, { x: 0, y: 12 }, { x: 9, y: 9 }], true);
  kaydet('yildiz', 24, 24);
  g.fillStyle(0xffffff); g.fillEllipse(10, 4, 18, 7);
  kaydet('tuy', 20, 8);
  g.destroy();
}

function efekt(sahne, tip, konum, adet = 1, renk, olcek = 1) {
  const T = sahne.tweens;
  for (let i = 0; i < adet; i++) {
    const s = sahne.add.image(konum.x, konum.y, tip).setDepth(100000);
    if (renk !== undefined) s.setTint(renk);
    const sag = (Math.random() - 0.5) * olcek, yuk = olcek;
    if (tip === 'kalp') {
      s.setScale(0.4 * olcek);
      T.add({ targets: s, x: s.x + sag * 140, y: s.y - (110 + Math.random() * 80) * yuk, scale: (1 + Math.random() * 0.4) * olcek,
        alpha: 0, duration: 1000 + Math.random() * 400, delay: i * 70, ease: 'Sine.easeOut', onComplete: () => s.destroy() });
    } else if (tip === 'nota') {
      s.setTint(Phaser.Utils.Array.GetRandom([0x6aa8ff, 0xff8fb0, 0xffc94a, 0x7ad37a])).setScale(0.9 * olcek);
      T.add({ targets: s, x: s.x + (60 + Math.random() * 50) * olcek, y: s.y - 120 * yuk, angle: 25, alpha: 0, duration: 1200, ease: 'Sine.easeOut', onComplete: () => s.destroy() });
    } else if (tip === 'tohum') {
      s.setScale(olcek);
      T.add({ targets: s, x: s.x + sag * 50, duration: 420, onComplete: () => s.destroy() });
      T.add({ targets: s, y: s.y - (24 + Math.random() * 16) * yuk, duration: 180, ease: 'Quad.easeOut', yoyo: true, angle: 200 });
    } else if (tip === 'yildiz') {
      s.setScale(0).setAlpha(0.95);
      T.add({ targets: s, scale: (0.6 + Math.random() * 0.5) * olcek, angle: 90, duration: 300, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => s.destroy() });
    } else if (tip === 'tuy') {
      s.setScale(1.6 * olcek).setAngle(Math.random() * 360);
      T.add({ targets: s, x: s.x + sag * 120, y: s.y + 90 * yuk, angle: s.angle + 160, alpha: 0, duration: 1400, ease: 'Sine.easeIn', onComplete: () => s.destroy() });
    }
  }
}

export function efektleriKur(sahne, olcek = 1) {
  dokuUret(sahne);
  sahne.efekt = (tip, konum, adet, renk) => efekt(sahne, tip, konum, adet, renk, olcek);
}
