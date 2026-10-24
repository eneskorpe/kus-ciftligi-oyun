// Köy sahnesi: izometrik harita, binalar, gezinen kuşlar, kamera (sürükle / yakınlaştır).
import { Kus } from './kus.js';
import { TURLER, tohumluRastgele, kondisyonAdi } from './turler.js';
import { D, dinle, kaydet, saat } from './durum.js';
import { kusGen } from './genetik.js';
import * as M from './mekanik.js';
import { arayuzKur, bildirim } from './arayuz.js';
import { efektleriKur } from './efekt.js';
import { gorselleriYukle } from './kusGorsel.js';
import { HARITA, KARO_G, DUNYA_G, DUNYA_Y, izoEkran, karoKoseleri } from './izo.js';
import { binaKur, susKur } from './binalar.js';
import { gunIsigiKur } from './gunIsigi.js';
import { potYukle, potUygula, potBellek } from './pot.js';
import { cevreSesleriKur } from './ses.js';
import { canlilikKur, goletKur, kucukCanlilarKur, surulerKur } from './canlilik.js';
import { binaCanlilikKur } from './binaCanlilik.js';
import { dokunmaTepkisiKur } from './dokunTepki.js';
import { zeminKatmanlariKur } from './zemin.js';
import { isciKur } from './isci.js';
import { dereKur } from './su.js';
import { KusEvi } from './kusevi.js';
import { kuseviArayuzKur } from './kuseviArayuz.js';
import { dekorlariYukle, dekorKoy, DEKOR_GRUP } from './dekor.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);

// Harita yerleşimi (karo koordinatları)
const YERLESIM = {
  binalar: [['kulucka', 7, 3], ['tuzak', 2, 8], ['kusevi', 12, 5], ['yemlik', 8, 11], ['kunduz', 15, 10]],
  susler: [['agac', 1, 2], ['agac', 4, 0], ['agac', 15, 2], ['agac', 16, 5], ['agac', 0, 12], ['agac', 3, 15], ['agac', 15, 14],
    ['agac', 12, 16], ['agac', 11, 1], // (17,10) ağacı kaldırıldı: Kunduz evinin su çarkını kapatıyordu ['agac', 6, 16], ['agac', 16, 16], ['agac', 1, 5],
    ['kaya', 5, 6], ['kaya', 2, 13], ['kaya', 10, 15],
    ['fener', 7, 7], ['fener', 9, 15], ['fener', 4, 11], ['fener', 12, 10], ['fener', 11, 13],
    ['cicek', 6, 8], ['cicek', 11, 6], ['cicek', 4, 12], ['cicek', 13, 13],['cicek', 5, 13]],
};

// Sabit köy objeleri (karo koordinatı). Çitler: cit_asagi sabit j boyunca, cit_yukari sabit i boyunca uzanır
const KOY_OBJELERI = [
  ['cit_asagi', 4.0, 11.15, 128], ['cit_asagi', 5.75, 11.15, 128],
  ['cit_yukari', 9.85, 15.0, 128], ['cit_yukari', 9.85, 16.75, 128],
  ['tabela', 9.15, 17.3, 82],
  ['bank', 11.6, 11.9, 100, true],
  ['kus_banyosu', 6.3, 12.4, 70],
  ['saman', 4.7, 7.5, 74], ['el_arabasi', 6.0, 8.7, 70, true],
  ['sandiklar', 6.4, 5.4, 66], ['fici', 15.4, 8.8, 44],
  ['fidan', 12.3, 14.4, 44], ['saz', 18.2, 11.6, 50], ['kutuk', 16.9, 15.3, 44], ['fidan', 3.3, 4.3, 40, true],
];

// Bina geliştirme kapsülünün boyu (dünya pikseli)
const KAPSUL = { w: 150, h: 34 };
const MANZARA_PARALAKS = 0.12; // uzak manzaranın kamerayla birlikte kayma oranı

// Çimene serpiştirilen minik kır çiçekleri (assets/kircicek)
const KIR_CICEKLERI = ['papatya', 'dugun', 'unutmabeni', 'pembe_yonca', 'menekse', 'kadife', 'beyaz_yonca', 'kume', 'can', 'yaban_gulu', 'karahindiba', 'tohum_topu'];

// Taş yol karoları
function yolKarolari() {
  const yol = new Set(), ekle = (i, j) => yol.add(i + ',' + j);
  for (let j = 6; j < HARITA; j++) ekle(8, j);
  for (let i = 2; i <= 8; i++) ekle(i, 10);
  for (let i = 9; i <= 14; i++) ekle(i, 9);
  for (let i = 7; i <= 10; i++) for (let j = 11; j <= 13; j++) ekle(i, j);
  return yol;
}

class Koy extends Phaser.Scene {
  constructor() { super('koy'); }

  preload() {
    gorselleriYukle(this);
    this.load.json('binaMeta', 'assets/binalar/binalar.json');
    dekorlariYukle(this);
    potYukle(this);
    this.load.image('doku_cimen', 'assets/doku/cimen.png');
    this.load.image('doku_yol', 'assets/doku/yol.png');
    for (const tip of ['kulucka', 'tuzak', 'kusevi', 'yemlik', 'agac', 'kunduz']) this.load.image('bina_' + tip, `assets/binalar/${tip}.png`);
    for (const ad of ['govde', 'bas', 'bas_mutlu', 'on_kol', 'arka_kol', 'bacak', 'kuyruk', 'tahta', 'alet_kutusu']) this.load.image('kunduz_' + ad, `assets/kunduz/${ad}.png`); // Kunduz Usta
    for (const ad of ['iskele_merdivenli', 'iskele_kucuk', 'malzeme', 'toz']) this.load.image('insaat_' + ad, `assets/insaat/${ad}.png`); // inşaat
    this.load.image('manzara_dag', 'assets/manzara/dag.png'); // ormanın ardındaki tepeler ve dağlar
    this.load.image('manzara_yan', 'assets/manzara/yan.png'); // sol ve sağ: çayır, korular, uzak çiftlik
    this.load.image('manzara_on', 'assets/manzara/on.png'); // ön: dere, sazlıklar, tahta köprü
    this.load.image('manzara_on_kopru', 'assets/manzara/on_kopru.png'); // dere köprüsü (akıntının üstünde)
    this.load.json('manzara_on_su', 'assets/manzara/on_su.json'); // derenin orta çizgisi ve suyun iç noktaları
    for (const ad of KIR_CICEKLERI) this.load.image('kircicek_' + ad, `assets/kircicek/${ad}.png`);
    // Bina uyarı ikonları, balon çerçeveleri ve süre çubuğu
    for (const ad of ['kafes', 'yumurta', 'altin_yigini', 'bos_yem', 'balon', 'balon_hazir', 'cubuk_cerceve', 'cubuk_dolgu']) this.load.image('ui_' + ad, `assets/arayuz/${ad}.png`);
  }

  create() {
    potUygula(this); // 2'nin katı tuvallere yerleşmiş görsellerin asıl boyutu
    potBellek(this, /^kus_/); // kuş parçaları da yumuşak kenarlı küçülsün (bellekte)
    const rnd = tohumluRastgele(2026);
    efektleriKur(this, 0.5);
    this.yol = yolKarolari();
    this.zeminCiz(rnd);

    this.binalar = YERLESIM.binalar.map(([tip, i, j]) => binaKur(this, tip, i, j, rnd));
    // Çiçek noktaları Gemini çiçek kümeleriyle değişti; diğer süsler (ağaç, kaya, fener) yerinde
    const susler = YERLESIM.susler.filter(([tip]) => tip !== 'cicek').map(([tip, i, j]) => susKur(this, tip === 'agac' ? 'agac_koy' : tip, i, j, rnd));
    for (const [tip, i, j] of YERLESIM.susler) if (tip === 'cicek') this.cicekKumesi(i + 0.5, j + 0.5, rnd);
    this.ormanKur(rnd);
    this.manzaraKur();
    this.koyObjeleri = [];
    this.dekorSerpistir(rnd);
    this.konmaYerleriKur(susler.filter((g) => g.texture && g.texture.key === 'dekor_fener'));
    this.bulutGolgeleri();
    this.zeminGuncelle = zeminKatmanlariKur(this, this.binalar, this.yol, rnd); // çimende renk lekeleri, temas gölgeleri, rüzgâr dalgası

    // Kuşlar meydanda geziniyor
    const m = izoEkran(9, 12.4);
    this.zemin = { x1: m.x - 190, x2: m.x + 190, y1: m.y - 70, y2: m.y + 70 };
    this.kuslar = [];
    M.tik(); // kapalıyken geçen sürenin etkileri
    this.kuslariEsitle();
    dinle(() => this.kuslariEsitle());
    this.game.events.on('kusGeldi', (kus, kaynak) => this.kusGeldi(kus, kaynak));
    this.time.addEvent({ delay: 1000, loop: true, callback: () => M.tik() });
    this.time.addEvent({ delay: 10000, loop: true, callback: kaydet });
    this.binaDurumlariKur();

    // Gece yanacak ışıklar: fenerler, bina kapı ve pencereleri
    const isiklar = susler.filter((g) => g.isik).map((g) => ({ ...g.isik, olcek: 1.6 }));
    for (const b of this.binalar) {
      const m = { x: (b.k.sol.x + b.k.sag.x) / 2, y: b.k.alt.y };
      isiklar.push({ x: m.x - 20, y: m.y - 70, olcek: b.tip === 'kulucka' ? 2.6 : 1.9 });
      if (b.tip === 'kusevi') isiklar.push({ x: m.x, y: m.y - 190, olcek: 1.6 });
    }
    const a = izoEkran(0, 0), c = izoEkran(HARITA, HARITA);
    this.gunIsigiGuncelle = gunIsigiKur(this, isiklar, { x1: izoEkran(0, HARITA).x + 200, x2: izoEkran(HARITA, 0).x - 200, y1: a.y + 200, y2: c.y - 150 });
    this.gunIsigiGuncelle(0);
    this.saatYaz();
    const sol = izoEkran(0, HARITA), sag = izoEkran(HARITA, 0);
    this.canlilikGuncelle = canlilikKur(this, { x1: sol.x, x2: sag.x, y1: izoEkran(0, 0).y, y2: izoEkran(HARITA, HARITA).y });
    this.bocekGuncelle = kucukCanlilarKur(this, { x1: sol.x, x2: sag.x, y1: izoEkran(0, 0).y, y2: izoEkran(HARITA, HARITA).y });
    surulerKur(this);
    binaCanlilikKur(this, this.binalar);
    this.dokunTepki = dokunmaTepkisiKur(this);
    this.isciGuncelle = isciKur(this); // Kunduz Usta
    cevreSesleriKur(this, () => this.gunIsigi && this.gunIsigi.gece > 0.6); // ara sıra uzaktan serçe cıvıltısı
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.saatYaz() });

    this.kameraKur();
    this.gorunurlukKur();
    this.game.events.emit('hazir', this);
  }

  update(zaman, dt) {
    for (const k of this.kuslar) k.update(zaman, Math.min(dt, 50));
    this.binaDurumlariCiz(zaman);
    this.gunIsigiGuncelle(zaman);
    this.canlilikGuncelle(zaman);
    this.zeminGuncelle();
    this.isciGuncelle(zaman, Math.min(dt, 50));
    this.bocekGuncelle(zaman, Math.min(dt, 50));
    this.gorunurlukGuncelle();
    this.manzaraGuncelle();
    if (this.dereGuncelle) this.dereGuncelle(zaman, Math.min(dt, 50));
  }

  saatYaz() {
    const s = saat(), sa = Math.floor(s) % 24, dk = Math.floor((s % 1) * 60);
    document.getElementById('saat').textContent = String(sa).padStart(2, '0') + ':' + String(dk).padStart(2, '0');
    if (this.gunIsigi) { // gün ışığı emojisine karşılık gelen Gemini ikonu (assets/arayuz)
      const ad = { '🌙': 'ay', '🌅': 'safak', '🌇': 'safak' }[this.gunIsigi.ikon] || 'gunes', ik = document.getElementById('saatIkon');
      if (ik.dataset.ad !== ad) { ik.dataset.ad = ad; ik.src = `assets/arayuz/${ad}.png`; }
    }
  }

  // Kayıttaki görünür kuşlarla köydeki kuşları eşler (en fazla 8 kuş gezer)
  kuslariEsitle() {
    const gorunen = D.kuslar.filter((k) => k.gorunur && !M.mesgulMu(k)).slice(0, 8);
    for (const kus of [...this.kuslar]) {
      if (!gorunen.some((k) => k.id === kus.id)) { kus.yokEt(); this.kuslar.splice(this.kuslar.indexOf(kus), 1); }
    }
    const Z = this.zemin, r = Phaser.Math.Between;
    for (const k of gorunen) {
      const gen = kusGen(k), kus = this.kuslar.find((x) => x.id === k.id);
      if (!kus) {
        const yeni = new Kus(this, r(Z.x1, Z.x2), r(Z.y1, Z.y2), gen, { olcek: 0.29 });
        yeni.id = k.id;
        this.kuslar.push(yeni);
      } else if (kus.gen.tur !== gen.tur || kus.gen.mutasyon !== gen.mutasyon || kondisyonAdi(kus.gen.tuy) !== kondisyonAdi(gen.tuy)) {
        kus.genAyarla(gen);
      }
    }
  }

  // Yeni kuş geldiği binadan uçarak meydana iner
  kusGeldi(veri, kaynak) {
    const kus = this.kuslar.find((k) => k.id === veri.id), bina = this.binalar.find((b) => b.tip === kaynak);
    if (!kus || !bina) return;
    const Z = this.zemin;
    Object.assign(kus.p, { x: bina.tepe.x, y: bina.k.alt.y, yuk: bina.k.alt.y - bina.tepe.y, cirp: 1, bacak: 0.2 });
    kus.yer = 'hava'; kus.cirpHiz = 30;
    kus.git(Phaser.Math.Between(Z.x1, Z.x2), Phaser.Math.Between(Z.y1, Z.y2)).then(() => kus.sevil());
  }

  binaDurumlariKur() {
    for (const b of this.binalar) {
      // Gemini görselleri: ahşap süre çubuğu (çerçeve + kırpılarak dolan yeşil dolgu), balon çerçevesi ve içindeki ikon
      b.cubukC = this.add.image(0, 0, 'ui_cubuk_cerceve').setDisplaySize(112, 26).setDepth(95000).setVisible(false);
      b.cubukD = this.add.image(0, 0, 'ui_cubuk_dolgu').setOrigin(0, 0.5).setDepth(95000.5).setVisible(false);
      b.cerceve = this.add.image(0, 0, 'ui_balon').setOrigin(0.5, 1).setDepth(95000).setVisible(false);
      b.balon = this.add.image(0, 0, 'ui_kafes').setDepth(95001).setVisible(false);
      // Geliştirme kapsülü: Kunduz Usta çalışırken binanın üstünde; ahşap kapsül, dolan yeşil bar, ustanın yüzü ve kalan süre
      b.ins = {
        cerceve: this.add.image(0, 0, 'ui_cubuk_cerceve').setDisplaySize(KAPSUL.w, KAPSUL.h).setDepth(95002),
        dolgu: this.add.image(0, 0, 'ui_cubuk_dolgu').setOrigin(0, 0.5).setDepth(95002.5),
        yuz: this.add.image(0, 0, this.textures.exists('kunduz_bas') ? 'kunduz_bas' : 'ui_yildiz').setDepth(95003),
        yazi: this.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: '900', color: '#ffffff',
          stroke: '#3a2a35', strokeThickness: 4 }).setOrigin(0.5).setDepth(95003),
      };
      b.ins.yuz.setScale(46 / b.ins.yuz.width);
      for (const n of Object.values(b.ins)) n.setVisible(false);
    }
  }

  // Geliştirme kapsülü: dolgu çerçevenin iç alanına ölçeklenir ve oranı kadarı görünür (uçlar ezilmez)
  kapsulCiz(b, I, x, y, zaman) {
    const K = b.ins, { w: W, h: H } = KAPSUL, kalan = M.kalanSure(I), oran = Math.min(1, 1 - kalan / Math.max(1, I.bitis - I.bas));
    const ix = x - W / 2 + W * 0.07, iw = W * 0.86, ih = H * 0.45, iy = y - H / 2 + H * 0.29 + ih / 2;
    K.cerceve.setPosition(x, y).setVisible(true);
    K.dolgu.setDisplaySize(iw, ih).setPosition(ix, iy).setCrop(0, 0, Math.max(0.1, oran) * K.dolgu.frame.width, K.dolgu.frame.height).setVisible(true);
    K.yuz.setPosition(x - W / 2 - 4, y - 3 + Math.sin(zaman / 160) * 1.5).setVisible(true); // usta çekiç sallar gibi hafifçe sallanır
    const s = Math.ceil(kalan / 1000), sa = Math.floor(s / 3600), dk = Math.floor(s % 3600 / 60), sn = s % 60;
    const sure = sa ? `${sa}:${String(dk).padStart(2, '0')}:${String(sn).padStart(2, '0')}` : `${dk}:${String(sn).padStart(2, '0')}`;
    K.yazi.setText(`Sv ${I.sv} · ${sure}`).setPosition(x + 8, iy).setVisible(true);
    b.insKutu = new Phaser.Geom.Rectangle(x - W / 2 - 28, y - H / 2 - 14, W + 34, H + 28); // dokunma alanı
  }

  // Binaların üstünde süre çubuğu ya da "hazır" balonu
  binaDurumlariCiz(zaman) {
    for (const b of this.binalar) {
      const x = b.tepe.x, I = D.insaat && D.insaat.tip === b.tip ? D.insaat : null;
      // Geliştirme sürerken kapsül en altta durur, diğer göstergeler onun üstüne kayar
      const y = b.tepe.y - 18 - (I ? 46 : 0);
      for (const n of [b.balon, b.cerceve, b.cubukC, b.cubukD, ...Object.values(b.ins)]) n.setVisible(false);
      b.insKutu = null;
      if (I) this.kapsulCiz(b, I, x, b.tepe.y - 22, zaman);
      let oran = null, balon = '';
      const is = b.tip === 'tuzak' ? D.tuzak : b.tip === 'kulucka' ? D.kulucka : null;
      if (is) {
        const kalan = M.kalanSure(is), toplam = is.bitis - is.bas;
        if (kalan <= 0 && (b.tip === 'tuzak' || is.asama === 'kulucka')) balon = b.tip === 'tuzak' ? 'kafes' : 'yumurta';
        else oran = toplam > 0 ? 1 - kalan / toplam : 1;
      } else if (b.tip === 'kusevi' && D.binalar.kusevi.birikim >= M.gelirKapasite() * 0.2) balon = 'altin_yigini';
      else if (b.tip === 'yemlik' && D.binalar.yemlik.stok <= 2) balon = 'bos_yem';
      if (oran !== null) {
        // Çerçevenin iç krem alanı: yatayda %7-%93, dikeyde %29-%74 (cubuk_cerceve.png)
        const W = 112, H = 26, ix = x - W / 2 + W * 0.07, iw = W * 0.86, ih = H * 0.45, iy = y - H / 2 + H * 0.29 + ih / 2;
        b.cubukC.setPosition(x, y).setVisible(true);
        const d = b.cubukD, kw = d.frame.width; // dolgu tam iç alana ölçeklenir, oranı kadarı görünür (yuvarlak uçlar ezilmez)
        d.setDisplaySize(iw, ih).setPosition(ix, iy).setCrop(0, 0, Math.max(0.12, oran) * kw, d.frame.height).setVisible(true);
      }
      if (balon) {
        // Ödül hazırsa altın çerçeve ve hafif nabız; yemlik uyarısı ahşap çerçeve. Daire merkezi görselin %43,4 yüksekliğinde
        const hazir = balon !== 'bos_yem', W = 72, Hb = W * 512 / 463, uc = y + 18 + Math.sin(zaman / 260) * 5;
        const nabiz = hazir ? 1 + Math.max(0, Math.sin(zaman / 180)) * 0.05 : 1;
        b.cerceve.setTexture(hazir ? 'ui_balon_hazir' : 'ui_balon').setDisplaySize(W * nabiz, Hb * nabiz).setPosition(x, uc).setVisible(true);
        b.balon.setTexture('ui_' + balon).setDisplaySize(42 * nabiz, 42 * nabiz).setPosition(x, uc - Hb * nabiz * (1 - 0.434)).setVisible(true);
      }
    }
  }

  // Zemin: köy kesintisiz bir çayırın ortasında; karo deseni yerine doğal çimen lekeleri
  zeminCiz(rnd) {
    const elmas = (e) => [izoEkran(-e, -e), izoEkran(HARITA + e, -e), izoEkran(HARITA + e, HARITA + e), izoEkran(-e, HARITA + e)];
    const rastgeleNokta = (e) => izoEkran(-e + rnd() * (HARITA + 2 * e), -e + rnd() * (HARITA + 2 * e));
    const g = this.add.graphics().setDepth(-100000);
    if (this.textures.exists('doku_cimen')) {
      // Gemini çimen dokusu: yukarıdan çizildiği için izometrik görünüm için dikeyde yarıya basılır
      const a = elmas(9), x0 = a[3].x, x1 = a[1].x, y0 = a[0].y, y1 = a[2].y;
      this.add.tileSprite((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 'doku_cimen').setTileScale(0.9, 0.45).setDepth(-100001);
    } else {
      g.fillStyle(0x76b552); g.fillPoints(elmas(9), true);
      for (const [e, al] of [[3, 0.25], [2, 0.3], [1.2, 0.4], [0.5, 0.6], [0, 1]]) { g.fillStyle(0x8cc963, al); g.fillPoints(elmas(e), true); }
      for (let n = 0; n < 520; n++) {
        const p = rastgeleNokta(8), w = 60 + rnd() * 170;
        g.fillStyle(Phaser.Utils.Array.GetRandom([0x9ad673, 0x7fbf58, 0x86c65e, 0x93cf6a]), 0.35);
        g.fillEllipse(p.x, p.y, w, w / 2);
      }
      for (let n = 0; n < 900; n++) { // çimen tutamları
        const p = rastgeleNokta(8), h = 6 + rnd() * 7;
        g.fillStyle(rnd() < 0.5 ? 0x6fae4b : 0x7dbd55, 0.9);
        g.fillTriangle(p.x - 4, p.y, p.x - 1, p.y - h, p.x + 2, p.y);
        g.fillTriangle(p.x, p.y, p.x + 3, p.y - h * 0.8, p.x + 6, p.y);
      }
    }
    // Minik kır çiçekleri (Gemini, assets/kircicek): kimi tek, kimi 2-4'lü öbek; boy ve açı hafif değişir.
    // Yolların altında kalırlar (yol dokusu üstte çizilir)
    if (this.textures.exists('kircicek_papatya')) {
      for (let n = 0; n < 120; n++) {
        const p = rastgeleNokta(6), adet = rnd() < 0.35 ? 2 + Math.floor(rnd() * 3) : 1;
        const tur = KIR_CICEKLERI[Math.floor(rnd() * KIR_CICEKLERI.length)];
        for (let m = 0; m < adet; m++) {
          const x = p.x + (m ? (rnd() - 0.5) * 22 : 0), y = p.y + (m ? (rnd() - 0.5) * 11 : 0);
          const ad = m && rnd() < 0.4 ? KIR_CICEKLERI[Math.floor(rnd() * KIR_CICEKLERI.length)] : tur;
          this.add.image(x, y, 'kircicek_' + ad).setOrigin(0.5, 0.7).setScale((10 + rnd() * 6) / 128)
            .setAngle((rnd() - 0.5) * 30).setFlipX(rnd() < 0.5).setDepth(-100000.2);
        }
      }
    } else for (let n = 0; n < 140; n++) { // görsel yoksa: kodla çizilmiş minik çiçek
      const p = rastgeleNokta(6);
      g.fillStyle(Phaser.Utils.Array.GetRandom([0xffffff, 0xffd84a, 0xa98cff, 0x8fd0ff])); g.fillCircle(p.x, p.y, 3.5);
      g.fillStyle(0xffe680); g.fillCircle(p.x, p.y, 1.4);
    }
    // Taş yol: Gemini dokusu varsa yol karolarının biçiminde kesilip döşenir, kenarına toprak şerit çekilir
    if (this.textures.exists('doku_yol')) {
      const maske = this.make.graphics({ add: false });
      maske.fillStyle(0xffffff);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const anahtar of this.yol) {
        const [i, j] = anahtar.split(',').map(Number), k = karoKoseleri(i, j);
        const m = { x: (k.sol.x + k.sag.x) / 2, y: (k.ust.y + k.alt.y) / 2 };
        const buyut = (n, f) => ({ x: m.x + (n.x - m.x) * f, y: m.y + (n.y - m.y) * f });
        g.fillStyle(0xa8916a, 0.85); g.fillPoints([k.ust, k.sag, k.alt, k.sol].map((n) => buyut(n, 1.12)), true);
        maske.fillPoints([k.ust, k.sag, k.alt, k.sol].map((n) => buyut(n, 1.01)), true);
        x0 = Math.min(x0, k.sol.x); x1 = Math.max(x1, k.sag.x); y0 = Math.min(y0, k.ust.y); y1 = Math.max(y1, k.alt.y);
      }
      this.add.tileSprite((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0 + 40, y1 - y0 + 40, 'doku_yol')
        .setTileScale(0.32, 0.16).setDepth(-99999).setMask(maske.createGeometryMask());
      return;
    }
    for (let i = 0; i < HARITA; i++) {
      for (let j = 0; j < HARITA; j++) {
        if (!this.yol.has(i + ',' + j)) continue;
        const k = karoKoseleri(i, j);
        g.fillStyle(0xdccfb2); g.fillPoints([k.ust, k.sag, k.alt, k.sol], true);
        for (let s = 0; s < 5; s++) {
          const u = 0.2 + rnd() * 0.6, v = 0.2 + rnd() * 0.6;
          const x = k.ust.x + (k.sag.x - k.ust.x) * u + (k.sol.x - k.ust.x) * v, y = k.ust.y + (k.sag.y - k.ust.y) * u + (k.sol.y - k.ust.y) * v;
          g.fillStyle(0xb8ab92); g.fillEllipse(x, y + 1.5, 24, 12);
          g.fillStyle(0xeae0c8); g.fillEllipse(x, y, 22, 10);
        }
      }
    }
  }

  // Köyün çevresini dışa doğru sıklaşan bir orman sarar; ön taraf (ekranın altı) daha seyrek
  // Uzak manzara: ormanın ardında tepeler ve dağlar (köy bir vadinin içinde). Alt kenarı yumuşak, ormanın arkasında kalır.
  // Kamera kayınca manzara biraz onunla birlikte kayar (MANZARA_PARALAKS): uzakta olduğu hissi
  manzaraKur() {
    // Yanlar: ormanın dışındaki çayır (sol köşe ve aynası sağ köşe). Yer düzleminde, ağaçların altında; kenarları çimene karışır
    if (this.textures.exists('manzara_yan')) {
      for (const [i, j, ayna] of [[-11, 6, false], [6, -11, true]]) {
        const p = izoEkran(i, j), y = this.add.image(p.x, p.y, 'manzara_yan').setFlipX(ayna).setDepth(-99997);
        y.setScale(1700 / y.width);
      }
    }
    // Ön: dere köyün ön iki kenarı boyunca akar (sol ön ve aynası sağ ön); dere görselde sol üstten sağ alta iner
    if (this.textures.exists('manzara_on')) {
      const dereler = [];
      for (const [i, j, ayna] of [[9, 28, false], [28, 13, true]]) { // sağdaki kaydırıldı: iki köprü simetrik görünmesin
        const p = izoEkran(i, j), o = this.add.image(p.x, p.y, 'manzara_on').setFlipX(ayna).setDepth(-99997);
        o.setScale(2200 / o.width);
        dereler.push({ o, ayna });
      }
      this.dereGuncelle = dereKur(this, dereler); // akan su, yapraklar, pırıltılar (su.js)
    }
    if (!this.textures.exists('manzara_dag')) return;
    const ust = izoEkran(-4, -4), en = (HARITA + 30) * KARO_G; // alt kenarı ormanın içinde, iki yanı ekran kenarlarını aşar
    const im = this.add.image(ust.x, ust.y, 'manzara_dag').setOrigin(0.5, 1).setDepth(izoEkran(-8, -8).y);
    im.setScale(en / im.width);
    this.manzara = { im, x: im.x, y: im.y, merkez: izoEkran(HARITA / 2, HARITA / 2) };
  }
  manzaraGuncelle() {
    const M = this.manzara;
    if (!M) return;
    const c = this.cameras.main.midPoint;
    M.im.setPosition(M.x + (c.x - M.merkez.x) * MANZARA_PARALAKS, M.y + (c.y - M.merkez.y) * MANZARA_PARALAKS);
  }

  ormanKur(rnd) {
    for (let i = -7; i < HARITA + 7; i++) {
      for (let j = -7; j < HARITA + 7; j++) {
        const d = Math.max(-i, -j, i - (HARITA - 1), j - (HARITA - 1));
        if (d < 1) continue;
        const on = i >= HARITA || j >= HARITA;
        if (on && d < 2) continue;
        const ti = i + (rnd() - 0.5) * 0.6, tj = j + (rnd() - 0.5) * 0.6;
        // Orman duvar gibi durmasın: köye yakın sıralar seyrek, dışa doğru sıklaşır ama en fazla %50; ara ara küçük açıklıklar.
        // Öndeki uzun ağaçlar köyü kapatmasın: ön tarafta yakın sıralarda sadece çalı, ağaçlar seyrek
        const aciklik = Math.sin(i * 1.7 + j * 0.9) + Math.sin(i * 0.6 - j * 1.3) > 1.2; // doğal dağılımlı boşluklar
        const agacSansi = aciklik ? 0.04 : on ? (d < 4 ? 0 : 0.06 + 0.05 * d) : Math.min(0.5, 0.1 + 0.08 * d);
        if (rnd() < agacSansi) susKur(this, 'agac_orman', ti, tj, rnd);
        else if (rnd() < (aciklik ? 0.12 : on ? 0.3 : 0.35)) this.caliKoy(ti, tj, rnd);
        if (rnd() < 0.5) this.tutamKoy(i + rnd(), j + rnd(), rnd);
        if (d <= 2 && rnd() < 0.06) { const p = izoEkran(i + rnd(), j + rnd()); dekorKoy(this, 'mantar', p.x, p.y, 38 + rnd() * 16, rnd() < 0.5); }
        if (d <= 3 && rnd() < 0.07) { const p = izoEkran(i + rnd(), j + rnd()); dekorKoy(this, Phaser.Utils.Array.GetRandom(DEKOR_GRUP.orman), p.x, p.y, 60 + rnd() * 30, rnd() < 0.5); }
      }
    }
  }
  // Aynı türden 2-4 çiçeklik küçük bir küme
  cicekKumesi(i, j, rnd) {
    const ad = Phaser.Utils.Array.GetRandom(DEKOR_GRUP.cicek), n = 2 + Math.floor(rnd() * 3);
    for (let s = 0; s < n; s++) {
      const p = izoEkran(i + (rnd() - 0.5) * 0.8, j + (rnd() - 0.5) * 0.8);
      dekorKoy(this, ad, p.x, p.y, 34 + rnd() * 16, rnd() < 0.5);
    }
  }
  // Kuşların konabileceği yerler (dünya noktası): x, y konma noktası, taban: objenin yer çizgisi (derinlik için), tip
  konmaYerleriKur(fenerler) {
    const L = [], ust = (n) => n.y - n.displayHeight * n.originY, sol = (n) => n.x - n.displayWidth * n.originX;
    const ekle = (x, y, taban, tip = 'tunek') => L.push({ x, y, taban, tip, dolu: null });
    for (const f of fenerler) ekle(f.x, ust(f) + f.displayHeight * 0.05, f.y);
    for (const { ad, n } of this.koyObjeleri) {
      const w = n.displayWidth, h = n.displayHeight, x0 = sol(n), y0 = ust(n), yon = n.flipX ? -1 : 1;
      if (ad === 'tabela') ekle(x0 + w * (n.flipX ? 0.52 : 0.48), y0 + h * 0.03, n.y);
      else if (ad === 'bank') ekle(n.x - yon * w * 0.12, y0 + h * 0.08, n.y);
      else if (ad === 'kus_banyosu') { ekle(x0 + w * 0.2, y0 + h * 0.13, n.y + 1, 'banyo'); ekle(x0 + w * 0.8, y0 + h * 0.13, n.y + 1, 'banyo'); }
      else if (ad.startsWith('cit')) { ekle(n.x - w * 0.22, y0 + h * (ad === 'cit_asagi' ? 0.08 : 0.38), n.y); ekle(n.x + w * 0.22, y0 + h * (ad === 'cit_asagi' ? 0.38 : 0.08), n.y); }
    }
    for (const b of this.binalar) {
      const n = b.nesne, h = b.kutu.height;
      if (b.tip === 'yemlik' && n.getBounds) { const s = n.getBounds(); ekle(s.centerX + s.width * 0.2, s.y + s.height * 0.43, b.k.alt.y + 1, 'yemlik'); } // tepsinin sağ kenarı
      else ekle(b.tepe.x, b.tepe.y + h * (b.tip === 'kusevi' ? 0.02 : 0.08), b.k.alt.y + 1);
    }
    this.konmaYerleri = L;
  }
  // Ekran dışında kalan sabit objeler (ağaç, çalı, çiçek, taş, bina) çizilmez; kamera oynadıkça güncellenir
  gorunurlukKur() {
    const haric = /^(dekor_(tavsan|kelebek|ari|yaprak)|manzara_)/; // manzara kamerayla kayar, kendi yerini bilir
    this.sabitler = this.children.list
      .filter((o) => (o.type === 'Image' && o.texture && !haric.test(o.texture.key) && o.depth < 90000))
      .map((o) => ({ o, r: o.getBounds() }));
    this.sonKamera = '';
  }

  gorunurlukGuncelle() {
    const v = this.cameras.main.worldView, anahtar = `${v.x | 0},${v.y | 0},${v.width | 0}`;
    if (anahtar === this.sonKamera) return;
    this.sonKamera = anahtar;
    const pay = 120, x0 = v.x - pay, x1 = v.right + pay, y0 = v.y - pay, y1 = v.bottom + pay;
    for (const { o, r } of this.sabitler) o.setVisible(r.right > x0 && r.x < x1 && r.bottom > y0 && r.y < y1);
  }
  // Tavşan: gündüz ara sıra yuvasından önce kulaklarını, sonra kafasını çıkarır, etrafa bakar, göz kırpar ve geri girer
  tavsanKur(yuva) {
    if (!this.textures.exists('dekor_tavsan1')) return;
    const w = yuva.displayWidth, h = yuva.displayHeight;
    const sol = yuva.x - w / 2, ust = yuva.y - h * yuva.originY;
    const x = sol + (yuva.flipX ? 0.37 : 0.63) * w, y = ust + 0.66 * h; // deliğin alt ortası
    const t = this.add.image(x, y, 'dekor_tavsan1').setOrigin(0.5, 1).setDepth(yuva.depth + 1).setVisible(false);
    const olcek = 0.3 * w / t.width;
    const kare = (n, ms) => new Promise((bitti) => { t.setTexture('dekor_tavsan' + n); this.time.delayedCall(ms, bitti); });
    const cik = async () => {
      if (!this.gunIsigi || this.gunIsigi.gece < 0.5) {
        t.setTexture('dekor_tavsan1').setScale(olcek, 0).setVisible(true).setFlipX(Math.random() < 0.5);
        await new Promise((b) => this.tweens.add({ targets: t, scaleY: olcek, duration: 260, ease: 'Back.easeOut', onComplete: b }));
        await kare(1, 900 + Math.random() * 600);
        await kare(2, 1600 + Math.random() * 800);
        await kare(3, 900);
        await kare(2, 700 + Math.random() * 800);
        await kare(1, 450);
        await new Promise((b) => this.tweens.add({ targets: t, scaleY: 0, duration: 220, ease: 'Quad.easeIn', onComplete: b }));
        t.setVisible(false);
      }
      this.time.delayedCall(18000 + Math.random() * 27000, cik);
    };
    this.time.delayedCall(4000 + Math.random() * 8000, cik);
    this.tavsanCik = cik; // deneme için
  }
  // Çalı: Gemini görseli varsa onu, yoksa kodla çizilmişini koyar
  caliKoy(i, j, rnd) {
    const k = karoKoseleri(i, j), x = (k.sol.x + k.sag.x) / 2, y = (k.ust.y + k.alt.y) / 2;
    const ad = Phaser.Utils.Array.GetRandom(DEKOR_GRUP.cali);
    if (!dekorKoy(this, ad, x, y, 85 + rnd() * 50, rnd() < 0.5)) susKur(this, 'cali', i, j, rnd);
  }

  tutamKoy(i, j, rnd, grup = 'tutam') {
    const p = izoEkran(i, j);
    dekorKoy(this, Phaser.Utils.Array.GetRandom(DEKOR_GRUP[grup]), p.x, p.y, grup === 'tutam' ? 30 + rnd() * 26 : 55 + rnd() * 30, rnd() < 0.5);
  }

  // Köyün boş çimenlerine tutam, yonca ve kenarlara çalı serpiştirir (yol, bina ve kuş meydanı hariç)
  dekorSerpistir(rnd) {
    const dolu = new Set(this.yol);
    // Gölet: yere yatık olduğu için derinliği üst kenarına göre (önündeki her şey üstünde görünür)
    const gp = izoEkran(14.6, 13.4), golet = dekorKoy(this, 'golet', gp.x, gp.y, 420);
    if (golet) {
      golet.setDepth(gp.y - 120);
      // Su elipsi (görselde suyun ortası yaklaşık %52 yukarıda)
      const h = golet.displayHeight, w = golet.displayWidth;
      this.su = { x: gp.x, y: gp.y - h * 0.52, rx: w * 0.33, ry: h * 0.22 };
      goletKur(this, this.su, gp.y - 120);
    }
    for (let i = 12; i <= 17; i++) for (let j = 11; j <= 15; j++) dolu.add(i + ',' + j);

    // Sabit köy objeleri: [ad, i, j, genişlik, ters]
    for (const [ad, i, j, en, ters] of KOY_OBJELERI) {
      const p = izoEkran(i, j);
      const n = dekorKoy(this, ad, p.x, p.y, en, ters);
      if (n) this.koyObjeleri.push({ ad, n });
      dolu.add(Math.floor(i) + ',' + Math.floor(j));
    }
    // Binaların arkasında 2 karo boş kalır: uzun çiçekler çatının arkasından taşmasın
    for (const b of this.binalar) for (let i = b.i - 2; i <= b.i + b.tanim.boyut[0]; i++) for (let j = b.j - 2; j <= b.j + b.tanim.boyut[1]; j++) dolu.add(i + ',' + j);
    for (const [, i, j] of YERLESIM.susler) dolu.add(i + ',' + j);
    for (let i = 6; i <= 11; i++) for (let j = 10; j <= 14; j++) dolu.add(i + ',' + j);
    for (let i = 0; i < HARITA; i++) {
      for (let j = 0; j < HARITA; j++) {
        if (dolu.has(i + ',' + j)) continue;
        const kenar = Math.min(i, j, HARITA - 1 - i, HARITA - 1 - j);
        if (kenar === 0 && rnd() < 0.3) this.caliKoy(i + 0.5, j + 0.5, rnd);
        if (rnd() < 0.4) this.tutamKoy(i + 0.15 + rnd() * 0.7, j + 0.15 + rnd() * 0.7, rnd);
        if (rnd() < 0.07) this.tutamKoy(i + 0.2 + rnd() * 0.6, j + 0.2 + rnd() * 0.6, rnd, 'seyrek');
        const yolKomsu = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => this.yol.has((i + a) + ',' + (j + c)));
        if (yolKomsu && rnd() < 0.22) this.cicekKumesi(i + 0.5, j + 0.5, rnd);
      }
    }
    // Tuzak kulübesinin yanında odun yığını, çayırda bir tavşan yuvası ve birkaç basamak taşı
    const tuzak = this.binalar.find((b) => b.tip === 'tuzak');
    if (tuzak) dekorKoy(this, 'odun_yigini', tuzak.k.sol.x + 30, tuzak.k.sol.y + 30, 62);
    for (const [ad, i, j, en] of [['tavsan_yuvasi', 15.5, 3.5, 104], ['basamak_tas', 4.6, 13.3, 70], ['basamak_tas', 13.4, 15.2, 66], ['tas_kucuk', 16.6, 14.2, 40]]) {
      const p = izoEkran(i, j), n = dekorKoy(this, ad, p.x, p.y, en, rnd() < 0.5);
      if (ad === 'tavsan_yuvasi' && n) this.tavsanKur(n);
    }

    // Binaların arsa köşelerinde birer çalı
    for (const b of this.binalar) {
      if (b.tanim.boyut[0] < 2 || b.tip === 'kunduz') continue; // Kunduz evinin köşesinde su çarkı var
      const k = b.k;
      dekorKoy(this, 'cali_kucuk', k.sol.x - 10, k.sol.y + 6, 70, false);
      dekorKoy(this, b.tip === 'tuzak' ? 'aycicegi' : 'cicek_kasa', k.sag.x + 4, k.sag.y + 8, b.tip === 'tuzak' ? 58 : 64, true);
    }
  }
  bulutGolgeleri() {
    for (let n = 0; n < 3; n++) {
      const b = this.add.ellipse(Phaser.Math.Between(0, DUNYA_G), Phaser.Math.Between(300, DUNYA_Y - 200), 520, 200, 0x1e3a28, 0.07).setDepth(90000);
      this.tweens.add({ targets: b, x: b.x + DUNYA_G, duration: 90000 + n * 20000, repeat: -1, onRepeat: () => { b.x = -400; } });
    }
  }

  // --- Kamera: tek parmakla kaydır, iki parmakla / tekerlekle yakınlaştır ---
  kameraKur() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#5f9e48');
    // Kamera köy ve çevresindeki ormanla sınırlı; ötesindeki boşluk görünmez
    // Yukarı kaydırınca ormanın ardındaki tepeler ve dağlar görünür (manzaranın gökyüzü kısmına kadar)
    const ust = this.manzara ? this.manzara.y - this.manzara.im.displayHeight * 0.8 : izoEkran(-3, -3).y - 260;
    const sol = izoEkran(-3, HARITA + 3).x, sag = izoEkran(HARITA + 3, -3).x, alt = izoEkran(HARITA + 3, HARITA + 3).y;
    cam.setBounds(sol, ust, sag - sol, alt - ust);
    this.sinir = { w: sag - sol, h: alt - ust };
    this.kullaniciZoom = Phaser.Math.Clamp(window.innerWidth / 1500, 0.42, 0.85);
    this.kullaniciZoom = Math.max(this.kullaniciZoom, Math.max(cam.width / this.sinir.w, cam.height / this.sinir.h) / DPR);
    cam.setZoom(this.kullaniciZoom * DPR);
    const m = izoEkran(9, 9);
    cam.centerOn(m.x, m.y);
    this.input.addPointer(1);

    let basX = 0, basY = 0, suruklendi = false, kiskacMesafe = 0;
    this.input.on('pointerdown', (p) => { basX = p.x; basY = p.y; suruklendi = false; kiskacMesafe = 0; });
    this.input.on('pointermove', (p) => {
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown) { // iki parmak: yakınlaştır
        suruklendi = true;
        const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (kiskacMesafe) this.yakinlastir((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, d / kiskacMesafe);
        kiskacMesafe = d;
        return;
      }
      if (!p.isDown) return;
      if (Math.hypot(p.x - basX, p.y - basY) > 12 * DPR) suruklendi = true;
      if (suruklendi) {
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      }
    });
    this.input.on('pointerup', (p) => {
      if (!suruklendi && !this.input.pointer2.isDown) this.dokun(p.worldX, p.worldY);
    });
    this.input.on('wheel', (p, _n, _dx, dy) => this.yakinlastir(p.x, p.y, dy > 0 ? 0.9 : 1.1));
  }

  // Ekrandaki (x, y) noktası yerinde kalacak şekilde yakınlaştırır
  yakinlastir(x, y, oran) {
    const cam = this.cameras.main, eski = cam.zoom;
    const enAz = Math.max(cam.width / this.sinir.w, cam.height / this.sinir.h) / DPR; // görüntü sınırın dışına taşmasın
    this.kullaniciZoom = Phaser.Math.Clamp(this.kullaniciZoom * oran, Math.max(0.3, enAz), 1.6);
    const yeni = this.kullaniciZoom * DPR, w = cam.width / 2, h = cam.height / 2;
    const dx = cam.scrollX + w + (x - w) / eski, dy = cam.scrollY + h + (y - h) / eski;
    cam.setZoom(yeni);
    cam.scrollX = dx - w - (x - w) / yeni;
    cam.scrollY = dy - h - (y - h) / yeni;
  }

  dokun(x, y) {
    // Geliştirme kapsülüne dokunulursa o binanın paneli açılır (hızlandırma düğmeleri orada)
    const kapsul = this.binalar.find((b) => b.insKutu && b.insKutu.contains(x, y));
    if (kapsul) { this.binaZipla(kapsul); this.game.events.emit('binaSecildi', kapsul); return; }
    const kus = this.kuslar.find((k) => k.dokunduMu(x, y));
    if (kus) {
      kus.sevil();
      const k = M.kusBul(kus.id);
      if (k) bildirim(M.kusSev(k.id) ? `💗 ${k.ad} sevildi! Mutluluk: ${Math.round(k.mutluluk)}` : `💗 ${k.ad} biraz önce sevildi, sonra tekrar dene`);
      return;
    }
    const bina = this.binalar.filter((b) => b.kutu.contains(x, y)).sort((a, b) => b.k.alt.y - a.k.alt.y)[0];
    if (this.dokunTepki(x, y, bina)) { this.game.events.emit('bosDokunus'); return; } // bitki ya da gölet
    if (bina) {
      this.binaZipla(bina);
      this.game.events.emit('binaSecildi', bina);
    } else this.game.events.emit('bosDokunus');
  }

  // Dokunulan bina hafifçe esneyip yerine oturur
  binaZipla(bina) {
    const n = bina.nesne, tabanY = bina.k.alt.y, merkezX = (bina.k.sol.x + bina.k.sag.x) / 2;
    if (n.type === 'Graphics') { // dünya koordinatında çizildiği için tabanın ortası sabit kalacak şekilde ölçeklenir
      const o = { s: 1 };
      this.tweens.add({ targets: o, s: 1.06, duration: 90, yoyo: true, ease: 'Sine.easeOut',
        onUpdate: () => {
          n.scaleY = o.s; n.scaleX = 1 - (o.s - 1) * 0.5;
          n.y = tabanY * (1 - n.scaleY); n.x = merkezX * (1 - n.scaleX);
        } });
    } else {
      // Zıplama her zaman binanın asıl boyundan başlar (üst üste dokununca bina uzayıp kalmasın).
      // Üstündeki ayrı parçalar (sallanan yumurtalar, kafes) zıplarken gizlenir: altlarındaki bina görselinde aynıları var
      if (n.tabanOlcekY === undefined) n.tabanOlcekY = n.scaleY;
      this.tweens.killTweensOf(n);
      n.scaleY = n.tabanOlcekY;
      const ekler = bina.ekler || [];
      for (const e of ekler) e.setAlpha(0);
      this.tweens.add({ targets: n, scaleY: n.tabanOlcekY * 1.06, duration: 90, yoyo: true, ease: 'Sine.easeOut',
        onComplete: () => { n.scaleY = n.tabanOlcekY; for (const e of ekler) e.setAlpha(1); } });
    }
  }
}

// --- Oyun ---
const oyun = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'oyun',
  width: window.innerWidth * DPR,
  height: window.innerHeight * DPR,
  backgroundColor: '#4f8f45',
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / DPR },
  // Mipmap: küçük gösterilen görsellerin kenarları yumuşar, ekran kartı daha az çalışır
  render: { antialias: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR', powerPreference: 'high-performance' },
  scene: [Koy, KusEvi],
});
window.oyun = oyun; // tarayıcı konsolundan deneme yapabilmek için
window.addEventListener('resize', () => {
  oyun.scale.resize(window.innerWidth * DPR, window.innerHeight * DPR);
  oyun.scale.setZoom(1 / DPR);
});

arayuzKur(oyun);
kuseviArayuzKur(oyun);
