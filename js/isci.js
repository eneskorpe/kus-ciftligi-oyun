// Kunduz Usta: bina geliştirilince göletin yanındaki evinden çıkar, taş yolları tercih ederek binaya yürür,
// iskele kurup çekiçle çalışır (ara sıra binanın öbür köşesine geçer), iş bitince sevinir ve evine döner.
// Görseller gelene kadar kodla çizilir; parça iskeleti (gövde, baş, kollar, bacaklar, kuyruk) Gemini parçalarına hazırdır.
import { D, simdi, sureYazi } from './durum.js';
import { HARITA, izoEkran, ekranIzo } from './izo.js';
import { dokunmaSesi } from './ses.js';

const CIZGI = 0x3a2a35, HIZ = 70; // yürüme hızı (dünya pikseli / sn)

// --- Kodla çizilen geçici kunduz (yüzü sağa bakar, ayak tabanı 0,0) ---
function parca(sahne, kap, x, y, ciz) { const g = sahne.add.graphics().setPosition(x, y); ciz(g); kap.add(g); return g; }
function kunduzCiz(sahne) {
  const kok = sahne.add.container(0, 0), govde = sahne.add.container(0, 0);
  const golge = sahne.add.ellipse(0, 0, 34, 10, 0x2a3a20, 0.25);
  kok.add([golge, govde]);
  const P = {};
  P.kuyruk = parca(sahne, govde, -10, -10, (g) => { g.fillStyle(CIZGI); g.fillEllipse(-9, 2, 22, 10); g.fillStyle(0x6b4a33); g.fillEllipse(-9, 2, 18, 7); });
  P.arkaBacak = parca(sahne, govde, -4, -9, (g) => { g.fillStyle(CIZGI); g.fillRoundedRect(-4, 0, 9, 10, 3); g.fillStyle(0x7a5236); g.fillRoundedRect(-2.5, 1, 6, 8, 2); });
  P.arkaKol = parca(sahne, govde, -1, -25, (g) => { g.fillStyle(CIZGI); g.fillRoundedRect(-3.5, 0, 7, 13, 3); g.fillStyle(0x8a5e3e); g.fillRoundedRect(-2, 1, 4, 11, 2); });
  P.govde = parca(sahne, govde, 0, -18, (g) => {
    g.fillStyle(CIZGI); g.fillEllipse(0, 0, 26, 24);
    g.fillStyle(0x9a6a44); g.fillEllipse(0, 0, 22.5, 20.5);
    g.fillStyle(0x4f7fd0); g.fillRoundedRect(-11, -1, 22, 11, { tl: 2, tr: 2, bl: 9, br: 9 }); // tulum
    g.fillStyle(0x4f7fd0); g.fillRect(-5, -8, 10, 8); g.fillStyle(0xffd36b); g.fillCircle(0, -4, 1.6);
  });
  P.onBacak = parca(sahne, govde, 4, -9, (g) => { g.fillStyle(CIZGI); g.fillRoundedRect(-4, 0, 9, 10, 3); g.fillStyle(0x8a5e3e); g.fillRoundedRect(-2.5, 1, 6, 8, 2); });
  P.bas = parca(sahne, govde, 5, -31, (g) => {
    g.fillStyle(CIZGI); g.fillCircle(-6, -9, 4.5); g.fillCircle(0, 0, 12.5); g.fillEllipse(9, 3, 14, 11);
    g.fillStyle(0x9a6a44); g.fillCircle(-6, -9, 3); g.fillCircle(0, 0, 11);
    g.fillStyle(0xe8c9a0); g.fillEllipse(9, 3, 11.5, 8.5); // ağız
    g.fillStyle(0xffffff); g.fillRect(9, 6, 4, 4); g.lineStyle(1, CIZGI); g.strokeRect(9, 6, 4, 4); // dişler
    g.fillStyle(0xff8fa0); g.fillCircle(14.5, 0.5, 2.3); // burun
    g.fillStyle(CIZGI); g.fillEllipse(4, -3, 4.2, 5.5); g.fillStyle(0xffffff); g.fillCircle(4.8, -4.2, 1.1); // göz
    g.fillStyle(CIZGI); g.fillEllipse(-1, -9, 25, 12); g.fillStyle(0xffd23f); g.fillEllipse(-1, -9.5, 22, 9.5); // baret
    g.fillStyle(CIZGI); g.fillRect(-13, -6, 26, 3); g.fillStyle(0xf2b51f); g.fillRect(-12, -5.5, 24, 2);
  });
  P.onKol = sahne.add.container(4, -25); govde.add(P.onKol);
  parca(sahne, P.onKol, 0, 0, (g) => {
    g.fillStyle(CIZGI); g.fillRoundedRect(-3.5, 0, 7, 13, 3); g.fillStyle(0x9a6a44); g.fillRoundedRect(-2, 1, 4, 11, 2);
    g.fillStyle(CIZGI); g.fillRect(-1.5, 9, 3, 12); g.fillStyle(0xc89a5e); g.fillRect(-0.5, 10, 1.5, 10); // sap
    g.fillStyle(CIZGI); g.fillRoundedRect(-6, 19, 13, 7, 2); g.fillStyle(0x8f9aa6); g.fillRoundedRect(-5, 20, 11, 5, 1.5); // çekiç başı
  });
  return { kok, govde, golge, P };
}

// --- Gemini parçalarından kunduz (assets/kunduz). Birimler parça sayfasının pikseli, ayak tabanı 0,0.
// Her eklem bir kap: animasyon kabın dönüşünü değiştirir, görselin kendi açısı ve kayması kabın içinde kalır.
// Yerleşim raw/kunduz_tasarim.png ile karşılaştırılarak ayarlandı.
const OLCEK = 0.13; // parça pikseli → dünya pikseli (kunduz ~73 px boyunda, kuşlardan biraz iri; kullanıcı daha büyük istedi)
const PARCALAR = { // [doku, eklem x, y, görselin orijini, ölçek, açı (derece), koyu mu]
  kuyruk: ['kuyruk', -130, -130, [0.88, 0.45], 0.8, 0],
  arkaKol: ['arka_kol', -55, -255, [0.55, 0.12], 0.8, 0, true],
  arkaBacak: ['bacak', -55, -133, [0.45, 0.25], 0.75, 0, true],
  onBacak: ['bacak', 55, -133, [0.45, 0.25], 0.75, 0],
  govdeR: ['govde', 0, -215, [0.5, 0.5], 1, 0],
  bas: ['bas', 25, -420, [0.5, 0.5], 1, 0],
  onKol: ['on_kol', 78, -248, [0.22, 0.1], 0.75, -25], // omuz başın altında: kol ağızdan çıkıyormuş gibi durmasın
};
function kunduzGorsel(sahne) {
  const kok = sahne.add.container(0, 0), govde = sahne.add.container(0, 0).setScale(OLCEK);
  const golge = sahne.add.ellipse(0, 0, 60, 16, 0x2a3a20, 0.25);
  kok.add([golge, govde]);
  const P = {};
  for (const [ad, [doku, x, y, orj, olcek, aci, koyu]] of Object.entries(PARCALAR)) {
    const im = sahne.add.image(0, 0, 'kunduz_' + doku).setOrigin(...orj).setScale(olcek).setAngle(aci);
    if (koyu) im.setTint(0xc8c0c0);
    const eklem = sahne.add.container(x, y, [im]);
    govde.add(eklem);
    P[ad] = eklem; P[ad].resim = im;
  }
  P.govde = P.govdeR;
  return { kok, govde, golge, P, gorsel: true };
}

// --- Yol bulma: karolar üstünde en ucuz yol (taş yol ucuz, çimen pahalı; binalar ve gölet geçilmez) ---
// Önce ağaç ve objelerden kaçınarak arar; yol kapalıysa sadece bina ve göleti engel sayar
export function yolBul(sahne, bas, hedef) {
  return yolAra(sahne, bas, hedef, true) || yolAra(sahne, bas, hedef, false) || [hedef];
}
export function yolAra(sahne, bas, hedef, objeler) {
  const N = HARITA + 2, k = (i, j) => (i + 1) * N + (j + 1), gecer = new Uint8Array(N * N).fill(1);
  for (const b of sahne.binalar) for (let i = b.i; i < b.i + b.tanim.boyut[0]; i++) for (let j = b.j; j < b.j + b.tanim.boyut[1]; j++) gecer[k(i, j)] = 0;
  const su = sahne.su;
  for (let i = -1; i <= HARITA; i++) for (let j = -1; j <= HARITA; j++) {
    const m = izoEkran(i + 0.5, j + 0.5);
    if (su && ((m.x - su.x) / (su.rx * 1.5)) ** 2 + ((m.y - su.y) / (su.ry * 1.5)) ** 2 < 1) gecer[k(i, j)] = 0;
  }
  // Ağaç, çalı, kaya, çit ve köy objelerinin dibi geçilmez (usta ağaçların içinden yürümesin)
  const ENGEL = /^(dekor_(agac|cali|kaya|tas_grubu|bank|saman|sandik|fici|el_arabasi|kus_banyosu|kutuk|fener|tabela|cit|odun|fidan)|bina_agac$)/;
  if (objeler) for (const o of sahne.children.list) {
    if (o.type !== 'Image' || !o.texture || !ENGEL.test(o.texture.key)) continue;
    const yari = o.displayWidth * (/cit/.test(o.texture.key) ? 0.45 : 0.25);
    for (const dx of [-yari, 0, yari]) {
      const t = ekranIzo(o.x + dx, o.y - 4), i = Math.floor(t.i), j = Math.floor(t.j);
      if (i >= -1 && j >= -1 && i <= HARITA && j <= HARITA) gecer[k(i, j)] = 0;
    }
  }
  const karo = (p) => { const t = ekranIzo(p.x, p.y); return [Math.max(-1, Math.min(HARITA, Math.floor(t.i))), Math.max(-1, Math.min(HARITA, Math.floor(t.j)))]; };
  const [bi, bj] = karo(bas), [hi, hj] = karo(hedef);
  gecer[k(bi, bj)] = gecer[k(hi, hj)] = 1;
  // Kapının ve iş yerinin hemen çevresindeki süs objeleri yolu kapatmasın (bina ve su hâlâ engel)
  if (objeler) for (const [ci, cj] of [[bi, bj], [hi, hj]]) for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const i = ci + di, j = cj + dj;
    if (i < -1 || j < -1 || i > HARITA || j > HARITA) continue;
    const m = izoEkran(i + 0.5, j + 0.5), suda = su && ((m.x - su.x) / (su.rx * 1.5)) ** 2 + ((m.y - su.y) / (su.ry * 1.5)) ** 2 < 1;
    if (!suda && !sahne.binalar.some((B) => i >= B.i && i < B.i + B.tanim.boyut[0] && j >= B.j && j < B.j + B.tanim.boyut[1])) gecer[k(i, j)] = 1;
  }
  const mesafe = new Float64Array(N * N).fill(Infinity), once = new Int32Array(N * N).fill(-1), acik = [[0, bi, bj]];
  mesafe[k(bi, bj)] = 0;
  while (acik.length) {
    acik.sort((a, b) => a[0] - b[0]);
    const [d, i, j] = acik.shift();
    if (i === hi && j === hj) break;
    if (d > mesafe[k(i, j)]) continue;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < -1 || nj < -1 || ni > HARITA || nj > HARITA || !gecer[k(ni, nj)]) continue;
      if (di && dj && (!gecer[k(i + di, j)] || !gecer[k(i, j + dj)])) continue; // köşeden kesme
      const nd = d + (sahne.yol.has(ni + ',' + nj) ? 1 : 1.7) * (di && dj ? 1.41 : 1);
      if (nd < mesafe[k(ni, nj)]) { mesafe[k(ni, nj)] = nd; once[k(ni, nj)] = k(i, j); acik.push([nd, ni, nj]); }
    }
  }
  if (mesafe[k(hi, hj)] === Infinity) return null; // hedefe ulaşılamıyor
  const noktalar = [];
  for (let n = k(hi, hj); n !== -1 && n !== k(bi, bj); n = once[n]) noktalar.unshift(izoEkran(Math.floor(n / N) - 1 + 0.5, (n % N) - 1 + 0.5));
  noktalar.pop(); noktalar.push(hedef);
  return noktalar;
}

export function isciKur(sahne) {
  const ev = sahne.binalar.find((b) => b.tip === 'kunduz');
  if (!ev) return () => {};
  const gorselli = sahne.textures.exists('kunduz_govde');
  const K = gorselli ? kunduzGorsel(sahne) : kunduzCiz(sahne), kok = K.kok.setScale(gorselli ? 1 : 1.15);
  // Çekiç: kol [VURUS_ALT (vuruş, öne-aşağı) .. VURUS_UST (kalkık)] arasında sallanır. Görselli kunduzda kol yüzün önüne
  // kalkmasın diye öne doğru sallanır (önizlemeyle seçildi: -0.7 kalkık, +0.55 vuruş)
  const VURUS_UST = gorselli ? -0.7 : -2.2, VURUS_ALT = gorselli ? 0.55 : 0;
  const SEVINC_KOL = gorselli ? -0.8 : -2.6, TASIMA_KOL = gorselli ? -0.45 : -2.7;
  const govdeY = K.govde.y; // gövde kabının dinlenme yüksekliği (zıplama ve yürüme sallantısı buna eklenir)
  // Kapı: Gemini evinde kapı ve taş basamaklar ön köşeye iniyor; usta basamakların ucundan çıkar
  const kapi = { x: ev.k.alt.x + 8, y: ev.k.alt.y - 20 }; // ev aynalı: basamaklar ön köşenin hafif sağında
  // Bir binanın çalışma noktaları: ön köşenin iki yanı (binanın önünde)
  const isNoktalari = (b) => [{ x: b.k.alt.x - (b.k.alt.x - b.k.sol.x) * 0.35, y: b.k.alt.y - (b.k.alt.y - b.k.sol.y) * 0.35 + 4 },
    { x: b.k.alt.x + (b.k.sag.x - b.k.alt.x) * 0.35, y: b.k.alt.y - (b.k.alt.y - b.k.sag.y) * 0.35 + 4 }];
  const S = { durum: 'evde', yol: [], hedefBina: null, noktaNo: 0, sonraki: 0, vurus: 0, faz: 0, sonInsaat: D.insaat && D.insaat.tip,
    yuksek: false, tasiyor: false, sonTemizlik: D.temizlik && D.temizlik.anahtar, hedefSus: null };
  let iskele = null, isNo = 0; // isNo: her yeni iş ya da bitişte artar, eski çalışma döngüsü kendiliğinden durur
  const iskeleVar = () => sahne.textures.exists('insaat_iskele_kucuk');
  // İskelenin binadaki ölçüsü ve üstündeki noktalar (görsel kesrinden dünya noktasına; ölçüler insaat/iskele_*.png'den).
  // Hep tek katlı iskele: iki katlıda merdiven sadece alt kata çıkıyordu, üst kat boşta kalıyordu (kullanıcı kararı).
  // Merdivenli tek kat görseli (insaat_iskele_merdivenli) gelince usta merdivenden çıkar; o zamana kadar platforma zıplar.
  const iskeleOlcu = (b) => {
    const A = b.k.alt, en = b.k.sag.x - b.k.sol.x, uzun = b.kutu.height > en * 1.1;
    const merdivenli = sahne.textures.exists('insaat_iskele_merdivenli');
    const doku = merdivenli ? 'insaat_iskele_merdivenli' : 'insaat_iskele_kucuk', f = sahne.textures.get(doku).get();
    const w = Math.min(140, en * (uzun ? 0.5 : 0.42)), h = w * f.height / f.width, x0 = A.x, y0 = A.y - 6;
    const nokta = (fx, fy) => ({ x: x0 + (fx - 0.5) * w, y: y0 - (1 - fy) * h });
    return merdivenli
      ? { uzun, doku, w, x0, y0, giris: nokta(0.2, 0.96), merdivenUst: nokta(0.31, 0.47), platform: nokta(0.58, 0.42) } // insaat/iskele_merdivenli.png'den ölçüldü
      : { uzun, doku, w, x0, y0, giris: nokta(0.5, 1.04), merdivenUst: null, platform: nokta(0.5, 0.45) }; // zıplayarak
  };
  // Ustanın başının üstünde taşıdığı tahta
  const tasinan = sahne.add.image(gorselli ? 14 : 0, gorselli ? -26 : -60, gorselli ? 'kunduz_tahta' : '__WHITE').setScale(gorselli ? OLCEK * 0.7 : 1).setVisible(false);
  kok.add(tasinan);

  const yuz = (dx) => { if (Math.abs(dx) > 0.5) kok.scaleX = Math.sign(dx) * Math.abs(kok.scaleY); };
  const git = (hedef, sonra) => { S.yol = yolBul(sahne, kok, hedef); S.durum = 'yuru'; S.varinca = sonra; };
  const iskeleKur = (b) => {
    iskeleKaldir();
    if (iskeleVar()) return iskeleGorsel(b);
    const g = sahne.add.graphics().setDepth(b.nesne.depth + 1), A = b.k.alt, Sl = b.k.sol, Sg = b.k.sag, h = Math.min(160, b.kutu.height * 0.55);
    const direk = (p) => { g.fillStyle(CIZGI); g.fillRect(p.x - 3, p.y - h, 6, h); g.fillStyle(0xc89a5e); g.fillRect(p.x - 1.5, p.y - h + 1, 3, h - 2); };
    const a = { x: A.x + (Sl.x - A.x) * 0.55, y: A.y + (Sl.y - A.y) * 0.55 }, c = { x: A.x + (Sg.x - A.x) * 0.55, y: A.y + (Sg.y - A.y) * 0.55 };
    [a, A, c].forEach(direk);
    for (const v of [0.45, 0.85]) { // tahta yürüme yolları
      g.lineStyle(7, CIZGI); g.lineBetween(a.x, a.y - h * v, A.x, A.y - h * v); g.lineBetween(A.x, A.y - h * v, c.x, c.y - h * v);
      g.lineStyle(4, 0xd9b27a); g.lineBetween(a.x, a.y - h * v, A.x, A.y - h * v); g.lineBetween(A.x, A.y - h * v, c.x, c.y - h * v);
    }
    const parcalar = [g];
    if (gorselli) { // ustanın alet kutusu ve birkaç tahta binanın dibinde
      const n = isNoktalari(b)[0];
      parcalar.push(sahne.add.image(n.x - 40, n.y + 8, 'kunduz_alet_kutusu').setOrigin(0.5, 1).setScale(OLCEK * 0.75).setDepth(n.y + 8));
      parcalar.push(sahne.add.image(n.x + 44, n.y + 12, 'kunduz_tahta').setOrigin(0.5, 1).setScale(OLCEK * 0.8).setDepth(n.y + 12));
    }
    for (const p of parcalar) { p.setAlpha(0); sahne.tweens.add({ targets: p, alpha: 1, duration: 400 }); }
    iskele = parcalar;
  };
  // Gemini iskelesi binanın ön köşesine kurulur (uzun binalara iki katlısı); yanında malzeme yığını ve alet kutusu
  const iskeleGorsel = (b) => {
    const O = iskeleOlcu(b), A = b.k.alt;
    const isk = sahne.add.image(O.x0, O.y0, O.doku).setOrigin(0.5, 1).setDepth(b.nesne.depth + 1);
    isk.setScale(O.w / isk.width);
    const n = isNoktalari(b)[0], m = isNoktalari(b)[1];
    S.malzeme = { x: m.x + 10, y: m.y + 16 }; // usta tahtayı yığının önünden alır
    const parcalar = [isk,
      sahne.add.image(m.x + 34, m.y + 14, 'insaat_malzeme').setOrigin(0.5, 1).setDepth(m.y + 14),
      sahne.add.image(n.x - 40, n.y + 8, 'kunduz_alet_kutusu').setOrigin(0.5, 1).setScale(OLCEK * 0.75).setDepth(n.y + 8)];
    parcalar[1].setScale(46 / parcalar[1].width);
    // İskele aşağıdan yukarı "kurulur", diğerleri belirir
    isk.scaleY = 0; sahne.tweens.add({ targets: isk, scaleY: isk.scaleX, duration: 500, ease: 'Back.easeOut' });
    toz(A.x, A.y - 4, 4);
    for (const p of parcalar.slice(1)) { p.setAlpha(0); sahne.tweens.add({ targets: p, alpha: 1, duration: 400 }); }
    iskele = parcalar;
  };
  const iskeleKaldir = () => {
    if (!iskele) return;
    const L = iskele; iskele = null;
    for (const p of L) sahne.tweens.add({ targets: p, alpha: 0, duration: 400, onComplete: () => p.destroy() });
  };
  const toz = (x, y, adet = 3) => {
    const gorsel = sahne.textures.exists('insaat_toz');
    for (let n = 0; n < adet; n++) {
      const t = gorsel // Gemini toz bulutu, yoksa kodla çizilmiş elips
        ? sahne.add.image(x + (Math.random() - 0.5) * 10, y, 'insaat_toz').setDepth(kok.depth + 1).setAlpha(0.9).setAngle(Math.random() * 360)
        : sahne.add.ellipse(x + (Math.random() - 0.5) * 10, y, 10, 7, 0xe8d8b8, 0.85).setDepth(kok.depth + 1);
      if (gorsel) t.setScale((9 + Math.random() * 5) / t.width);
      sahne.tweens.add({ targets: t, x: t.x + (Math.random() - 0.5) * 30, y: y - 10 - Math.random() * 14, scale: t.scale * 1.8, alpha: 0, duration: 500 + Math.random() * 300, onComplete: () => t.destroy() });
    }
  };
  // --- Çalışma döngüsü: iskeleye çık, binada çekiçle çalış, in, yığından tahta getir, yeniden çık ---
  const bekle = (ms) => new Promise((r) => sahne.time.delayedCall(ms, r));
  const tween = (cfg) => new Promise((r) => sahne.tweens.add({ ...cfg, targets: kok, onComplete: r }));
  const kisaYuru = (hedef) => new Promise((r) => { S.yol = [hedef]; S.durum = 'yuru'; S.varinca = r; });
  const iskeleyeCik = async (O) => {
    S.durum = 'tirman'; S.yuksek = true;
    if (O.merdivenUst) { // merdiven: önce basamaklara, sonra platforma
      yuz(O.merdivenUst.x - kok.x);
      await tween({ x: O.merdivenUst.x, y: O.merdivenUst.y, duration: 1300, ease: 'Linear' });
      S.durum = 'yuru-ust'; yuz(O.platform.x - kok.x);
      await tween({ x: O.platform.x, y: O.platform.y, duration: 500 });
    } else { // tek kat: zıplayarak platforma
      await tween({ x: O.platform.x, y: O.platform.y, duration: 380, ease: 'Back.easeOut' });
    }
  };
  const iskeledenIn = async (O) => {
    S.durum = 'tirman';
    if (O.merdivenUst) {
      yuz(O.merdivenUst.x - kok.x);
      await tween({ x: O.merdivenUst.x, y: O.merdivenUst.y, duration: 450 });
      await tween({ x: O.giris.x, y: O.giris.y, duration: 1000, ease: 'Linear' });
    } else await tween({ x: O.giris.x, y: O.giris.y, duration: 320, ease: 'Quad.easeIn' });
    S.yuksek = false;
  };
  const calismaDongusu = async (b) => {
    const no = ++isNo, devam = () => no === isNo && D.insaat && D.insaat.tip === b.tip;
    const O = iskeleOlcu(b);
    while (devam()) {
      await iskeleyeCik(O); if (!devam()) return;
      yuz(b.k.alt.x - kok.x || -1);
      S.durum = 'calis';
      await bekle(6000 + Math.random() * 5000); if (!devam()) return;
      await iskeledenIn(O); if (!devam()) return;
      if (!gorselli || !S.malzeme) continue;
      await kisaYuru(S.malzeme); if (!devam()) return; // tahta al
      S.durum = 'bekle'; toz(kok.x + 12, kok.y - 4, 2); await bekle(350);
      S.tasiyor = true; tasinan.setVisible(true);
      await kisaYuru(O.giris); if (!devam()) return;
      S.tasiyor = false; tasinan.setVisible(false); // tahtayı iskeleye bırakır
    }
  };
  const isBaslat = (b, dogrudan) => {
    S.hedefBina = b; S.noktaNo = 0;
    const basla = () => { iskeleKur(b); if (iskeleVar()) calismaDongusu(b); else { S.durum = 'calis'; } };
    const hedef = iskeleVar() ? iskeleOlcu(b).giris : isNoktalari(b)[0];
    if (dogrudan) { kok.setPosition(hedef.x, hedef.y).setVisible(true).setAlpha(1); basla(); return; }
    evdenCik(() => git(hedef, basla));
  };
  // İş bitince (usta iskeledeyse önce iner) bina kutlanır, usta sevinip evine döner
  const isBitti = async (b) => {
    isNo++;
    sahne.tweens.killTweensOf(kok);
    S.tasiyor = false; tasinan.setVisible(false);
    if (kok.visible) kok.setAlpha(1);
    if (S.yuksek && b) await iskeledenIn(iskeleOlcu(b));
    S.yuksek = false;
    iskeleKaldir();
    if (b && b.temel) sahne.time.delayedCall(1600, () => sahne.yenidenKur()); // yeni bina kuruldu: inşaat alanı yerine bina çizilsin
    if (S.durum === 'evde') { if (b) sevin(b, () => {}); return; }
    sevin(b, eveDon);
  };
  const evdenCik = (sonra) => {
    kok.setPosition(kapi.x, kapi.y).setVisible(true).setAlpha(0);
    S.durum = 'cikiyor';
    sahne.tweens.add({ targets: kok, alpha: 1, duration: 350, onComplete: sonra });
  };
  const eveDon = () => git(kapi, () => {
    S.durum = 'giriyor';
    sahne.tweens.add({ targets: kok, alpha: 0, duration: 400, onComplete: () => { kok.setVisible(false); S.durum = 'evde'; } });
  });
  const sevin = (b, sonra) => {
    S.durum = 'sevin';
    K.P.onKol.rotation = SEVINC_KOL;
    if (K.gorsel) K.P.bas.resim.setTexture('kunduz_bas_mutlu'); // gülen yüz
    sahne.tweens.add({ targets: K.govde, y: govdeY - 14, duration: 220, yoyo: true, repeat: 2, ease: 'Quad.easeOut', onComplete: () => {
      K.P.onKol.rotation = 0;
      if (K.gorsel) K.P.bas.resim.setTexture('kunduz_bas');
      sonra();
    } });
    if (b) {
      sahne.binaZipla(b);
      const m = { x: (b.k.sol.x + b.k.sag.x) / 2, y: b.tepe.y + b.kutu.height * 0.25 };
      sahne.efekt('yildiz', m, 8, 0xffe27a);
      for (let n = 0; n < 6; n++) toz(b.k.sol.x + (b.k.sag.x - b.k.sol.x) * Math.random(), b.k.alt.y - (b.k.alt.y - b.k.ust.y) * 0.3 * Math.random(), 2);
    }
  };

  // --- Dekor kaldırma (mekanik.js temizlikBaslat): usta ağacın/kayanın yanına yürür, çalışır; süre dolunca dekor devrilip kaybolur ---
  const susBul = (anahtar) => (sahne.susNesneleri || []).find((s) => s.anahtar === anahtar && s.n.active);
  let sayac = null; // dekorun üstünde kalan süre
  const temizlikBaslat = (s, dogrudan) => {
    S.hedefBina = null; S.hedefSus = s;
    const yon = kapi.x < s.n.x ? -1 : 1, hedef = { x: s.n.x + yon * Math.max(34, s.n.displayWidth * 0.3), y: s.n.y + 8 };
    if (sayac) sayac.destroy();
    sayac = sahne.add.text(s.n.x, s.n.y - s.n.displayHeight - 6, '', { fontFamily: 'Nunito, system-ui', fontSize: '22px', fontStyle: '800', color: '#4f3a22',
      backgroundColor: '#fff6dd', padding: { x: 10, y: 4 } }).setOrigin(0.5, 1).setDepth(150000);
    const basla = () => { yuz(s.n.x - kok.x); S.durum = 'calis'; };
    if (dogrudan) { kok.setPosition(hedef.x, hedef.y).setVisible(true).setAlpha(1); basla(); return; }
    if (S.durum === 'evde') evdenCik(() => git(hedef, basla)); else git(hedef, basla);
  };
  const temizlikBitti = (s) => {
    isNo++;
    sahne.tweens.killTweensOf(kok);
    if (sayac) { sayac.destroy(); sayac = null; }
    S.hedefSus = null;
    if (s) {
      const n = s.n, yon = n.x > kok.x ? 1 : -1;
      sahne.sallananlar = (sahne.sallananlar || []).filter((x) => x.n !== n);
      for (let k = 0; k < 6; k++) toz(n.x + (Math.random() - 0.5) * n.displayWidth * 0.6, n.y - Math.random() * 10, 2);
      dokunmaSesi(sahne, s.tip === 'agac' ? 'hisirti' : 'tak', 0.08);
      // Ağaç devrilir, kaya ufalanır; sonra kaybolur
      sahne.tweens.add({ targets: n, angle: s.tip === 'agac' ? 80 * yon : 0, scaleY: s.tip === 'agac' ? n.scaleY : 0, alpha: 0, duration: 700, ease: 'Quad.easeIn', onComplete: () => n.destroy() });
      if (sahne.engel) sahne.engel.delete(s.i + ',' + s.j); // düzenle modunda o karo artık boş
      sahne.efekt('yildiz', { x: n.x, y: n.y - 40 }, 8, 0xffe27a);
    }
    if (S.durum === 'evde') return;
    sevin(null, eveDon);
  };

  kok.setVisible(false);
  // Kapalıyken biten kaldırma işlerinin dekorları sessizce kalkar
  for (const s of sahne.susNesneleri || []) if ((D.kaldirilan || []).includes(s.anahtar)) { sahne.sallananlar = (sahne.sallananlar || []).filter((x) => x.n !== s.n); s.n.destroy(); }
  if (D.temizlik) { const s = susBul(D.temizlik.anahtar); if (s) temizlikBaslat(s, true); }
  if (D.insaat) { // süren iş: usta işinin başında (yeni bina az önce konduysa evinden yürüyerek gelir)
    const b = sahne.binalar.find((x) => x.tip === D.insaat.tip);
    if (b) isBaslat(b, !sahne.registry.get('ustaYuruyerek'));
  }
  sahne.registry.remove('ustaYuruyerek');
  sahne.isci = { S, kok, isBaslat, temizlikBaslat }; // deneme için

  return (zaman, dt) => {
    const s = dt / 1000, I = D.insaat;
    // Yeni iş: usta evdeyse ya da eve dönüyorsa yola çıkar
    if (I && I.tip !== S.sonInsaat) {
      S.sonInsaat = I.tip;
      const b = sahne.binalar.find((x) => x.tip === I.tip);
      if (b) {
        if (S.durum === 'evde') isBaslat(b);
        else { // eve dönerken yeni iş geldi: yoldan döner
          S.hedefBina = b;
          git(iskeleVar() ? iskeleOlcu(b).giris : isNoktalari(b)[0], () => { iskeleKur(b); if (iskeleVar()) calismaDongusu(b); else S.durum = 'calis'; });
        }
      }
    }
    // Dekor kaldırma işi geldi / bitti
    const T = D.temizlik;
    if (T && T.anahtar !== S.sonTemizlik) {
      S.sonTemizlik = T.anahtar;
      const s = susBul(T.anahtar);
      if (s) temizlikBaslat(s);
    }
    if (!T && S.sonTemizlik) {
      const s = susBul(S.sonTemizlik);
      S.sonTemizlik = null;
      temizlikBitti(s);
    }
    if (sayac && T) sayac.setText('🦫 ' + sureYazi(T.bitis - simdi()));
    // İş bitti (süre doldu ya da elmasla bitirildi)
    if (!I && S.sonInsaat) {
      const b = sahne.binalar.find((x) => x.tip === S.sonInsaat);
      S.sonInsaat = null;
      isBitti(b);
    }
    if (!kok.visible) return;
    if (S.durum === 'yuru') {
      const h = S.yol[0];
      if (!h) { const f = S.varinca; S.varinca = null; S.durum = 'bekle'; if (f) f(); }
      else {
        const dx = h.x - kok.x, dy = h.y - kok.y, d = Math.hypot(dx, dy), v = HIZ * s;
        if (d <= v) { kok.setPosition(h.x, h.y); S.yol.shift(); } else { kok.x += dx / d * v; kok.y += dy / d * v; yuz(dx); }
        S.faz += s * 11;
        K.P.onBacak.rotation = Math.sin(S.faz) * 0.6; K.P.arkaBacak.rotation = -Math.sin(S.faz) * 0.6;
        if (S.tasiyor) K.P.arkaKol.rotation = K.P.onKol.rotation = TASIMA_KOL; // tahtayı göğsünün önünde tutar
        else { K.P.arkaKol.rotation = -Math.sin(S.faz) * 0.5; K.P.onKol.rotation = Math.sin(S.faz) * 0.4; }
        K.govde.y = -Math.abs(Math.sin(S.faz)) * 2.5;
        K.P.kuyruk.rotation = Math.sin(S.faz * 0.5) * 0.15;
      }
    } else if (S.durum === 'tirman' || S.durum === 'yuru-ust') { // merdivende kollar ve bacaklar sırayla
      S.faz += s * (S.durum === 'tirman' ? 13 : 11);
      const a = Math.sin(S.faz);
      K.P.onBacak.rotation = a * 0.5; K.P.arkaBacak.rotation = -a * 0.5;
      if (S.durum === 'tirman') { const k = gorselli ? -0.9 : -2.0; K.P.onKol.rotation = k + a * 0.4; K.P.arkaKol.rotation = k - a * 0.4; }
      else { K.P.onKol.rotation = a * 0.4; K.P.arkaKol.rotation = -a * 0.4; }
      K.govde.y = 0;
    } else if (S.durum === 'calis') {
      const b = S.hedefBina;
      if (b && !iskeleVar()) yuz((b.k.alt.x - kok.x) || (S.noktaNo ? -1 : 1));
      // Çekiç: yavaş kalkar, hızlı iner; inişte toz ve "tak"
      const once = S.vurus;
      S.vurus = (S.vurus + s * 2.2) % 1;
      const t = S.vurus < 0.7 ? S.vurus / 0.7 : 1 - (S.vurus - 0.7) / 0.3;
      K.P.onKol.rotation = VURUS_ALT + (VURUS_UST - VURUS_ALT) * t;
      K.P.onBacak.rotation = K.P.arkaBacak.rotation = 0; K.govde.y = 0;
      if (once > S.vurus) { // vuruş anı
        const ileri = Math.sign(kok.scaleX);
        toz(kok.x + ileri * 33, kok.y - 6, 2);
        if (kok.visible && Math.random() < 0.9) dokunmaSesi(sahne, 'tak', 0.035);
        const H = S.hedefSus && S.hedefSus.n; // kaldırılan dekor her vuruşta sarsılır
        if (H && H.active) { const x0 = H.x; sahne.tweens.add({ targets: H, x: x0 + ileri * 3, duration: 60, yoyo: true, onComplete: () => { H.x = x0; } }); }
      }
      if (b && !iskeleVar() && zaman > S.sonraki) { // iskele görseli yoksa: binanın öbür köşesine geç
        S.noktaNo = 1 - S.noktaNo;
        const n = isNoktalari(b)[S.noktaNo];
        S.durum = 'yuru'; S.yol = [n]; S.varinca = () => { S.durum = 'calis'; S.sonraki = sahne.time.now + 6000 + Math.random() * 5000; };
      }
    } else if (S.durum === 'bekle' || S.durum === 'cikiyor' || S.durum === 'giriyor') {
      K.P.onBacak.rotation = K.P.arkaBacak.rotation = K.P.arkaKol.rotation = K.P.onKol.rotation = 0; K.govde.y = 0;
    }
    K.P.bas.rotation = Math.sin(zaman / 600) * 0.05; // hafif nefes
    // İskeledeyken iskelenin önünde çizilir, gölgesi yerde kalmaz
    kok.setDepth(S.yuksek && iskele ? iskele[0].depth + 2 : kok.y);
    K.golge.setVisible(!S.yuksek);
  };
}
