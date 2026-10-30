// Oyun kuralları: tuzak, kuluçka, bakım, gelir, bina geliştirme, hızlandırma.
import { TURLER } from './turler.js';
import { D, simdi, DAKIKA, degisti, bildir, xpEkle, harca } from './durum.js';
import { YEMLER, KULUCKA_DK, yabaniKus, yavruUret, kusOlustur, kusDegeri, geceMi, fenotip, MUT_ADI } from './genetik.js';
import { gorevOlay, gunluguYenile } from './gorevler.js';
import { BINALAR } from './binalar.js';

export const MAKS_SV = 5;
export const GELISTIRME_FIYATI = [0, 0, 300, 800, 2000, 5000]; // hedef seviyeye göre
const SURE_CARPAN = (sv) => 1 - 0.1 * (sv - 1);
const CIFTLESME_DK = 2;
const SEVME_ARASI = 60 * DAKIKA;
const GELIR_SAAT = { 'Yaygın': 12, 'Nadir': 30, 'Epik': 90, 'Efsanevi': 400 };

export const kapasite = () => 6 + 4 * (D.binalar.kusevi.sv - 1);
export const yemlikKapasite = () => 20 * D.binalar.yemlik.sv;
export const kusBul = (id) => D.kuslar.find((k) => k.id === id);
export const mesgulMu = (k) => (!!D.kulucka && (D.kulucka.aId === k.id || D.kulucka.bId === k.id)) || (!!D.klinik && D.klinik.kusId === k.id); // kuluçkada ya da klinikte

export const BINA_ETKI = {
  tuzak: (sv) => `Süre −%${(sv - 1) * 10}, mutasyon şansı +%${(sv - 1) * 4}${sv >= 2 ? ', ay çekirdeği açık' : ''}`,
  degirmen: (sv) => `Öğütme süresi −%${(sv - 1) * 10}${sv >= 2 ? ', ballı çubuk açık' : ''}${sv >= 3 ? ', kalsiyum taşı açık' : ''}`,
  klinik: (sv) => `Hizmet süresi −%${(sv - 1) * 10}, check-up koruması ${24 + (sv - 1) * 12} sa${sv >= 2 ? ', tüy bakımı açık' : ''}`,
  siparis: (sv) => `Panoda ${siparisYeri(sv)} sipariş, ödül +%${(sv - 1) * 10}, yeni sipariş daha çabuk gelir${sv >= 3 ? ', kusursuz tüy siparişleri' : ''}`,
  tarla: (sv) => `Hasat +%${(sv - 1) * 25}, süre −%${(sv - 1) * 10}${sv >= 2 ? ', kenevir açık' : ''}`,
  kulucka: (sv) => `Kuluçka süresi −%${(sv - 1) * 10}, yavru tüyü daha iyi`,
  kusevi: (sv) => `Kapasite ${6 + 4 * (sv - 1)} kuş`,
  yemlik: (sv) => `${20 * sv} porsiyon yem alır`,
};

// --- Tuzak ---
export const tuzakSuresi = (yem) => YEMLER[yem].sure * DAKIKA * SURE_CARPAN(D.binalar.tuzak.sv);
export function tuzakKur(yem, tohumla = false) {
  const Y = YEMLER[yem];
  if (D.tuzak) return;
  if (D.binalar.tuzak.sv < Y.svGerek) return bildir(`Bu yem için Tuzak Kulübesi Sv. ${Y.svGerek} olmalı`);
  if (tohumla) { if (!tohumHarca(Y.tarla)) return; } else if (!harca(Y.fiyat)) return;
  D.tuzak = { yem, bas: simdi(), bitis: simdi() + tuzakSuresi(yem) };
  gorevOlay('tuzakKur'); gorevOlay('tuzakKur:' + yem);
  bildir(`${Y.ikon} Tuzak kuruldu`);
  degisti();
}
// Süre bitince yakalanan kuşu döndürür (henüz köye eklenmez)
export function tuzakAc() {
  if (!D.tuzak || simdi() < D.tuzak.bitis) return null;
  const kus = kusOlustur(yabaniKus(D.tuzak.yem, D.binalar.tuzak.sv));
  D.tuzak = null;
  xpEkle(10);
  gorevOlay('tuzakAc');
  if (kesfet(kus.tur)) kus.yeniTur = true;
  degisti();
  return kus;
}

// --- Kuluçka ---
export function ciftlestir(aId, bId) {
  const a = kusBul(aId), b = kusBul(bId);
  if (D.kulucka || !a || !b) return false;
  if (a.cinsiyet === b.cinsiyet) { bildir('Bir erkek ve bir dişi kuş seçmelisin'); return false; }
  for (const k of [a, b]) {
    if (k.hasta && k.hasta.tur === 'nezle') { bildir(`${k.ad} nezle, önce Kuş Kliniği'nde iyileşmeli 🤧`); return false; }
    if (k.mutluluk < 50) { bildir(`${k.ad} mutsuz, çiftleşmek istemiyor 😔`); return false; }
    if (k.tokluk < 30) { bildir(`${k.ad} aç, önce beslenmeli 🌾`); return false; }
  }
  D.kulucka = { aId, bId, asama: 'ciftlesme', bas: simdi(), bitis: simdi() + CIFTLESME_DK * DAKIKA };
  gorevOlay('ciftlestir');
  bildir('💞 Çiftleşme başladı');
  degisti();
  return true;
}
export const kuluckaSuresi = (tur) => KULUCKA_DK[TURLER[tur].nadirlik] * DAKIKA * SURE_CARPAN(D.binalar.kulucka.sv);
export function kuluckaAc() {
  const K = D.kulucka;
  if (!K || K.asama !== 'kulucka' || simdi() < K.bitis) return null;
  const kus = kusOlustur(K.cocuk);
  D.kulucka = null;
  xpEkle(25);
  gorevOlay('yumurta');
  if (kesfet(kus.tur)) kus.yeniTur = true;
  degisti();
  return kus;
}

function kesfet(tur) {
  if (D.kesifler.includes(tur)) return false;
  D.kesifler.push(tur);
  xpEkle(100);
  bildir(`📖 Yeni tür keşfettin: ${TURLER[tur].ad}!`);
  return true;
}

export function kusEkle(kus) {
  if (D.kuslar.length >= kapasite()) { bildir('Kuş Evi dolu! Geliştir ya da bir kuş sat'); return false; }
  delete kus.yeniTur;
  kus.gorunur = D.kuslar.filter((k) => k.gorunur).length < 8;
  D.kuslar.push(kus);
  degisti();
  return true;
}

export function kusSat(kusVeyaId) {
  const k = typeof kusVeyaId === 'object' ? kusVeyaId : kusBul(kusVeyaId);
  if (!k || mesgulMu(k)) return;
  const deger = kusDegeri(k);
  delete k.yeniTur;
  D.altin += deger;
  gorevOlay('sat');
  D.kuslar = D.kuslar.filter((x) => x !== k);
  bildir(`🪙 ${k.ad} ${deger} altına satıldı`);
  degisti();
}

export function kusSev(id) {
  const k = kusBul(id);
  if (!k) return false;
  if (simdi() - k.sonSevme < SEVME_ARASI) return false;
  k.sonSevme = simdi();
  k.mutluluk = Math.min(100, k.mutluluk + 15);
  gorevOlay('sev');
  xpEkle(2);
  degisti();
  return true;
}

// --- Yemlik ve Kuş Evi ---
// Yemliği tarladan gelen tohumla doldurur: 1 tohum = 1 porsiyon (önce darı, sonra ayçiçeği, sonra kenevir). Yetmezse yarısına kadar
export function yemlikTohumla() {
  const eksik = yemlikKapasite() - D.binalar.yemlik.stok;
  if (eksik <= 0) return bildir('Yemlik zaten dolu');
  let kalan = eksik;
  for (const e of ['dari', 'aycicek', 'kenevir']) { const al = Math.min(kalan, D.tohumlar[e]); D.tohumlar[e] -= al; kalan -= al; }
  const konan = eksik - kalan;
  if (!konan) return bildir('Ambarda tohum yok 🌾 Tarlada ekip hasat et');
  D.binalar.yemlik.stok += konan;
  gorevOlay('yemlikDoldur');
  bildir(`🌾 Yemliğe ${konan} tohum kondu`);
  degisti();
}
// Karışık yem (Değirmen): 1 kese = 25 porsiyon
export const KARISIK_PORSIYON = 25;
export function yemlikKarisik() {
  const eksik = yemlikKapasite() - D.binalar.yemlik.stok;
  if (eksik <= 0) return bildir('Yemlik zaten dolu');
  if (!D.karisik) return bildir('Karışık yemin yok 🥣 Önce değirmende öğüt');
  const kese = Math.min(D.karisik, Math.ceil(eksik / KARISIK_PORSIYON));
  D.karisik -= kese;
  D.binalar.yemlik.stok = Math.min(yemlikKapasite(), D.binalar.yemlik.stok + kese * KARISIK_PORSIYON);
  gorevOlay('yemlikDoldur');
  bildir(`🥣 Yemliğe ${kese} kese karışık yem kondu`);
  degisti();
}
export function yemlikDoldur() {
  const eksik = yemlikKapasite() - D.binalar.yemlik.stok;
  if (eksik <= 0) return bildir('Yemlik zaten dolu');
  if (!harca(eksik * 3)) return;
  D.binalar.yemlik.stok += eksik;
  gorevOlay('yemlikDoldur');
  bildir(`🌾 Yemlik dolduruldu (${eksik * 3} 🪙)`);
  degisti();
}
export const yemlikFiyati = () => Math.max(0, yemlikKapasite() - D.binalar.yemlik.stok) * 3;
export const gelirKapasite = () => 150 * D.binalar.kusevi.sv;
export function geliriTopla() {
  const m = Math.floor(D.binalar.kusevi.birikim);
  if (m <= 0) return bildir('Henüz toplanacak altın yok');
  D.altin += m; D.binalar.kusevi.birikim -= m;
  gorevOlay('gelirTopla', m);
  xpEkle(Math.ceil(m / 50));
  bildir(`🪙 +${m} altın toplandı`);
  degisti();
}

// --- Bina geliştirme: Kunduz Usta evinden çıkıp binaya yürür, süre boyunca çalışır (tek usta, aynı anda tek bina) ---
export const GELISTIRME_DK = [0, 0, 1, 5, 20, 60]; // hedef seviyeye göre süre (dakika)
export const SV_GEREK = [0, 0, 2, 4, 7, 10]; // binanın hedef seviyesi için gereken oyuncu seviyesi
export function gelistir(tip) {
  const B = D.binalar[tip];
  if (B.sv >= MAKS_SV) return bildir('Bina en yüksek seviyede');
  if (D.seviye < SV_GEREK[B.sv + 1]) return bildir(`🔒 Sv. ${B.sv + 1} için oyuncu seviyen ${SV_GEREK[B.sv + 1]} olmalı`);
  if (D.insaat) return bildir('🦫 Kunduz Usta şu an başka bir binada çalışıyor');
  if (D.temizlik) return bildir('🦫 Kunduz Usta şu an köyde bir dekoru kaldırıyor');
  if (!harca(GELISTIRME_FIYATI[B.sv + 1])) return;
  D.insaat = { tip, sv: B.sv + 1, bas: simdi(), bitis: simdi() + GELISTIRME_DK[B.sv + 1] * DAKIKA };
  bildir('🦫 Kunduz Usta yola çıktı!');
  degisti();
}
function insaatBitir() {
  const I = D.insaat, B = D.binalar[I.tip];
  B.sv = Math.max(B.sv, I.sv);
  D.insaat = null;
  xpEkle(50);
  bildir(I.yeni ? `🏗️ ${BINALAR[I.tip].ad} kuruldu!` : `⬆️ Seviye ${B.sv} oldu!`);
}

// --- Yeni bina inşası: oyuncu seviyesiyle açılır, İnşa menüsünden seçilip köyde boş bir yere konur, Kunduz Usta kurar ---
export const binaDurumu = (tip) => { // 'kilitli' | 'acik' | 'var'
  if (D.binalar[tip]) return 'var';
  return D.seviye >= BINALAR[tip].acilis ? 'acik' : 'kilitli';
};
export function insaEt(tip, i, j) {
  const T = BINALAR[tip];
  if (binaDurumu(tip) === 'var') { bildir('Bu bina zaten köyünde var'); return false; }
  if (binaDurumu(tip) === 'kilitli') { bildir(`🔒 ${T.ad} oyuncu seviyesi ${T.acilis}'te açılır`); return false; }
  if (D.insaat || D.temizlik) { bildir('🦫 Kunduz Usta şu an başka bir işte'); return false; }
  if (!harca(T.fiyat)) return false;
  D.binalar[tip] = { sv: 0 }; // inşaat bitince Sv 1
  D.yerlesim = D.yerlesim || {};
  D.yerlesim[tip] = [i, j];
  D.insaat = { tip, sv: 1, yeni: true, bas: simdi(), bitis: simdi() + T.dk * DAKIKA };
  bildir(`🦫 Kunduz Usta ${T.ad} inşaatına koşuyor!`);
  degisti();
  return true;
}

// --- Tohum Tarlası: ekin seç (az bir tohum parası), süre dolunca hasat et; hasat ambara (D.tohumlar) girer ---
// Tohumlar yemliği ve tuzağı doldurur, ileride Değirmen'de ikramlara dönüşür. Tarla seviyesi verimi artırır, süreyi kısaltır.
export const EKINLER = {
  dari: { ad: 'Darı', ikon: '🌾', fiyat: 10, dk: 2, verim: 12, svGerek: 1 },
  aycicek: { ad: 'Ayçiçeği', ikon: '🌻', fiyat: 25, dk: 6, verim: 10, svGerek: 1 },
  kenevir: { ad: 'Kenevir', ikon: '🌿', fiyat: 50, dk: 15, verim: 10, svGerek: 2 },
};
export const ekinSuresi = (e) => EKINLER[e].dk * DAKIKA * SURE_CARPAN(D.binalar.tarla ? D.binalar.tarla.sv : 1);
export const ekinVerimi = (e) => Math.round(EKINLER[e].verim * (1 + 0.25 * ((D.binalar.tarla ? D.binalar.tarla.sv : 1) - 1)));
export const tohumToplam = () => Object.values(D.tohumlar).reduce((a, b) => a + b, 0);
export function tohumHarca(gerek) {
  for (const [e, n] of Object.entries(gerek)) if (D.tohumlar[e] < n) { bildir(`Ambarda yeterli ${EKINLER[e].ad.toLowerCase()} yok`); return false; }
  for (const [e, n] of Object.entries(gerek)) D.tohumlar[e] -= n;
  return true;
}
export function ek(ekin) {
  const E = EKINLER[ekin];
  if (D.tarla) return;
  if (D.binalar.tarla.sv < E.svGerek) return bildir(`${E.ad} için Tohum Tarlası Sv. ${E.svGerek} olmalı`);
  if (!harca(E.fiyat)) return;
  D.tarla = { ekin, bas: simdi(), bitis: simdi() + ekinSuresi(ekin), verim: ekinVerimi(ekin) };
  gorevOlay('ek');
  bildir(`${E.ikon} ${E.ad} ekildi`);
  degisti();
}
export function hasat() {
  const T = D.tarla;
  if (!T || simdi() < T.bitis) return;
  D.tohumlar[T.ekin] += T.verim;
  D.tarla = null;
  xpEkle(5);
  gorevOlay('hasat');
  bildir(`${EKINLER[T.ekin].ikon} +${T.verim} ${EKINLER[T.ekin].ad.toLowerCase()} ambara girdi`);
  degisti();
}

// --- Değirmen: ambardaki tohumları karışık yeme ve Kuş Evi ikramlarına öğütür (tek iş, ×1 ya da ×5) ---
// Ürünler: ikramlar D.ikramlar'a (Kuş Evi tepsisi), karışık yem D.karisik'e (yemlik). Seviye süreyi kısaltır, yeni tarifler açar.
export const DEGIRMEN_URUNLERI = {
  karisik: { ad: 'Karışık yem', ikon: '🥣', gerek: { dari: 3, aycicek: 2, kenevir: 1 }, dk: 3, svGerek: 1, aciklama: `Yemliğe ${25} porsiyon` },
  dari: { ad: 'Darı salkımı', ikon: '🌾', gerek: { dari: 4 }, dk: 1, svGerek: 1, aciklama: 'Kuş Evi ikramı' },
  ay: { ad: 'Ay çekirdeği', ikon: '🌻', gerek: { aycicek: 4 }, dk: 2, svGerek: 1, aciklama: 'Kuş Evi ikramı' },
  bal: { ad: 'Ballı yem çubuğu', ikon: '🍯', gerek: { dari: 4, kenevir: 3 }, dk: 6, svGerek: 2, aciklama: 'Gizli tür şansı ×2' },
  kalsiyum: { ad: 'Kalsiyum taşı', ikon: '🧂', gerek: { kenevir: 6 }, dk: 8, svGerek: 3, aciklama: 'Kuluçka %30 kısa' },
};
export const ogutmeSuresi = (u, adet = 1) => DEGIRMEN_URUNLERI[u].dk * adet * DAKIKA * SURE_CARPAN(D.binalar.degirmen ? D.binalar.degirmen.sv : 1);
export function ogut(urun, adet = 1) {
  const U = DEGIRMEN_URUNLERI[urun];
  if (D.degirmen) return;
  if (D.binalar.degirmen.sv < U.svGerek) return bildir(`${U.ad} için Değirmen Sv. ${U.svGerek} olmalı`);
  const gerek = Object.fromEntries(Object.entries(U.gerek).map(([e, n]) => [e, n * adet]));
  if (!tohumHarca(gerek)) return;
  D.degirmen = { urun, adet, bas: simdi(), bitis: simdi() + ogutmeSuresi(urun, adet) };
  gorevOlay('ogut');
  bildir(`⚙️ Değirmen ${U.ad.toLowerCase()} öğütüyor`);
  degisti();
}
export function degirmenTopla() {
  const I = D.degirmen;
  if (!I || simdi() < I.bitis) return;
  const U = DEGIRMEN_URUNLERI[I.urun];
  if (I.urun === 'karisik') D.karisik += I.adet; else D.ikramlar[I.urun] = (D.ikramlar[I.urun] || 0) + I.adet;
  D.degirmen = null;
  xpEkle(3 * I.adet);
  gorevOlay('degirmenTopla');
  bildir(`${U.ikon} +${I.adet} ${U.ad.toLowerCase()}`);
  degisti();
}

// --- Hafif rahatsızlıklar: kuşlar ölmez ve gerçekten hastalanmaz; yalnızca uzun süre aç ya da mutsuz kalan kuş ara sıra
// rahatsızlanır. Kuş Kliniği açılmadan (oyuncu Sv 5) hiç olmaz. İyi bakılırsa 6 saatte kendiliğinden geçer; klinikte hemen.
export const RAHATSIZLIKLAR = {
  nezle: { ad: 'Nezle', ikon: '🤧', etki: 'Çiftleşemez' },
  tuy: { ad: 'Tüy dökümü', ikon: '🪶', etki: 'Tüy değeri hızla bozulur' },
  halsiz: { ad: 'Halsizlik', ikon: '😴', etki: 'Kazandırdığı altın yarıya iner' },
};
const RAHATSIZLIK_SAATLIK = 0.12; // bakımsız kuşun bir saatte rahatsızlanma ihtimali
function rahatsizlikTik(k, t, saat) {
  if (k.hasta) {
    if (k.hasta.tur === 'tuy') k.tuy = Math.min(1, k.tuy + 0.01 * saat);
    if (k.tokluk > 60 && k.mutluluk > 60) k.hasta.iyi = (k.hasta.iyi || 0) + saat; // iyi bakılıyor: yavaş yavaş iyileşir
    if (k.hasta.iyi >= 6) { delete k.hasta; bildir(`💚 ${k.ad} iyi bakıldı ve kendiliğinden iyileşti`); return true; }
    return false;
  }
  if (D.seviye < BINALAR.klinik.acilis || (k.koruma && k.koruma > t) || (k.tokluk >= 25 && k.mutluluk >= 25)) return false;
  if (Math.random() >= 1 - Math.pow(1 - RAHATSIZLIK_SAATLIK, saat)) return false;
  const turler = Object.keys(RAHATSIZLIKLAR), tur = turler[Math.floor(Math.random() * turler.length)], R = RAHATSIZLIKLAR[tur];
  k.hasta = { tur, bas: t };
  bildir(`${R.ikon} ${k.ad} rahatsızlandı: ${R.ad.toLowerCase()}. ${D.binalar.klinik ? "Kuş Kliniği'nde tedavi et" : 'İyi beslenirse geçer'}`);
  return true;
}

// --- Kuş Kliniği: tek kuş, süreli hizmet; kuş bu sürede köyde görünmez, bitince etkisiyle döner ---
export const KLINIK_HIZMETLERI = {
  tedavi: { ad: 'Tedavi', ikon: '💊', fiyat: 40, dk: 3, svGerek: 1, aciklama: 'Rahatsızlığı geçirir, 12 saat korur', hasta: true },
  checkup: { ad: 'Check-up', ikon: '🩺', fiyat: 25, dk: 2, svGerek: 1, aciklama: 'Bir süre rahatsızlanmaz, tüyü biraz parlar' },
  tuy: { ad: 'Tüy bakımı', ikon: '🪶', fiyat: 60, dk: 4, svGerek: 2, aciklama: 'Tüy değeri iyileşir, mutluluk +15' },
};
export const klinikSuresi = (h) => KLINIK_HIZMETLERI[h].dk * DAKIKA * SURE_CARPAN(D.binalar.klinik ? D.binalar.klinik.sv : 1);
export function klinigeGonder(kusId, hizmet) {
  const k = kusBul(kusId), H = KLINIK_HIZMETLERI[hizmet];
  if (!k || D.klinik) return;
  if (D.binalar.klinik.sv < H.svGerek) return bildir(`${H.ad} için Kuş Kliniği Sv. ${H.svGerek} olmalı`);
  if (mesgulMu(k)) return bildir(`${k.ad} şu an kuluçkada`);
  if (H.hasta && !k.hasta) return bildir(`${k.ad} sağlıklı, tedaviye gerek yok`);
  if (!harca(H.fiyat)) return;
  D.klinik = { kusId, hizmet, bas: simdi(), bitis: simdi() + klinikSuresi(hizmet) };
  gorevOlay('klinik');
  bildir(`${H.ikon} ${k.ad} kliniğe girdi`);
  degisti();
}
function klinikBitir() {
  const I = D.klinik, k = kusBul(I.kusId), sv = D.binalar.klinik ? D.binalar.klinik.sv : 1, t = simdi();
  D.klinik = null;
  if (!k) return;
  if (I.hizmet === 'tedavi') { delete k.hasta; k.koruma = t + 12 * 60 * DAKIKA; k.mutluluk = Math.min(100, k.mutluluk + 10); bildir(`💚 ${k.ad} iyileşti ve köye döndü`); }
  else if (I.hizmet === 'checkup') { k.koruma = t + (24 + (sv - 1) * 12) * 60 * DAKIKA; k.tuy = Math.max(0, +(k.tuy - 0.004).toFixed(3)); bildir(`🩺 ${k.ad} check-up'tan döndü: sapasağlam`); }
  else { k.tuy = Math.max(0, +(k.tuy - 0.012).toFixed(3)); k.mutluluk = Math.min(100, k.mutluluk + 15); if (k.hasta && k.hasta.tur === 'tuy') delete k.hasta; bildir(`🪶 ${k.ad} tüy bakımından pırıl pırıl döndü`); }
  xpEkle(8);
}

// --- Sipariş Panosu: köylüler belirli bir kuş ister (tür, renk, tüy kalitesi, cinsiyet). Kuşu teslim edince altın, XP, bazen elmas.
// D.siparis.liste: her yer ya bir sipariş ya da { bekle } (yeni sipariş gelme anı). Siparişlerin süresi dolmaz; beğenmediğin reddedilir.
export const KOYLULER = [
  { ad: 'Ayı Dede', ikon: '🐻' }, { ad: 'Tilki Teyze', ikon: '🦊' }, { ad: 'Tavşan Kız', ikon: '🐰' }, { ad: 'Kirpi Amca', ikon: '🦔' },
  { ad: 'Sincap Bacı', ikon: '🐿️' }, { ad: 'Kurbağa Muhtar', ikon: '🐸' }, { ad: 'Fare Nine', ikon: '🐭' }, { ad: 'Geyik Hoca', ikon: '🦌' },
];
const SIPARIS_SOZ = ['Bahçeme neşe katacak bir kuş arıyorum', 'Torunuma doğum günü hediyesi lazım', 'Penceremde şarkı söyleyecek biri olsun',
  'Kuş yarışmasına katılacağım', 'Yalnız kaldım, bir arkadaş istiyorum', 'Çay bahçeme süs olsun', 'Okulun kuş köşesi için', 'Eski kuşum gibi birini arıyorum'];
export const KOND_SINIR = { 'İyi': 0.38, 'Parlak': 0.15, 'Kusursuz': 0.07 }; // bu tüy değerinin altında olmalı
const MUT_GEN = { normal: {}, alaca: { alaca: [1, 0] }, mavi: { mavi: [1, 1] }, lutino: { ino: [1, 1] }, albino: { ino: [1, 1], mavi: [1, 1] } };
const pnoSv = () => (D.binalar.siparis ? D.binalar.siparis.sv : 0);
export const siparisYeri = (sv = pnoSv()) => 3 + Math.floor((sv - 1) / 2); // Sv1-2: 3, Sv3-4: 4, Sv5: 5
const siparisBekleme = () => 15 * DAKIKA * SURE_CARPAN(Math.max(1, pnoSv()));
const rastgele = (d) => d[Math.floor(Math.random() * d.length)];
function siparisUret() {
  const sv = pnoSv(), turler = D.kesifler.filter((t) => TURLER[t]);
  const tur = rastgele(turler.filter((t) => TURLER[t].nadirlik !== 'Efsanevi' || Math.random() < 0.3)) || 'kanarya';
  const s = { id: (D.siparis.sonId = (D.siparis.sonId || 0) + 1), koylu: Math.floor(Math.random() * KOYLULER.length), soz: Math.floor(Math.random() * SIPARIS_SOZ.length), tur };
  let zorluk = 0;
  // Renk: oyuncunun şimdiye kadar elde ettiği renklerden (kuşlarında görülen)
  const renkler = [...new Set(D.kuslar.map((k) => fenotip(k.genler)))].filter((m) => m !== 'normal');
  if (renkler.length && Math.random() < 0.35) { s.mutasyon = rastgele(renkler); zorluk++; }
  const r = Math.random();
  if (sv >= 3 && r < 0.12) { s.kondisyon = 'Kusursuz'; zorluk += 2; } else if (r < 0.35) { s.kondisyon = 'Parlak'; zorluk++; } else if (r < 0.6) s.kondisyon = 'İyi';
  if (Math.random() < 0.3) { s.cinsiyet = Math.random() < 0.5 ? 'e' : 'd'; zorluk++; }
  // Ödül: istenen kuşun satış değerinin yaklaşık iki katı; zorluk ve pano seviyesiyle artar
  const deger = kusDegeri({ tur, genler: { ino: [0, 0], mavi: [0, 0], alaca: [0, 0], ...MUT_GEN[s.mutasyon || 'normal'] }, tuy: s.kondisyon ? KOND_SINIR[s.kondisyon] - 0.01 : 0.42 });
  s.altin = Math.round(deger * (1.8 + 0.25 * zorluk) * (1 + 0.1 * (sv - 1)) / 5) * 5 + 20;
  s.xp = 15 + 10 * ['Yaygın', 'Nadir', 'Epik', 'Efsanevi'].indexOf(TURLER[tur].nadirlik) + 5 * zorluk;
  if (zorluk >= 2 && Math.random() < 0.4) s.elmas = zorluk >= 3 ? 2 : 1;
  return s;
}
export const siparisKoylu = (s) => KOYLULER[s.koylu];
export const siparisSozu = (s) => SIPARIS_SOZ[s.soz];
export const siparisYazi = (s) => [TURLER[s.tur].ad, s.mutasyon && MUT_ADI[s.mutasyon], s.kondisyon && `en az ${s.kondisyon.toLocaleLowerCase('tr')} tüy`,
  s.cinsiyet && (s.cinsiyet === 'e' ? '♂ erkek' : '♀ dişi')].filter(Boolean).join(' · ');
export const siparisUygun = (s, k) => k.tur === s.tur && !mesgulMu(k) && (!s.mutasyon || fenotip(k.genler) === s.mutasyon)
  && (!s.kondisyon || k.tuy < KOND_SINIR[s.kondisyon]) && (!s.cinsiyet || k.cinsiyet === s.cinsiyet);
export const siparisHazirMi = () => !!D.siparis && D.siparis.liste.some((s) => s.tur && D.kuslar.some((k) => siparisUygun(s, k)));
function siparisTik(t) {
  if (!pnoSv()) return false;
  const P = D.siparis = D.siparis || { liste: [] };
  let degisim = false;
  while (P.liste.length < siparisYeri()) { P.liste.push(P.liste.length ? { bekle: t + siparisBekleme() * P.liste.length / 2 } : siparisUret()); degisim = true; }
  P.liste.forEach((s, n) => { if (!s.tur && t >= s.bekle) { P.liste[n] = siparisUret(); degisim = true; } });
  return degisim;
}
export function siparisTeslim(sipId, kusId) {
  const P = D.siparis, n = P ? P.liste.findIndex((s) => s.id === sipId) : -1, k = kusBul(kusId);
  if (n < 0 || !k) return;
  const s = P.liste[n];
  if (!siparisUygun(s, k)) return bildir('Bu kuş siparişe uymuyor');
  delete k.yeniTur;
  D.kuslar = D.kuslar.filter((x) => x !== k);
  D.altin += s.altin; D.elmas += s.elmas || 0;
  P.teslim = (P.teslim || 0) + 1;
  P.liste[n] = { bekle: simdi() + siparisBekleme() };
  xpEkle(s.xp);
  gorevOlay('siparis');
  bildir(`📜 ${siparisKoylu(s).ad} ${k.ad} için çok mutlu! +${s.altin} 🪙${s.elmas ? ` +${s.elmas} 💎` : ''}`);
  degisti();
}
export function siparisReddet(sipId) {
  const P = D.siparis, n = P ? P.liste.findIndex((s) => s.id === sipId) : -1;
  if (n < 0) return;
  P.liste[n] = { bekle: simdi() + 5 * DAKIKA };
  bildir('📜 Sipariş panodan kaldırıldı, yenisi birazdan gelir');
  degisti();
}

// --- Dekor kaldırma: Kunduz Usta köydeki ağaç ve kayaları kaldırır; türüne ve boyutuna göre altın kazandırır ---
// Kaldırılan dekorlar D.kaldirilan'a ('agac,1,2' gibi) yazılır; o karo bina, yol ve fırça için boşalır (koy.js suslerGuncel)
export function temizlikBilgi(doku, boy) {
  if (doku === 'dekor_tas_kucuk') return { ad: 'Küçük taş', ikon: '🪨', altin: 15, xp: 5, sn: 30 };
  if (/kaya|tas/.test(doku)) return { ad: 'Kaya', ikon: '🪨', altin: 30, xp: 8, sn: 60 };
  return { ad: 'Ağaç', ikon: '🌳', altin: Math.round(30 + boy / 6), xp: 12, sn: 120 }; // büyük ağaç daha çok altın
}
export function temizlikBaslat(anahtar, bilgi) {
  if (D.insaat || D.temizlik) { bildir('🦫 Kunduz Usta şu an başka bir işte'); return false; }
  D.temizlik = { anahtar, ad: bilgi.ad, altin: bilgi.altin, xp: bilgi.xp, bas: simdi(), bitis: simdi() + bilgi.sn * 1000 };
  bildir('🦫 Kunduz Usta işe koyuldu!');
  degisti();
  return true;
}
function temizlikBitir() {
  const T = D.temizlik;
  D.temizlik = null;
  (D.kaldirilan = D.kaldirilan || []).push(T.anahtar);
  D.altin += T.altin;
  xpEkle(T.xp);
  bildir(`🦫 ${T.ad} kaldırıldı! +${T.altin} 🪙`);
}

// --- Hızlandırma ---
export const kalanSure = (is) => Math.max(0, is.bitis - simdi());
export const elmasFiyati = (ms) => Math.max(1, Math.ceil(ms / (10 * DAKIKA)));
export function hizlandirElmas(tip) {
  const is = D[tip];
  if (!is) return;
  if (!harca(0, elmasFiyati(kalanSure(is)))) return;
  is.bitis = simdi();
  degisti();
}
export function hizlandirReklam(tip) { // gerçek reklam bağlanana kadar deneme
  const is = D[tip];
  if (!is) return;
  is.bitis -= 15 * DAKIKA;
  bildir('📺 Süre 15 dakika kısaldı');
  degisti();
}

// --- Zamanla işleyenler (her saniye ve oyun açılışında) ---
export function tik() {
  gunluguYenile();
  const t = simdi(), saat = Math.min(t - D.son, 24 * 60 * DAKIKA) / (60 * DAKIKA);
  let degisim = false;
  if (D.insaat && t >= D.insaat.bitis) { insaatBitir(); degisim = true; }
  if (D.temizlik && t >= D.temizlik.bitis) { temizlikBitir(); degisim = true; }
  if (D.klinik && t >= D.klinik.bitis) { klinikBitir(); degisim = true; }
  if (siparisTik(t)) degisim = true;
  const K = D.kulucka;
  if (K && K.asama === 'ciftlesme' && t >= K.bitis) {
    const a = kusBul(K.aId), b = kusBul(K.bId);
    if (!a || !b) { D.kulucka = null; } else {
      K.cocuk = yavruUret(a, b, { kuluckaSv: D.binalar.kulucka.sv, gece: geceMi() });
      // Kalsiyum taşı: kuluçka %30 kısa (bir kez kullanılır)
      const kals = (a.buff && a.buff.kalsiyum) || (b.buff && b.buff.kalsiyum);
      for (const k of [a, b]) if (k.buff) delete k.buff.kalsiyum;
      K.asama = 'kulucka'; K.bas = t; K.bitis = t + kuluckaSuresi(K.cocuk.tur) * (kals ? 0.7 : 1);
      bildir('🥚 Yumurta kuluçkaya yattı!');
    }
    degisim = true;
  }
  if (saat > 0) {
    const Y = D.binalar.yemlik;
    for (const k of D.kuslar) {
      k.tokluk = Math.max(0, k.tokluk - 4 * saat);
      k.mutluluk = Math.max(0, k.mutluluk - 3 * saat);
      if (k.tokluk < 70 && Y.stok > 0) { Y.stok--; k.tokluk = Math.min(100, k.tokluk + 30); k.mutluluk = Math.min(100, k.mutluluk + 3); degisim = true; }
      // Bakım tüyü etkiler: iyi bakılan kuşun tüyü parlar, bakımsız kuşun tüyü matlaşır
      if (k.mutluluk > 70 && k.tokluk > 50) k.tuy = Math.max(0, k.tuy - 0.004 * saat);
      else if (k.mutluluk < 30 || k.tokluk < 20) k.tuy = Math.min(1, k.tuy + 0.006 * saat);
      if (rahatsizlikTik(k, t, saat)) degisim = true;
      if (k.mutluluk >= 50) D.binalar.kusevi.birikim += GELIR_SAAT[TURLER[k.tur].nadirlik] * saat * (k.hasta && k.hasta.tur === 'halsiz' ? 0.5 : 1);
    }
    D.binalar.kusevi.birikim = Math.min(gelirKapasite(), D.binalar.kusevi.birikim);
  }
  D.son = t;
  if (degisim) degisti();
}
