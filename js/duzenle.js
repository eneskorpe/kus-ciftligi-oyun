// Köyü düzenleme modu: binalar kare kare sürüklenerek taşınır.
// "Düzenle" düğmesiyle açılır; kareler görünür, binaya basılı tutup sürüklenir. Bina kareden kareye "tık" sesiyle oturur;
// altındaki alan yeşil (konabilir) ya da kırmızı (başka bina, yol, gölet, ağaç/fener/kaya, köy objesi ya da harita dışı).
// Kaydet: yeni yerler D.yerlesim'e yazılır ve köy yeniden kurulur (ışıklar, konma yerleri, süsler hepsi yeni yere göre).
// Vazgeç: köy eski haliyle yeniden kurulur. Küçük süsler (çimen, çiçek) binanın altında kendiliğinden kalkar.
// Yol fırçası: açıkken binalar taşınmaz; çimene basıp sürüklemek taş yol döşer, yola basıp sürüklemek yolu kaldırır.
// Değişiklikler kaydedilene kadar üstte önizleme olarak çizilir; kayıtta D.yollar { ekle, sil }'e yazılır (koy.js yolKarolari).
// Meydan ve giriş yolu değişmez; ağaç/obje/gölet ve binaların üstüne yol döşenmez.
import { D, degisti } from './durum.js';
import { HARITA, izoEkran, ekranIzo, karoKoseleri } from './izo.js';
import { dokunmaSesi } from './ses.js';
import { bildirim } from './arayuz.js';
import { temizlikBilgi, temizlikBaslat, kalanSure, insaEt } from './mekanik.js';
import { BINALAR } from './binalar.js';
import { sureYazi } from './durum.js';

const $ = (s) => document.querySelector(s);

export function duzenleKur(sahne, sabitYol, sabitEngel) {
  const S = { aktif: false, surukluyor: false, b: null, degisti: false };
  let izgara = null, alan = null, onizleme = null;
  const firca = new Map(); // 'i,j' → true (yol döşendi) / false (yol kaldırıldı)

  // Bir binanın konamayacağı karolar (o binanın kendisi hariç): meydan ve giriş yolu, ağaç/obje/gölet, diğer binalar.
  // Binaların kendi yolları engel değildir: bina taşınınca yollar yeniden döşenir (yollar.js)
  const engeller = (haric) => {
    const e = new Set([...sabitYol, ...sabitEngel]);
    for (const b of sahne.binalar) if (b !== haric) {
      const [w, d] = b.tanim.boyut, [bi, bj] = b.yeni || [b.i, b.j];
      for (let i = bi; i < bi + w; i++) for (let j = bj; j < bj + d; j++) e.add(i + ',' + j);
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
      if (e.has(i + ',' + j) && !sabitYol.has(i + ',' + j)) { izgara.fillStyle(0x3a2a35, 0.12); izgara.fillPoints(n, true); }
      izgara.lineStyle(1.5, 0xffffff, 0.35); izgara.strokePoints(n, true, true);
    }
    alan = sahne.add.graphics().setDepth(-99989);
    onizleme = sahne.add.graphics().setDepth(-99988);
  };
  const onizlemeCiz = () => {
    onizleme.clear();
    for (const [t, doseli] of firca) {
      const [i, j] = t.split(',').map(Number), k = karoKoseleri(i, j), n = [k.ust, k.sag, k.alt, k.sol];
      onizleme.fillStyle(doseli ? 0xd6c29b : 0x86c95a, 0.95); onizleme.fillPoints(n, true);
      onizleme.lineStyle(2, doseli ? 0xa8916a : 0x5e9e3c, 0.9); onizleme.strokePoints(n, true, true);
    }
  };
  const yolVarMi = (t) => (firca.has(t) ? firca.get(t) : sahne.yol.has(t));
  // Fırçanın değiştirebileceği karo mu: harita içi, sabit yol/engel değil, bina altında değil
  const boyanir = (i, j) => {
    const t = i + ',' + j;
    if (i < 0 || j < 0 || i >= HARITA || j >= HARITA || sabitYol.has(t) || sabitEngel.has(t)) return false;
    return !sahne.binalar.some((b) => { const [w, d] = b.tanim.boyut, [bi, bj] = b.yeni || [b.i, b.j]; return i >= bi && i < bi + w && j >= bj && j < bj + d; });
  };
  const boya = (p) => {
    const t = ekranIzo(p.worldX, p.worldY), i = Math.floor(t.i), j = Math.floor(t.j), a = i + ',' + j;
    if (!boyanir(i, j) || yolVarMi(a) === S.fircaYol) return;
    if (S.fircaYol === sahne.yol.has(a)) firca.delete(a); else firca.set(a, S.fircaYol);
    S.yolDegisti = firca.size > 0;
    onizlemeCiz();
    dokunmaSesi(sahne, 'tik', 0.1);
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

  const ac = (sessiz) => {
    S.aktif = true; S.degisti = false; S.yolDegisti = false; firca.clear();
    sahne.game.events.emit('bosDokunus'); // açık bina paneli kapansın
    document.body.classList.add('duzen-modu');
    izgaraCiz();
    if (!sessiz) bildirim('🔨 Taşımak istediğin binaya basılı tutup sürükle');
  };
  const kapat = (kaydet) => {
    let kuruldu = false;
    if (hayalet) { // yeni bina yerleştiriliyordu
      if (kaydet) {
        const [i, j] = hayalet.konum;
        if (!uygunMu(hayalet, i, j)) return bildirim('Burası uygun değil: binayı yeşil görünen bir yere koy');
        if (!insaEt(hayalet.tip, i, j)) return;
        S.degisti = kuruldu = true;
        sahne.registry.set('ustaYuruyerek', true); // köy yeniden kurulunca usta evinden yürüyerek gelsin (isci.js)
      }
      hayaletKaldir();
    }
    if (kaydet && S.degisti) {
      D.yerlesim = D.yerlesim || {};
      for (const b of sahne.binalar) if (b.yeni) D.yerlesim[b.tip] = b.yeni;
    }
    if (kaydet && S.yolDegisti) {
      const ekle = new Set((D.yollar || {}).ekle), sil = new Set((D.yollar || {}).sil);
      for (const [t, doseli] of firca) { if (doseli) { sil.delete(t); ekle.add(t); } else { ekle.delete(t); sil.add(t); } }
      D.yollar = { ekle: [...ekle], sil: [...sil] };
      S.degisti = true;
    }
    if (kaydet && S.degisti) degisti();
    fircaAyarla(false);
    document.body.classList.remove('duzen-modu');
    kart.classList.remove('acik');
    S.aktif = false;
    if (!S.degisti) { for (const g of [izgara, alan, onizleme]) if (g) g.destroy(); izgara = alan = onizleme = null; return; }
    // Köy yeni yerlere (ya da vazgeçildiyse eski yerlere) göre baştan kurulur; kamera yerinde kalır
    sahne.yenidenKur();
    if (kaydet && !kuruldu) setTimeout(() => bildirim('✅ Köy düzeni kaydedildi'), 400);
  };

  S.bas = (p) => {
    if (S.firca) { // yola basıldıysa bu sürüklemede yol kaldırılır, çimene basıldıysa döşenir
      const t = ekranIzo(p.worldX, p.worldY), i = Math.floor(t.i), j = Math.floor(t.j);
      if (!boyanir(i, j)) return;
      Object.assign(S, { surukluyor: true, fircaYol: !yolVarMi(i + ',' + j) });
      return boya(p);
    }
    if (hayalet) { // yeni bina: yalnızca kendi alanından tutulup sürüklenir (başka yerde kamera kayar)
      const t = ekranIzo(p.worldX, p.worldY), [hi, hj] = hayalet.konum, [w, d] = hayalet.tanim.boyut, i = Math.floor(t.i), j = Math.floor(t.j);
      if (i < hi || j < hj || i >= hi + w || j >= hj + d) return;
      Object.assign(S, { surukluyor: true, b: hayalet, ofs: [i - hi, j - hj], ilk: [hi, hj], son: [hi, hj] });
      return dokunmaSesi(sahne, 'pop', 0.09);
    }
    const b = sahne.binalar.filter((x) => x.nesne.getBounds().contains(p.worldX, p.worldY)).sort((a, c) => c.nesne.depth - a.nesne.depth)[0];
    if (!b) return;
    const t = ekranIzo(p.worldX, p.worldY), [i, j] = b.konum || [b.i, b.j];
    Object.assign(S, { surukluyor: true, b, ofs: [Math.floor(t.i) - i, Math.floor(t.j) - j], ilk: [i, j], son: [i, j] });
    b.tasiniyor = true;
    for (const n of (b.ekler || [])) n.setVisible(false);
    sahne.tweens.add({ targets: b.nesne, scaleY: b.nesne.scaleY * 1.04, duration: 90, yoyo: true });
    dokunmaSesi(sahne, 'pop', 0.09);
    alanCiz(b, i, j);
  };
  S.tasi = (p) => {
    if (S.firca) return boya(p);
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
    if (S.firca) { S.surukluyor = false; return; }
    const b = S.b, [i, j] = S.son;
    S.surukluyor = false;
    if (b === hayalet) { S.b = null; return dokunmaSesi(sahne, uygunMu(b, i, j) ? 'yerlesti' : 'olmaz', 0.1); } // kırmızıysa orada kalır, oyuncu yeşil bir yer bulur
    if (uygunMu(b, i, j)) {
      if (i !== b.i || j !== b.j) { b.yeni = [i, j]; S.degisti = true; } else delete b.yeni;
      dokunmaSesi(sahne, 'yerlesti', 0.1);
    } else { // konamaz: eski yerine döner
      yereKoy(b, ...S.ilk);
      dokunmaSesi(sahne, 'olmaz', 0.1);
      bildirim('Buraya konamaz: başka bina, meydan, ağaç ya da obje var');
    }
    alan.clear();
    b.tasiniyor = false;
    for (const n of (b.ekler || [])) n.setVisible(true);
    S.b = null;
  };

  const fircaAyarla = (acik) => {
    S.firca = acik;
    $('#duzFirca').classList.toggle('secili', acik);
    $('#duzIpucu').textContent = acik ? 'Çimene sürükle: yol döşer · Yola sürükle: yolu kaldırır' : 'Binaya basılı tut ve sürükle · Ağaç ya da kayaya dokun: Kunduz kaldırsın';
  };
  // Ağaç ya da kayaya dokununca: Kunduz Usta kaldırsın mı? (süre ve altın ödülü kartta)
  const kart = $('#temizlikKart');
  S.dokun = (p) => {
    if (S.firca) return;
    if (hayalet) { // yeni bina dokunulan yere gelir
      const t = ekranIzo(p.worldX, p.worldY), [w, d] = hayalet.tanim.boyut;
      const i = Math.floor(t.i) - Math.floor(w / 2), j = Math.floor(t.j) - Math.floor(d / 2);
      yereKoy(hayalet, i, j); alanCiz(hayalet, i, j);
      return dokunmaSesi(sahne, 'tik', 0.1);
    }
    const s = (sahne.susNesneleri || []).filter((x) => x.n.active && x.n.getBounds().contains(p.worldX, p.worldY)).sort((a, c) => c.n.depth - a.n.depth)[0];
    if (!s) return kart.classList.remove('acik');
    const T = D.temizlik;
    if (T && T.anahtar === s.anahtar) return bildirim(`🦫 Kunduz Usta bunu kaldırıyor · ${sureYazi(kalanSure(T))}`);
    const B = temizlikBilgi(s.n.texture.key, s.n.displayHeight);
    $('#tkBaslik').textContent = `${B.ikon} ${B.ad}`;
    $('#tkBilgi').innerHTML = `Kunduz Usta kaldırsın mı?<br>⏱ ${sureYazi(B.sn * 1000)} · Ödül: +${B.altin} 🪙`;
    $('#tkTamam').onclick = () => { kart.classList.remove('acik'); if (temizlikBaslat(s.anahtar, B)) dokunmaSesi(sahne, 'yerlesti', 0.1); };
    kart.classList.add('acik');
    dokunmaSesi(sahne, 'pop', 0.09);
  };
  $('#tkVazgec').onclick = () => kart.classList.remove('acik');

  // --- Yeni bina yerleştirme (İnşa menüsü, arayuz.js): bina ekranın ortasına en yakın boş yerde belirir;
  // sürüklenir ya da dokunulan yere gelir; "Burada kur" ile altın ödenir ve Kunduz Usta inşaata başlar ---
  let hayalet = null;
  const hayaletKaldir = () => {
    if (hayalet) hayalet.nesne.destroy();
    hayalet = null;
    if (alan) alan.clear();
    document.body.classList.remove('yerlestir-modu');
    $('#duzKaydet').textContent = '✓ Kaydet';
  };
  S.yerlestir = (tip) => {
    if (D.insaat || D.temizlik) return bildirim('🦫 Kunduz Usta şu an başka bir işte; işi bitince inşa edebilirsin');
    if (!S.aktif) ac(true);
    fircaAyarla(false);
    if (hayalet) hayaletKaldir();
    const tanim = BINALAR[tip], [w, d] = tanim.boyut, c = sahne.cameras.main, m = ekranIzo(c.midPoint.x, c.midPoint.y);
    let en = null;
    for (let i = 0; i < HARITA; i++) for (let j = 0; j < HARITA; j++) {
      if (!uygunMu({ tanim }, i, j)) continue;
      const u = Math.hypot(i + w / 2 - m.i, j + d / 2 - m.j);
      if (!en || u < en[2]) en = [i, j, u];
    }
    if (!en) return bildirim('Köyde bu bina için boş yer yok. Kunduz Usta ağaç ya da kaya kaldırsın, yer açılır');
    const k = karoKoseleri(en[0], en[1], w, d);
    const nesne = sahne.add.text((k.sol.x + k.sag.x) / 2, (k.ust.y + k.alt.y) / 2, tanim.ikon, { fontSize: '72px' }).setOrigin(0.5, 0.75).setDepth(150000);
    hayalet = { tip, tanim, i: en[0], j: en[1], konum: [en[0], en[1]], nesne, ekler: [] };
    document.body.classList.add('yerlestir-modu');
    $('#duzIpucu').textContent = `${tanim.ikon} ${tanim.ad}: sürükle ya da bir yere dokun, yeşil olunca "Burada kur"`;
    $('#duzKaydet').textContent = `🏗️ Burada kur · ${tanim.fiyat} 🪙`;
    alanCiz(hayalet, en[0], en[1]);
    c.pan(nesne.x, nesne.y, 400, 'Sine.easeInOut');
  };

  $('#duzFirca').onclick = () => fircaAyarla(!S.firca);
  $('#dDuzenle').onclick = () => (S.aktif ? kapat(true) : ac());
  $('#duzKaydet').onclick = () => kapat(true);
  $('#duzVazgec').onclick = () => { S.degisti = S.degisti || sahne.binalar.some((b) => b.konum); kapat(false); };
  S.uygunMu = uygunMu; // deneme için
  return S;
}
