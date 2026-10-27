// Köyü düzenleme modu: binalar kare kare sürüklenerek taşınır.
// "Düzenle" düğmesiyle açılır; kareler görünür, binaya basılı tutup sürüklenir. Bina kareden kareye "tık" sesiyle oturur;
// altındaki alan yeşil (konabilir) ya da kırmızı (başka bina, yol, gölet, ağaç/fener/kaya, köy objesi ya da harita dışı).
// Kaydet: yeni yerler D.yerlesim'e yazılır ve köy yeniden kurulur (ışıklar, konma yerleri, süsler hepsi yeni yere göre).
// Vazgeç: köy eski haliyle yeniden kurulur. Küçük süsler (çimen, çiçek) binanın altında kendiliğinden kalkar.
import { D, degisti } from './durum.js';
import { HARITA, izoEkran, ekranIzo, karoKoseleri } from './izo.js';
import { dokunmaSesi } from './ses.js';
import { bildirim } from './arayuz.js';

const $ = (s) => document.querySelector(s);

export function duzenleKur(sahne, YERLESIM, KOY_OBJELERI) {
  const S = { aktif: false, surukluyor: false, b: null, degisti: false };
  let izgara = null, alan = null;

  // Bir binanın konamayacağı karolar (o binanın kendisi hariç)
  const engeller = (haric) => {
    const e = new Set(sahne.yol);
    const ekle = (i, j) => e.add(i + ',' + j);
    for (const b of sahne.binalar) if (b !== haric) {
      const [w, d] = b.tanim.boyut, [bi, bj] = b.yeni || [b.i, b.j];
      for (let i = bi; i < bi + w; i++) for (let j = bj; j < bj + d; j++) ekle(i, j);
    }
    for (const [tip, i, j] of YERLESIM.susler) if (tip !== 'cicek') ekle(i, j); // ağaç, kaya, fener
    for (const [ad, i, j] of KOY_OBJELERI) {
      ekle(Math.floor(i), Math.floor(j));
      if (ad === 'cit_asagi') ekle(Math.floor(i) + 1, Math.floor(j)); // çitler iki karo boyunca uzanır
      if (ad === 'cit_yukari') ekle(Math.floor(i), Math.floor(j) + 1);
    }
    const su = sahne.su; // gölet ve kıyısı
    if (su) for (let i = 0; i < HARITA; i++) for (let j = 0; j < HARITA; j++) {
      const m = izoEkran(i + 0.5, j + 0.5);
      if (((m.x - su.x) / (su.rx * 1.35)) ** 2 + ((m.y - su.y) / (su.ry * 1.6)) ** 2 < 1) ekle(i, j);
    }
    return e;
  };
  const uygunMu = (b, i, j) => {
    const [w, d] = b.tanim.boyut;
    if (i < 0 || j < 0 || i + w > HARITA || j + d > HARITA) return false;
    const e = engeller(b);
    for (let a = i; a < i + w; a++) for (let c = j; c < j + d; c++) if (e.has(a + ',' + c)) return false;
    return true;
  };

  const izgaraCiz = () => {
    izgara = sahne.add.graphics().setDepth(-99990);
    const e = engeller(null);
    for (let i = 0; i < HARITA; i++) for (let j = 0; j < HARITA; j++) {
      const k = karoKoseleri(i, j), n = [k.ust, k.sag, k.alt, k.sol];
      if (e.has(i + ',' + j) && !sahne.yol.has(i + ',' + j)) { izgara.fillStyle(0x3a2a35, 0.12); izgara.fillPoints(n, true); }
      izgara.lineStyle(1.5, 0xffffff, 0.35); izgara.strokePoints(n, true, true);
    }
    alan = sahne.add.graphics().setDepth(-99989);
  };
  const alanCiz = (b, i, j) => {
    const k = karoKoseleri(i, j, ...b.tanim.boyut), ok = uygunMu(b, i, j);
    alan.clear();
    alan.fillStyle(ok ? 0x7fd35a : 0xff5d5d, 0.45); alan.fillPoints([k.ust, k.sag, k.alt, k.sol], true);
    alan.lineStyle(3, ok ? 0x2f7d2a : 0xb02a2a, 0.9); alan.strokePoints([k.ust, k.sag, k.alt, k.sol], true, true);
    return ok;
  };

  // Binayı ve üstündeki parçaları (sallanan yumurta, kafes) (i, j) karosuna kaydırır
  const yereKoy = (b, i, j) => {
    const [i0, j0] = b.konum || [b.i, b.j], dx = ((i - j) - (i0 - j0)) * 32 * 2, dy = ((i + j) - (i0 + j0)) * 16 * 2;
    for (const n of [b.nesne, ...(b.ekler || [])]) { n.x += dx; n.y += dy; n.depth += dy; }
    b.konum = [i, j];
  };

  const ac = () => {
    S.aktif = true; S.degisti = false;
    sahne.game.events.emit('bosDokunus'); // açık bina paneli kapansın
    document.body.classList.add('duzen-modu');
    izgaraCiz();
    bildirim('🔨 Taşımak istediğin binaya basılı tutup sürükle');
  };
  const kapat = (kaydet) => {
    if (kaydet && S.degisti) {
      D.yerlesim = D.yerlesim || {};
      for (const b of sahne.binalar) if (b.yeni) D.yerlesim[b.tip] = b.yeni;
      degisti();
    }
    document.body.classList.remove('duzen-modu');
    S.aktif = false;
    if (!S.degisti) { if (izgara) izgara.destroy(); if (alan) alan.destroy(); izgara = alan = null; return; }
    // Köy yeni yerlere (ya da vazgeçildiyse eski yerlere) göre baştan kurulur; kamera yerinde kalır
    const c = sahne.cameras.main;
    sahne.registry.set('kamera', { x: c.midPoint.x, y: c.midPoint.y, z: c.zoom, kz: sahne.kullaniciZoom });
    sahne.scene.restart();
    if (kaydet) setTimeout(() => bildirim('✅ Köy düzeni kaydedildi'), 400);
  };

  S.bas = (p) => {
    const b = sahne.binalar.filter((x) => x.nesne.getBounds().contains(p.worldX, p.worldY)).sort((a, c) => c.nesne.depth - a.nesne.depth)[0];
    if (!b) return;
    const t = ekranIzo(p.worldX, p.worldY), [i, j] = b.konum || [b.i, b.j];
    Object.assign(S, { surukluyor: true, b, ofs: [Math.floor(t.i) - i, Math.floor(t.j) - j], bas: [i, j], son: [i, j] });
    b.tasiniyor = true;
    for (const n of (b.ekler || [])) n.setVisible(false);
    sahne.tweens.add({ targets: b.nesne, scaleY: b.nesne.scaleY * 1.04, duration: 90, yoyo: true });
    dokunmaSesi(sahne, 'pop', 0.09);
    alanCiz(b, i, j);
  };
  S.tasi = (p) => {
    const b = S.b, t = ekranIzo(p.worldX, p.worldY), i = Math.floor(t.i) - S.ofs[0], j = Math.floor(t.j) - S.ofs[1];
    if (i === S.son[0] && j === S.son[1]) return;
    const [w, d] = b.tanim.boyut;
    if (i < -1 || j < -1 || i + w > HARITA + 1 || j + d > HARITA + 1) return; // haritadan çok taşmasın
    S.son = [i, j];
    yereKoy(b, i, j);
    alanCiz(b, i, j);
    dokunmaSesi(sahne, 'tik', 0.1); // kareden kareye "tık"
  };
  S.birak = () => {
    const b = S.b, [i, j] = S.son;
    S.surukluyor = false;
    if (uygunMu(b, i, j)) {
      if (i !== b.i || j !== b.j) { b.yeni = [i, j]; S.degisti = true; } else delete b.yeni;
      dokunmaSesi(sahne, 'yerlesti', 0.1);
    } else { // konamaz: eski yerine döner
      yereKoy(b, ...S.bas);
      dokunmaSesi(sahne, 'olmaz', 0.1);
      bildirim('Buraya konamaz: başka bir bina, yol ya da obje var');
    }
    alan.clear();
    b.tasiniyor = false;
    for (const n of (b.ekler || [])) n.setVisible(true);
    S.b = null;
  };

  $('#dDuzenle').onclick = () => (S.aktif ? kapat(true) : ac());
  $('#duzKaydet').onclick = () => kapat(true);
  $('#duzVazgec').onclick = () => { S.degisti = S.degisti || sahne.binalar.some((b) => b.konum); kapat(false); };
  S.uygunMu = uygunMu; // deneme için
  return S;
}
