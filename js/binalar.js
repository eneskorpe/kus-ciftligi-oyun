// Köy binaları: tanımlar ve geçici (kodla çizilen) izometrik görünümleri.
// Gemini görselleri gelince her bina için 'bina_<tip>' dokusu yüklenecek ve çizim yerine o kullanılacak.
import { karoKoseleri, lerpN, yukari } from './izo.js';
import { koyulastir } from './turler.js';
import { dekorKoy } from './dekor.js';
import { sallananEkle } from './canlilik.js';

const CIZGI = 0x3a2a35;

export const BINALAR = {
  kulucka: { ad: 'Kuluçkahane', boyut: [3, 3], ikon: '🥚',
    aciklama: 'İki kuşunu çiftleştirir ve yumurtaları kuluçkada tutar. Seviyesi arttıkça kuluçka süresi kısalır.' },
  tuzak: { ad: 'Tuzak Kulübesi', boyut: [2, 2], ikon: '🪤',
    aciklama: 'Yem seçip tuzak kurarsın. Süre bitince tuzağa hangi kuşun düştüğünü görürsün. Seviye yakalama şansını artırır.' },
  kusevi: { ad: 'Kuş Evi', boyut: [2, 2], ikon: '🏠',
    aciklama: 'Kuşların burada yaşar. Seviyesi arttıkça daha çok kuş barınır.' },
  yemlik: { ad: 'Yemlik', boyut: [1, 1], ikon: '🌾',
    aciklama: 'Köydeki kuşlar burada beslenir. Boşalınca yeniden doldurman gerekir.' },
  kunduz: { ad: 'Kunduz Usta', boyut: [3, 3], ikon: '🦫', sabit: true, ayna: true, // geliştirilmez; aynalı: su çarkı gölete bakar
    aciklama: 'Köyün marangozu. Bir binayı geliştirdiğinde evinden çıkıp çalışmaya gider, iş bitince evine döner.' },
  // Oyuncunun sonradan inşa ettiği binalar (yeni: true). acilis: oyuncu seviyesi, fiyat: altın, dk: inşaat süresi.
  // islevYok: işlevi henüz yazılmadı (panelde "yakında"); renk/cati: Gemini görseli gelene kadarki geçici çizim
  tarla: { ad: 'Tohum Tarlası', boyut: [3, 3], ikon: '🌱', yeni: true, acilis: 3, fiyat: 400, dk: 3, renk: 0x9a6b3f,
    aciklama: 'Darı, ayçiçeği ve kenevir tohumu ekersin; süre dolunca hasat edip kuşların için yem elde edersin.' },
  klinik: { ad: 'Kuş Kliniği', boyut: [2, 2], ikon: '🩺', yeni: true, acilis: 5, fiyat: 1200, dk: 8, renk: 0xf4f1ea, cati: 0x7fc6d9, islevYok: true,
    aciklama: 'Bakımsız kalıp rahatsızlanan kuşlar burada iyileşir. Sağlıklı kuşlara check-up yapılır, tüyleri bakılır.' },
  degirmen: { ad: 'Değirmen', boyut: [2, 2], ikon: '⚙️', yeni: true, acilis: 6, fiyat: 1800, dk: 10, renk: 0xe8d2a8, cati: 0xc4553f, islevYok: true,
    aciklama: 'Tarladan gelen hasadı karışık yeme, ballı çubuğa ve kalsiyum taşına çevirir.' },
  siparis: { ad: 'Sipariş Panosu', boyut: [1, 1], ikon: '📜', yeni: true, acilis: 8, fiyat: 2500, dk: 12, renk: 0xb98055, cati: 0x6aae4f, islevYok: true,
    aciklama: 'Köylüler belirli kuşlar ister. Siparişi teslim edersen altın ve XP kazanırsın.' },
  kres: { ad: 'Kuş Kreşi', boyut: [2, 2], ikon: '🐣', yeni: true, acilis: 10, fiyat: 4000, dk: 20, renk: 0xffe3ec, cati: 0xf29bb5, islevYok: true,
    aciklama: 'Yumurtadan çıkan minik yavrular burada büyür.' },
  kule: { ad: 'Gözlem Kulesi', boyut: [2, 2], ikon: '🔭', yeni: true, acilis: 12, fiyat: 6000, dk: 30, renk: 0xc9b79a, cati: 0x4f7fbf, yuksek: true, islevYok: true,
    aciklama: 'Göle, dağa ve ormana keşif gönderirsin. Her bölgede farklı kuş türleri yaşar.' },
  muze: { ad: 'Kuş Müzesi', boyut: [3, 3], ikon: '🏛️', yeni: true, acilis: 15, fiyat: 10000, dk: 45, renk: 0xf1ead8, cati: 0x9a7bc4, islevYok: true,
    aciklama: 'Nadir kuşlarını sergilersin. Her sergilenen kuş gelir ve rozet kazandırır.' },
  lab: { ad: 'Genetik Laboratuvarı', boyut: [2, 2], ikon: '🧬', yeni: true, acilis: 15, fiyat: 12000, dk: 45, renk: 0xe6f2f5, cati: 0x6fbf8f, islevYok: true,
    aciklama: 'İki kuşun yavrularının hangi renk ve genlerle doğabileceğini gösterir.' },
};
export const YENI_BINALAR = Object.keys(BINALAR).filter((t) => BINALAR[t].yeni);

// --- Çizim yardımcıları ---
function sekil(g, noktalar, renk, cerceve = true, alfa = 1) {
  g.fillStyle(renk, alfa); g.fillPoints(noktalar, true);
  if (cerceve) { g.lineStyle(3, CIZGI, 1); g.strokePoints(noktalar, true, true); }
}
const merkez = (k) => lerpN(k.ust, k.alt, 0.5);
const daralt = (k, f, kay = { x: 0, y: 0 }) => {
  const m = merkez(k), s = (n) => ({ x: m.x + (n.x - m.x) * f + kay.x, y: m.y + (n.y - m.y) * f + kay.y });
  return { ust: s(k.ust), sag: s(k.sag), alt: s(k.alt), sol: s(k.sol) };
};
// Duvar yüzeyinde (a→b kenarı, h yüksekliği) u: kenar boyunca, v: yukarı doğru oran
const yuzNokta = (a, b, h, u, v) => yukari(lerpN(a, b, u), v * h);
function yuzDortgen(g, a, b, h, u0, u1, v0, v1, renk, cerceve = true) {
  sekil(g, [yuzNokta(a, b, h, u0, v0), yuzNokta(a, b, h, u1, v0), yuzNokta(a, b, h, u1, v1), yuzNokta(a, b, h, u0, v1)], renk, cerceve);
}
function yuzDaire(g, a, b, h, uc, vc, ru, rv, renk, cerceve = true) {
  const n = [];
  for (let i = 0; i < 20; i++) { const t = i / 20 * Math.PI * 2; n.push(yuzNokta(a, b, h, uc + Math.cos(t) * ru, vc + Math.sin(t) * rv)); }
  sekil(g, n, renk, cerceve);
}
// Yerde yatan izometrik elips (yassı)
function yerElips(g, x, y, rx, renk, cerceve = true) {
  const n = [];
  for (let i = 0; i < 20; i++) { const t = i / 20 * Math.PI * 2; n.push({ x: x + Math.cos(t) * rx, y: y + Math.sin(t) * rx / 2 }); }
  sekil(g, n, renk, cerceve);
}

// Duvarlı kutu: sol ve sağ ön yüzler + üst
function kutu(g, k, h, renk) {
  const koyu = koyulastir(renk, 0.8);
  sekil(g, [k.sol, k.alt, yukari(k.alt, h), yukari(k.sol, h)], renk);
  sekil(g, [k.alt, k.sag, yukari(k.sag, h), yukari(k.alt, h)], koyu);
  return { sol: (u0, u1, v0, v1, r, c) => yuzDortgen(g, k.sol, k.alt, h, u0, u1, v0, v1, r, c),
    sag: (u0, u1, v0, v1, r, c) => yuzDortgen(g, k.alt, k.sag, h, u0, u1, v0, v1, r, c),
    solDaire: (uc, vc, ru, rv, r, c) => yuzDaire(g, k.sol, k.alt, h, uc, vc, ru, rv, r, c),
    sagDaire: (uc, vc, ru, rv, r, c) => yuzDaire(g, k.alt, k.sag, h, uc, vc, ru, rv, r, c) };
}

// Piramit çatı: saçaklar biraz taşar
function cati(g, k, h, ch, renk, tasma = 1.15, cizgiRenk) {
  const s = daralt(k, tasma), m = yukari(merkez(k), h + ch);
  const Y = (n) => yukari(n, h);
  const koyu = koyulastir(renk, 0.8);
  sekil(g, [Y(s.sol), Y(s.ust), m], koyulastir(renk, 0.7));
  sekil(g, [Y(s.ust), Y(s.sag), m], koyulastir(renk, 0.7));
  sekil(g, [Y(s.sol), Y(s.alt), m], renk);
  sekil(g, [Y(s.alt), Y(s.sag), m], koyu);
  if (cizgiRenk !== undefined) { // saman / kiremit çizgileri
    g.lineStyle(2, cizgiRenk, 0.7);
    for (let t = 0.25; t < 1; t += 0.25) {
      g.lineBetween(lerpN(Y(s.sol), m, t).x, lerpN(Y(s.sol), m, t).y, lerpN(Y(s.alt), m, t).x, lerpN(Y(s.alt), m, t).y);
      g.lineBetween(lerpN(Y(s.alt), m, t).x, lerpN(Y(s.alt), m, t).y, lerpN(Y(s.sag), m, t).x, lerpN(Y(s.sag), m, t).y);
    }
  }
  return m;
}

function arsa(g, k, renk) {
  sekil(g, [k.ust, k.sag, k.alt, k.sol], renk, false);
  g.lineStyle(2, CIZGI, 0.25); g.strokePoints([k.ust, k.sag, k.alt, k.sol], true, true);
}

function cicekler(g, k, adet, rnd) {
  for (let n = 0; n < adet; n++) {
    const p = lerpN(lerpN(k.sol, k.alt, rnd()), lerpN(k.ust, k.sag, rnd()), rnd() * 0.25);
    g.fillStyle(Phaser.Utils.Array.GetRandom([0xffffff, 0xffd84a, 0xff9ac0, 0xb48cff])); g.fillCircle(p.x, p.y, 5);
    g.fillStyle(0xffe680); g.fillCircle(p.x, p.y, 2);
  }
}

// Görseli henüz olmayan yeni bina: renkli duvarlı, çatılı basit bir ev (tarla: sürülmüş toprak ve filizler)
function geciciCiz(g, k, rnd, tanim) {
  arsa(g, k, 0x86c05a);
  if (!tanim.cati) { // tarla
    const d = daralt(k, 0.82);
    sekil(g, [d.ust, d.sag, d.alt, d.sol], tanim.renk);
    g.lineStyle(3, koyulastir(tanim.renk, 0.75), 1);
    for (let t = 0.15; t < 1; t += 0.17) { const a = lerpN(d.sol, d.ust, t), b = lerpN(d.alt, d.sag, t); g.lineBetween(a.x, a.y, b.x, b.y); }
    for (let n = 0; n < 14; n++) { const p = lerpN(lerpN(d.sol, d.alt, rnd()), lerpN(d.ust, d.sag, rnd()), rnd()); g.fillStyle(0x6cc154); g.fillEllipse(p.x - 3, p.y - 4, 6, 9); g.fillEllipse(p.x + 3, p.y - 4, 6, 9); }
    return 10;
  }
  const d = daralt(k, 0.7, { x: 0, y: -4 }), h = tanim.yuksek ? 150 : 80;
  const yuz = kutu(g, d, h, tanim.renk);
  yuz.sol(0.38, 0.62, 0, 0.6, 0x8a5a3a);
  yuz.sagDaire(0.5, 0.6, 0.14, 0.2, 0xffd36b);
  cati(g, d, h, 70, tanim.cati, 1.2, koyulastir(tanim.cati, 0.8));
  return h + 70;
}
// İnşaat alanı (bina kurulana kadar): toprak, köşe kazıkları ve tahtalar
function temelCiz(g, k) {
  arsa(g, k, 0x86c05a);
  const d = daralt(k, 0.86);
  sekil(g, [d.ust, d.sag, d.alt, d.sol], 0xb08655);
  g.lineStyle(2, 0x8a6440, 0.8);
  for (let t = 0.2; t < 1; t += 0.2) { const a = lerpN(d.sol, d.alt, t), b = lerpN(d.ust, d.sag, t); g.lineBetween(a.x, a.y, b.x, b.y); }
  for (const n of [d.sol, d.alt, d.sag, d.ust]) { g.fillStyle(CIZGI); g.fillRect(n.x - 4, n.y - 34, 8, 36); g.fillStyle(0xd9b27a); g.fillRect(n.x - 2, n.y - 32, 4, 32); }
  g.lineStyle(2, 0xffffff, 0.8); g.strokePoints([yukari(d.sol, 26), yukari(d.alt, 26), yukari(d.sag, 26)], false);
  return 34;
}

// --- Binalar ---
const CIZIMLER = {
  kulucka(g, k) {
    arsa(g, k, 0x79b955);
    const d = daralt(k, 0.74, { x: 0, y: -6 }), h = 92;
    const yuz = kutu(g, d, h, 0xf3e3c3);
    yuz.sol(0.38, 0.62, 0, 0.62, 0x8a5a3a);
    yuz.solDaire(0.5, 0.62, 0.12, 0.12, 0x8a5a3a, false);
    yuz.sagDaire(0.3, 0.55, 0.13, 0.22, 0xffd36b);
    yuz.sagDaire(0.72, 0.55, 0.13, 0.22, 0xffd36b);
    const tepe = cati(g, d, h, 105, 0xf0c04e, 1.2, 0xc99a2e);
    sekil(g, elipsN(tepe.x, tepe.y + 52, 17, 22), 0xfff3dc); // yumurta tabelası
    // Kapının önünde yumurtalı yuva
    const on = lerpN(k.sol, k.alt, 0.25);
    yerElips(g, on.x + 10, on.y - 14, 26, 0xb88a56);
    for (const [dx, r] of [[-6, 0xffd9e4], [8, 0xdbeef5]]) sekil(g, elipsN(on.x + 10 + dx, on.y - 22, 8, 10), r);
    return h + 105;
  },
  tuzak(g, k, rnd) {
    arsa(g, k, 0x9cbf5e);
    const d = daralt(k, 0.6, { x: 10, y: -18 }), h = 70;
    const yuz = kutu(g, d, h, 0xb98055);
    g.lineStyle(2, 0x7a4f2e, 0.8);
    for (const v of [0.33, 0.66]) {
      const a = yuzNokta(d.sol, d.alt, h, 0, v), b = yuzNokta(d.sol, d.alt, h, 1, v), c = yuzNokta(d.alt, d.sag, h, 1, v);
      g.lineBetween(a.x, a.y, b.x, b.y); g.lineBetween(b.x, b.y, c.x, c.y);
    }
    yuz.sol(0.35, 0.65, 0, 0.7, 0x6e4528);
    yuz.sag(0.25, 0.75, 0.35, 0.8, 0xd9cfb8); // asılı ağ
    g.lineStyle(1.5, 0x8a7a62, 1);
    for (let u = 0.3; u < 0.75; u += 0.09) { const a = yuzNokta(d.alt, d.sag, h, u, 0.35), b = yuzNokta(d.alt, d.sag, h, u, 0.8); g.lineBetween(a.x, a.y, b.x, b.y); }
    cati(g, d, h, 62, 0x6aae4f, 1.22, 0x4e8a3a);
    // Önde çubukla kaldırılmış kafes tuzak
    const c = lerpN(k.alt, k.sol, 0.3), cy = c.y - 26;
    yerElips(g, c.x, cy + 6, 12, 0xe9c46a, false);
    g.lineStyle(3, CIZGI); g.lineBetween(c.x + 26, cy + 8, c.x + 18, cy - 20);
    g.lineStyle(2, 0x7a4f2e); g.lineBetween(c.x + 26, cy + 8, c.x + 18, cy - 20);
    const kafes = []; for (let t = 0; t <= 16; t++) { const a = Math.PI + t / 16 * Math.PI; kafes.push({ x: c.x - 4 + Math.cos(a) * 30, y: cy - 6 + Math.sin(a) * 30 }); }
    kafes.push({ x: c.x + 26, y: cy - 6 + 14 });
    g.lineStyle(3, CIZGI); g.strokePoints(kafes, false);
    g.lineStyle(1.5, 0x8a6a4a);
    for (let t = 1; t < 6; t++) { const a = Math.PI + t / 6 * Math.PI; g.lineBetween(c.x - 4 + Math.cos(a) * 30, cy - 6 + Math.sin(a) * 30, c.x - 4 + Math.cos(a) * 30 * 0.9, cy + 6); }
    cicekler(g, k, 3, rnd);
    return h + 62;
  },
  kusevi(g, k, rnd) {
    arsa(g, k, 0x79b955);
    const d = daralt(k, 0.46), h = 190;
    const yuz = kutu(g, d, h, 0xd7a56b);
    for (const v of [0.22, 0.52, 0.8]) {
      for (const [taraf, u] of [['solDaire', 0.5], ['sagDaire', 0.5]]) {
        yuz[taraf](u, v, 0.2, 0.07, 0x3e2a22);
      }
      const a = yuzNokta(d.sol, d.alt, h, 0.5, v - 0.09), b = yuzNokta(d.alt, d.sag, h, 0.5, v - 0.09);
      g.lineStyle(4, CIZGI); g.lineBetween(a.x - 8, a.y + 4, a.x + 8, a.y - 4); g.lineBetween(b.x - 8, b.y - 4, b.x + 8, b.y + 4);
      g.lineStyle(2, 0x8a5a3a); g.lineBetween(a.x - 7, a.y + 3.5, a.x + 7, a.y - 3.5); g.lineBetween(b.x - 7, b.y - 3.5, b.x + 7, b.y + 3.5);
    }
    // Sarmaşık
    for (let n = 0; n < 7; n++) {
      const p = yuzNokta(d.alt, d.sag, h, 0.1 + rnd() * 0.3, rnd() * 0.35);
      g.fillStyle(n % 2 ? 0x5fae4a : 0x4f9e3e); g.fillCircle(p.x, p.y, 7 + rnd() * 4);
    }
    cati(g, d, h, 80, 0xd9534a, 1.35, 0xa83a32);
    cicekler(g, k, 5, rnd);
    return h + 80;
  },
  kunduz(g, k, rnd) { // Gemini görseli gelene kadar: kütüklerden kubbe biçimli kunduz yuvası
    arsa(g, k, 0x79b955);
    const m = merkez(k), cx = m.x, cy = m.y - 4;
    for (let n = 0; n < 6; n++) { // üst üste kütük halkaları
      const r = 74 - n * 11, y = cy - n * 15;
      sekil(g, elipsN(cx, y, r, r * 0.42), n % 2 ? 0x9a6a44 : 0x8a5a3a);
      g.lineStyle(2, 0x6e4528, 0.8);
      for (let t = 0; t < 5; t++) { const a = rnd() * Math.PI; g.lineBetween(cx + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.38, cx + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.3); }
    }
    sekil(g, elipsN(cx - 18, cy + 4, 15, 20), 0x4a2e22); // kapı
    sekil(g, elipsN(cx + 30, cy - 30, 8, 8), 0xffd36b); // pencere
    cicekler(g, k, 3, rnd);
    return 110;
  },
  yemlik(g, k) {
    const m = merkez(k);
    yerElips(g, m.x, m.y, 30, 0x6aa8d8);
    g.fillStyle(CIZGI); g.fillRect(m.x - 6, m.y - 70, 12, 70);
    g.fillStyle(0xa5744b); g.fillRect(m.x - 3.5, m.y - 68, 7, 66);
    const tepsi = daralt(k, 0.62, { x: 0, y: -70 });
    sekil(g, [tepsi.ust, tepsi.sag, tepsi.alt, tepsi.sol], 0xb98552);
    for (let n = 0; n < 14; n++) { g.fillStyle(n % 3 ? 0xe9c46a : 0x5a4636); g.fillEllipse(m.x + Phaser.Math.Between(-22, 22), m.y - 70 + Phaser.Math.Between(-8, 8), 7, 4); }
    const cat = daralt(k, 0.7, { x: 0, y: -105 });
    sekil(g, [cat.sol, cat.alt, { x: m.x, y: m.y - 140 }], 0xd9534a);
    sekil(g, [cat.alt, cat.sag, { x: m.x, y: m.y - 140 }], 0xbb4038);
    return 140;
  },
};

function elipsN(x, y, rx, ry) { const n = []; for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; n.push({ x: x + Math.cos(t) * rx, y: y + Math.sin(t) * ry }); } return n; }

// Binayı haritaya yerleştirir; dokunma kontrolü ve derinlik bilgisini döndürür
// temel: bina henüz inşa ediliyor (Sv 0), yerinde inşaat alanı çizilir
export function binaKur(sahne, tip, i, j, rnd, temel = false) {
  const tanim = BINALAR[tip], [w, d] = tanim.boyut, k = karoKoseleri(i, j, w, d);
  let yukseklik, nesne;
  const meta = sahne.cache.json.get('binaMeta');
  if (temel) {
    nesne = sahne.add.graphics();
    yukseklik = temelCiz(nesne, k);
  } else if (sahne.textures.exists('bina_' + tip) && meta && meta[tip]) {
    // Gemini görseli: çimenli arsanın sol ve sağ köşesi karonun köşelerine oturur
    const M = meta[tip], koseY = (M.solY + M.sagY) / 2;
    nesne = sahne.add.image(k.sol.x, k.sol.y, 'bina_' + tip).setOrigin(M.solX / M.w, koseY / M.h);
    nesne.setScale((k.sag.x - k.sol.x) / (M.sagX - M.solX));
    if (tanim.ayna) nesne.setFlipX(true); // görsel sağ-sol simetrik arsada durduğu için köşeler yine oturur
    yukseklik = koseY * nesne.scaleY - (k.sol.y - k.ust.y);
  } else {
    nesne = sahne.add.graphics();
    yukseklik = CIZIMLER[tip] ? CIZIMLER[tip](nesne, k, rnd) : geciciCiz(nesne, k, rnd, tanim);
  }
  // Derinlik arsanın ortasından: bina gövdesinin arkasındaki kuş ve objeler arkada, önündekiler önde kalır
  // (eskiden ön köşeydi; çimen levhası kaldırılınca arsanın arka yarısındaki her şey binanın altında kalıyordu)
  nesne.setDepth(nesne.type === 'Image' ? (k.ust.y + k.alt.y) / 2 : k.alt.y);
  return { tip, tanim, i, j, k, nesne, seviye: 1, temel,
    kutu: new Phaser.Geom.Rectangle(k.sol.x, k.ust.y - yukseklik, k.sag.x - k.sol.x, k.alt.y - k.ust.y + yukseklik),
    tepe: { x: merkez(k).x, y: k.alt.y - (k.alt.y - k.ust.y) / 2 - yukseklik } };
}

// Süs: ağaç ve kaya
export function susKur(sahne, tip, i, j, rnd) {
  const k = karoKoseleri(i, j), m = merkez(k);
  if (tip === 'fener') { // Gemini feneri (kuş evi biçimli); gece ışığı pencerelerine oturur
    const f = dekorKoy(sahne, 'fener', m.x, m.y, 56);
    if (f) { f.isik = { x: m.x - 0.04 * f.displayWidth, y: m.y - (f.height * f.originY - 0.32 * f.height) * f.scaleY }; return f; }
  }
  if (tip === 'kaya') { // Gemini kayası
    const ad = Phaser.Utils.Array.GetRandom(['tas_kucuk', 'tas_grubu', 'kaya_yosunlu']);
    const f = dekorKoy(sahne, ad, m.x, m.y + 6, ad === 'tas_kucuk' ? 46 : 70, rnd() < 0.5);
    if (f) return f;
  }
  // Ağaç çeşitleri: 'agac_orman' ormana, 'agac_koy' köy içine uygun karışım (genişlik: dünya pikseli)
  const CESIT = {
    agac_orman: [['bina_agac', 0], ['bina_agac', 0], ['agac_cam', 120], ['agac_cam', 120], ['agac_hus', 130], ['agac_sogut', 160]],
    agac_koy: [['agac_elma', 140], ['agac_cicekli', 145], ['bina_agac', 0], ['agac_hus', 125]],
  };
  if (CESIT[tip]) {
    const [ad, en] = Phaser.Utils.Array.GetRandom(CESIT[tip]);
    if (ad !== 'bina_agac') {
      const f = dekorKoy(sahne, ad, m.x, m.y + 8, en * (0.85 + rnd() * 0.35), rnd() < 0.5);
      if (f) return f.setDepth(k.alt.y - 2);
    }
    tip = 'agac';
  }
  if (tip === 'agac' && sahne.textures.exists('bina_agac')) { // Gemini ağacı: gövde dibi karonun ortasında
    const M = sahne.cache.json.get('binaMeta').agac, s = (170 + rnd() * 70) / M.w;
    const a = sahne.add.image(m.x, m.y + 8, 'bina_agac').setOrigin(0.5, M.altY / M.h).setScale(s).setFlipX(rnd() < 0.5).setDepth(k.alt.y - 2);
    sallananEkle(sahne, a, 'bina_agac');
    return a;
  }
  const g = sahne.add.graphics().setDepth(k.alt.y - 2);
  if (tip === 'agac') {
    const s = 0.8 + rnd() * 0.4;
    yerElips(g, m.x, m.y + 4, 34 * s, 0x5f9e45, false);
    g.fillStyle(CIZGI); g.fillRoundedRect(m.x - 12 * s, m.y - 70 * s, 24 * s, 74 * s, 6);
    g.fillStyle(0x9a6a44); g.fillRoundedRect(m.x - 9 * s, m.y - 68 * s, 18 * s, 70 * s, 5);
    const tac = [[0, -110, 52], [-34, -86, 38], [34, -88, 40], [0, -140, 38]];
    for (const [dx, dy, r] of tac) { g.fillStyle(CIZGI); g.fillCircle(m.x + dx * s, m.y + dy * s, (r + 3) * s); }
    for (const [dx, dy, r] of tac) { g.fillStyle(dy < -120 ? 0x6cc154 : 0x5aac46); g.fillCircle(m.x + dx * s, m.y + dy * s, r * s); }
    g.fillStyle(0x86d468, 0.8); g.fillCircle(m.x - 14 * s, m.y - 140 * s, 13 * s); g.fillCircle(m.x - 40 * s, m.y - 96 * s, 9 * s);
  } else if (tip === 'kaya') {
    const s = 0.7 + rnd() * 0.5;
    sekil(g, elipsN(m.x, m.y - 10 * s, 30 * s, 20 * s), 0xa8a8a0);
    g.fillStyle(0xc8c8c0); g.fillEllipse(m.x - 8 * s, m.y - 18 * s, 22 * s, 10 * s);
  } else if (tip === 'fener') { // gece yanan sokak feneri
    g.setDepth(k.alt.y - 30);
    yerElips(g, m.x, m.y, 12, 0x6b6b66, false);
    g.fillStyle(CIZGI); g.fillRect(m.x - 4.5, m.y - 78, 9, 78);
    g.fillStyle(0x4a4a52); g.fillRect(m.x - 2.5, m.y - 76, 5, 74);
    sekil(g, [{ x: m.x - 13, y: m.y - 80 }, { x: m.x + 13, y: m.y - 80 }, { x: m.x + 10, y: m.y - 104 }, { x: m.x - 10, y: m.y - 104 }], 0xffe08a);
    sekil(g, [{ x: m.x - 16, y: m.y - 104 }, { x: m.x + 16, y: m.y - 104 }, { x: m.x, y: m.y - 118 }], 0x4a4a52);
    g.isik = { x: m.x, y: m.y - 92 };
  } else if (tip === 'cali') { // yuvarlak çalı (dekor görselleri gelene kadar)
    const s = 0.7 + rnd() * 0.6, top = [[-16, -14, 17], [14, -12, 16], [0, -24, 19]];
    yerElips(g, m.x, m.y + 2, 28 * s, 0x5f9e45, false);
    for (const [dx, dy, r] of top) { g.fillStyle(CIZGI); g.fillCircle(m.x + dx * s, m.y + dy * s, (r + 3) * s); }
    for (const [dx, dy, r] of top) { g.fillStyle(dy < -20 ? 0x6cc154 : 0x58a845); g.fillCircle(m.x + dx * s, m.y + dy * s, r * s); }
    g.fillStyle(0x86d468, 0.8); g.fillCircle(m.x - 6 * s, m.y - 30 * s, 6 * s);
  } else if (tip === 'cicek') {
    cicekler(g, daralt(k, 0.8), 6, rnd);
  }
  return g;
}
