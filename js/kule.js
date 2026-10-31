// Gözlem Kulesi (docs/gozlem-kulesi-tasarim.md): göl, orman ve dağa keşif gönderme, dürbünle bakma, Gözlem Defteri.
// D.kule: { kesif: [{ kusId, bolge, bas, bitis }], defter: { tur: fotoğraf sayısı }, tamam: [bitirilen bölgeler], durbun: { gun, sayi } }
import { TURLER } from './turler.js';
import { D, simdi, DAKIKA, degisti, bildir, xpEkle, harca, bugun } from './durum.js';
import { kusBul, kesfet, elmasFiyati, kalanSure } from './mekanik.js';
import { kusOlustur } from './genetik.js';
import { kalp, bagEkle } from './bag.js';
import { yildiz } from './egitim.js';
import { gorevOlay } from './gorevler.js';

// Her bölgenin türleri (ağırlık: ne sık görüldüğü). Kule seviyesiyle bölgeler açılır
export const BOLGELER = {
  gol: { ad: 'Göl', e: 'göle', de: 'gölde', den: 'gölden', ikon: '🏞️', sv: 1, dk: 30, erzak: 20, turler: { mavigerdan: 5, muhabbet: 2, yalicapkini: 1.5 },
    aciklama: 'Sazlıklar ve nilüferler arasında, suyun kıyısında' },
  orman: { ad: 'Orman', e: 'ormana', de: 'ormanda', den: 'ormandan', ikon: '🌲', sv: 2, dk: 60, erzak: 40, turler: { kizilgerdan: 5, saka: 2, agackakan: 2.5 },
    aciklama: 'Yaşlı ağaçların gölgesinde, yosunlu dalların üstünde' },
  dag: { ad: 'Dağ', e: 'dağa', de: 'dağda', den: 'dağdan', ikon: '⛰️', sv: 3, dk: 120, erzak: 80, turler: { dag_ispinozu: 5, ev_sercesi: 2, tirmasik: 1.2 },
    aciklama: 'Kayalık yamaçlarda, bulutların hemen altında' },
};
export const DEFTER_ODULU = 5; // bir bölgenin bütün türlerini fotoğraflayınca 💎

const kuleSv = () => (D.binalar.kule ? D.binalar.kule.sv : 0);
const SURE_CARPAN = (sv) => 1 - 0.1 * (sv - 1);
export const kuleDurumu = () => (D.kule = D.kule || { kesif: [], defter: {}, tamam: [], durbun: { gun: '', sayi: 0 } });
export const bolgeAcik = (b, sv = kuleSv()) => sv >= BOLGELER[b].sv;
export const kesifYeri = (sv = kuleSv()) => (sv >= 4 ? 2 : 1);
export const kesifSuresi = (b) => BOLGELER[b].dk * DAKIKA * SURE_CARPAN(Math.max(1, kuleSv()));
export const kesifteMi = (k) => !!D.kule && D.kule.kesif.some((e) => e.kusId === k.id);
export const kesifHazirMi = () => !!D.kule && D.kule.kesif.some((e) => simdi() >= e.bitis);
export const fotograflandi = (tur) => !!(D.kule && D.kule.defter[tur]);
// Keşif bir türü getirebilir mi: yaygın türler hep, diğerleri önce dürbünle görülmüş olmalı
export const getirebilir = (tur) => TURLER[tur].nadirlik === 'Yaygın' || fotograflandi(tur);

// Rehber kuşun yeteneği keşfin şansını artırır: bağ ve Getir yıldızı
export const kusBulmaSansi = (k) => Math.min(0.85, 0.35 + 0.03 * kalp(k) + 0.06 * yildiz(k, 'getir') + (kuleSv() >= 5 ? 0.1 : 0));

export function kesifGonder(kusId, bolge) {
  const K = kuleDurumu(), k = kusBul(kusId), B = BOLGELER[bolge];
  if (!k || !bolgeAcik(bolge) || K.kesif.length >= kesifYeri()) return false;
  if (!harca(B.erzak)) return false;
  K.kesif.push({ kusId, bolge, bas: simdi(), bitis: simdi() + kesifSuresi(bolge) });
  gorevOlay('kesif');
  bildir(`${B.ikon} ${k.ad} ${B.e} doğru kanat çırptı!`);
  degisti();
  return true;
}
export function kesifHizlandir(n) {
  const E = kuleDurumu().kesif[n];
  if (!E || !harca(0, elmasFiyati(kalanSure(E)))) return;
  E.bitis = simdi();
  degisti();
}

const agirlikliSec = (agirlik) => {
  const ad = Object.keys(agirlik), top = ad.reduce((t, a) => t + agirlik[a], 0);
  let r = Math.random() * top;
  for (const a of ad) if ((r -= agirlik[a]) < 0) return a;
  return ad[0];
};

// Keşif dönüşü: kuş ya da hediye. Dönen: { kus?, metin } (yeni kuş köye henüz eklenmez, kart açılır)
export function kesifBitir(n) {
  const K = kuleDurumu(), E = K.kesif[n];
  if (!E || simdi() < E.bitis) return null;
  K.kesif.splice(n, 1);
  const k = kusBul(E.kusId), B = BOLGELER[E.bolge];
  xpEkle(10 + 5 * B.sv);
  if (k) { k.mutluluk = Math.min(100, k.mutluluk + 10); bagEkle(k, 'sev'); }
  const adaylar = Object.fromEntries(Object.entries(B.turler).filter(([t]) => getirebilir(t)));
  let sonuc;
  if (k && Math.random() < kusBulmaSansi(k)) {
    const tur = agirlikliSec(adaylar), sv = Math.max(1, kuleSv()), p = 0.1 + 0.03 * sv;
    const kopya = (oran) => [+(Math.random() < oran), +(Math.random() < oran)];
    const kus = kusOlustur({ tur, genler: { ino: kopya(p), mavi: kopya(p), alaca: [+(Math.random() < 0.05 + 0.02 * sv), 0] }, tuy: Math.random() ** (1 + 0.2 * sv) });
    if (kesfet(tur)) kus.yeniTur = true;
    sonuc = { kus, metin: `${B.ikon} ${k.ad} ${B.den} bir arkadaşla döndü: ${TURLER[tur].ad}!` };
  } else {
    const r = Math.random();
    if (r < 0.12) { D.elmas += 1; sonuc = { metin: `${B.ikon} ${k ? k.ad : 'Kuşun'} ${B.den} parlak bir 💎 buldu!` }; }
    else if (r < 0.5 && D.binalar.tarla) { const m = 8 + 6 * B.sv; D.tohumlar.dari += m; sonuc = { metin: `${B.ikon} ${k ? k.ad : 'Kuşun'} ${m} 🌾 darıyla döndü` }; }
    else { const m = (25 + Math.floor(Math.random() * 30)) * B.sv; D.altin += m; sonuc = { metin: `${B.ikon} ${k ? k.ad : 'Kuşun'} ${m} 🪙 buldu` }; }
  }
  gorevOlay('kesifBitti');
  bildir(sonuc.metin);
  degisti();
  return sonuc;
}

// --- Dürbün: günde birkaç kez kısa bir bakış; saklanan kuşların fotoğrafını çek ---
export const durbunHakki = (sv = kuleSv()) => 2 + sv;
export const kalanBakis = () => { const d = kuleDurumu().durbun; return d.gun === bugun() ? Math.max(0, durbunHakki() - d.sayi) : durbunHakki(); };
export function bakisBasla() {
  const d = kuleDurumu().durbun;
  if (d.gun !== bugun()) { d.gun = bugun(); d.sayi = 0; }
  if (d.sayi >= durbunHakki()) return false;
  d.sayi++;
  degisti();
  return true;
}
// Mini oyunda görünecek kuş: bölgenin ağırlıklarına göre (nadirler seyrek)
export const durbunKusu = (bolge) => agirlikliSec(BOLGELER[bolge].turler);

// Fotoğraflar deftere işlenir. Bölgenin bütün türleri tamamlanınca bir kez ödül
export function fotografCek(bolge, turler) {
  const K = kuleDurumu();
  const yeni = turler.filter((t) => !K.defter[t]);
  for (const t of turler) K.defter[t] = (K.defter[t] || 0) + 1;
  const altin = 5 * turler.length * BOLGELER[bolge].sv;
  D.altin += altin;
  xpEkle(3 + 2 * turler.length);
  gorevOlay('durbun');
  let metin = turler.length ? `📷 ${turler.length} fotoğraf · +${altin} 🪙` : '📷 Bu sefer kimse görünmedi...';
  if (yeni.length) metin += ` · Deftere yeni: ${yeni.map((t) => TURLER[t].ad).join(', ')}`;
  if (!K.tamam.includes(bolge) && Object.keys(BOLGELER[bolge].turler).every((t) => K.defter[t])) {
    K.tamam.push(bolge);
    D.elmas += DEFTER_ODULU;
    metin += ` · 🏅 ${BOLGELER[bolge].ad} sayfası tamamlandı! +${DEFTER_ODULU} 💎`;
  }
  bildir(metin);
  degisti();
  return yeni;
}
