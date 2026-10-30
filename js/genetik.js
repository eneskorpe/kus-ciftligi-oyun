// Genetik: yabani kuş üretimi, çiftleştirmede yavru, gizli tür tarifleri ve kuş değeri.
// Her renk geni iki kopya taşır (anneden bir, babadan bir). 1 = mutasyonlu kopya.
//   ino, mavi: çekinik (iki kopya gerekir; tek kopya "taşıyıcı", görünmez)
//   alaca: baskın (tek kopya yeter)
import { TURLER, kondisyonAdi } from './turler.js';
import { D, simdi, saat } from './durum.js';
import { ISIMLER } from './isimler.js';
import { kalp, huySec, favoriSec } from './bag.js';
import { FAVORI } from './ikram.js';

export const YEMLER = {
  // tarla: altın yerine tarladan gelen tohumla da kurulabilir (mekanik.js tuzakKur)
  tohum: { ad: 'Kuş tohumu', ikon: '🌱', fiyat: 20, tarla: { dari: 3 }, sure: 10, svGerek: 1, turler: { ev_sercesi: 50, saka: 30, kanarya: 20 } },
  dari: { ad: 'Salkım darı', ikon: '🌾', fiyat: 60, tarla: { dari: 8 }, sure: 20, svGerek: 1, turler: { ev_sercesi: 15, saka: 15, kanarya: 30, muhabbet: 40 } },
  ay: { ad: 'Ay çekirdeği', ikon: '🌻', fiyat: 150, tarla: { aycicek: 6 }, sure: 40, svGerek: 2, turler: { kanarya: 15, saka: 15, muhabbet: 30, sultan: 40 } },
};

// Gizli tarifler: sıra önemsiz. kosul sağlanmazsa yavru ebeveynlerden birinin türünde olur.
export const TARIFLER = [
  { ebeveyn: ['muhabbet', 'kanarya'], tur: 'cennet', sans: 0.25 },
  { ebeveyn: ['cennet', 'sultan'], tur: 'ketzal', sans: 0.12,
    kosul: (a, b, k) => a.tuy < 0.15 && b.tuy < 0.15 && k.kuluckaSv >= 3 && k.gece },
];

export const KULUCKA_DK = { 'Yaygın': 5, 'Nadir': 15, 'Epik': 45, 'Efsanevi': 120 };
const DEGER = { 'Yaygın': 40, 'Nadir': 120, 'Epik': 600, 'Efsanevi': 5000 };
const MUT_CARPAN = { normal: 1, alaca: 1.5, mavi: 2, lutino: 2.5, albino: 4 };
const KOND_CARPAN = { 'Kusursuz': 3, 'Parlak': 1.8, 'İyi': 1, 'Sıradan': 0.8, 'Mat': 0.5 };

export const MUT_ADI = { normal: 'Normal', lutino: 'Lutino', albino: 'Albino', mavi: 'Mavi seri', alaca: 'Alaca' };
const sinirla = (v) => Math.max(0, Math.min(1, v));
const sec = (dizi) => dizi[Math.floor(Math.random() * dizi.length)];

export function fenotip(g) {
  const ino = g.ino[0] && g.ino[1], mavi = g.mavi[0] && g.mavi[1];
  if (ino && mavi) return 'albino';
  if (ino) return 'lutino';
  if (mavi) return 'mavi';
  if (g.alaca[0] || g.alaca[1]) return 'alaca';
  return 'normal';
}

// Kuş görselinin istediği gen bilgisi
export const kusGen = (k) => ({ tur: k.tur, mutasyon: fenotip(k.genler), tuy: k.tuy, tohum: k.tohum });

export function kusOlustur({ tur, genler, tuy, cinsiyet, ebeveyn, ebeveynHuy }) {
  const kullanilan = new Set(D.kuslar.map((k) => k.ad));
  const bos = ISIMLER.filter((ad) => !kullanilan.has(ad));
  return {
    id: ++D.sonId, ad: bos.length ? sec(bos) : `Kuş ${D.sonId}`, tur, cinsiyet: cinsiyet || sec(['e', 'd']),
    tuy: +sinirla(tuy).toFixed(3), tohum: 1 + Math.floor(Math.random() * 999), genler,
    mutluluk: 75, tokluk: 75, sonSevme: 0, gorunur: true, dogum: simdi(), ebeveyn: ebeveyn || null,
    huy: huySec(ebeveynHuy), favori: favoriSec(FAVORI[tur]),
  };
}

// Tuzağa düşen yabani kuş. Tuzak seviyesi mutasyon şansını ve tüy kalitesini artırır.
export function yabaniKus(yemAd, sv) {
  const yem = YEMLER[yemAd], toplam = Object.values(yem.turler).reduce((a, b) => a + b, 0);
  let r = Math.random() * toplam, tur = Object.keys(yem.turler)[0];
  for (const [t, a] of Object.entries(yem.turler)) { if ((r -= a) < 0) { tur = t; break; } }
  const p = 0.12 + 0.04 * (sv - 1);
  const kopya = (oran) => [+(Math.random() < oran), +(Math.random() < oran)];
  const genler = { ino: kopya(p), mavi: kopya(p), alaca: [+(Math.random() < 0.05 + 0.02 * (sv - 1)), 0] };
  return { tur, genler, tuy: Math.random() ** (1 + 0.2 * (sv - 1)) };
}

export function tarifBul(a, b) {
  return TARIFLER.find((t) => (t.ebeveyn[0] === a.tur && t.ebeveyn[1] === b.tur) || (t.ebeveyn[0] === b.tur && t.ebeveyn[1] === a.tur));
}

// Yavru: tür tarife göre, genler her ebeveynden birer kopya, tüy ebeveynlerin ortalaması çevresinde
export function yavruUret(a, b, kosullar) {
  const tarif = tarifBul(a, b);
  let tur = Math.random() < 0.5 ? a.tur : b.tur;
  // Ballı yem çubuğu: gizli tür şansı ×2 (bir kez kullanılır)
  const carpan = (a.buff && a.buff.nadir) || (b.buff && b.buff.nadir) ? 2 : 1;
  for (const k of [a, b]) if (k.buff) delete k.buff.nadir;
  if (tarif && (!tarif.kosul || tarif.kosul(a, b, kosullar)) && Math.random() < tarif.sans * carpan) tur = tarif.tur;
  const genler = {};
  for (const g of ['ino', 'mavi', 'alaca']) genler[g] = [sec(a.genler[g]), sec(b.genler[g])];
  const sapma = (Math.random() + Math.random() + Math.random() - 1.5) * 0.12;
  return { tur, genler, tuy: sinirla((a.tuy + b.tuy) / 2 + sapma - 0.015 * (kosullar.kuluckaSv - 1)), ebeveyn: [a.ad, b.ad], ebeveynHuy: [a.huy, b.huy] };
}

export function kusDegeri(k) {
  // Bağ: her kalp değeri %8 artırır (kuşla vakit geçirmek, hemen satmaktan kârlı olsun)
  const utangac = k.huy === 'utangac' && kalp(k) >= 10 ? 1.25 : 1; // utangaç kuşun Can Dostu ödülü
  return Math.round(DEGER[TURLER[k.tur].nadirlik] * MUT_CARPAN[fenotip(k.genler)] * KOND_CARPAN[kondisyonAdi(k.tuy)] * (1 + 0.08 * kalp(k)) * utangac);
}

export const geceMi = () => { const s = saat(); return s >= 20 || s < 6; };
