// Oyun kuralları: tuzak, kuluçka, bakım, gelir, bina geliştirme, hızlandırma.
import { TURLER } from './turler.js';
import { D, simdi, DAKIKA, degisti, bildir, xpEkle, harca } from './durum.js';
import { YEMLER, KULUCKA_DK, yabaniKus, yavruUret, kusOlustur, kusDegeri, geceMi } from './genetik.js';
import { gorevOlay, gunluguYenile } from './gorevler.js';

export const MAKS_SV = 5;
export const GELISTIRME_FIYATI = [0, 0, 300, 800, 2000, 5000]; // hedef seviyeye göre
const SURE_CARPAN = (sv) => 1 - 0.1 * (sv - 1);
const CIFTLESME_DK = 2;
const SEVME_ARASI = 60 * DAKIKA;
const GELIR_SAAT = { 'Yaygın': 12, 'Nadir': 30, 'Epik': 90, 'Efsanevi': 400 };

export const kapasite = () => 6 + 4 * (D.binalar.kusevi.sv - 1);
export const yemlikKapasite = () => 20 * D.binalar.yemlik.sv;
export const kusBul = (id) => D.kuslar.find((k) => k.id === id);
export const mesgulMu = (k) => !!D.kulucka && (D.kulucka.aId === k.id || D.kulucka.bId === k.id);

export const BINA_ETKI = {
  tuzak: (sv) => `Süre −%${(sv - 1) * 10}, mutasyon şansı +%${(sv - 1) * 4}${sv >= 2 ? ', ay çekirdeği açık' : ''}`,
  kulucka: (sv) => `Kuluçka süresi −%${(sv - 1) * 10}, yavru tüyü daha iyi`,
  kusevi: (sv) => `Kapasite ${6 + 4 * (sv - 1)} kuş`,
  yemlik: (sv) => `${20 * sv} porsiyon yem alır`,
};

// --- Tuzak ---
export const tuzakSuresi = (yem) => YEMLER[yem].sure * DAKIKA * SURE_CARPAN(D.binalar.tuzak.sv);
export function tuzakKur(yem) {
  const Y = YEMLER[yem];
  if (D.tuzak) return;
  if (D.binalar.tuzak.sv < Y.svGerek) return bildir(`Bu yem için Tuzak Kulübesi Sv. ${Y.svGerek} olmalı`);
  if (!harca(Y.fiyat)) return;
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
export function gelistir(tip) {
  const B = D.binalar[tip];
  if (B.sv >= MAKS_SV) return bildir('Bina en yüksek seviyede');
  if (D.insaat) return bildir('🦫 Kunduz Usta şu an başka bir binada çalışıyor');
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
  bildir(`⬆️ Seviye ${B.sv} oldu!`);
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
      if (k.mutluluk >= 50) D.binalar.kusevi.birikim += GELIR_SAAT[TURLER[k.tur].nadirlik] * saat;
    }
    D.binalar.kusevi.birikim = Math.min(gelirKapasite(), D.binalar.kusevi.birikim);
  }
  D.son = t;
  if (degisim) degisti();
}
