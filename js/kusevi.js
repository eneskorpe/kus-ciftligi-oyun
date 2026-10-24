// Kuş Evi sahnesi: kuşun yakından görüldüğü iç mekân. Ortada tünek, tünekte seçili kuş.
// Gemini görselleri (assets/kusevi/ic.png, ic_gece.png, tunek.png) varsa onları, yoksa kodla çizilmiş hali kullanır.
import { Kus } from './kus.js';
import { efektleriKur } from './efekt.js';
import { gorselleriYukle } from './kusGorsel.js';
import { kusGen } from './genetik.js';
import { gunDurumu } from './gunIsigi.js';
import { D } from './durum.js';
import { potBellek } from './pot.js';
import * as M from './mekanik.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const CIZGI = 0x3a2a35;

// Arayüzün kapladığı alanlar (CSS pikseli): sol avatar şeridi, üst bilgi kartı, alt yem tepsisi
export const KENAR = { sol: 86, ust: 132, alt: 124 };
// Hazırlanan Gemini görselleri (assets/kusevi/): 'ic', 'ic_gece', 'tunek'. Eklendikçe buraya yazılır.
const KUSEVI_GORSELLERI = ['ic.jpg', 'ic_gece.jpg', 'tunek.png'];
// Arka plan görselinde halının merkezi (oran olarak): tünek buraya oturur
const HALI = { x: 0.5, y: 0.875 };

export class KusEvi extends Phaser.Scene {
  constructor() { super('kusevi'); }

  preload() {
    gorselleriYukle(this);
    for (const id of ['dari', 'ay', 'meyve', 'bal', 'kalsiyum', 'test']) this.load.image('ikram_' + id, `assets/kusevi/ikram_${id}.png`);
    for (const dosya of KUSEVI_GORSELLERI) this.load.image('kusevi_' + dosya.split('.')[0], `assets/kusevi/${dosya}`);
  }

  create(veri) {
    potBellek(this, /^(kus_|ikram_|kusevi_tunek)/); // yumuşak kenarlı küçültme (pot.js)
    efektleriKur(this);
    const W = this.scale.width, H = this.scale.height;
    const sol = KENAR.sol * DPR, ust = KENAR.ust * DPR, alt = KENAR.alt * DPR;
    this.gece = gunDurumu().gece;
    this.gunIsigi = { gece: this.gece };
    this.arkaPlan(W, H);

    // Tünek: kuş alanının ortasında, alt tepsinin biraz üstünde
    const alanH = H - ust - alt, cx = sol + (W - sol) / 2;
    // Görselli tünekte direk halıya basar; tünek dalının yüksekliği alana göre
    const tunekY = ust + alanH * (this.textures.exists('kusevi_tunek') ? 0.6 : 0.72);
    // Kuş ölçeği: kuş yaklaşık 80 birim boyunda, 100 birim enindedir
    this.carpan = Math.min(alanH * 0.36 / (80 * 2.2), (W - sol) * 0.55 / (100 * 2.2));
    this.tunekCiz(cx, tunekY, Math.min((W - sol) * 0.6, 110 * this.carpan * 2.2), H);
    this.tunek = { x: cx, y: tunekY, zeminY: tunekY };
    this.zemin = { x1: cx - 10, x2: cx + 10, y1: tunekY - 2, y2: tunekY + 2 };

    this.kus = null;
    this.kusSec(veri && veri.id);

    // Dokunma: kısa dokunuş = sev, kuşun üstünde parmak gezdirme = okşa
    let basla = null, yol = 0;
    this.input.on('pointerdown', (p) => { if (this.kus && this.kus.dokunduMu(p.worldX, p.worldY)) { basla = { x: p.x, y: p.y }; yol = 0; } });
    this.input.on('pointermove', (p) => {
      if (!basla || !p.isDown) return;
      yol += Math.hypot(p.x - p.prevPosition.x, p.y - p.prevPosition.y);
      if (yol > 30 * DPR) this.kus.oksan();
    });
    this.input.on('pointerup', () => {
      if (basla && yol <= 30 * DPR) this.game.events.emit('kuseviSev');
      basla = null;
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
    // Kuş Evi'ne girince küçük bir selam
    this.time.delayedCall(250, () => { if (k.durum === 'bos') k.kanatCirp(); });
  }

  update(zaman, dt) { if (this.kus) this.kus.update(zaman, Math.min(dt, 50)); }

  // İkram, ekranın altından kuşun gagasına doğru süzülür ve küçülerek kaybolur
  ikramUcur(id) {
    if (!this.kus || !this.textures.exists('ikram_' + id)) return;
    const k = this.kus, H = this.scale.height, bas = k.dunyaKonumu(k.gaga);
    const r = this.add.image(bas.x + 30 * DPR, H - KENAR.alt * DPR, 'ikram_' + id).setDepth(100000);
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
  arkaPlan(W, H) {
    const anahtar = this.gece > 0.5 && this.textures.exists('kusevi_ic_gece') ? 'kusevi_ic_gece' : 'kusevi_ic';
    if (this.textures.exists(anahtar)) {
      const r = this.add.image(W / 2, H / 2, anahtar).setDepth(-10);
      r.setScale(Math.max(W / r.width, H / r.height));
      this.haliY = H / 2 + (HALI.y - 0.5) * r.displayHeight;
      return;
    }
    const g = this.add.graphics().setDepth(-10), gece = this.gece;
    const karart = (renk) => Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(renk), Phaser.Display.Color.ValueToColor(0x2a2340), 100, gece * 55);
    const r = (renk) => { const c = karart(renk); return Phaser.Display.Color.GetColor(c.r, c.g, c.b); };
    const zeminY = H * 0.86;
    // Duvar: dikey tahtalar
    g.fillStyle(r(0xd9a35c)); g.fillRect(0, 0, W, zeminY);
    const tahta = 70 * DPR;
    for (let x = 0, n = 0; x < W; x += tahta, n++) {
      g.fillStyle(r(n % 2 ? 0xd29a52 : 0xdcaa64)); g.fillRect(x, 0, tahta, zeminY);
      g.fillStyle(r(0xb07a3c)); g.fillRect(x, 0, 3 * DPR, zeminY);
      g.fillStyle(r(0xc48c4a), 0.6); g.fillCircle(x + tahta * 0.5, zeminY * (0.2 + (n * 37 % 60) / 100), 4 * DPR);
    }
    // Tavan kirişi
    g.fillStyle(r(0x9a6334)); g.fillRect(0, 0, W, 34 * DPR);
    g.fillStyle(r(0x7d4e28)); g.fillRect(0, 30 * DPR, W, 6 * DPR);
    // Pencere (sağ üst): gündüz gökyüzü ve ağaçlar, gece yıldızlar ve ay
    const pr = Math.min(W, H) * 0.17, px = W - pr * 1.25, py = H * 0.32;
    g.fillStyle(r(0x8a5a30)); g.fillCircle(px, py, pr + 14 * DPR);
    g.fillStyle(gece > 0.5 ? 0x1d2a5c : 0x9ad4ff); g.fillCircle(px, py, pr);
    if (gece > 0.5) {
      g.fillStyle(0xfff3c4); g.fillCircle(px + pr * 0.35, py - pr * 0.35, pr * 0.18);
      g.fillStyle(0x1d2a5c); g.fillCircle(px + pr * 0.43, py - pr * 0.42, pr * 0.15);
      g.fillStyle(0xffffff, 0.8);
      for (let i = 0; i < 9; i++) { const a = i * 2.4, d = pr * (0.2 + (i % 4) * 0.18); g.fillCircle(px + Math.cos(a) * d, py + Math.sin(a) * d * 0.6 - pr * 0.2, 1.6 * DPR); }
    } else {
      g.fillStyle(0xffffff, 0.9); g.fillEllipse(px - pr * 0.3, py - pr * 0.4, pr * 0.6, pr * 0.22);
    }
    g.fillStyle(gece > 0.5 ? 0x24402c : 0x6cc154);
    for (const [dx, rr] of [[-0.55, 0.42], [0, 0.5], [0.55, 0.45]]) g.fillCircle(px + dx * pr, py + pr * 0.55, pr * rr);
    g.lineStyle(10 * DPR, r(0x8a5a30)); g.lineBetween(px - pr, py, px + pr, py); g.lineBetween(px, py - pr, px, py + pr);
    g.lineStyle(5 * DPR, CIZGI); g.strokeCircle(px, py, pr + 14 * DPR);
    // Sol duvarda raf ve yuvalar
    const rx = W * 0.02 + KENAR.sol * DPR, ry = H * 0.36;
    for (const yy of [ry, ry + H * 0.17]) {
      g.fillStyle(r(0x8a5a30)); g.fillRect(rx, yy, W * 0.16, 12 * DPR);
      g.fillStyle(r(0xe0b956)); g.fillEllipse(rx + W * 0.08, yy - 8 * DPR, W * 0.11, 22 * DPR);
      g.fillStyle(r(0xc99a2e)); g.fillEllipse(rx + W * 0.08, yy - 10 * DPR, W * 0.07, 10 * DPR);
    }
    // Zemin ve halı
    g.fillStyle(r(0xa8743f)); g.fillRect(0, zeminY, W, H - zeminY);
    for (let y = zeminY + 18 * DPR; y < H; y += 26 * DPR) { g.fillStyle(r(0x93622f)); g.fillRect(0, y, W, 3 * DPR); }
    g.fillStyle(r(0x7fae5a)); g.fillEllipse(W / 2 + KENAR.sol * DPR / 2, zeminY + (H - zeminY) * 0.45, W * 0.62, (H - zeminY) * 0.6);
    g.fillStyle(r(0x93c06c)); g.fillEllipse(W / 2 + KENAR.sol * DPR / 2, zeminY + (H - zeminY) * 0.45, W * 0.48, (H - zeminY) * 0.42);
    // Gece fener ışığı
    if (gece > 0.5) {
      g.fillStyle(0xffd27a, 0.12); g.fillCircle(W / 2, H * 0.25, Math.max(W, H) * 0.45);
    }
  }

  tunekCiz(x, y, en, H) {
    const zeminY = H * 0.86;
    if (this.textures.exists('kusevi_tunek')) {
      // Dal üstü y noktasında, taban halıda (alt tepsinin altında kalmasın); dal kuşun ayaklarını rahat taşısın
      const taban = Math.min(this.haliY || zeminY, H - KENAR.alt * DPR + 30 * DPR);
      const t = this.add.image(x, taban, 'kusevi_tunek').setOrigin(0.5, 1).setDepth(y - 1);
      const DAL_UST = 0.02; // görselde dalın üst kenarı (yükseklik oranı)
      t.setScale(Math.max((taban - y) / (t.height * (1 - DAL_UST)), en * 1.15 / t.width));
      t.y = y - t.displayHeight * DAL_UST + t.displayHeight;
      return;
    }
    const g = this.add.graphics().setDepth(y), dal = en * 0.11;
    // Direk ve taban
    g.fillStyle(CIZGI); g.fillRoundedRect(x - dal * 0.55, y, dal * 1.1, zeminY - y + 10 * DPR, 6);
    g.fillStyle(0x9a6a44); g.fillRoundedRect(x - dal * 0.42, y, dal * 0.84, zeminY - y + 6 * DPR, 5);
    g.fillStyle(CIZGI); g.fillEllipse(x, zeminY + 8 * DPR, dal * 3.2, dal * 1.1);
    g.fillStyle(0x8a5a30); g.fillEllipse(x, zeminY + 5 * DPR, dal * 2.9, dal * 0.85);
    // Yatay dal
    g.fillStyle(CIZGI); g.fillRoundedRect(x - en / 2 - 4, y - dal * 0.2 - 4, en + 8, dal + 8, dal * 0.5);
    g.fillStyle(0xa5744b); g.fillRoundedRect(x - en / 2, y - dal * 0.2, en, dal, dal * 0.45);
    g.fillStyle(0xc08a5c); g.fillRoundedRect(x - en / 2 + dal * 0.3, y - dal * 0.05, en - dal * 0.6, dal * 0.22, dal * 0.1);
    g.fillStyle(0xe2c29a); g.fillEllipse(x + en / 2 - dal * 0.25, y + dal * 0.3, dal * 0.4, dal * 0.75);
    // İp sargısı
    g.fillStyle(0xd9b77a);
    for (let i = 0; i < 3; i++) g.fillRoundedRect(x - dal * 0.6, y + dal * 0.85 + i * dal * 0.28, dal * 1.2, dal * 0.2, 3);
    // Sarmaşık
    for (let i = 0; i < 4; i++) { g.fillStyle(i % 2 ? 0x5fae4a : 0x4f9e3e); g.fillEllipse(x + (i % 2 ? dal * 0.5 : -dal * 0.4), y + dal * 2 + i * dal * 0.9, dal * 0.7, dal * 0.45); }
  }
}
