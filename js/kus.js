// Parçalı (iskeletli) kuş: her parça ayrı çizilir, animasyonu kod oynatır.
// Yön kuralı: parçalar sağa bakan kuşa göre çizilir. Pozitif açı saat yönündedir;
// geriye (-x) uzanan bir kanat/kuyruk için pozitif açı ucu yukarı kaldırır.
import { TURLER, paletOlustur, koyulastir, tohumluRastgele } from './turler.js';
import { GORSEL_TURLER, ONAYLI, boyaliDoku } from './kusGorsel.js';
import { cevreSesiCal } from './ses.js';

const CIZGI = 0x3a2a35;
const KALIN = 2.6;
const AYAK_Y = 35;
const AGIZ = { ust: 0.12, alt: 0.3 }; // gaga tam açıkken üst gaganın kalkışı ve alt çenenin inişi (radyan) // gövde merkezinden ayak ucuna mesafe

const lerp = (a, b, t) => a + (b - a) * t;

// Yerdeyken, tünekteyken ve yuvadayken kuşun dinlenme pozları
const POZ = {
  zemin: { ezX: 1, ezY: 1, puf: 1, cokme: 0, basAci: 0, basX: 0, basY: 0, gagaAc: 0, kuyrukAci: 0, kanatAci: -0.25,
    cirp: 0, bacak: 1, gozAcik: 1, ibikAci: 0, egim: 0 },
};
POZ.tunek = { ...POZ.zemin, bacak: 0.45, cokme: 7, puf: 1.06 };
POZ.yuva = { ...POZ.zemin, bacak: 0, cokme: 12, puf: 1.14, gozAcik: 0.55 };

// --- Çizim yardımcıları ---
function elipsNoktalari(cx, cy, rx, ry, aci = 0, n = 30) {
  const c = Math.cos(aci), s = Math.sin(aci), noktalar = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    noktalar.push({ x: cx + x * c - y * s, y: cy + x * s + y * c });
  }
  return noktalar;
}

// Damla biçimli tüy: tabanı (bx,by) noktasında, -x yönünde uzanır ve ucu incelir
function tuyNoktalari(bx, by, boy, en, aci = 0, n = 26) {
  const c = Math.cos(aci), s = Math.sin(aci), noktalar = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const x = (Math.cos(a) - 1) * boy / 2;
    const y = Math.sin(a) * en / 2 * (0.3 + 0.7 * (1 + Math.cos(a)) / 2);
    noktalar.push({ x: bx + x * c - y * s, y: by + x * s + y * c });
  }
  return noktalar;
}

function doldur(g, noktalar, renk, alfa = 1) { g.fillStyle(renk, alfa); g.fillPoints(noktalar, true); }
function cevrele(g, noktalar, kalinlik = KALIN) { g.lineStyle(kalinlik, CIZGI, 1); g.strokePoints(noktalar, true, true); }
function sekil(g, noktalar, renk, cerceve = true) { doldur(g, noktalar, renk); if (cerceve) cevrele(g, noktalar); return noktalar; }

// --- Parça çizimleri ---
function kanatCiz(g, P, sk, arka, rnd, alaca) {
  const ana = arka ? koyulastir(P.kanat, 0.78) : P.kanat;
  const uc = arka ? koyulastir(P.kanatUc, 0.78) : P.kanatUc;
  // Uç tüyleri ana kanadın arkasından taşar
  [[-2, 0.06], [3, -0.08], [8, -0.24]].forEach(([y, a]) => sekil(g, tuyNoktalari(-20, y, 28, 10, a), uc));
  const govde = tuyNoktalari(6, 0, 50, 28, 0);
  doldur(g, govde, ana);
  if (!arka) {
    if (P.kanatBant) doldur(g, elipsNoktalari(-9, 2, 6, 10.5, 0.1), P.kanatBant);
    if (alaca) doldur(g, elipsNoktalari(-14 + rnd() * 10, -2 + rnd() * 5, 7, 5.5), P.karin);
    if (sk.desen === 'dalgali') {
      g.lineStyle(2, 0x1d1d1d, 0.9);
      for (const [x, y] of [[-4, -6], [-13, -7], [-22, -5], [-6, 1], [-15, 0], [-24, 1], [-10, 7], [-19, 7]]) {
        g.beginPath(); g.arc(x, y, 3.6, 0.2, Math.PI - 0.2); g.strokePath();
      }
    }
  }
  cevrele(g, govde);
}

function kuyrukCiz(g, P, sk) {
  const L = sk.kuyrukBoy;
  if (sk.kuyruk === 'yelpaze') {
    [[0.22, 12], [-0.22, 12], [0, 14]].forEach(([a, en]) => sekil(g, tuyNoktalari(4, 0, L, en, a), P.kuyruk));
  } else if (sk.kuyruk === 'uzun') {
    sekil(g, tuyNoktalari(4, 1, L * 0.8, 12, -0.1), koyulastir(P.kuyruk, 0.85));
    sekil(g, tuyNoktalari(4, 0, L, 11, 0.06), P.kuyruk);
  } else { // serit: ketzalın uzun kuyruk şeritleri
    sekil(g, tuyNoktalari(4, 2, L, 11, -0.06), koyulastir(P.kuyruk, 0.82));
    sekil(g, tuyNoktalari(4, 0, L * 0.92, 12, 0.05), P.kuyruk);
    sekil(g, tuyNoktalari(4, 0, 24, 15, 0.1), P.kuyruk);
  }
}

function govdeCiz(g, P, sk, rnd, alaca, tuy) {
  const govde = elipsNoktalari(0, 0, 31, 26, -0.18);
  doldur(g, govde, P.govde);
  if (P.sokum) doldur(g, elipsNoktalari(-21, 6, 8, 9), P.sokum);
  doldur(g, elipsNoktalari(8, 8, 21, 16.5, -0.3), P.karin);
  if (alaca) for (let i = 0; i < 3; i++) doldur(g, elipsNoktalari(-18 + rnd() * 20, -14 + rnd() * 14, 4 + rnd() * 4, 3.5 + rnd() * 3), P.karin);
  if (tuy < 0.15) doldur(g, elipsNoktalari(-4, -15, 14, 4.5, -0.15), 0xffffff, tuy < 0.07 ? 0.38 : 0.25);
  if (tuy > 0.6) { // mat tüylerde dağınık tüy uçları
    g.lineStyle(2.2, CIZGI, 0.8);
    for (const [x, y, a] of [[-14, -22, -1.9], [-6, -25, -1.6], [-24, -14, -2.4]]) g.lineBetween(x, y, x + Math.cos(a) * 6, y + Math.sin(a) * 6);
  }
  cevrele(g, govde);
}

function basCiz(g, P, sk) {
  const cx = 4, cy = -12, bas = elipsNoktalari(cx, cy, 21, 20, 0, 36);
  doldur(g, bas, P.bas);
  if (P.ense) doldur(g, bas.filter((n) => n.x < cx - 6), P.ense);
  if (P.tepe) doldur(g, bas.filter((n) => n.y < cy - 9), P.tepe);
  if (sk.desen === 'dalgali') {
    g.lineStyle(1.8, 0x1d1d1d, 0.9);
    for (const [x, y] of [[-10, -20], [-7, -13], [-12, -7], [-4, -24], [-3, -18]]) { g.beginPath(); g.arc(x, y, 3, 0.2, Math.PI - 0.2); g.strokePath(); }
  }
  if (P.maske) doldur(g, elipsNoktalari(17, -10, 8.5, 9.5), P.maske);
  if (P.gerdan) doldur(g, elipsNoktalari(15, 4, 8.5, 5.5, -0.2), P.gerdan);
  if (sk.gerdanBenek) { g.fillStyle(0x1d1d1d, 1); g.fillCircle(14, 5, 1.8); g.fillCircle(19, 3.5, 1.8); }
  if (P.yanak && sk.yanakBoy) doldur(g, elipsNoktalari(10, -3, sk.yanakBoy, sk.yanakBoy * 0.85), P.yanak);
  else doldur(g, elipsNoktalari(11, -2, 5, 3), 0xff8fa0, 0.45); // sevimli allık
  if (P.gozHalka) doldur(g, elipsNoktalari(13, -15, 7.5, 8.5), P.gozHalka);
  cevrele(g, bas);
}

function ibikCiz(g, P, sk) {
  if (sk.ibik === 'sultan') {
    [[24, 1.0, 2], [28, 1.22, 0], [20, 1.45, -2]].forEach(([boy, a, x]) => sekil(g, tuyNoktalari(x, 4, boy, 7.5, a), P.ibik));
  } else if (sk.ibik === 'tuylu') {
    [[-4, -1, 8], [4, -4, 9.5], [11, -1, 8]].forEach(([x, y, r]) => sekil(g, elipsNoktalari(x, y, r, r * 0.9), P.ibik));
  }
}

function gagaCiz(ust, alt, P, sk) {
  if (sk.gaga === 'kanca') {
    sekil(ust, [{ x: -3, y: -6 }, { x: 5, y: -6.5 }, { x: 10, y: -2 }, { x: 10, y: 3 }, { x: 7, y: 6 }, { x: 5.5, y: 2 }, { x: -3, y: 2 }], P.gaga);
    sekil(alt, [{ x: 0, y: 0 }, { x: 7, y: 0 }, { x: 5, y: 4 }, { x: 0, y: 4 }], koyulastir(P.gaga, 0.9));
  } else {
    sekil(ust, [{ x: -2, y: -4.5 }, { x: 11, y: 0.5 }, { x: -2, y: 2 }], P.gaga);
    sekil(alt, [{ x: 0, y: 0 }, { x: 9, y: -0.5 }, { x: 0, y: 3.2 }], koyulastir(P.gaga, 0.88));
  }
}

function gozCiz(g, mutluG, P) {
  doldur(g, elipsNoktalari(0, 0, 4.6, 6), P.goz);
  g.fillStyle(0xffffff, 1); g.fillCircle(1.4, -2.2, 1.8); g.fillCircle(-1.3, 1.9, 0.9);
  mutluG.lineStyle(2.8, CIZGI, 1); mutluG.beginPath(); mutluG.arc(0, 2.5, 5, Math.PI + 0.35, Math.PI * 2 - 0.35); mutluG.strokePath();
}

function bacakCiz(g, P) {
  g.lineStyle(5.5, CIZGI, 1); g.lineBetween(0, 0, 0, 17); g.lineBetween(-4, 17.5, 7, 17.5);
  g.lineStyle(3, P.bacak, 1); g.lineBetween(0, 0, 0, 17); g.lineBetween(-4, 17.5, 7, 17.5);
}

export class Kus {
  // secenek.olcek: köyde kuşları küçültmek için çarpan; secenek.alan: kuşun gezinebileceği dikdörtgen
  constructor(sahne, x, y, gen, secenek = {}) {
    this.sahne = sahne;
    this.onizleme = !!secenek.onizleme;
    this.yakinPlan = !!secenek.yakinPlan; // Kuş Evi: gaga açılmaz, şakıma gerdan ve baş hareketiyle olur
    // atölyede onay bekleyen çizimler de gösterilir
    this.carpan = secenek.olcek || 1;
    this.alan = secenek.alan || sahne.zemin;
    this.p = { ...POZ.zemin, x, y, yuk: 0, yon: 1 };
    this.yer = 'zemin';
    this.durum = 'bos';
    this.no = 0;
    this.mesgul = false;
    this.bosSayac = 1500;
    this.kirpSayac = 2000; this.kirpiyor = 0;
    this.kanatFaz = 0; this.cirpHiz = 0;
    this.nefesFaz = 0; this.nefesHiz = 0.9; this.nefesGenlik = 0.028;
    this.parlamaSayac = 0;

    const ekle = (ebeveyn, x0, y0, cocuk) => {
      const c = cocuk ? cocuk.setPosition(x0, y0) : sahne.add.container(x0, y0);
      ebeveyn.add(c);
      return c;
    };
    this.kok = sahne.add.container(x, y);
    this.golge = sahne.add.ellipse(0, 0, 58, 15, 0x2a3a20, 0.22);
    this.kok.add(this.golge);
    this.yonC = ekle(this.kok, 0, 0);
    this.kalk = ekle(this.yonC, 0, 0);
    this.ez = ekle(this.kalk, 0, 0); // esneme/ezilme ayak hizasından olur
    this.govdeKok = ekle(this.ez, 0, -AYAK_Y);

    const g = () => sahne.add.graphics();
    const r = () => sahne.add.image(0, 0, '__WHITE').setVisible(false); // çizim görseli için yer tutucu
    this.kanatArka = ekle(this.govdeKok, 0, 0); this.gKanatArka = ekle(this.kanatArka, 0, 0, g()); this.iKanatArka = ekle(this.kanatArka, 0, 0, r());
    this.kuyruk = ekle(this.govdeKok, 0, 0); this.gKuyruk = ekle(this.kuyruk, 0, 0, g()); this.iKuyruk = ekle(this.kuyruk, 0, 0, r());
    this.bacakA = ekle(this.govdeKok, 0, 0); this.gBacakA = ekle(this.bacakA, 0, 0, g()); this.iBacakA = ekle(this.bacakA, 0, 0, r());
    this.bacakB = ekle(this.govdeKok, 0, 0); this.gBacakB = ekle(this.bacakB, 0, 0, g()); this.iBacakB = ekle(this.bacakB, 0, 0, r());
    this.gGovde = ekle(this.govdeKok, 0, 0, g()); this.iGovde = ekle(this.govdeKok, 0, 0, r()); this.gGovdeUst = ekle(this.govdeKok, 0, 0, g());
    this.bas = ekle(this.govdeKok, 0, 0);
    this.ibik = ekle(this.bas, 0, -28); this.gIbik = ekle(this.ibik, 0, 0, g()); this.iIbik = ekle(this.ibik, 0, 0, r());
    this.gBas = ekle(this.bas, 0, 0, g()); this.iBas = ekle(this.bas, 0, 0, r()); this.gBasUst = ekle(this.bas, 0, 0, g());
    this.goz = ekle(this.bas, 0, 0); this.gGoz = ekle(this.goz, 0, 0, g()); this.gMutluGoz = ekle(this.goz, 0, 0, g());
    // Alt gaga üst gaganın arkasında: kapalıyken gizlenir, açılınca görünür
    this.gaga = ekle(this.bas, 0, 0);
    this.gAgiz = ekle(this.gaga, 0, 0, g()); // açık gagada görünen ağız içi
    this.gagaAltC = ekle(this.gaga, 0, 0); this.gGagaAlt = ekle(this.gagaAltC, 0, 0, g()); this.iGagaAlt = ekle(this.gagaAltC, 0, 0, r());
    this.gGagaUst = ekle(this.gaga, 0, 0, g()); this.iGagaUst = ekle(this.gaga, 0, 0, r());
    this.kanatOn = ekle(this.govdeKok, 0, 0); this.gKanatOn = ekle(this.kanatOn, 0, 0, g()); this.iKanatOn = ekle(this.kanatOn, 0, 0, r());
    this.grafikler = [this.gKanatArka, this.gKuyruk, this.gBacakA, this.gBacakB, this.gGovde, this.gGovdeUst, this.gIbik, this.gBas, this.gBasUst,
      this.gGoz, this.gMutluGoz, this.gGagaUst, this.gGagaAlt, this.gKanatOn, this.gAgiz];
    this.govdeKok.bringToTop(this.bas); // kanat yukarı kalktığında başın arkasında kalsın
    this.resimler = [this.iIbik, this.iKanatArka, this.iKuyruk, this.iBacakA, this.iBacakB, this.iGovde, this.iBas, this.iGagaUst, this.iGagaAlt, this.iKanatOn];

    this.genAyarla(gen);
  }

  genAyarla(gen) {
    this.gen = gen;
    const tur = TURLER[gen.tur], P = paletOlustur(gen), sk = tur.sekil;
    this.tur = tur;
    this.palet = P;
    const rnd = tohumluRastgele(gen.tohum), alaca = gen.mutasyon === 'alaca';
    const boyutSapma = 0.96 + rnd() * 0.08;
    this.olcek = 2.2 * tur.boyut * boyutSapma * this.carpan;
    this.kok.setScale(this.olcek);
    for (const gr of this.grafikler) gr.clear();
    const G = GORSEL_TURLER[gen.tur];
    this.gorsel = G && this.sahne.textures.exists(`kus_${gen.tur}_govde`) && (ONAYLI.includes(gen.tur) || this.onizleme) ? G : null;
    for (const im of this.resimler) im.setVisible(!!this.gorsel).clearTint();
    if (this.gorsel) return this.gorselKur(this.gorsel, gen, P, rnd, alaca);

    // Kodla çizilen kuş
    const yer = (c, x, y) => c.setPosition(x, y);
    yer(this.kanatArka, 8, -13); yer(this.kuyruk, -24, 8); yer(this.bacakA, -3, 18); yer(this.bacakB, 7, 18);
    yer(this.bas, 16, -14); yer(this.ibik, 0, -28); yer(this.goz, 13, -15);
    this.ayakY = AYAK_Y; yer(this.gaga, 23, -12); yer(this.gagaAltC, -2, 2); yer(this.kanatOn, 2, -8);
    this.goz.setScale(1);
    this.basTaban = [16, -14];
    kanatCiz(this.gKanatArka, P, sk, true, rnd, false);
    kuyrukCiz(this.gKuyruk, P, sk);
    bacakCiz(this.gBacakA, P); bacakCiz(this.gBacakB, P);
    govdeCiz(this.gGovde, P, sk, rnd, alaca, gen.tuy);
    ibikCiz(this.gIbik, P, sk);
    basCiz(this.gBas, P, sk);
    gozCiz(this.gGoz, this.gMutluGoz, P);
    gagaCiz(this.gGagaUst, this.gGagaAlt, P, sk);
    kanatCiz(this.gKanatOn, P, sk, false, rnd, alaca);
    this.kuyrukTaban = sk.kuyruk === 'serit' ? -0.62 : -0.45;
  }

  // Gemini çizimlerinden kesilen parçalarla kuş
  gorselKur(G, gen, P, rnd, alaca) {
    const doku = (parca) => boyaliDoku(this.sahne, gen.tur, parca, gen);
    const yerles = (im, parca, ayar, x = 0, y = 0) => {
      im.setTexture(doku(parca)).setOrigin(...(ayar.orj || [0.5, 0.5])).setPosition(x, y);
      im.setScale(ayar.en ? ayar.en / im.width : ayar.boy / im.height);
    };
    yerles(this.iGovde, 'govde', G.govde, G.govde.x, G.govde.y);
    this.bas.setPosition(...G.boyun); this.basTaban = G.boyun;
    yerles(this.iBas, 'bas', G.bas, G.bas.x, G.bas.y);
    this.goz.setPosition(...G.goz).setScale(G.gozOlcek || 1.15);
    this.gaga.setPosition(...G.gaga);
    yerles(this.iGagaUst, 'gagaUst', G.gagaUst);
    // Koni gaga: tam gaga ağız çizgisinden bölünmüş iki parça olarak açılır (ayrı çene çizilmez)
    const cizgi = this.sahne.cache.json.get(`gagaCizgi_${gen.tur}`);
    this.gagaBol = !!cizgi && this.sahne.textures.exists(`kus_${gen.tur}_gagaUstBol`);
    if (this.gagaBol) {
      yerles(this.iGagaUst, 'gagaUstBol', G.gagaUst);
      this.gagaAltC.setPosition(0, 0);
      yerles(this.iGagaAlt, 'gagaAltBol', G.gagaUst);
      this.gGagaAlt.clear();
      this.agizCizgisi = cizgi.cizgi; this.kontur = null; this.kanca = false; this.agizAci = AGIZ;
    } else this.cenesiCiz(P);
    this.kanatOn.setPosition(G.kanat.x, G.kanat.y);
    this.kanatArka.setPosition(G.kanatArka.x, G.kanatArka.y);
    this.kuyruk.setPosition(G.kuyruk.x, G.kuyruk.y);
    yerles(this.iKuyruk, 'kuyruk', G.kuyruk);
    G.bacaklar.forEach(([x, y], n) => { const c = n ? this.bacakB : this.bacakA; c.setPosition(x, y); yerles(n ? this.iBacakB : this.iBacakA, 'bacak', G.bacak); });
    this.ayakY = G.ayakY || AYAK_Y;
    if (G.ibik) { this.ibik.setPosition(G.ibik.x, G.ibik.y); yerles(this.iIbik, 'ibik', G.ibik); } else this.iIbik.setVisible(false);
    this.kanatAcikMi = null; this.kanatGorsel(false);
    this.kuyrukTaban = 0;

    // Gövde üstü: karın, alaca lekeleri, tüy parlaklığı / dağınıklığı
    const g = this.gGovdeUst, K = G.karin;
    if (K) doldur(g, elipsNoktalari(K.x, K.y, K.rx, K.ry, -0.25), P.karin, 0.9);
    if (alaca) for (let i = 0; i < 3; i++) doldur(g, elipsNoktalari(-20 + rnd() * 18, -12 + rnd() * 16, 4 + rnd() * 4, 3.5 + rnd() * 3), P.karin);
    if (gen.tuy < 0.15) doldur(g, elipsNoktalari(-8, -18, 12, 4, -0.3), 0xffffff, gen.tuy < 0.07 ? 0.4 : 0.26);
    if (gen.tuy > 0.6) {
      g.lineStyle(2.2, CIZGI, 0.8);
      for (const [x, y, a] of [[-18, -18, -2.1], [-26, -8, -2.6], [-10, -26, -1.8]]) g.lineBetween(x, y, x + Math.cos(a) * 6, y + Math.sin(a) * 6);
    }
    gozCiz(this.gGoz, this.gMutluGoz, P);
    doldur(this.gBasUst, elipsNoktalari(G.goz[0] - 4, G.goz[1] + 9, 4.5, 2.6), 0xff8fa0, 0.4); // allık
  }

  // Görselli kuşların alt çenesi ve ağız içi: Gemini'nin ayrı alt gaga çizimleri güvenilmez olduğu için kodla çizilir.
  // Gaga kapalıyken ikisi de gizlidir; açılırken çene gaga renginde ve dış çizgili olarak aşağı iner.
  // Gaga görselinin alt kenar çizgisi (yerel birimde), dipten uca. Doku başına bir kez hesaplanır.
  gagaAltKonturu() {
    const b = this.iGagaUst, anahtar = b.texture.key;
    const onbellek = Kus.konturlar || (Kus.konturlar = {});
    if (!onbellek[anahtar]) {
      const kaynak = b.texture.getSourceImage(), W = kaynak.width, H = kaynak.height;
      const tuval = document.createElement('canvas'); tuval.width = W; tuval.height = H;
      const ctx = tuval.getContext('2d'); ctx.drawImage(kaynak, 0, 0);
      const d = ctx.getImageData(0, 0, W, H).data, dolu = (x, y) => d[(y * W + x) * 4 + 3] > 128;
      let uc = W - 1;
      while (uc > 0 && ![...Array(H).keys()].some((y) => dolu(uc, y))) uc--;
      const x0 = Math.round(b.originX * W), noktalar = [];
      for (let n = 0; n <= 10; n++) {
        const x = Math.round(x0 + (uc - x0) * n / 10 * 0.97);
        let y = H - 1; while (y > 0 && !dolu(x, y)) y--;
        noktalar.push([x / W, y / H]);
      }
      // Piksel basamaklarını yumuşat (kesik kesik çizgi olmasın)
      onbellek[anahtar] = noktalar.map((n, i) => { const a = noktalar[Math.max(0, i - 1)], c = noktalar[Math.min(noktalar.length - 1, i + 1)]; return [n[0], (a[1] + 2 * n[1] + c[1]) / 4]; });
    }
    const w = b.displayWidth, h = b.displayHeight;
    return onbellek[anahtar].map(([u, v]) => ({ x: (u - b.originX) * w, y: (v - b.originY) * h }));
  }

  // Alt çene: üst gaganın alt kenarına yapışık, uca doğru incelen parça. Kapalıyken üst gaganın arkasında gizlidir.
  cenesiCiz(P) {
    const b = this.iGagaUst, h = b.displayHeight;
    this.gagaAltC.setPosition(0, 0);
    this.iGagaAlt.setVisible(false);
    const k = this.gagaAltKonturu();
    // Kanca gaga (papağanlar): alt kenar uca doğru aşağı kıvrılır; çene kısa kalır, gerçek papağanlardaki gibi kancanın altında
    const kanca = this.tur.sekil.gaga === 'kanca'; // türler.js: papağanlar
    const M = kanca ? 5 : 8;
    this.kontur = k; this.ceneM = M; this.kanca = kanca;
    // Koni gaga: alt çene iner. Kanca gaga: kanca kalkar, altta ince bir alt çene sabit kalır
    this.agizAci = kanca ? { ust: 0.24, alt: 0 } : AGIZ;
    const ust = k.slice(0, M + 1).map((n) => ({ x: n.x, y: n.y - 0.1 * h }));
    const kalinlik = kanca ? 0.09 : 0.16;
    const alt = k.slice(0, M + 1).map((n, i) => ({ x: n.x, y: n.y + (kalinlik * h) * Math.pow(1 - i / M, 0.8) - 0.05 * h })).reverse();
    const cene = [...ust, ...alt];
    const c = this.gGagaAlt;
    c.clear();
    if (kanca) return; // papağan: alt çene çizilmez, kalkan kancanın altında sadece ağız içi görünür
    c.fillStyle(koyulastir(P.gaga, 0.88), 1); c.fillPoints(cene, true);
    c.lineStyle(Math.max(0.6, h * 0.05), 0x5b2340, 1); c.strokePoints(cene, true, true);
  }

  // Ağız içi: üst gaganın (kalkmış) alt kenarı ile çenenin (inmiş) üst kenarı arasındaki alan
  agizCiz(ac) {
    const a = this.gAgiz, k = this.kontur;
    a.clear();
    if (ac <= 0.04) return;
    if (this.gagaBol) { // ağız içi: ağız çizgisinin kalkan üst ve inen alt kopyası arasında
      const b = this.iGagaUst, w = b.displayWidth, h = b.displayHeight, A = this.agizAci;
      const don = (n, t) => ({ x: n.x * Math.cos(t) - n.y * Math.sin(t), y: n.x * Math.sin(t) + n.y * Math.cos(t) });
      const L = this.agizCizgisi.map(([u, v]) => ({ x: (u - b.originX) * w, y: (v - b.originY) * h }));
      a.fillStyle(0x6e2434, 1);
      a.fillPoints([...L.map((n) => don(n, -ac * A.ust)), ...L.map((n) => don(n, ac * A.alt)).reverse()], true);
      const o = L[Math.floor(L.length * 0.4)], dil = don({ x: o.x, y: o.y + 0.04 * h }, ac * A.alt * 0.7);
      a.fillStyle(0xe2788a, 1); a.fillEllipse(dil.x, dil.y, Math.abs(L[L.length - 1].x - L[0].x) * 0.45, 0.08 * h);
      return;
    }
    if (!k) return;
    const h = this.iGagaUst.displayHeight, M = this.ceneM || 8;
    const don = (n, t) => ({ x: n.x * Math.cos(t) - n.y * Math.sin(t), y: n.x * Math.sin(t) + n.y * Math.cos(t) });
    const ustKenar = k.slice(0, (this.kanca ? 10 : M) + 1).map((n) => don({ x: n.x, y: n.y - 0.06 * h }, -ac * this.agizAci.ust));
    const altKenar = this.kanca
      ? k.map((n) => ({ x: n.x, y: n.y - 0.02 * h })).reverse() // kanca: ağız, gaganın eski alt kenarına kadar
      : k.slice(0, M + 1).map((n) => don({ x: n.x, y: n.y - 0.1 * h }, ac * this.agizAci.alt)).reverse();
    a.fillStyle(0x6e2434, 1); a.fillPoints([...ustKenar, ...altKenar], true);
    const dil = don({ x: k[Math.round(M / 2)].x, y: k[Math.round(M / 2)].y - 0.08 * h }, ac * this.agizAci.alt * 0.8);
    a.fillStyle(0xe2788a, 1); a.fillEllipse(dil.x, dil.y, Math.abs(k[M].x - k[0].x) * 0.55, 0.1 * h);
  }
  // Katlı kanat ile açık (uçuş) kanadı arasında geçiş
  kanatGorsel(acik) {
    if (this.kanatAcikMi === acik || !this.gorsel) return;
    this.kanatAcikMi = acik;
    const G = this.gorsel, ayar = acik ? { ...G.kanat, ...G.acikKanat } : G.kanat;
    for (const im of [this.iKanatOn, this.iKanatArka]) {
      im.setTexture(boyaliDoku(this.sahne, this.gen.tur, acik ? 'acikKanat' : 'kanat', this.gen)).setOrigin(...ayar.orj);
      im.setScale(ayar.en / im.width).setFlipX(acik && !!ayar.ters);
    }
    this.iKanatArka.setTint(0xc9bba8);
  }

  // --- Yardımcılar ---
  tw(ozellik, sure, ease = 'Sine.easeInOut') {
    return new Promise((bitti) => this.sahne.tweens.add({ targets: this.p, ...ozellik, duration: sure, ease, onComplete: bitti }));
  }
  bekle(ms) { return new Promise((bitti) => this.sahne.time.delayedCall(ms, bitti)); }
  dunyaKonumu(parca) { const m = parca.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; }
  yuz(dx) {
    const y = Math.sign(dx);
    if (y && y !== Math.sign(this.p.yon) && Math.abs(dx) > 3) this.sahne.tweens.add({ targets: this.p, yon: y, duration: 160, ease: 'Sine.easeInOut' });
  }
  dinlenmeNefesi() {
    if (this.yer === 'yuva') { this.nefesHiz = 0.45; this.nefesGenlik = 0.045; } else { this.nefesHiz = 0.9; this.nefesGenlik = 0.028; }
  }

  // Yeni bir eylem başlatır: önceki eylemi iptal eder, kuşu bulunduğu yerin pozuna getirir
  async basla(durum, sure = 160) {
    const no = ++this.no;
    this.sahne.tweens.killTweensOf(this.p);
    this.durum = durum; this.mesgul = false; this.p.mutlu = false;
    this.dinlenmeNefesi();
    if (Math.abs(this.p.yon) !== 1) this.p.yon = this.p.yon < 0 ? -1 : 1;
    if (this.yer === 'hava') return no; // havadaysa uçmaya devam eder, eylem önce indirir
    this.cirpHiz = 0;
    await this.tw({ ...POZ[this.yer], ...(this.yer === 'zemin' ? { yuk: 0 } : {}) }, sure);
    return no;
  }
  bitir(no) { if (this.no === no) { this.durum = 'bos'; this.mesgul = false; this.bosSayac = 1200 + Math.random() * 2000; } }

  // --- Hareket temelleri ---
  async zipla(hx, hy, no) {
    const p = this.p, ok = () => this.no === no;
    this.yuz(hx - p.x);
    await this.bekle(120);
    for (;;) {
      if (!ok()) return false;
      const dx = hx - p.x, dy = hy - p.y, d = Math.hypot(dx, dy);
      if (d < 4) break;
      const adim = Math.min(d, 36 * this.carpan), nx = p.x + dx / d * adim, ny = p.y + dy / d * adim;
      await this.tw({ ezY: 0.86, ezX: 1.08 }, 70, 'Quad.easeOut'); if (!ok()) return false;
      this.tw({ x: nx, y: ny }, 230, 'Linear');
      this.tw({ ezY: 1.07, ezX: 0.94, kanatAci: -0.1 }, 115).then(() => ok() && this.tw({ ezY: 1, ezX: 1, kanatAci: -0.25 }, 115));
      await this.tw({ yuk: 18 * this.carpan }, 115, 'Quad.easeOut'); if (!ok()) return false;
      await this.tw({ yuk: 0 }, 115, 'Quad.easeIn'); if (!ok()) return false;
    }
    await this.tw({ ezY: 0.9, ezX: 1.06 }, 60); if (!ok()) return false;
    await this.tw({ ezY: 1, ezX: 1 }, 140, 'Back.easeOut');
    return ok();
  }

  // Uçuş: kalkış → kanat çırpma (uzun yolda süzülme) → istenirse konma
  async uc(hx, hy, hyuk, no, kon = true) {
    const p = this.p, ok = () => this.no === no;
    this.yuz(hx - p.x);
    if (p.cirp < 0.5) { // yerden kalkış: çömel ve sıçra
      await this.tw({ ezY: 0.8, ezX: 1.12, kanatAci: 0.2 }, 120, 'Quad.easeOut'); if (!ok()) return false;
      this.tw({ ezY: 1.08, ezX: 0.94 }, 120).then(() => ok() && this.tw({ ezY: 1, ezX: 1 }, 160));
    }
    if (!this.yerRezerve) this.yerBirak(); // konduğu yerden kalkınca yeri boşalır
    this.yer = 'hava';
    this.cirpHiz = 30;
    this.tw({ cirp: 1, bacak: 0.2, egim: 0.18, cokme: 0, puf: 1, kanatAci: 0.5 }, 200);
    const x0 = p.x, y0 = p.y, a0 = p.yuk;
    const mesafe = Math.hypot(hx - x0, (hy - hyuk) - (y0 - a0));
    const c = this.carpan, sure = 500 + mesafe * 1.7 / c, tepe = Math.min(170 * c, 50 * c + mesafe * 0.25), uzun = sure > 1200;
    const ilerleme = { t: 0 };
    let inis = false;
    await new Promise((bitti) => this.sahne.tweens.add({
      targets: ilerleme, t: 1, duration: sure, ease: 'Sine.easeInOut', onComplete: bitti,
      onUpdate: () => {
        if (!ok()) return;
        const t = ilerleme.t;
        p.x = lerp(x0, hx, t); p.y = lerp(y0, hy, t);
        p.yuk = lerp(a0, hyuk, t) + Math.sin(Math.PI * t) * tepe;
        if (uzun && !inis) { // ortada kısa süzülme
          const suzul = t > 0.38 && t < 0.58;
          p.cirp += ((suzul ? 0.12 : 1) - p.cirp) * 0.12;
          this.cirpHiz = suzul ? 14 : 30;
        }
        if (kon && !inis && t > 0.74) {
          inis = true; this.cirpHiz = 22;
          this.tw({ egim: -0.28, bacak: 1, cirp: 1 }, 260);
        }
      },
    }));
    if (!ok()) return false;
    if (!kon) return true;
    // Konma: ayaklar değer, gövde ezilir, kanatlar toplanır
    this.cirpHiz = 0;
    this.tw({ cirp: 0, egim: 0, kanatAci: -0.25 }, 220);
    await this.tw({ ezY: 0.8, ezX: 1.13 }, 90, 'Quad.easeOut'); if (!ok()) return false;
    await this.tw({ ezY: 1, ezX: 1 }, 200, 'Back.easeOut');
    this.yer = 'zemin';
    return ok();
  }

  async zemineIn(no) {
    if (this.yer === 'zemin' && this.p.yuk < 2) return true;
    const A = this.alan, hx = Phaser.Math.Clamp(this.p.x + this.p.yon * 110 * this.carpan, A.x1, A.x2);
    return this.uc(hx, Phaser.Math.Clamp(this.p.y, A.y1, A.y2), 0, no);
  }

  // --- Oyuncunun tetiklediği animasyonlar ---
  async git(x, y) {
    const no = await this.basla('yuruyor'); if (this.no !== no) return;
    const uzak = Math.hypot(x - this.p.x, y - this.p.y) > 320 * this.carpan;
    if (this.yer !== 'zemin' || uzak) { if (!await this.uc(x, y, 0, no)) return; } else if (!await this.zipla(x, y, no)) return;
    this.bitir(no);
  }

  async ucusGosterisi() {
    const no = await this.basla('ucus'); if (this.no !== no) return;
    const Z = this.alan, r = Phaser.Math.Between, c = this.carpan;
    for (let i = 0; i < 2; i++) if (!await this.uc(r(Z.x1, Z.x2), r(Z.y1, Z.y2), r(220, 360) * c, no, false)) return;
    if (!await this.uc(r(Z.x1 + 80, Z.x2 - 80), r(Z.y1 + 40, Z.y2 - 40), 0, no)) return;
    this.bitir(no);
  }

  async tune() {
    const no = await this.basla('tunuyor'); if (this.no !== no) return;
    const T = this.sahne.tunek;
    if (this.yer !== 'tunek') {
      if (!await this.uc(T.x, T.zeminY, T.yuk, no)) return;
      this.yer = 'tunek';
      await this.tw({ ...POZ.tunek }, 260); if (this.no !== no) return;
    }
    this.bitir(no);
  }

  async ye() {
    const no = await this.basla('yiyor'); const ok = () => this.no === no; if (!ok()) return;
    if (!await this.zemineIn(no)) return;
    const Y = this.sahne.yemlik, p = this.p;
    const hx = Y.x + (p.x < Y.x ? -72 : 72) * (this.olcek / 2.2), hy = Y.y - 4;
    if (Math.hypot(hx - p.x, hy - p.y) > 320) { if (!await this.uc(hx, hy, 0, no)) return; } else if (!await this.zipla(hx, hy, no)) return;
    this.yuz(Y.x - p.x); await this.bekle(180); if (!ok()) return;
    for (let i = 0; i < 4; i++) {
      await this.tw({ basAci: 1.25, basX: 4, basY: 14, egim: 0.32, ezY: 0.94, kuyrukAci: 0.25 }, 130, 'Quad.easeIn'); if (!ok()) return;
      this.sahne.efekt('tohum', this.dunyaKonumu(this.gaga), 3);
      await this.tw({ gagaAc: 1 }, 60); if (!ok()) return;
      await this.tw({ basAci: -0.12, basX: 0, basY: 0, egim: 0, ezY: 1, gagaAc: 0, kuyrukAci: 0 }, 180, 'Quad.easeOut'); if (!ok()) return;
      for (let j = 0; j < 2; j++) { await this.tw({ gagaAc: 0.55 }, 70); await this.tw({ gagaAc: 0 }, 70); }
      if (!ok()) return;
      await this.bekle(120 + Math.random() * 260); if (!ok()) return;
    }
    // Karnı doydu: memnun kuyruk sallama
    p.mutlu = true;
    this.sahne.efekt('kalp', this.dunyaKonumu(this.bas), 1);
    for (let i = 0; i < 3; i++) { await this.tw({ kuyrukAci: 0.3 }, 80); await this.tw({ kuyrukAci: -0.15 }, 80); }
    if (!ok()) return;
    await this.bekle(400); p.mutlu = false;
    await this.tw({ kuyrukAci: 0 }, 120);
    this.bitir(no);
  }

  async sevil() {
    const no = await this.basla('seviliyor', 100); const ok = () => this.no === no; if (!ok()) return;
    if (this.yer === 'hava' && !await this.zemineIn(no)) return;
    const p = this.p, taban = { ...POZ[this.yer === 'hava' ? 'zemin' : this.yer] };
    p.mutlu = true;
    this.sahne.efekt('kalp', this.dunyaKonumu(this.bas), 6);
    this.tw({ ibikAci: 0.45, basAci: -0.22, puf: taban.puf * 1.07, gozAcik: 1 }, 180);
    if (this.yer === 'zemin') {
      for (let i = 0; i < 2; i++) {
        await this.tw({ ezY: 0.84, ezX: 1.1 }, 80, 'Quad.easeOut'); if (!ok()) return;
        this.cirpHiz = 34; this.tw({ cirp: 1 }, 80);
        this.tw({ ezY: 1.08, ezX: 0.94 }, 140);
        await this.tw({ yuk: 30 * this.carpan }, 160, 'Quad.easeOut'); if (!ok()) return;
        await this.tw({ yuk: 0 }, 160, 'Quad.easeIn'); if (!ok()) return;
        this.tw({ cirp: 0 }, 120);
        await this.tw({ ezY: 0.9, ezX: 1.06 }, 70); if (!ok()) return;
      }
      await this.tw({ ezY: 1, ezX: 1 }, 140, 'Back.easeOut'); if (!ok()) return;
    } else {
      this.cirpHiz = 34; await this.tw({ cirp: 0.8 }, 120); if (!ok()) return;
      await this.bekle(600); if (!ok()) return;
      await this.tw({ cirp: 0 }, 160); if (!ok()) return;
    }
    for (let i = 0; i < 3; i++) { await this.tw({ kuyrukAci: 0.3, egim: 0.05 }, 90); await this.tw({ kuyrukAci: -0.15, egim: -0.05 }, 90); }
    if (!ok()) return;
    await this.bekle(350); if (!ok()) return;
    p.mutlu = false; this.cirpHiz = 0;
    await this.tw(taban, 260);
    this.bitir(no);
  }

  async kulucka() {
    const no = await this.basla('kulucka'); const ok = () => this.no === no; if (!ok()) return;
    const Y = this.sahne.yuva;
    if (this.yer !== 'yuva') {
      if (!await this.uc(Y.x, Y.y, 0, no)) return;
      this.sahne.yumurtaGoster(this.gen);
      this.yer = 'yuva';
      // Yumurtanın üstüne yerleşme kıpırtısı
      this.tw({ bacak: 0, cokme: 12 }, 260);
      for (let i = 0; i < 3; i++) { await this.tw({ egim: 0.12, puf: 1.1 }, 110); if (!ok()) return; await this.tw({ egim: -0.12 }, 110); if (!ok()) return; }
      await this.tw({ egim: 0, puf: 1.14 }, 160); if (!ok()) return;
      await this.tw({ gozAcik: 0.55 }, 700); if (!ok()) return;
    }
    this.dinlenmeNefesi();
    this.bitir(no);
  }

  async kanatCirp() {
    const no = await this.basla('cirpiyor'); const ok = () => this.no === no; if (!ok()) return;
    if (this.yer === 'hava' && !await this.zemineIn(no)) return;
    const p = this.p, yerde = this.yer === 'zemin';
    this.cirpHiz = 28;
    await this.tw({ cirp: 1, ezY: 1.06, ezX: 0.95, egim: -0.08 }, 160); if (!ok()) return;
    for (let i = 0; i < 4; i++) {
      await this.tw({ yuk: yerde ? 10 * this.carpan : p.yuk, egim: -0.14 }, 160); if (!ok()) return;
      await this.tw({ yuk: yerde ? 2 * this.carpan : p.yuk, egim: -0.04 }, 160); if (!ok()) return;
    }
    await this.tw({ cirp: 0, yuk: yerde ? 0 : p.yuk, ezY: 1, ezX: 1, egim: 0 }, 200); if (!ok()) return;
    this.cirpHiz = 0;
    await this.silkelen(no); if (!ok()) return;
    this.bitir(no);
  }


  // --- Kuş Evi'ne özel (tünekte) ---
  // Okşanma: gözler kapanır, baş parmağa doğru eğilir, tüyler hafifçe kabarır
  async oksan() {
    if (this.durum === 'oksaniyor') { this.oksamaSure = 900; return; }
    const no = await this.basla('oksaniyor', 120); const ok = () => this.no === no; if (!ok()) return;
    const taban = POZ[this.yer] || POZ.zemin;
    this.p.mutlu = true; this.oksamaSure = 900;
    this.tw({ basAci: 0.35, basY: 3, puf: taban.puf * 1.08, ibikAci: 0.3, kuyrukAci: 0.1 }, 260);
    while (ok() && this.oksamaSure > 0) {
      this.sahne.efekt('kalp', this.dunyaKonumu(this.bas), 1);
      await this.tw({ egim: 0.04 }, 220); if (!ok()) return;
      await this.tw({ egim: -0.02 }, 220); if (!ok()) return;
      this.oksamaSure -= 440;
    }
    if (!ok()) return;
    this.p.mutlu = false;
    await this.tw({ ...taban }, 300);
    this.bitir(no);
  }

  // Elden ikram yeme: boyun öne uzanır, gagalar, çiğner; sevdiği ikramsa sevinçle kanat çırpar
  async ikramYe(sevdi) {
    const no = await this.basla('ikram'); const ok = () => this.no === no; if (!ok()) return;
    const taban = POZ[this.yer] || POZ.zemin;
    this.yuz(1);
    await this.tw({ basAci: 0.45, basX: 9, basY: 4, egim: 0.12 }, 260); if (!ok()) return;
    for (let i = 0; i < 3; i++) {
      await this.tw({ gagaAc: 1, basX: 12 }, 90); if (!ok()) return;
      this.sahne.efekt('tohum', this.dunyaKonumu(this.gaga), 2);
      await this.tw({ gagaAc: 0, basX: 9 }, 110); if (!ok()) return;
    }
    await this.tw({ basAci: -0.1, basX: 0, basY: 0, egim: 0 }, 220); if (!ok()) return;
    for (let j = 0; j < 3; j++) { await this.tw({ gagaAc: 0.5 }, 70); await this.tw({ gagaAc: 0 }, 70); }
    if (!ok()) return;
    if (sevdi) {
      this.p.mutlu = true;
      this.sahne.efekt('kalp', this.dunyaKonumu(this.bas), 5);
      this.cirpHiz = 30; await this.tw({ cirp: 0.8 }, 120); if (!ok()) return;
      await this.bekle(700); if (!ok()) return;
      await this.tw({ cirp: 0 }, 160); this.cirpHiz = 0;
      this.p.mutlu = false;
    } else {
      this.p.mutlu = true; this.sahne.efekt('kalp', this.dunyaKonumu(this.bas), 1);
      await this.bekle(500); this.p.mutlu = false;
    }
    if (!ok()) return;
    await this.tw({ ...taban }, 200);
    this.bitir(no);
  }

  async temizlen() {
    const no = await this.basla('temizleniyor'); const ok = () => this.no === no; if (!ok()) return;
    const taban = POZ[this.yer] || POZ.zemin;
    await this.tw({ basAci: 1.5, basX: -10, basY: 9, kanatAci: -0.12 }, 260); if (!ok()) return;
    for (let i = 0; i < 5; i++) { await this.tw({ basAci: 1.62, gagaAc: 0.5 }, 90); await this.tw({ basAci: 1.45, gagaAc: 0 }, 90); if (!ok()) return; }
    await this.tw({ basAci: 0, basX: 0, basY: 0, kanatAci: taban.kanatAci }, 260); if (!ok()) return;
    await this.silkelen(no); if (!ok()) return;
    this.bitir(no);
  }

  // Mutsuz kuş: tüylerini kabartıp başını çevirir
  async kus() {
    const no = await this.basla('kusmus'); const ok = () => this.no === no; if (!ok()) return;
    const taban = POZ[this.yer] || POZ.zemin;
    await this.tw({ puf: taban.puf * 1.15, basAci: -0.25, basX: -4, gozAcik: 0.5 }, 400); if (!ok()) return;
    await this.bekle(1600); if (!ok()) return;
    await this.tw({ ...taban }, 400);
    this.bitir(no);
  }

  // --- Boştayken kendi kendine yaptıkları ---
  async silkelen(no) {
    const ok = () => this.no === no, taban = (POZ[this.yer] || POZ.zemin).puf;
    await this.tw({ puf: taban * 1.16 }, 120); if (!ok()) return;
    for (let i = 0; i < 4; i++) { await this.tw({ egim: 0.12 }, 45); await this.tw({ egim: -0.12 }, 45); if (!ok()) return; }
    this.sahne.efekt('tuy', this.dunyaKonumu(this.govdeKok), 2, this.palet.govde);
    await this.tw({ puf: taban, egim: 0 }, 160);
  }

  yerBirak() {
    const K = this.konduguYer;
    if (K && K.dolu === this) K.dolu = null;
    this.konduguYer = null;
  }

  // Boş bir konma yerine uçar. Kuş banyosundaysa su içip yıkanır, yemlikteyse tohum gagalar.
  async konmaYerineGit(no) {
    const ok = () => this.no === no, bos = this.sahne.konmaYerleri.filter((k) => !k.dolu);
    if (!bos.length) return;
    const K = Phaser.Utils.Array.GetRandom(bos), zy = K.taban + 2;
    this.yerBirak(); K.dolu = this; this.konduguYer = K; this.yerRezerve = true;
    const vardi = await this.uc(K.x, zy, zy - K.y, no);
    this.yerRezerve = false;
    if (!vardi) { this.yerBirak(); return; }
    this.yer = 'tunek';
    await this.tw({ ...POZ.tunek }, 220); if (!ok()) return;
    const tane = (tip, renk) => this.sahne.efekt(tip, this.dunyaKonumu(this.gaga), 2, renk);
    if (K.tip === 'banyo' || K.tip === 'yemlik') {
      for (let i = 0; i < 3; i++) {
        await this.tw({ basAci: 1.1, basX: 3, basY: 10, egim: 0.28 }, 150, 'Quad.easeIn'); if (!ok()) return;
        tane(K.tip === 'banyo' ? 'tuy' : 'tohum', K.tip === 'banyo' ? 0x8fd0ff : undefined);
        await this.tw({ basAci: K.tip === 'banyo' ? -0.35 : 0, basX: 0, basY: 0, egim: 0 }, 220, 'Quad.easeOut'); if (!ok()) return;
        await this.bekle(250 + Math.random() * 300); if (!ok()) return;
      }
      if (K.tip === 'banyo') { // yıkanma: kabarır, sallanır, su damlaları saçar
        await this.tw({ puf: POZ.tunek.puf * 1.18, cokme: POZ.tunek.cokme + 4 }, 160); if (!ok()) return;
        for (let i = 0; i < 6; i++) {
          await this.tw({ egim: 0.18 }, 50); await this.tw({ egim: -0.18 }, 50); if (!ok()) return;
          if (i % 2 === 0) this.sahne.efekt('tuy', this.dunyaKonumu(this.govdeKok), 2, 0x8fd0ff);
        }
        await this.tw({ puf: POZ.tunek.puf, cokme: POZ.tunek.cokme, egim: 0 }, 200); if (!ok()) return;
        await this.silkelen(no);
      }
    }
  }
  // Oyuncunun yıkattığı kuş (Kuş Banyosu): havuzun kenarına uçar, banyo sürdükçe suya dalıp çırpınır, sonunda parlayıp silkinir
  async banyoYap(K, devam) {
    const no = await this.basla('banyo'); const ok = () => this.no === no; if (!ok()) return;
    if (K.dolu && K.dolu !== this) { const o = K.dolu; o.yerBirak(); const A = o.alan; o.git(Phaser.Math.Between(A.x1, A.x2), Phaser.Math.Between(A.y1, A.y2)); } // yeri boşalt
    this.yerBirak(); K.dolu = this; this.konduguYer = K;
    const zy = K.taban + 2;
    if (this.yer !== 'tunek' || Math.hypot(this.p.x - K.x, this.p.y - zy) > 4) {
      if (!await this.uc(K.x, zy, zy - K.y, no)) return;
    }
    this.yer = 'tunek';
    await this.tw({ ...POZ.tunek }, 220); if (!ok()) return;
    const damla = (n = 2) => this.sahne.efekt('tuy', this.dunyaKonumu(this.govdeKok), n, 0x8fd0ff);
    while (devam()) {
      await this.tw({ basAci: 1.1, basX: 3, basY: 10, egim: 0.28 }, 150, 'Quad.easeIn'); if (!ok()) return;
      damla();
      await this.tw({ basAci: -0.35, basX: 0, basY: 0, egim: 0 }, 200, 'Quad.easeOut'); if (!ok()) return;
      await this.tw({ puf: POZ.tunek.puf * 1.18, cokme: POZ.tunek.cokme + 4 }, 140); if (!ok()) return;
      for (let i = 0; i < 6; i++) {
        await this.tw({ egim: 0.2, kanatAci: -0.5 }, 55); await this.tw({ egim: -0.2, kanatAci: -0.1 }, 55); if (!ok()) return;
        if (i % 2 === 0) damla(3);
      }
      await this.tw({ puf: POZ.tunek.puf, cokme: POZ.tunek.cokme, egim: 0, kanatAci: POZ.tunek.kanatAci }, 180); if (!ok()) return;
      await this.bekle(300 + Math.random() * 400); if (!ok()) return;
    }
    await this.silkelen(no); if (!ok()) return;
    this.sahne.efekt('yildiz', this.dunyaKonumu(this.govdeKok), 7, 0xfff3a0); // pırıl pırıl
    this.p.mutlu = true;
    await this.tw({ ibikAci: 0.45, basAci: -0.22 }, 200); await this.bekle(700); if (!ok()) return;
    this.p.mutlu = false;
    const A = this.alan;
    this.yerBirak();
    if (!await this.uc(Phaser.Math.Between(A.x1, A.x2), Phaser.Math.Between(A.y1, A.y2), 0, no)) return;
    this.bitir(no);
  }
  // Göletin ön kenarına uçar, üç kez su içer (suda halka açılır), silkelenir ve meydana döner
  async suIc(no) {
    const ok = () => this.no === no, p = this.p, S = this.sahne.su, A = this.alan, c = this.carpan;
    this.sahne.suIcen = this;
    const bitir = () => { if (this.sahne.suIcen === this) this.sahne.suIcen = null; };
    const a = Math.PI * (0.2 + Math.random() * 0.6), hx = S.x + Math.cos(a) * S.rx * 0.85, hy = S.y + Math.sin(a) * S.ry * 1.6; // öndeki taşların üstü
    if (!await this.uc(hx, hy, 0, no)) return bitir();
    this.yuz(S.x - p.x); await this.bekle(250); if (!ok()) return bitir();
    for (let i = 0; i < 3; i++) {
      await this.tw({ basAci: 1.25, basX: 4, basY: 14, egim: 0.32, ezY: 0.94 }, 160, 'Quad.easeIn'); if (!ok()) return bitir();
      const g = this.dunyaKonumu(this.gaga);
      if (this.sahne.halka) this.sahne.halka(g.x + 6 * c * Math.sign(p.yon), g.y + 8 * c, true);
      await this.tw({ basAci: -0.35, basX: 0, basY: 0, egim: -0.05, ezY: 1 }, 260, 'Quad.easeOut'); if (!ok()) return bitir(); // başı kaldırıp yutar
      await this.bekle(350 + Math.random() * 300); if (!ok()) return bitir();
    }
    await this.silkelen(no); if (!ok()) return bitir();
    bitir();
    await this.uc(Phaser.Math.Between(A.x1, A.x2), Phaser.Math.Between(A.y1, A.y2), 0, no);
  }
  async bosHareket() {
    const no = this.no, ok = () => this.no === no, p = this.p;
    this.mesgul = true;
    const secenekler = this.yer === 'zemin'
      ? ['basEg', 'basEg', 'etrafaBak', 'kuyruk', 'temizlen', 'silkelen', 'zipla', 'zipla', 'gagala', 'gerin']
      : this.yer === 'tunek' ? ['basEg', 'etrafaBak', 'kuyruk', 'temizlen', 'uyukla'] : ['basEg', 'yumurtaBak', 'uyukla'];
    // Huya göre sık yapılan hareketler (bag.js HUYLAR): şarkıcı öter, uykucu uyuklar, meraklı yeri gagalar, neşeli zıplar, süslü tüylerini tarar
    const HUY_HAREKET = { sarkici: ['ot', 'ot', 'ot'], uykucu: ['uyukla', 'uyukla'], merakli: ['gagala', 'gagala'], neseli: ['zipla', 'zipla', 'zipla'], suslu: ['temizlen', 'silkelen'] };
    if (this.yer !== 'yuva' && HUY_HAREKET[this.huy]) secenekler.push(...HUY_HAREKET[this.huy].filter((h) => this.yer === 'zemin' || h !== 'zipla' && h !== 'gagala'));
    if (this.yer !== 'yuva' && !secenekler.includes('ot') && Math.random() < 0.3) secenekler.push('ot'); // her kuş ara sıra öter (sesli öten yalnız şarkıcı)
    const geceUykusu = this.sahne.gunIsigi && this.sahne.gunIsigi.gece > 0.6 && Math.random() < 0.65; // geceleri çoğunlukla uyuklarlar
    // Köyde gölet varsa ara sıra su içmeye gider (aynı anda tek kuş)
    const suIc = !geceUykusu && this.yer === 'zemin' && this.sahne.su && !this.sahne.suIcen && Math.random() < 0.12;
    // Köyde ara sıra çatılara, çitlere, fenerlere, tabelaya, banka, kuş banyosuna ya da yemliğe konar; bir süre sonra iner
    const yerler = this.sahne.konmaYerleri;
    const kon = !geceUykusu && !suIc && this.yer === 'zemin' && yerler && Math.random() < 0.2;
    const ayril = !geceUykusu && this.yer === 'tunek' && this.konduguYer && Math.random() < 0.2;
    const sec = suIc ? 'suIc' : kon ? 'kon' : ayril ? 'ayril' : geceUykusu ? 'uyukla' : Phaser.Utils.Array.GetRandom(secenekler), taban = POZ[this.yer] || POZ.zemin;
    if (sec === 'suIc') {
      await this.suIc(no);
    } else if (sec === 'kon') {
      await this.konmaYerineGit(no);
    } else if (sec === 'ayril') {
      const A = this.alan;
      await this.uc(Phaser.Math.Between(A.x1, A.x2), Phaser.Math.Between(A.y1, A.y2), 0, no);
    } else if (sec === 'basEg') {
      await this.tw({ basAci: Math.random() < 0.5 ? -0.3 : 0.28 }, 200); if (!ok()) return;
      await this.bekle(500 + Math.random() * 500); if (!ok()) return;
      await this.tw({ basAci: 0 }, 220);
    } else if (sec === 'etrafaBak') {
      this.yuz(-p.yon); await this.bekle(900); if (!ok()) return;
    } else if (sec === 'kuyruk') {
      for (let i = 0; i < 3; i++) { await this.tw({ kuyrukAci: 0.28 }, 70); await this.tw({ kuyrukAci: -0.12 }, 70); if (!ok()) return; }
      await this.tw({ kuyrukAci: 0 }, 100);
    } else if (sec === 'temizlen') { // gagasıyla kanadını tarar
      await this.tw({ basAci: 1.5, basX: -10, basY: 9, kanatAci: -0.12 }, 260); if (!ok()) return;
      for (let i = 0; i < 4; i++) { await this.tw({ basAci: 1.62, gagaAc: 0.5 }, 90); await this.tw({ basAci: 1.45, gagaAc: 0 }, 90); if (!ok()) return; }
      await this.tw({ basAci: 0, basX: 0, basY: 0, kanatAci: taban.kanatAci }, 260);
    } else if (sec === 'silkelen') {
      await this.silkelen(no);
    } else if (sec === 'zipla') {
      const Z = this.alan, c = this.carpan;
      const hx = Phaser.Math.Clamp(p.x + Phaser.Math.Between(-140, 140) * c, Z.x1, Z.x2);
      const hy = Phaser.Math.Clamp(p.y + Phaser.Math.Between(-60, 60) * c, Z.y1, Z.y2);
      await this.zipla(hx, hy, no);
    } else if (sec === 'gagala') { // yerde tohum arar
      for (let i = 0; i < 2; i++) {
        await this.tw({ basAci: 1.25, basY: 14, egim: 0.32, ezY: 0.94 }, 130, 'Quad.easeIn'); if (!ok()) return;
        await this.tw({ basAci: 0, basY: 0, egim: 0, ezY: 1 }, 170, 'Quad.easeOut'); if (!ok()) return;
      }
      if (this.huy === 'merakli' && Math.random() < 0.4) this.sahne.efekt('yildiz', this.dunyaKonumu(this.gaga), 3, 0xfff3a0); // bir şey buldu mu?
    } else if (sec === 'ot') { // başını kaldırıp öter: gaga açılıp kapanır, notalar uçar
      await this.tw({ basAci: -0.4, puf: taban.puf * 1.06 }, 200); if (!ok()) return;
      if (this.huy === 'sarkici' && Math.random() < 0.5 && this.sahne.cameras.main.worldView.contains(p.x, p.y)) cevreSesiCal(this.sahne, 0.025);
      for (let i = 0; i < 3; i++) {
        await this.tw({ gagaAc: 0.8 }, 90); if (!ok()) return;
        if (i !== 1) this.sahne.efekt('nota', this.dunyaKonumu(this.bas), 1);
        await this.tw({ gagaAc: 0.1 }, 110); if (!ok()) return;
      }
      await this.tw({ basAci: 0, gagaAc: 0, puf: taban.puf }, 220);
    } else if (sec === 'gerin') { // kanadını gerer
      await this.tw({ kanatAci: 0.9, egim: 0.12, basAci: -0.15 }, 380); if (!ok()) return;
      await this.bekle(450); if (!ok()) return;
      await this.tw({ kanatAci: taban.kanatAci, egim: 0, basAci: 0 }, 320);
    } else if (sec === 'uyukla') {
      await this.tw({ gozAcik: 0.12, basAci: 0.25, basY: 4, puf: taban.puf * 1.05 }, 900); if (!ok()) return;
      await this.bekle(1800); if (!ok()) return;
      await this.tw({ gozAcik: taban.gozAcik, basAci: 0, basY: 0, puf: taban.puf }, 400);
    } else if (sec === 'yumurtaBak') {
      await this.tw({ basAci: 0.85, basY: 8, gozAcik: 1 }, 300); if (!ok()) return;
      await this.bekle(600); if (!ok()) return;
      await this.tw({ basAci: 0, basY: 0, gozAcik: taban.gozAcik }, 300);
    }
    if (ok()) { this.mesgul = false; this.bosSayac = 1000 + Math.random() * 2600; }
  }

  yokEt() {
    this.yerBirak();
    this.no++;
    this.sahne.tweens.killTweensOf(this.p);
    this.kok.destroy();
  }

  // Dokunma kontrolü için gövde merkezi ve yarıçapı
  // Küçük kuşlarda da parmakla rahat seçilsin diye dokunma alanı en az 38 birim
  dokunduMu(x, y) { const m = this.dunyaKonumu(this.govdeKok); return Math.hypot(x - m.x, y - m.y) < Math.max(40 * this.olcek, 38); }

  update(zaman, dt) {
    const p = this.p, s = dt / 1000;
    this.kok.setPosition(p.x, p.y);
    this.kok.setDepth(p.y);
    this.kalk.y = -p.yuk / this.olcek;
    const golgeO = Math.max(0.35, 1 - p.yuk / (420 * this.carpan));
    this.golge.setScale(golgeO).setAlpha(golgeO);
    this.yonC.scaleX = Math.abs(p.yon) < 0.04 ? 0.04 * Math.sign(p.yon || 1) : p.yon;

    // Nefes alma: gövde hafifçe şişip iner
    this.nefesFaz += s * this.nefesHiz * Math.PI * 2;
    const n = Math.sin(this.nefesFaz) * this.nefesGenlik;
    this.ez.scaleX = p.puf * p.ezX * (1 - n * 0.4);
    this.ez.scaleY = p.puf * p.ezY * (1 + n);
    this.govdeKok.rotation = p.egim;
    this.govdeKok.y = -this.ayakY + p.cokme;

    this.bas.rotation = p.basAci;
    this.bas.x = this.basTaban[0] + p.basX; this.bas.y = this.basTaban[1] + p.basY - n * 12;
    if (this.gorsel && this.yakinPlan) { // yakın planda gaga hep kapalı ve temiz kalır
      this.gGagaAlt.setVisible(false); this.gAgiz.setVisible(false);
      if (this.sonAgiz) { this.gAgiz.clear(); this.sonAgiz = false; }
      this.gagaAltC.rotation = 0; this.iGagaUst.rotation = 0;
    } else if (this.gorsel) { // görselli kuş: tam gaga hafifçe kalkar, kodla çizilen alt çene iner, arada ağız içi görünür
      const acik = p.gagaAc > 0.04;
      this.gGagaAlt.setVisible(acik && !this.gagaBol); this.gAgiz.setVisible(acik);
      if (acik || this.sonAgiz) this.agizCiz(p.gagaAc);
      this.sonAgiz = acik;
      const A = this.agizAci || AGIZ;
      this.gagaAltC.rotation = p.gagaAc * A.alt;
      this.iGagaUst.rotation = -p.gagaAc * A.ust;
    } else {
      this.gAgiz.setVisible(false);
      this.gagaAltC.rotation = p.gagaAc * 0.6;
      this.iGagaUst.rotation = 0;
    }
    this.ibik.rotation = p.ibikAci + n * 2;
    const ucusSallanti = p.cirp > 0.5 ? Math.sin(this.kanatFaz * 0.5) * 0.08 : 0;
    this.kuyruk.rotation = this.kuyrukTaban + p.kuyrukAci + ucusSallanti;

    // Kanatlar: dinlenme açısı ile çırpma döngüsü arasında karışım
    if (this.cirpHiz > 0) this.kanatFaz += s * this.cirpHiz;
    const sn = Math.sin(this.kanatFaz), on = -0.6 + (sn * 0.5 + 0.5) * 2.25;
    const arka = -0.5 + (Math.sin(this.kanatFaz - 0.45) * 0.5 + 0.5) * 2.0;
    let onAci = lerp(p.kanatAci, on, p.cirp), arkaAci = lerp(p.kanatAci + 0.08, arka, p.cirp);
    if (this.gorsel) { // çizimde katlı kanat zaten dinlenme açısında; çırparken açık kanat görseli kullanılır
      const acik = p.cirp > 0.45;
      this.kanatGorsel(acik);
      const fark = acik ? this.gorsel.acikKanat.aci : 0.25;
      onAci += fark; arkaAci += fark;
    }
    this.kanatOn.rotation = onAci;
    this.kanatArka.rotation = arkaAci;
    this.kanatOn.scaleY = this.gorsel ? 1 : 1 - 0.18 * p.cirp * Math.max(0, -Math.cos(this.kanatFaz));

    const bacakGorunur = p.bacak > 0.05;
    this.bacakA.setVisible(bacakGorunur).scaleY = p.bacak;
    this.bacakB.setVisible(bacakGorunur).scaleY = p.bacak;

    // Göz kırpma
    this.kirpSayac -= dt;
    if (this.kirpSayac < 0) { this.kirpiyor = 110; this.kirpSayac = 1800 + Math.random() * 3200; }
    if (this.kirpiyor > 0) this.kirpiyor -= dt;
    this.gMutluGoz.setVisible(!!p.mutlu);
    this.gGoz.setVisible(!p.mutlu);
    this.goz.scaleY = p.mutlu ? 1 : Math.max(0.1, p.gozAcik * (this.kirpiyor > 0 ? 0.1 : 1));

    // Kusursuz tüy ve efsanevi kuşlarda parıltı
    const efsanevi = this.tur.nadirlik === 'Efsanevi';
    if (this.gen.tuy < 0.07 || efsanevi) {
      this.parlamaSayac -= dt;
      if (this.parlamaSayac < 0) {
        this.parlamaSayac = efsanevi ? 260 : 700;
        const m = this.dunyaKonumu(this.govdeKok), r = 34 * this.olcek;
        this.sahne.efekt('yildiz', { x: m.x + (Math.random() - 0.5) * r * 1.6, y: m.y + (Math.random() - 0.6) * r * 1.6 }, 1, efsanevi ? 0xffd75a : 0xffffff);
      }
    }

    if (this.durum === 'bos' && !this.mesgul) {
      this.bosSayac -= dt;
      if (this.bosSayac < 0) this.bosHareket();
    }
  }
}
