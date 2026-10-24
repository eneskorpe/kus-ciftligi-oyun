// Köyün canlılığı: rüzgârda sallanan bitkiler, ara sıra geçen esinti ve uçuşan yapraklar, gölette halkalar ve parıltılar.
// Bitkiler dekorKoy/susKur ile oluşturulurken sahne.sallananlar listesine eklenir (dekor.js, binalar.js).

// Dekor adına göre sallanma gücü (radyan). Listede olmayanlar (taş, bank, çit...) sallanmaz.
export function sallanmaGucu(ad) {
  if (/^cimen|yonca|saz|egrelti/.test(ad)) return 0.07;
  if (/^cicek|gelincik|lavanta|aycicegi|kadife/.test(ad)) return 0.06;
  if (/^cali/.test(ad)) return 0.025;
  if (/sogut/.test(ad)) return 0.022;
  if (/^agac|fidan|bina_agac/.test(ad)) return 0.012;
  return 0;
}

export function sallananEkle(sahne, nesne, ad) {
  const g = sallanmaGucu(ad);
  if (!nesne || !g) return;
  (sahne.sallananlar = sahne.sallananlar || []).push({ n: nesne, ad, g, faz: Math.random() * 6.28, hiz: 0.8 + Math.random() * 0.5 });
}

function yaprakDokusu(sahne) {
  if (sahne.textures.exists('yaprak')) return;
  const g = sahne.add.graphics();
  g.fillStyle(0x3a2a35); g.fillEllipse(9, 5, 18, 10);
  g.fillStyle(0x7cc454); g.fillEllipse(9, 5, 15, 7);
  g.lineStyle(1.2, 0x4f8f35); g.lineBetween(3, 5, 15, 5);
  g.generateTexture('yaprak', 18, 10); g.destroy();
}

// sinir: { x1, x2, y1, y2 } esintinin geçtiği alan (dünya koordinatı)
export function canlilikKur(sahne, sinir) {
  yaprakDokusu(sahne);
  const esinti = { x: -1e9, guc: 0 };
  sahne.esinti = esinti; // çimendeki rüzgâr dalgası da bunu izler (zemin.js)
  // 12-28 saniyede bir soldan sağa bir esinti geçer
  const esintiBaslat = () => {
    esinti.x = sinir.x1 - 300; esinti.guc = 0.8 + Math.random() * 0.6;
    sahne.tweens.add({ targets: esinti, x: sinir.x2 + 300, duration: 4500, ease: 'Sine.easeInOut' });
    for (let i = 0; i < 8 + Math.floor(Math.random() * 6); i++) {
      sahne.time.delayedCall(i * 280, () => yaprakUcur(sahne, esinti, sinir));
    }
  };
  sahne.esintiBaslat = esintiBaslat; // deneme için
  const planla = () => sahne.time.delayedCall(12000 + Math.random() * 16000, () => { esintiBaslat(); planla(); });
  planla();

  return (zaman) => {
    const t = zaman / 1000, liste = sahne.sallananlar || [];
    const cam = sahne.cameras.main.worldView;
    for (const s of liste) {
      const n = s.n;
      if (n.x < cam.x - 200 || n.x > cam.right + 200 || n.y < cam.y - 100 || n.y > cam.bottom + 400) continue; // ekran dışı
      const dx = (n.x - esinti.x) / 350, ek = esinti.guc * Math.exp(-dx * dx);
      n.rotation = s.g * (Math.sin(t * s.hiz * 1.6 + s.faz) * 0.45 + ek * 1.6) + (s.tik ? s.tik * Math.sin(t * 28) : 0); // tik: dokununca hışırtı (dokunTepki.js)
    }
  };
}

function yaprakUcur(sahne, esinti, sinir) {
  // Yapraklar oyuncunun gördüğü alanda uçar (esinti cephesinin yakınından)
  const v = sahne.cameras.main.worldView;
  const x = Math.max(v.x - 100, Math.min(v.right, esinti.x + (Math.random() - 0.3) * 200)), y = v.y + v.height * (0.25 + Math.random() * 0.7);
  void sinir;
  const y0 = y - 120 - Math.random() * 120;
  // Gemini yaprakları: çoğu yeşil (1-4), ara sıra sarı ve turuncu sonbahar yaprağı (5-6)
  const gorsel = sahne.textures.exists('dekor_yaprak1');
  const n = Math.random() < 0.8 ? 1 + Math.floor(Math.random() * 4) : 5 + Math.floor(Math.random() * 2);
  const p = sahne.add.image(x, y0, gorsel ? 'dekor_yaprak' + n : 'yaprak').setDepth(96000).setAngle(Math.random() * 360);
  p.setScale(gorsel ? (14 + Math.random() * 6) / p.width : 1.2 + Math.random() * 0.8);
  if (!gorsel && Math.random() < 0.3) p.setTint(0xd9b04a);
  sahne.tweens.add({ targets: p, x: x + 350 + Math.random() * 250, duration: 3400, ease: 'Sine.easeOut' });
  sahne.tweens.add({ targets: p, y: y0 + 90 + Math.random() * 60, duration: 3400, ease: 'Sine.easeIn' });
  sahne.tweens.add({ targets: p, angle: p.angle + 540, duration: 3400 });
  sahne.tweens.add({ targets: p, alpha: 0, delay: 2600, duration: 800, onComplete: () => p.destroy() });
}

// Gölet: su yüzeyinde ara sıra halka ve parıltı. su: { x, y, rx, ry } su elipsi (dünya), derinlik: göletin hemen üstü
export function goletKur(sahne, su, derinlik) {
  // buyuk: true ya da halkanın ulaşacağı yarıçap (dokunuşta daha büyük ve belirgin)
  sahne.halka = (x, y, buyuk = false) => {
    const g = sahne.add.graphics().setDepth(derinlik + 1).setPosition(x, y);
    const o = { r: 3 }, hedef = typeof buyuk === 'number' ? buyuk : buyuk ? 26 : 16, kalin = hedef > 30 ? 3 : 2;
    sahne.tweens.add({ targets: o, r: hedef, duration: hedef > 30 ? 1600 : buyuk ? 1400 : 1100, ease: 'Sine.easeOut',
      onUpdate: (tw) => { const a = 1 - tw.progress; g.clear(); g.lineStyle(kalin, 0xffffff, (kalin > 2 ? 0.8 : 0.55) * a); g.strokeEllipse(0, 0, o.r * 2, o.r); if (o.r > 8) { g.lineStyle(1.5, 0xffffff, 0.35 * a); g.strokeEllipse(0, 0, o.r * 1.2, o.r * 0.6); } },
      onComplete: () => g.destroy() });
  };
  const rastgele = () => { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 0.75; return { x: su.x + Math.cos(a) * su.rx * d, y: su.y + Math.sin(a) * su.ry * d }; };
  sahne.time.addEvent({ delay: 1800, loop: true, callback: () => { if (Math.random() < 0.6) { const p = rastgele(); sahne.halka(p.x, p.y); } } });
  sahne.time.addEvent({ delay: 700, loop: true, callback: () => {
    if (Math.random() > 0.5) return;
    const p = rastgele(), s = sahne.add.image(p.x, p.y, 'yildiz').setDepth(derinlik + 1).setScale(0).setAlpha(0.9);
    sahne.tweens.add({ targets: s, scale: 0.35 + Math.random() * 0.25, duration: 350, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => s.destroy() });
  } });
}

// --- Küçük canlılar: gündüz çiçekten çiçeğe kelebekler, çalıların etrafında arılar ---
function bocekDokulari(sahne) {
  if (sahne.textures.exists('kelebek_kanat')) return;
  const g = sahne.add.graphics();
  // Tek kanat (sağ): üst büyük, alt küçük kanat; boyası tint ile verilir
  g.fillStyle(0x3a2a35); g.fillEllipse(11, 7, 20, 14); g.fillEllipse(9, 17, 14, 10);
  g.fillStyle(0xffffff); g.fillEllipse(11, 7, 17, 11); g.fillEllipse(9, 17, 11, 7);
  g.fillStyle(0xffffff, 0.6); g.fillCircle(13, 6, 2.5);
  g.generateTexture('kelebek_kanat', 22, 23); g.clear();
  g.fillStyle(0x3a2a35); g.fillEllipse(3, 9, 5, 16);
  g.generateTexture('kelebek_govde', 6, 18); g.clear();
  // Arı: sarı-siyah çizgili gövde, beyaz kanatlar
  g.fillStyle(0xffffff, 0.8); g.fillEllipse(6, 3, 7, 6); g.fillEllipse(11, 3, 7, 6);
  g.fillStyle(0x3a2a35); g.fillEllipse(8.5, 9, 13, 9);
  g.fillStyle(0xf6c431); g.fillEllipse(8.5, 9, 10.5, 6.5);
  g.fillStyle(0x3a2a35); g.fillRect(7, 6, 2, 6); g.fillRect(10.5, 6, 2, 6);
  g.generateTexture('ari', 17, 14); g.destroy();
}

const KELEBEK_RENK = [0xffb84d, 0x8fd0ff, 0xfff27a, 0xffffff, 0xc9a7ff, 0xff9a6a];

export function kucukCanlilarKur(sahne, alan) {
  bocekDokulari(sahne);
  const liste = sahne.sallananlar || [];
  const icinde = (n) => n.x > alan.x1 && n.x < alan.x2 && n.y > alan.y1 && n.y < alan.y2;
  const cicekler = liste.filter((s) => /cicek|gelincik|lavanta|aycicegi|kadife/.test(s.ad) && icinde(s.n)).map((s) => s.n);
  const calilar = liste.filter((s) => /^cali/.test(s.ad) && icinde(s.n)).map((s) => s.n);
  const konmaYeri = (dizi) => { const c = Phaser.Utils.Array.GetRandom(dizi); return { x: c.x + (Math.random() - 0.5) * 14, y: c.y - c.displayHeight * 0.55 }; };
  const ucucular = [];

  // Gemini çizimi varsa 3 kareli animasyon (1 açık, 2 yarı, 3 kapalı kanat), yoksa kodla çizilmiş hali
  const gorselli = sahne.textures.exists('dekor_kelebek1') && sahne.textures.exists('dekor_ari1');
  // Tek kelebek: çiçeklere konar
  if (cicekler.length) {
    const p = konmaYeri(cicekler);
    if (gorselli) {
      const k = sahne.add.image(p.x, p.y, 'dekor_kelebek1').setOrigin(0.5, 0.75).setDepth(95500);
      const o = 30 / k.width;
      ucucular.push({ n: k, olcek: o, hiz: 70, yerler: cicekler, hedef: p, durus: 2 + Math.random() * 3, faz: Math.random() * 6, kelebek: true, ad: 'kelebek' });
    } else {
      const k = sahne.add.container(p.x, p.y).setDepth(95500), renk = Phaser.Utils.Array.GetRandom(KELEBEK_RENK);
      const sol = sahne.add.image(0, 0, 'kelebek_kanat').setOrigin(1, 0.4).setTint(renk).setFlipX(true);
      const sag = sahne.add.image(0, 0, 'kelebek_kanat').setOrigin(0, 0.4).setTint(renk);
      k.add([sol, sag, sahne.add.image(0, 2, 'kelebek_govde')]);
      ucucular.push({ n: k, sol, sag, olcek: 1.15, hiz: 70, yerler: cicekler, hedef: p, durus: 2 + Math.random() * 3, faz: Math.random() * 6, kelebek: true });
    }
  }
  // İki arı: çiçeklere ve çalılara konar, daha hızlı ve vızıltılı uçar
  const ariYerleri = cicekler.concat(calilar);
  for (let i = 0; i < 2 && ariYerleri.length; i++) {
    const p = konmaYeri(ariYerleri), a = sahne.add.image(p.x, p.y, gorselli ? 'dekor_ari1' : 'ari').setOrigin(0.5, 0.75).setDepth(95500);
    ucucular.push({ n: a, ad: gorselli ? 'ari' : null, olcek: gorselli ? 24 / a.width : 1.1, hiz: 110, yerler: ariYerleri, hedef: p, durus: 1 + Math.random() * 3, faz: Math.random() * 6 });
  }

  return (zaman, dt) => {
    const t = zaman / 1000, s = dt / 1000, gunduz = !sahne.gunIsigi || sahne.gunIsigi.gece < 0.5;
    for (const b of ucucular) {
      b.n.setVisible(gunduz);
      if (!gunduz) continue;
      const n = b.n, dx = b.hedef.x - n.x, dy = b.hedef.y - n.y, d = Math.hypot(dx, dy);
      let cirp = 1;
      if (d < 4) { // konmuş: kelebek kanatlarını yavaşça açıp kapar, arı hafifçe kıpırdar
        b.durus -= s;
        cirp = 0.55 + 0.45 * Math.sin(t * 3 + b.faz);
        if (!b.kelebek) n.y = b.hedef.y + Math.sin(t * 20 + b.faz) * 0.4;
        if (b.durus <= 0) { b.hedef = konmaYeri(b.yerler); b.durus = (b.kelebek ? 2 : 1.5) + Math.random() * 3; }
      } else { // uçuş: dalgalı yol
        const v = Math.min(d, b.hiz * s), sall = b.kelebek ? 1 : 1.6;
        n.x += dx / d * v + Math.cos(t * 5 + b.faz) * 0.6 * sall;
        n.y += dy / d * v + Math.sin(t * (b.kelebek ? 7 : 13) + b.faz) * 1.1 * sall;
        cirp = Math.abs(Math.sin(t * 18 + b.faz));
        n.scaleX = (dx < 0 ? -1 : 1) * b.olcek;
      }
      n.scaleY = b.olcek; n.scaleX = (n.scaleX < 0 ? -1 : 1) * b.olcek;
      if (b.ad) { // kare animasyonu: uçarken hızlı 1-2-3-2 döngüsü, konmuşken kelebek yavaşça açıp kapar, arı kanatlarını toplar
        const DONGU = [1, 2, 3, 2], konmus = d < 4;
        const kare = konmus ? (b.kelebek ? (cirp > 0.5 ? 1 : 3) : 3) : DONGU[Math.floor(t * (b.kelebek ? 12 : 22) + b.faz) % 4];
        n.setTexture(`dekor_${b.ad}${kare}`);
      } else if (b.kelebek) b.sol.scaleX = b.sag.scaleX = 0.2 + 0.8 * cirp;
      n.setDepth(n.y + 400);
    }
  };
}
// --- Uzaktan geçen yabani kuş sürüleri: gündüz ara sıra ekranın üst kısmından küçük siluetler geçer ---
function siluetDokusu(sahne) {
  if (sahne.textures.exists('siluet')) return;
  const g = sahne.add.graphics();
  g.lineStyle(3, 0x3a2a35, 1);
  g.beginPath(); g.arc(8, 10, 7, Math.PI * 1.1, Math.PI * 1.9); g.strokePath();
  g.beginPath(); g.arc(22, 10, 7, Math.PI * 1.1, Math.PI * 1.9); g.strokePath();
  g.fillStyle(0x3a2a35, 1); g.fillCircle(15, 8, 2.2);
  g.generateTexture('siluet', 30, 14); g.destroy();
}

export function surulerKur(sahne) {
  siluetDokusu(sahne);
  const gec = () => {
    const v = sahne.cameras.main.worldView, soldan = Math.random() < 0.5;
    const n = 4 + Math.floor(Math.random() * 5), y0 = v.y + v.height * (0.08 + Math.random() * 0.25);
    const x0 = soldan ? v.x - 120 : v.right + 120, x1 = soldan ? v.right + 220 : v.x - 220;
    const sure = 9000 + Math.random() * 5000, olcek = 0.7 + Math.random() * 0.4;
    for (let i = 0; i < n; i++) {
      // V düzeni: lider önde, diğerleri iki yana ve geriye
      const sira = Math.ceil(i / 2), yan = i % 2 ? 1 : -1;
      const dx = -sira * 34 * (soldan ? 1 : -1), dy = sira * 16 * yan + (Math.random() - 0.5) * 6;
      const s = sahne.add.image(x0 + dx, y0 + dy, 'siluet').setDepth(97500).setAlpha(0.5).setScale(olcek * (0.85 + Math.random() * 0.3));
      const faz = Math.random() * 6, hiz = 9 + Math.random() * 3;
      sahne.tweens.add({ targets: s, x: x1 + dx, y: y0 + dy - 40 + Math.random() * 30, duration: sure, ease: 'Linear',
        onUpdate: () => { s.scaleY = s.scaleX * (0.55 + 0.45 * Math.abs(Math.sin(sahne.time.now / 1000 * hiz + faz))); },
        onComplete: () => s.destroy() });
    }
  };
  const planla = () => sahne.time.delayedCall(40000 + Math.random() * 50000, () => {
    if (!sahne.gunIsigi || sahne.gunIsigi.gece < 0.5) gec();
    planla();
  });
  sahne.time.delayedCall(8000 + Math.random() * 10000, () => { if (!sahne.gunIsigi || sahne.gunIsigi.gece < 0.5) gec(); planla(); });
  sahne.suruGecir = gec; // deneme için
}
