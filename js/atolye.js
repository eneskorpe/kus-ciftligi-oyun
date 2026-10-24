// Kuş Atölyesi: tek kuşun animasyonlarını, renk genlerini ve tüy değerini denemek için sahne.
import { Kus } from './kus.js';
import { TURLER, MUTASYONLAR, kondisyonAdi } from './turler.js';
import { efektleriKur } from './efekt.js';
import { GORSEL_TURLER, ONAYLI } from './kusGorsel.js';
import { gorselleriYukle } from './kusGorsel.js';

const W = 1000, H = 1000;
// ?tur=saka ile doğrudan bir türü açar (çizim kontrolü için)
const istenen = new URLSearchParams(location.search).get('tur');
const ILK_TUR = TURLER[istenen] ? istenen : 'kanarya';
const CIZGI = 0x3a2a35;

class Atolye extends Phaser.Scene {
  constructor() { super('atolye'); }

  preload() {
    gorselleriYukle(this);
    for (const tur of Object.keys(GORSEL_TURLER)) this.load.image('tasarim_' + tur, `assets/kuslar/${tur}/tasarim.png`);
  }

  create() {
    this.zemin = { x1: 120, x2: 880, y1: 650, y2: 930 };
    this.tunek = { x: 712, y: 466, zeminY: 700 };
    this.tunek.yuk = this.tunek.zeminY - this.tunek.y;
    this.yemlik = { x: 230, y: 800 };
    this.yuva = { x: 560, y: 862 };

    efektleriKur(this);
    this.arkaPlanCiz();
    this.agacCiz();
    this.yemlikCiz();
    this.yuvaCiz();

    this.kus = new Kus(this, 430, 760, { tur: ILK_TUR, mutasyon: 'normal', tuy: 0.2, tohum: 7 }, { onizleme: true });
    this.input.on('pointerdown', (ptr) => {
      if (this.kus.dokunduMu(ptr.worldX, ptr.worldY)) return this.kus.sevil();
      const Z = this.zemin;
      if (ptr.worldY > Z.y1 - 30) this.kus.git(Phaser.Math.Clamp(ptr.worldX, Z.x1, Z.x2), Phaser.Math.Clamp(ptr.worldY, Z.y1, Z.y2));
    });
    // Tasarımla karşılaştırma: tasarım görseli yarı saydam olarak kuşun üstüne oturur
    this.karsilastir = false;
    this.tasarimResmi = this.add.image(0, 0, '__WHITE').setVisible(false).setDepth(9000).setAlpha(0.5);
    this.game.events.emit('hazir', this);
  }

  update(zaman, dt) {
    this.kus.update(zaman, Math.min(dt, 50));
    const k = this.kus, G = k.gorsel, T = G && G.tasarim, r = this.tasarimResmi;
    r.setVisible(!!(this.karsilastir && T));
    if (!r.visible) return;
    const m = k.govdeKok.getWorldTransformMatrix();
    r.setTexture('tasarim_' + k.gen.tur);
    r.setOrigin(T.x / r.width, T.y / r.height).setScale(T.k * k.olcek).setPosition(m.tx, m.ty).setFlipX(k.p.yon < 0);
  }


  arkaPlanCiz() {
    const g = this.add.graphics().setDepth(-10);
    g.fillGradientStyle(0x8fd0ff, 0x8fd0ff, 0xe6f6ff, 0xe6f6ff, 1); g.fillRect(0, 0, W, 640);
    g.fillStyle(0xfff3b8, 0.9); g.fillCircle(150, 150, 62);
    g.fillStyle(0xffffff, 0.92);
    for (const [x, y, s] of [[390, 170, 1], [780, 120, 1.25], [600, 260, 0.7]]) {
      g.fillEllipse(x, y, 120 * s, 46 * s); g.fillEllipse(x - 40 * s, y + 8 * s, 80 * s, 36 * s); g.fillEllipse(x + 44 * s, y + 6 * s, 90 * s, 38 * s);
    }
    g.fillStyle(0xb5e294); g.fillEllipse(180, 640, 820, 260);
    g.fillStyle(0xa3d982); g.fillEllipse(820, 650, 860, 300);
    g.fillStyle(0x8ccd62); g.fillRect(0, 620, W, H - 620); g.fillEllipse(500, 630, 1400, 120);
    g.fillStyle(0x7dbf55);
    for (let i = 0; i < 70; i++) {
      const x = Phaser.Math.Between(10, 990), y = Phaser.Math.Between(640, 990), b = Phaser.Math.Between(6, 12);
      g.fillTriangle(x - 4, y, x, y - b, x + 4, y);
    }
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(20, 980), y = Phaser.Math.Between(660, 985);
      g.fillStyle(Phaser.Utils.Array.GetRandom([0xffffff, 0xffd84a, 0xff9ac0])); g.fillCircle(x, y, 4.5);
      g.fillStyle(0xffe680); g.fillCircle(x, y, 1.8);
    }
  }

  agacCiz() {
    const g = this.add.graphics().setDepth(699), T = this.tunek;
    g.fillStyle(CIZGI); g.fillRoundedRect(786, 380, 66, 330, 14);
    g.fillStyle(0x9a6a44); g.fillRoundedRect(789, 383, 60, 324, 12);
    g.fillStyle(0x7d5233); g.fillRect(805, 430, 6, 220); g.fillRect(828, 470, 5, 160);
    // Tünek dalı
    g.lineStyle(22, CIZGI); g.lineBetween(T.x - 90, T.y + 9, 800, T.y + 4);
    g.lineStyle(16, 0xa5744b); g.lineBetween(T.x - 88, T.y + 9, 800, T.y + 4);
    g.fillStyle(0x6cba4c); g.fillEllipse(T.x - 86, T.y - 4, 26, 14);
    // Yapraklar
    // Yapraklar: önce tüm dış çizgiler, sonra dolgular; böylece tek parça bir taç görünür
    const tac = [[820, 330, 150, 110, 0x4f9e3e], [740, 300, 110, 80, 0x5fb04a], [900, 290, 110, 90, 0x5fb04a], [820, 250, 120, 90, 0x6cc154]];
    for (const [x, y, rx, ry] of tac) { g.fillStyle(CIZGI); g.fillEllipse(x, y, rx * 2 + 7, ry * 2 + 7); }
    for (const [x, y, rx, ry, renk] of tac) { g.fillStyle(renk); g.fillEllipse(x, y, rx * 2, ry * 2); }
    g.fillStyle(0x7fd062, 0.7);
    for (const [x, y] of [[780, 230], [850, 200], [900, 260], [720, 290]]) g.fillEllipse(x, y, 46, 26);
  }

  yemlikCiz() {
    const Y = this.yemlik, g = this.add.graphics().setDepth(Y.y + 6);
    g.fillStyle(CIZGI); g.fillEllipse(Y.x, Y.y, 116, 40);
    g.fillStyle(0xb98552); g.fillEllipse(Y.x, Y.y, 110, 34);
    g.fillStyle(0x7c5531); g.fillEllipse(Y.x, Y.y - 3, 90, 22);
    g.fillStyle(0xe9c46a);
    for (let i = 0; i < 26; i++) g.fillEllipse(Y.x + Phaser.Math.Between(-36, 36), Y.y - 3 + Phaser.Math.Between(-7, 7), 8, 5);
  }

  yuvaCiz() {
    const Y = this.yuva;
    const arka = this.add.graphics().setDepth(Y.y - 20);
    arka.fillStyle(CIZGI); arka.fillEllipse(Y.x, Y.y - 6, 172, 62);
    arka.fillStyle(0xa77a4a); arka.fillEllipse(Y.x, Y.y - 6, 166, 56);
    arka.fillStyle(0x6e4a2c); arka.fillEllipse(Y.x, Y.y - 8, 124, 34);
    this.yumurtaG = this.add.graphics().setDepth(Y.y - 10);
    const on = this.add.graphics().setDepth(Y.y + 8);
    on.fillStyle(CIZGI); on.slice(Y.x, Y.y - 6, 86, 0, Math.PI, false); on.fillPath();
    on.fillStyle(0xb88a56); on.slice(Y.x, Y.y - 8, 81, 0.05, Math.PI - 0.05, false); on.fillPath();
    on.fillStyle(0xa77a4a); on.fillEllipse(Y.x, Y.y - 6, 150, 20);
    on.lineStyle(3, 0x7c5531);
    for (let i = 0; i < 12; i++) {
      const a = 0.25 + i * 0.22, x = Y.x + Math.cos(a) * 70, y = Y.y - 6 + Math.sin(a) * 50;
      on.lineBetween(x - 14, y - 4, x + 12, y + 3);
    }
  }

  yumurtaGoster(gen) {
    const Y = this.yuva, e = TURLER[gen.tur].yumurta, g = this.yumurtaG, x = Y.x, y = Y.y - 22;
    g.clear();
    g.fillStyle(CIZGI); g.fillEllipse(x, y, 40, 50);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(e.renk).color); g.fillEllipse(x, y, 34, 44);
    if (e.benek) {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(e.benek).color);
      for (const [dx, dy, r] of [[-6, -8, 2.5], [5, -2, 2], [-2, 8, 3], [7, 10, 1.8], [-9, 3, 1.6]]) g.fillCircle(x + dx, y + dy, r);
    }
    g.fillStyle(0xffffff, 0.6); g.fillEllipse(x - 7, y - 10, 8, 12);
  }
}

// --- Oyun ve arayüz ---
const oyun = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'oyun',
  backgroundColor: '#bfe6fb',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: [Atolye],
});
window.oyun = oyun; // tarayıcı konsolundan deneme yapabilmek için

const $ = (s) => document.querySelector(s);
let metinler = {};
fetch('icerik/turler.json').then((r) => r.json()).then((j) => { metinler = j.turler; bilgiGuncelle(); }).catch(() => {});

oyun.events.once('hazir', (sahne) => {
  const kus = sahne.kus;
  const turSec = $('#tur'), mutSec = $('#mutasyon'), tuy = $('#tuy');
  turSec.innerHTML = Object.entries(TURLER).map(([k, t]) => `<option value="${k}">${t.ad} (${t.nadirlik})</option>`).join('');
  mutSec.innerHTML = Object.entries(MUTASYONLAR).map(([k, ad]) => `<option value="${k}">${ad}</option>`).join('');

  const uygula = (gen) => {
    kus.genAyarla(gen);
    turSec.value = gen.tur; mutSec.value = gen.mutasyon; tuy.value = gen.tuy;
    bilgiGuncelle();
  };
  turSec.onchange = () => uygula({ ...kus.gen, tur: turSec.value });
  mutSec.onchange = () => uygula({ ...kus.gen, mutasyon: mutSec.value });
  tuy.oninput = () => uygula({ ...kus.gen, tuy: +tuy.value });
  $('#rastgele').onclick = () => {
    const turler = Object.keys(TURLER);
    const mut = Math.random() < 0.55 ? 'normal' : Phaser.Utils.Array.GetRandom(Object.keys(MUTASYONLAR).slice(1));
    uygula({ tur: Phaser.Utils.Array.GetRandom(turler), mutasyon: mut, tuy: +(Math.random() ** 1.6).toFixed(3), tohum: Phaser.Math.Between(1, 999) });
  };
  document.querySelectorAll('[data-eylem]').forEach((b) => { b.onclick = () => kus[b.dataset.eylem](); });
  uygula(kus.gen);
});

function bilgiGuncelle() {
  const sahne = oyun.scene.getScene('atolye');
  if (!sahne || !sahne.kus) return;
  const gen = sahne.kus.gen, tur = TURLER[gen.tur], m = metinler[gen.tur];
  $('#kusAd').textContent = tur.ad;
  $('#nadirlik').textContent = tur.nadirlik;
  $('#nadirlik').dataset.nadirlik = tur.nadirlik;
  $('#kondisyon').textContent = `${MUTASYONLAR[gen.mutasyon]} · ${kondisyonAdi(gen.tuy)} (${gen.tuy.toFixed(3)}) · Desen #${gen.tohum}`;
  $('#tuyEtiket').textContent = `Tüy değeri: ${gen.tuy.toFixed(3)} (${kondisyonAdi(gen.tuy)})`;
  $('#tanim').innerHTML = m ? `<b>${m.kisilik}.</b> ${m.tanim} <i>${m.gercekBilgi}</i>` : '';
  if (kontrolCiz.tur !== gen.tur) kontrolCiz(gen.tur);
}

// --- Çizim kontrolü: tasarım, kesilen parçalar, onay durumu ve pozlar ---
const PARCA_ADLARI = [['govde', 'Gövde'], ['bas', 'Baş (gözsüz)'], ['basGozlu', 'Gözlü baş'], ['ibik', 'İbik'], ['gagaUst', 'Üst gaga'],
  ['gagaAlt', 'Alt gaga'], ['kanat', 'Katlı kanat'], ['acikKanat', 'Açık kanat'], ['kuyruk', 'Kuyruk'], ['bacak', 'Bacak']];

function kontrolCiz(tur) {
  kontrolCiz.tur = tur;
  const G = GORSEL_TURLER[tur], durum = $('#onayDurum');
  if (!G) {
    durum.textContent = ''; durum.className = '';
    $('#kIcerik').innerHTML = '<p class="kNot">Bu türün henüz çizimi yok; kodla çizilmiş hali görünüyor.</p>';
    return;
  }
  const onayli = ONAYLI.includes(tur);
  durum.textContent = onayli ? '✅ Onaylı' : '⏳ Onay bekliyor';
  durum.className = onayli ? 'onayli' : 'bekliyor';
  const parcalar = PARCA_ADLARI.filter(([p]) => p !== 'ibik' || G.ibik).map(([p, ad]) => {
    const ikiz = p === 'gagaAlt';
    return `<figure class="${ikiz ? 'uyari' : ''}"><img src="assets/kuslar/${tur}/${p}.png" alt="" onerror="this.parentElement.style.display='none'">
      <figcaption>${ad}${ikiz ? '<br>Kullanılmıyor: alt çene kodla çizilir' : ''}</figcaption></figure>`;
  }).join('');
  $('#kIcerik').innerHTML = `
    <div class="kTasarim"><img src="raw/${tur}_tasarim.jpg" alt="Tasarım"><p class="kNot">Soldaki tasarımla oyundaki kuşu karşılaştır. Pozları görmek için düğmeye bas.</p></div>
    <div class="kDugmeler"><button id="kPoz">▶️ Pozları sırayla göster</button><button id="kKarsilastir">👁 Tasarımla karşılaştır</button></div>
    <div class="kParcalar">${parcalar}</div>
    <ul class="kListe">
      <li>İki gaga, eksik ya da fazla parça var mı?</li>
      <li>Baş gövdeye düzgün oturuyor mu, arada boşluk var mı?</li>
      <li>Göz ve allık doğru yerde mi?</li>
      <li>Kanat çırparken açık kanat geriye doğru mu bakıyor?</li>
      <li>Kuyruk ve bacaklar yerinde mi?</li>
      <li>Renk genlerinde (Lutino, Albino, Mavi seri) renkler düzgün mü?</li>
    </ul>
    <p class="kNot">${onayli ? 'Bu tür onaylı, köyde çizimiyle görünüyor.' : `Beğendiysen bana <b>"${TURLER[tur].ad} onaylı"</b> yaz; sorun varsa ne gördüğünü söyle. Onaylanana kadar köyde kod çizimiyle görünür.`}</p>`;
  $('#kPoz').onclick = pozlariGoster;
  $('#kKarsilastir').onclick = () => { const s = oyun.scene.getScene('atolye'); s.karsilastir = !s.karsilastir; $('#kKarsilastir').classList.toggle('acik', s.karsilastir); };
}

// Karşılaştırma için pozlar sırayla, her biri 1,4 saniye
async function pozlariGoster() {
  const sahne = oyun.scene.getScene('atolye'), kus = sahne.kus;
  const POZLAR = [
    ['Duruş', {}], ['Gaga açık', { gagaAc: 1, basAci: -0.3 }], ['Kanat yukarı', { cirp: 1, bacak: 0.2, egim: 0.18, yuk: 120 }, Math.PI / 2],
    ['Kanat ortada', { cirp: 1, bacak: 0.2, egim: 0.18, yuk: 120 }, 0], ['Kanat aşağı', { cirp: 1, bacak: 0.2, egim: 0.18, yuk: 120 }, -Math.PI / 2],
    ['Gagalama', { basAci: 1.25, basX: 4, basY: 14, egim: 0.32, ezY: 0.94, gagaAc: 1 }], ['Mutlu', { mutlu: true, basAci: -0.22, puf: 1.07, ibikAci: 0.45 }],
    ['Uyuklama', { gozAcik: 0.12, basAci: 0.25, basY: 4, puf: 1.1 }],
  ];
  const no = await kus.basla('test');
  const temel = { yuk: 0, basAci: 0, basX: 0, basY: 0, egim: 0, ezY: 1, ezX: 1, gagaAc: 0, mutlu: false, cirp: 0, puf: 1, bacak: 1, gozAcik: 1, ibikAci: 0, kanatAci: -0.25 };
  const etiket = sahne.add.text(500, 120, '', { fontSize: '44px', fontStyle: 'bold', color: '#3a2a35', backgroundColor: '#fffaf0', padding: { x: 14, y: 6 } }).setOrigin(0.5).setDepth(100000);
  for (const [ad, poz, faz] of POZLAR) {
    if (kus.no !== no) break;
    Object.assign(kus.p, temel, poz);
    kus.cirpHiz = 0; kus.kanatFaz = faz || 0; kus.kirpSayac = 1e9;
    etiket.setText(ad);
    await new Promise((r) => setTimeout(r, 1400));
  }
  etiket.destroy();
  if (kus.no === no) { Object.assign(kus.p, temel); kus.kirpSayac = 2000; kus.bitir(no); }
}