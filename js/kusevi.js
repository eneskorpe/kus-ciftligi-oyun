// Kuş Evi sahnesi: kuşun yakından görüldüğü iç mekân. Ortada tünek, tünekte seçili kuş.
// Gemini görselleri (assets/kusevi/ic.png, ic_gece.png, tunek.png) varsa onları, yoksa kodla çizilmiş hali kullanır.
import { Kus } from './kus.js';
import { efektleriKur } from './efekt.js';
import { gorselleriYukle } from './kusGorsel.js';
import { kusGen } from './genetik.js';
import { gunDurumu } from './gunIsigi.js';
import { D, bildir } from './durum.js';
import { potBellek } from './pot.js';
import * as M from './mekanik.js';
import { YUVA_GORSELLERI, acikSusler, kusSusleri, SUSLER } from './yuva.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const CIZGI = 0x3a2a35;

// Arayüzün kapladığı alanlar (CSS pikseli): sol avatar şeridi, üst bilgi kartı, alt yem tepsisi. Ekran düzenine göre
// (telefonda şerit üstte, düğmeler altta) DOM'dan ölçülür; ölçülemezse bu değerler kullanılır
export const KENAR = { sol: 86, ust: 132, alt: 124 };
function arayuzKenari() {
  const kutu = (s) => { const e = document.querySelector(s), r = e && e.getBoundingClientRect(); return r && r.width && r.height ? r : null; };
  const av = kutu('#kAvatar'), kart = kutu('#kKart'), ey = kutu('#kEylem'), tep = kutu('#kTepsi');
  if (!av || !kart || !tep) return { ...KENAR, dar: false };
  const dar = av.width > av.height; // kuş şeridi yatay: telefon düzeni
  const altUst = Math.min(tep.top, dar && ey ? ey.top : Infinity);
  return { sol: dar ? 0 : av.right, ust: kart.bottom + 4, alt: innerHeight - altUst + 4, dar };
}
// Hazırlanan Gemini görselleri (assets/kusevi/): 'ic', 'ic_gece', 'tunek'. Eklendikçe buraya yazılır.
const KUSEVI_GORSELLERI = ['ic.jpg', 'ic_gece.jpg', 'tunek.png'];
// --- Kaydırılan oda (yuva) ---
// Ölçü birimi U: kuşun eni. Oda soldan sağa köşelere bölünür; her süsün sabit bir yeri ve kuşa göre boyu vardır.
// x: odanın sol kenarından U cinsinden; yer: zemin (yere basar), tavan (tavandan sarkar), duvar (duvarda, y: tavandan yere oran),
// tunek (tüneğin direğinde), kemer (tüneği çerçeveler); boy: U cinsinden yükseklik
const ODA_EN = 11.6;
const KOSELER = [
  { ad: 'Dinlenme köşesi', x: 1.3 }, { ad: 'Oyun köşesi', x: 6.05 }, { ad: 'Bakım köşesi', x: 8.3 }, { ad: 'Hazine rafı', x: 10.45 },
];
const TUNEK_X = 3.6;
const SUS_YERI = {
  saksi: { x: 0.45, yer: 'zemin', boy: 0.75 },
  yastik: { x: 1.25, yer: 'zemin', boy: 0.42 },
  besik: { x: 2.05, yer: 'zemin', boy: 0.5 },
  isimlik: { yer: 'tunek', boy: 0.32 },
  salincak: { x: 5.3, yer: 'tavan', boy: 1.3 },
  merdiven: { x: 6.4, yer: 'tavan', boy: 1.45 },
  can: { x: 7.1, yer: 'duvar', y: 0.16, boy: 0.55 },
  havuz: { x: 7.9, yer: 'zemin', boy: 0.62 }, // kuş içine sığacak kadar
  ayna: { x: 8.8, yer: 'zemin', boy: 0.85 },
  fener: { x: 9.45, yer: 'duvar', y: 0.18, boy: 0.7 },
  sandik: { x: 10.05, yer: 'zemin', boy: 0.55 },
  altinTunek: { x: 10.95, yer: 'zemin', boy: 0.8 },
  ozel_cennet: { yer: 'kemer', uzama: 1.35 },
  ozel_ketzal: { yer: 'kemer', uzama: 1.12 }, // taş oymalar uzayınca belli olur
};

export class KusEvi extends Phaser.Scene {
  constructor() { super('kusevi'); }

  preload() {
    gorselleriYukle(this);
    for (const id of ['dari', 'ay', 'meyve', 'bal', 'kalsiyum', 'test']) this.load.image('ikram_' + id, `assets/kusevi/ikram_${id}.png`);
    for (const id of YUVA_GORSELLERI) this.load.image('yuva_' + id, `assets/yuva/${id}.png`);
    for (const dosya of KUSEVI_GORSELLERI) this.load.image('kusevi_' + dosya.split('.')[0], `assets/kusevi/${dosya}`);
  }

  create(veri) {
    potBellek(this, /^(kus_|ikram_|kusevi_tunek|yuva_)/); // yumuşak kenarlı küçültme (pot.js)
    efektleriKur(this);
    const W = this.scale.width, H = this.scale.height;
    this.kenar = arayuzKenari();
    const sol = this.kenar.sol * DPR, ust = this.kenar.ust * DPR, alt = this.kenar.alt * DPR;
    this.gece = gunDurumu().gece;
    this.gunIsigi = { gece: this.gece };
    // Kuş ölçeği: kuş yaklaşık 80 birim boyunda, 100 birim enindedir. Kuş odanın içinde küçük bir canlı gibi dursun:
    // boyu alanın en çok %25'i, eni ekranın en çok %27'si (telefonda ekranın yaklaşık dörtte biri)
    const alanH = H - ust - alt;
    this.carpan = Math.min(alanH * 0.25 / (80 * 2.2), (W - sol) * 0.27 / (100 * 2.2));
    const U = 100 * 2.2 * this.carpan;
    // Oda: tavan arayüzün altında, yer çizgisi alt düğmelerin biraz üstünde; önünde yazıların durduğu bir zemin şeridi kalır
    const C = ust, F = H - alt - U * 0.38, OX = sol;
    this.oda = { U, C, F, OX, en: OX + ODA_EN * U, H, W, sol, ust, alanH };
    this.arkaPlan(this.oda);
    const tx = OX + TUNEK_X * U, ty = F - U * 1.2;
    this.tunekCiz(tx, ty, U * 1.25, F);
    this.tunek = { x: tx, y: ty, zeminY: ty };
    this.zemin = { x1: tx - 10, x2: tx + 10, y1: ty - 2, y2: ty + 2 };
    this.kameraKur();

    this.kus = null; this.susler = []; this.yuvaAnahtar = null;
    this.kusSec(veri && veri.id);

    // Dokunma: kuşa kısa dokunuş = sev, kuşun üstünde parmak gezdirme = okşa; başka yerde sürükleme = odayı kaydır
    let basla = null, yol = 0, kaydir = null;
    this.input.on('pointerdown', (p) => {
      if (this.kus && this.kus.dokunduMu(p.worldX, p.worldY)) { basla = { x: p.x, y: p.y }; yol = 0; return; }
      kaydir = { x: p.x, s: this.cameras.main.scrollX, oynadi: false };
      this.cameras.main.panEffect.reset();
    });
    this.input.on('pointermove', (p) => {
      if (!p.isDown) return;
      if (basla) { yol += Math.hypot(p.x - p.prevPosition.x, p.y - p.prevPosition.y); if (yol > 30 * DPR) this.kus.oksan(); return; }
      if (kaydir) { const dx = p.x - kaydir.x; if (Math.abs(dx) > 8 * DPR) kaydir.oynadi = true; this.cameras.main.scrollX = kaydir.s - dx; }
    });
    this.input.on('pointerup', () => {
      if (basla && yol <= 30 * DPR) this.game.events.emit('kuseviSev');
      basla = null;
      this.surukledi = !!(kaydir && kaydir.oynadi);
      kaydir = null;
    });
    // Siluete dokununca o süsün nasıl açılacağı yazar
    this.input.on('gameobjectup', (p, n) => {
      if (this.surukledi || !n.susId) return;
      const S = SUSLER[n.susId], v = this.kusVeri(), [a, h] = v ? S.ilerleme(v) : [0, 1];
      bildir(`🔒 ${S.ikon} ${S.ad}: ${S.sart}${h > 1 ? ` (${Math.min(a, h)}/${h})` : ''}`);
    });

    // Mutsuzsa ara sıra küser
    this.time.addEvent({ delay: 7000, loop: true, callback: () => {
      const k = this.kus, v = this.kusVeri();
      if (!k || k.durum !== 'bos' || k.mesgul || !v) return;
      if (v.mutluluk < 30) k.kus();
    } });
    this.scale.on('resize', this.yenidenKur, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.yenidenKur, this));
    this.game.events.emit('kuseviHazir', this);
  }

  yenidenKur() { this.scene.restart({ id: this.secili }); }
  // Bilgi kartı dolunca (ilk açılışta boş ölçülmüş olabilir) arayüz alanı değiştiyse oda yeniden kurulur
  kenarDenetle() {
    const k = arayuzKenari(), e = this.kenar;
    if (e && ['sol', 'ust', 'alt'].some((a) => Math.abs(k[a] - e[a]) > 10)) this.yenidenKur();
  }

  kusVeri() { return M.kusBul(this.secili); }

  kusSec(id) {
    const v = M.kusBul(id) || D.kuslar[0];
    if (!v) return;
    this.secili = v.id;
    const t = this.tunek, gen = kusGen(v);
    if (!this.kus) {
      this.kus = new Kus(this, t.x, t.y, gen, { olcek: this.carpan, alan: this.zemin, yakinPlan: true });
      this.kus.kok.setDepth(t.y + 5);
    } else {
      this.kus.genAyarla(gen);
    }
    const k = this.kus;
    k.no++; this.tweens.killTweensOf(k.p);
    k.yer = 'tunek'; k.durum = 'bos'; k.mesgul = false;
    Object.assign(k.p, { x: t.x, y: t.y, yuk: 0, yon: 1, bacak: 0.45, cokme: 7, puf: 1.06, basAci: 0, basX: 0, basY: 0, egim: 0,
      ezX: 1, ezY: 1, cirp: 0, gozAcik: 1, mutlu: false, kanatAci: -0.25, gagaAc: 0, kuyrukAci: 0, ibikAci: 0 });
    k.golge.setVisible(false);
    k.bosSayac = 1500;
    this.yuvaCiz();
    // Kuş Evi'ne girince küçük bir selam
    this.time.delayedCall(250, () => { if (k.durum === 'bos') k.kanatCirp(); });
  }

  // Kamera yalnız yatay kayar; başlangıçta tünek ortada. Kenarlardaki oklar odanın devamını gösterir
  kameraKur() {
    const O = this.oda, cam = this.cameras.main;
    cam.setBounds(0, 0, Math.max(O.en + O.U * 0.2, O.W), O.H);
    cam.centerOn(this.tunek.x, O.H / 2);
    const ok = (yazi, x) => this.add.text(x, (O.C + O.F) / 2, yazi, { fontFamily: 'Nunito, sans-serif', fontSize: `${28 * DPR}px`, color: '#fff8e6',
      stroke: '#3a2a35', strokeThickness: 6 * DPR }).setOrigin(0.5).setScrollFactor(0).setDepth(200000).setInteractive({ useHandCursor: true });
    // Bilgisayar düzeninde sağdaki düğme sütununun solunda dursun
    const ey = document.querySelector('#kEylem'), er = ey && ey.getBoundingClientRect();
    const sagX = !this.kenar.dar && er && er.width ? er.left * DPR - 22 * DPR : O.W - 22 * DPR;
    this.okSol = ok('◀', O.sol + 22 * DPR); this.okSag = ok('▶', sagX);
    this.okSol.on('pointerup', () => !this.surukledi && cam.pan(cam.midPoint.x - O.W * 0.7, O.H / 2, 450, 'Sine.easeInOut'));
    this.okSag.on('pointerup', () => !this.surukledi && cam.pan(cam.midPoint.x + O.W * 0.7, O.H / 2, 450, 'Sine.easeInOut'));
  }

  // Kişisel yuva: süslerin her birinin odada sabit bir yeri var. Açılmışlar yerinde, açılmamışlar soluk siluet (dokununca şartı yazar).
  // Yeni bir süs açılınca kamera oraya kayar ve süs hafifçe zıplayarak yerine oturur
  yuvaCiz() {
    const v = this.kusVeri(), O = this.oda, t = this.tunek, U = O.U;
    const acik = v ? acikSusler(v) : [], anahtar = v ? v.id + ':' + acik.join(',') : '';
    if (anahtar === this.yuvaAnahtar) return;
    const onceki = this.yuvaKus === (v && v.id) ? this.acikOnce || [] : null;
    this.yuvaAnahtar = anahtar; this.yuvaKus = v && v.id; this.acikOnce = acik;
    (this.susler || []).forEach((r) => r.destroy());
    this.susler = [];
    if (!v) return;
    let yeni = null;
    for (const id of kusSusleri(v)) {
      const Y = SUS_YERI[id];
      if (!Y || !this.textures.exists('yuva_' + id)) continue;
      const acikMi = acik.includes(id), r = this.add.image(0, 0, 'yuva_' + id);
      if (Y.yer === 'kemer') {
        if (!acikMi) { r.destroy(); continue; } // türe özel kemer açılmadan görünmez (tüneği kapatmasın)
        const boy = O.F - (t.y - U * 0.95), sx = Math.min(boy / r.height, U * 3 / r.width), sy = Math.min(boy / r.height, sx * Y.uzama);
        r.setScale(sx, sy).setOrigin(0.5, 1).setPosition(t.x, O.F + U * 0.04).setDepth(t.y - 4);
      } else {
        r.setScale(U * Y.boy / r.height);
        const x = O.OX + (Y.x || 0) * U;
        if (Y.yer === 'tunek') r.setOrigin(0.5, 0).setPosition(t.x, t.y + (O.F - t.y) * 0.32).setDepth(t.y);
        else if (Y.yer === 'tavan') r.setOrigin(0.5, 0).setPosition(x, O.C - U * 0.05).setDepth(-5);
        else if (Y.yer === 'duvar') r.setOrigin(0.5, 0).setPosition(x, O.C + (O.F - O.C) * Y.y).setDepth(-5);
        else r.setOrigin(0.5, 1).setPosition(x, O.F + U * 0.06).setDepth(O.F - 1);
        if (acikMi && (Y.yer === 'tavan' || Y.yer === 'tunek')) this.tweens.add({ targets: r, angle: { from: -2, to: 2 }, duration: 2400 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      if (!acikMi) {
        // Siluet: koyu ve saydam; üstünde kilit
        r.setTint(0x3a2a35).setAlpha(0.22).setInteractive({ useHandCursor: true });
        r.susId = id;
        const b = r.getBounds();
        this.susler.push(this.add.text(b.centerX, b.centerY, '🔒', { fontSize: `${Math.max(14, U * 0.18)}px` }).setOrigin(0.5).setDepth(r.depth + 1).setAlpha(0.8));
      } else if (onceki && !onceki.includes(id)) yeni = r;
      this.susler.push(r);
    }
    if (yeni) {
      // Yeni açılan süs: kamera oraya kayar, süs zıplayarak belirir
      const cam = this.cameras.main, sx = yeni.scaleX, sy = yeni.scaleY;
      cam.pan(yeni.x, O.H / 2, 600, 'Sine.easeInOut');
      yeni.setScale(0.01);
      this.tweens.add({ targets: yeni, scaleX: sx, scaleY: sy, delay: 450, duration: 500, ease: 'Back.easeOut' });
    }
  }

  update(zaman, dt) {
    if (this.kus) this.kus.update(zaman, Math.min(dt, 50));
    if (this.okSol) {
      const cam = this.cameras.main, b = cam.getBounds(), a = 0.75 + Math.sin(zaman / 300) * 0.25;
      this.okSol.setVisible(cam.scrollX > b.x + 4).setAlpha(a);
      this.okSag.setVisible(cam.scrollX + cam.width < b.right - 4).setAlpha(a);
    }
  }

  // İkram, ekranın altından kuşun gagasına doğru süzülür ve küçülerek kaybolur
  ikramUcur(id) {
    if (!this.kus || !this.textures.exists('ikram_' + id)) return;
    const k = this.kus, H = this.scale.height, bas = k.dunyaKonumu(k.gaga);
    const r = this.add.image(bas.x + 30 * DPR, H - this.kenar.alt * DPR, 'ikram_' + id).setDepth(100000);
    const s0 = 56 * DPR / Math.max(r.width, r.height);
    r.setScale(s0);
    // Gaganın ucunu her karede yeniden hesaplar: kuş yemek için başını eğerken ikram gagayı takip eder
    const uc = () => { const b = k.iGagaUst.visible ? k.iGagaUst.getBounds() : null, g = k.dunyaKonumu(k.gaga);
      return b ? { x: k.p.yon < 0 ? b.left : b.right, y: b.bottom } : g; };
    const x0 = r.x, y0 = r.y, ilerleme = { t: 0 };
    this.tweens.add({ targets: ilerleme, t: 1, duration: 420, ease: 'Sine.easeOut',
      onUpdate: () => { const h = uc(), t = ilerleme.t; r.setPosition(x0 + (h.x - x0) * t, y0 + (h.y - y0) * t).setScale(s0 * (1 - 0.5 * t)); },
      onComplete: () => {
        const takip = this.time.addEvent({ delay: 16, loop: true, callback: () => { const h = uc(); r.setPosition(h.x, h.y); } });
        this.tweens.add({ targets: r, scale: 0, alpha: 0, delay: 380, duration: 380, onComplete: () => { takip.remove(); r.destroy(); } });
      } });
  }
  // --- Çizimler ---
  // Geniş oda (geçici kod çizimi; Gemini panoraması gelince değişecek): tahta duvar, köşelere göre pencere, kiriş ve raf, zemin ve halılar
  arkaPlan(O) {
    const g = this.add.graphics().setDepth(-10), gece = this.gece, U = O.U, en = Math.max(O.en + U * 0.2, O.W), F = O.F, H = O.H;
    const karart = (renk) => Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(renk), Phaser.Display.Color.ValueToColor(0x2a2340), 100, gece * 35);
    const r = (renk) => { const c = karart(renk); return Phaser.Display.Color.GetColor(c.r, c.g, c.b); };
    const X = (u) => O.OX + u * U;
    // Duvar: dikey tahtalar
    const tahta = U * 0.42;
    for (let x = 0, n = 0; x < en; x += tahta, n++) {
      g.fillStyle(r(n % 2 ? 0xd29a52 : 0xdcaa64)); g.fillRect(x, 0, tahta, F);
      g.fillStyle(r(0xb07a3c)); g.fillRect(x, 0, Math.max(2, U * 0.015), F);
    }
    // Süpürgelik ve zemin
    g.fillStyle(r(0x8a5a30)); g.fillRect(0, F - U * 0.1, en, U * 0.1);
    g.fillStyle(r(0xa8743f)); g.fillRect(0, F, en, H - F);
    for (let y = F + U * 0.12; y < H; y += U * 0.18) { g.fillStyle(r(0x93622f)); g.fillRect(0, y, en, Math.max(2, U * 0.012)); }
    // Halılar: dinlenme köşesinde yuvarlak krem, tünek altında yeşil
    g.fillStyle(r(0xe8d6b0)); g.fillEllipse(X(1.4), F + U * 0.05, U * 2.6, U * 0.5);
    g.fillStyle(r(0x7fae5a)); g.fillEllipse(X(TUNEK_X), F + U * 0.05, U * 2.2, U * 0.45);
    g.fillStyle(r(0x93c06c)); g.fillEllipse(X(TUNEK_X), F + U * 0.05, U * 1.6, U * 0.3);
    // Oyun köşesi: tavan kirişi
    g.fillStyle(r(0x7d4e28)); g.fillRect(X(4.7), O.C - U * 0.12, U * 2.6, U * 0.16);
    // Bakım köşesi: yuvarlak pencere
    const px = X(8.35), py = O.C + (F - O.C) * 0.38, pr = U * 0.55;
    g.fillStyle(r(0x8a5a30)); g.fillCircle(px, py, pr + U * 0.07);
    g.fillStyle(gece > 0.5 ? 0x1d2a5c : 0x9ad4ff); g.fillCircle(px, py, pr);
    if (gece > 0.5) { g.fillStyle(0xfff3c4); g.fillCircle(px + pr * 0.35, py - pr * 0.35, pr * 0.18); }
    else { g.fillStyle(0xffffff, 0.9); g.fillEllipse(px - pr * 0.3, py - pr * 0.35, pr * 0.7, pr * 0.22); }
    g.fillStyle(gece > 0.5 ? 0x24402c : 0x6cc154);
    for (const [dx, rr] of [[-0.55, 0.42], [0, 0.5], [0.55, 0.45]]) g.fillCircle(px + dx * pr, py + pr * 0.6, pr * rr);
    g.lineStyle(Math.max(3, U * 0.05), r(0x8a5a30)); g.lineBetween(px - pr, py, px + pr, py); g.lineBetween(px, py - pr, px, py + pr);
    g.lineStyle(Math.max(2, U * 0.025), CIZGI); g.strokeCircle(px, py, pr + U * 0.07);
    // Hazine rafı: duvarda iki raf tahtası
    for (const f of [0.42, 0.66]) { g.fillStyle(r(0x8a5a30)); g.fillRect(X(9.7), O.C + (F - O.C) * f, U * 1.7, U * 0.07); }
    // Köşe tabelaları: zeminin önünde küçük ahşap yazılar (oyuncu odanın öbür köşelerini keşfetsin)
    for (const K of KOSELER) {
      this.add.text(X(K.x), F + U * 0.2, K.ad, { fontFamily: 'Nunito, sans-serif', fontStyle: '800', fontSize: `${Math.max(11 * DPR, U * 0.12)}px`,
        color: '#fff3d6', backgroundColor: '#8a5a30', padding: { x: U * 0.06, y: U * 0.02 } }).setOrigin(0.5).setDepth(-9).setAlpha(0.92);
    }
    // Gece: tavandan sıcak bir ışık
    if (gece > 0.5) { g.fillStyle(0xffd27a, 0.1); g.fillCircle(X(TUNEK_X), O.C, U * 3); }
  }

  // Tünek: kuşa göre ölçekli (dalı kuşun ayaklarını rahat taşır), tabanı yerde
  tunekCiz(x, y, en, F) {
    if (this.textures.exists('kusevi_tunek')) {
      const t = this.add.image(x, F, 'kusevi_tunek').setOrigin(0.5, 1).setDepth(y - 1);
      const DAL_UST = 0.02; // görselde dalın üst kenarı (yükseklik oranı)
      t.setScale((F - y) / (t.height * (1 - DAL_UST)));
      return;
    }
    const g = this.add.graphics().setDepth(y), dal = en * 0.11;
    g.fillStyle(CIZGI); g.fillRoundedRect(x - dal * 0.55, y, dal * 1.1, F - y, 6);
    g.fillStyle(0x9a6a44); g.fillRoundedRect(x - dal * 0.42, y, dal * 0.84, F - y - 2, 5);
    g.fillStyle(CIZGI); g.fillEllipse(x, F, dal * 3.2, dal * 1.1);
    g.fillStyle(0x8a5a30); g.fillEllipse(x, F - 2, dal * 2.9, dal * 0.85);
    g.fillStyle(CIZGI); g.fillRoundedRect(x - en / 2 - 4, y - dal * 0.2 - 4, en + 8, dal + 8, dal * 0.5);
    g.fillStyle(0xa5744b); g.fillRoundedRect(x - en / 2, y - dal * 0.2, en, dal, dal * 0.45);
  }
}
