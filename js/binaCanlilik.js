// Binalar yaşasın: kuluçkada yumurta varken kapı önündeki yumurtalar ara sıra sallanır, tuzağa kuş düşünce
// kafes kıpırdar, Kuş Evi'nin deliklerinden ara sıra bir kuş başını çıkarıp etrafa bakar.
// (Fenerlerin gece titreşimi gunIsigi.js içinde.) Bölgeler bina görselinin asıl piksel ölçüsündedir.
import { D, simdi } from './durum.js';
import { kusGen } from './genetik.js';
import { paletOlustur } from './turler.js';
import { GORSEL_TURLER, ONAYLI, boyaliDoku } from './kusGorsel.js';

const CIZGI = 0x3a2a35;
// [x, y, genişlik, yükseklik, dönme noktası x, y (0-1)]
const YUMURTALAR = [[174, 394, 137, 109, 0.5, 0.92], [558, 394, 118, 73, 0.5, 0.9]];
const KAFES = [494, 321, 212, 201, 0.45, 0.93];
// Kuş Evi delikleri: merkez x, y ve yarıçap
const DELIKLER = [[296, 396, 32], [288, 676, 32], [297, 920, 32], [560, 705, 20]];

// Bina görselinin bir bölgesini ayrı bir çerçeve olarak binanın tam üstüne koyar
function parcaKopya(sahne, b, ad, [x, y, w, h, ox, oy]) {
  const n = b.nesne, doku = n.texture;
  if (!doku.has(ad)) doku.add(ad, 0, x, y, w, h);
  const s = n.scaleX, px = x + ox * w, py = y + oy * h;
  const im = sahne.add.image(n.x + (px - n.originX * n.width) * s, n.y + (py - n.originY * n.height) * s, doku.key, ad)
    .setOrigin(ox, oy).setScale(s).setDepth(n.depth + 1);
  (b.ekler = b.ekler || []).push(im); // bina zıplarken gizlenir (koy.js binaZipla)
  return im;
}
const yerDonustur = (n, px, py) => ({ x: n.x + (px - n.originX * n.width) * n.scaleX, y: n.y + (py - n.originY * n.height) * n.scaleY });

export function binaCanlilikKur(sahne, binalar) {
  const bul = (tip) => binalar.find((b) => b.tip === tip && b.nesne.type === 'Image');
  const r = Phaser.Math.Between;

  // Kuluçkahane: yumurta kuluçkadayken yumurtalar ara sıra sallanır (iki yuva ayrı zamanlarda)
  const kulucka = bul('kulucka');
  if (kulucka) {
    YUMURTALAR.forEach((bolge, n) => {
      const y = parcaKopya(sahne, kulucka, 'yumurta' + n, bolge);
      const salla = () => {
        sahne.time.delayedCall(r(2500, 6000) + n * 900, () => {
          const K = D.kulucka;
          if (K && K.asama === 'kulucka' && y.visible) {
            const hazir = simdi() >= K.bitis; // çıkmaya hazırsa daha hızlı sallanır
            sahne.tweens.add({ targets: y, angle: { from: -3.5, to: 3.5 }, duration: hazir ? 70 : 110, yoyo: true,
              repeat: hazir ? 4 : 2, ease: 'Sine.easeInOut', onComplete: () => { y.angle = 0; salla(); } });
          } else salla();
        });
      };
      salla();
    });
  }

  // Tuzak Kulübesi: tuzağa kuş düştüyse kafes çırpınır gibi kıpırdar
  const tuzak = bul('tuzak');
  if (tuzak) {
    const k = parcaKopya(sahne, tuzak, 'kafes', KAFES), x0 = k.x, y0 = k.y, s = k.scaleX;
    const kipirda = () => {
      sahne.time.delayedCall(r(1500, 3500), () => {
        const T = D.tuzak;
        if (T && simdi() >= T.bitis && k.visible) {
          sahne.tweens.chain({ targets: k, tweens: [
            { angle: -2.5, x: x0 - 3 * s, y: y0 - 6 * s, duration: 80, ease: 'Sine.easeOut' },
            { angle: 2, x: x0 + 3 * s, y: y0, duration: 90, ease: 'Sine.easeIn' },
            { angle: -1.5, x: x0 - 2 * s, y: y0 - 4 * s, duration: 80, ease: 'Sine.easeOut' },
            { angle: 0, x: x0, y: y0, duration: 100, ease: 'Bounce.easeOut' },
          ], onComplete: kipirda });
        } else kipirda();
      });
    };
    kipirda();
  }

  // Kuş Evi: sahip olunan bir kuş rastgele bir delikten başını çıkarır, sağa sola bakar, geri girer
  const ev = bul('kusevi');
  if (ev) {
    const cik = () => sahne.time.delayedCall(r(9000, 20000), () => basCikar(cik));
    const basCikar = (bitince = () => {}, delik = Phaser.Utils.Array.GetRandom(DELIKLER)) => {
      const adaylar = D.kuslar.filter((k) => ONAYLI.includes(k.tur) && GORSEL_TURLER[k.tur]);
      if (!adaylar.length || !ev.nesne.visible || (sahne.gunIsigi && sahne.gunIsigi.gece > 0.6)) return bitince();
      const [dx, dy, dr] = delik, p = yerDonustur(ev.nesne, dx, dy);
      const bas = basKur(sahne, kusGen(Phaser.Utils.Array.GetRandom(adaylar)));
      const olcek = (dr * 2.3 * ev.nesne.scaleX) / 60, yon = Math.random() < 0.5 ? -1 : 1;
      bas.setPosition(p.x, p.y + dr * 0.3 * ev.nesne.scaleX).setDepth(ev.nesne.depth + 2).setScale(0, olcek * 0.3);
      sahne.tweens.chain({ targets: bas, tweens: [
        { scaleX: olcek * yon, scaleY: olcek, duration: 260, ease: 'Back.easeOut' },
        { angle: 12 * yon, duration: 300, hold: r(400, 900), ease: 'Sine.easeInOut' },
        { scaleX: -olcek * yon, angle: -10 * yon, duration: 160, hold: r(500, 1100), ease: 'Sine.easeInOut' },
        { angle: 0, duration: 200, hold: 300 },
        { scaleX: 0, scaleY: olcek * 0.3, duration: 220, ease: 'Back.easeIn' },
      ], onComplete: () => { bas.destroy(); bitince(); } });
    };
    sahne.basCikar = (n = 0) => basCikar(undefined, DELIKLER[n]); // test için
    cik();
  }
}

// Kuşun yalnızca başı (Gemini parçalarıyla): boyun noktası 0,0; yaklaşık 60 birim genişlik
function basKur(sahne, gen) {
  const G = GORSEL_TURLER[gen.tur], P = paletOlustur(gen), c = sahne.add.container(0, 0);
  const resim = (parca, ayar, x = 0, y = 0) => {
    const im = sahne.add.image(x, y, boyaliDoku(sahne, gen.tur, parca, gen)).setOrigin(...(ayar.orj || [0.5, 0.5]));
    im.setScale(ayar.en ? ayar.en / im.width : ayar.boy / im.height);
    c.add(im);
    return im;
  };
  if (G.ibik && sahne.textures.exists(`kus_${gen.tur}_ibik`)) resim('ibik', G.ibik, G.ibik.x, G.ibik.y);
  resim('bas', G.bas, G.bas.x, G.bas.y);
  const goz = sahne.add.graphics().setPosition(...G.goz).setScale(G.gozOlcek || 1.15);
  goz.fillStyle(P.goz); goz.fillEllipse(0, 0, 9.2, 12);
  goz.fillStyle(0xffffff); goz.fillCircle(1.4, -2.2, 1.8); goz.fillCircle(-1.3, 1.9, 0.9);
  goz.fillStyle(0xff8fa0, 0.4); goz.fillEllipse(-4, 9, 9, 5.2); // allık
  c.add(goz);
  const bol = sahne.textures.exists(`kus_${gen.tur}_gagaUstBol`);
  if (bol) resim('gagaAltBol', G.gagaUst, ...G.gaga);
  resim(bol ? 'gagaUstBol' : 'gagaUst', G.gagaUst, ...G.gaga);
  // Baş görseli boyun noktasının üstünde: kabın ortası başın ortası olsun
  c.list.forEach((o) => { o.x -= G.bas.x; o.y -= G.bas.y; });
  return c;
}
