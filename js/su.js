// Akan dere: köyün önündeki dere görsellerine (manzara_on) canlılık.
// 1) Akıntı çizgileri: suyun üstünde kısa, hafif kavisli parlak çizgiler belirir, akış yönünde süzülüp kaybolur.
// 2) Akıntıya kapılmış yapraklar: derenin orta çizgisi boyunca süzülür, hafifçe döner ve sallanır.
// 3) Pırıltılar: güneş suda ara sıra parlar.
// Suyun iç noktaları ve orta çizgi assets/manzara/on_su.json'dan (görselden çıkarıldı; tools yerine tek seferlik betikle).
const r = (a, b) => a + Math.random() * (b - a);
const EGIM = Math.atan2(0.48, 1); // derenin görseldeki genel akış yönü (sol üstten sağ alta)

function cizgiDokusu(sahne) {
  if (sahne.textures.exists('su_cizgi')) return;
  const W = 128, H = 32, t = sahne.textures.createCanvas('su_cizgi', W, H), ctx = t.getContext();
  const g = ctx.createLinearGradient(2, 0, W - 2, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = g; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(6, 23); ctx.quadraticCurveTo(W / 2, 4, W - 6, 23); ctx.stroke(); // küçük dalga sırtı
  t.refresh();
}

// dereler: [{ o: dere görseli, ayna }]
export function dereKur(sahne, dereler) {
  const veri = sahne.cache.json.get('manzara_on_su');
  if (!dereler.length || !veri) return () => {};
  cizgiDokusu(sahne);
  const cizgiler = [], yapraklar = [];

  for (const { o, ayna } of dereler) {
    const dunya = ([u, v]) => ({ x: o.x + ((ayna ? 1 - u : u) - 0.5) * o.displayWidth, y: o.y + (v - 0.5) * o.displayHeight });
    const noktalar = (veri.noktalar || []).map(dunya);
    const yol = (veri.yol || []).map(dunya);
    if (ayna) yol.reverse();
    const aci = ayna ? Math.PI - EGIM : EGIM, yon = { x: Math.cos(aci), y: Math.sin(aci) };
    // Köprü: görselin köprü bölgesi (su hariç) çizgi ve yaprakların üstüne tekrar çizilir; akıntı köprünün altından geçer
    if (veri.kopru && sahne.textures.exists('manzara_on_kopru')) {
      const [x0, y0, x1, y1] = veri.kopru, m = dunya([(x0 + x1) / 2, (y0 + y1) / 2]);
      sahne.add.image(m.x, m.y, 'manzara_on_kopru').setScale(o.scaleX, o.scaleY).setFlipX(ayna).setDepth(o.depth + 0.8);
    }
    // Akıntı çizgileri: her derede sürekli ~55 tane, her biri 1.6-2.6 sn yaşar
    const cizgiDogur = (ilk) => {
      const p = noktalar[Math.floor(Math.random() * noktalar.length)], im = sahne.add.image(p.x, p.y, 'su_cizgi')
        .setTint(0xe8fbff).setDepth(o.depth + 0.5).setRotation(aci).setAlpha(0);
      im.setScale(r(0.7, 1.1), r(0.6, 0.8)); // oyunun olağan zoom'unda (0.45-0.85) okunur kalınlıkta
      const C = { im, yon, x0: p.x, y0: p.y, yas: ilk ? r(0, 2) : 0, omur: r(1.6, 2.6), hiz: r(18, 30), en: r(0.7, 0.95), ac: () => cizgiDogur(false) };
      cizgiler.push(C);
    };
    if (noktalar.length) for (let n = 0; n < 55; n++) cizgiDogur(true);
    if (yol.length > 1) for (let n = 0; n < 3; n++) yapraklar.push(yaprakKur(sahne, yol, o.depth + 0.6, Math.random()));
    // Pırıltılar
    sahne.time.addEvent({ delay: 450, loop: true, callback: () => {
      if (Math.random() < 0.45 || !noktalar.length) return;
      const p = noktalar[Math.floor(Math.random() * noktalar.length)];
      const s = sahne.add.image(p.x, p.y, 'yildiz').setDepth(o.depth + 0.7).setScale(0).setAlpha(0.95);
      sahne.tweens.add({ targets: s, scale: r(0.3, 0.55), duration: 320, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => s.destroy() });
    } });
  }
  sahne.dere = { cizgiler, yapraklar }; // deneme için

  return (zaman, dt) => {
    const s = dt / 1000;
    for (let i = cizgiler.length - 1; i >= 0; i--) {
      const C = cizgiler[i];
      C.yas += s;
      const t = C.yas / C.omur;
      if (t >= 1) { C.im.destroy(); cizgiler.splice(i, 1); C.ac(); continue; }
      const d = C.yas * C.hiz;
      C.im.setPosition(C.x0 + C.yon.x * d, C.y0 + C.yon.y * d).setAlpha(C.en * Math.sin(Math.PI * t)); // yavaşça belirir, söner
    }
    for (const Y of yapraklar) Y.ilerle(s, zaman);
  };
}

// Akıntıyla süzülen yaprak: orta çizgi boyunca ilerler, sonda kaybolup baştan doğar
function yaprakKur(sahne, yol, derinlik, bas) {
  const uz = []; let top = 0;
  for (let i = 1; i < yol.length; i++) { top += Math.hypot(yol[i].x - yol[i - 1].x, yol[i].y - yol[i - 1].y); uz.push(top); }
  const doku = 'dekor_yaprak' + (1 + Math.floor(Math.random() * 6));
  const im = sahne.add.image(0, 0, sahne.textures.exists(doku) ? doku : 'yaprak').setDepth(derinlik);
  im.setScale(r(11, 15) / im.width);
  const Y = { d: bas * top, hiz: r(22, 34), kay: r(-8, 8), faz: Math.random() * 6, don: r(-40, 40) };
  Y.ilerle = (s, zaman) => {
    Y.d += Y.hiz * s;
    if (Y.d > top) { Y.d = 0; Y.kay = r(-8, 8); }
    let i = uz.findIndex((u) => u >= Y.d); if (i < 0) i = uz.length - 1;
    const a = yol[i], b = yol[i + 1], u0 = i ? uz[i - 1] : 0, t = (Y.d - u0) / Math.max(1, uz[i] - u0);
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    im.setPosition(x + Math.sin(zaman / 600 + Y.faz) * 3, y + Y.kay * 0.5 + Math.sin(zaman / 450 + Y.faz) * 1.5);
    im.angle += Y.don * s;
    im.setAlpha(Math.min(1, Math.min(Y.d, top - Y.d) / 80)); // başta ve sonda yavaşça belirip kaybolur
  };
  return Y;
}
