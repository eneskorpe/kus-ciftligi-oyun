// Oyun durumu ve kayıt (tarayıcı hafızası). Test için: ?hiz=60 zamanı hızlandırır, ?sifirla kaydı siler.
const ANAHTAR = 'kusCiftligi_v1';
const parametre = new URLSearchParams(location.search);
export const HIZ = Math.max(1, +parametre.get('hiz') || 1);
// Test sürümü (GitHub Pages test adresi ya da ?sinirsiz): altın ve elmas sınırsız, harcamalar düşmez.
// Gerçek yayına geçerken bu satır kaldırılmalı (DEVAM.md'de not var).
export const SINIRSIZ = location.hostname.endsWith('github.io') || parametre.has('sinirsiz');
const acilis = Date.now();
export const simdi = () => acilis + (Date.now() - acilis) * HIZ;
export const DAKIKA = 60000;

function yeniOyun() {
  const t = simdi();
  const kus = (id, tur, cinsiyet, tuy, ad) => ({ id, ad, tur, cinsiyet, tuy, tohum: 1 + Math.floor(Math.random() * 999),
    genler: { ino: [0, 0], mavi: [0, 0], alaca: [0, 0] }, mutluluk: 80, tokluk: 80, sonSevme: 0, gorunur: true, dogum: t });
  return {
    surum: 1, altin: 300, elmas: 10, xp: 0, seviye: 1, sonId: 3,
    kuslar: [kus(1, 'kanarya', 'e', 0.22, 'Limon'), kus(2, 'kanarya', 'd', 0.3, 'Pamuk'), kus(3, 'ev_sercesi', 'e', 0.4, 'Fıstık')],
    binalar: { tuzak: { sv: 1 }, kulucka: { sv: 1 }, kusevi: { sv: 1, birikim: 0 }, yemlik: { sv: 1, stok: 10 }, kunduz: { sv: 1 } },
    tuzak: null,    // { yem, bas, bitis }
    kulucka: null,  // { aId, bId, asama: 'ciftlesme' | 'kulucka', bas, bitis, cocuk }
    insaat: null,   // { tip, sv (hedef seviye), bas, bitis } Kunduz Usta'nın geliştirdiği bina
    kesifler: ['ev_sercesi', 'kanarya'],
    son: t,
  };
}

function yukle() {
  if (parametre.has('sifirla')) { try { localStorage.removeItem(ANAHTAR); } catch { /* yok */ } }
  try {
    const kayit = JSON.parse(localStorage.getItem(ANAHTAR));
    if (kayit && kayit.surum === 1) return kayit;
  } catch { /* bozuk kayıt: yeni oyun */ }
  return yeniOyun();
}

export const D = yukle();
// Eski kayıtlarda olmayan alanlar
D.gorevler = D.gorevler || { gun: '', gunluk: [], anaNo: 0, sayac: {} };
// Test: ?altin=5000&elmas=100 kayda bir kez ekler (adres hemen temizlenir, yenileyince tekrar eklenmez)
if (parametre.has('altin') || parametre.has('elmas')) {
  D.altin += Math.max(0, +parametre.get('altin') || 0);
  D.elmas += Math.max(0, +parametre.get('elmas') || 0);
  try { localStorage.setItem(ANAHTAR, JSON.stringify(D)); } catch { /* yok */ }
  parametre.delete('altin'); parametre.delete('elmas');
  history.replaceState(null, '', location.pathname + (parametre.toString() ? '?' + parametre : ''));
}
if (SINIRSIZ) { D.altin = Math.max(D.altin, 999999); D.elmas = Math.max(D.elmas, 99999); }
D.binalar.kunduz = D.binalar.kunduz || { sv: 1 }; // Kunduz Usta'nın evi (geliştirilmez)
D.ikramlar = D.ikramlar ||{ dari: 5, ay: 3, meyve: 1, bal: 0, kalsiyum: 0, test: 0 };

// Günün saati (0-24, kesirli). Test için ?saat=22 gibi sabitlenebilir.
const sabitSaat = parametre.has('saat') ? +parametre.get('saat') : null;
export function saat() {
  if (sabitSaat !== null) return sabitSaat;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}
export const bugun = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

const dinleyiciler = new Set();
export function dinle(f) { dinleyiciler.add(f); }
export function kaydet() {
  D.son = simdi();
  try { localStorage.setItem(ANAHTAR, JSON.stringify(D)); } catch { /* gizli sekme vb. */ }
}
// Durum değişince kaydeder ve arayüze haber verir
export function degisti() { kaydet(); dinleyiciler.forEach((f) => f()); }

let bildirimFn = () => {};
export function bildirimAyarla(f) { bildirimFn = f; }
export function bildir(metin) { bildirimFn(metin); }

export const xpGerek = (sv) => 60 + sv * 40;
export function xpEkle(miktar) {
  D.xp += miktar;
  while (D.xp >= xpGerek(D.seviye)) {
    D.xp -= xpGerek(D.seviye);
    D.seviye++;
    D.elmas += 2;
    bildir(`🎉 Seviye ${D.seviye}! +2 💎`);
  }
}

export function harca(altin = 0, elmas = 0) {
  if (SINIRSIZ) return true; // test sürümünde hiçbir şey eksilmez
  if (D.altin < altin) { bildir('Yeterli altının yok 🪙'); return false; }
  if (D.elmas < elmas) { bildir('Yeterli elmasın yok 💎'); return false; }
  D.altin -= altin; D.elmas -= elmas;
  return true;
}

export function sureYazi(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000)), sa = Math.floor(s / 3600), dk = Math.floor(s % 3600 / 60), sn = s % 60;
  if (sa) return `${sa} sa ${dk} dk`;
  if (dk) return `${dk} dk ${String(sn).padStart(2, '0')} sn`;
  return `${sn} sn`;
}
