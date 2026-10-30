// Kuş Evi ikramları: köydeki yemlik temel açlığı karşılar; ikramlar kuşa özel, elle verilir ve etkisi vardır.
// Her türün sevdiği bir ikram var: onu verince etkisi iki katına çıkar.
import { TURLER } from './turler.js';
import { D, degisti, bildir, harca, xpEkle } from './durum.js';
import { bagEkle, bakimYap } from './bag.js';

export const IKRAMLAR = {
  dari: { ad: 'Darı salkımı', ikon: '🌾', fiyat: { altin: 15 }, aciklama: 'Mutluluk +15, tokluk +20' },
  ay: { ad: 'Ay çekirdeği', ikon: '🌻', fiyat: { altin: 30 }, aciklama: 'Mutluluk +30' },
  meyve: { ad: 'Meyve tabağı', ikon: '🍓', fiyat: { altin: 80 }, aciklama: 'Tüyler parlar (tüy değeri iyileşir)' },
  bal: { ad: 'Ballı yem çubuğu', ikon: '🍯', fiyat: { altin: 150 }, aciklama: 'Sonraki çiftleşmede gizli tür şansı ×2' },
  kalsiyum: { ad: 'Kalsiyum taşı', ikon: '🧂', fiyat: { altin: 120 }, aciklama: 'Sonraki kuluçka %30 kısa sürer' },
  test: { ad: 'Genetik test', ikon: '🧪', fiyat: { elmas: 2 }, aciklama: 'Gizli taşıyıcı genleri Kuş Defteri\'nde gösterir' },
};

// Türlerin sevdiği ikramlar (Gemini'nin yazdığı "sevdiği yem" bilgisine göre)
export const FAVORI = { ev_sercesi: 'dari', saka: 'ay', kanarya: 'bal', muhabbet: 'dari', sultan: 'ay', cennet: 'meyve', ketzal: 'meyve' };

export const BASLANGIC_IKRAM = { dari: 5, ay: 3, meyve: 1, bal: 0, kalsiyum: 0, test: 0 };

export const stok = (id) => (D.ikramlar && D.ikramlar[id]) || 0;

export function ikramAl(id) {
  const I = IKRAMLAR[id];
  if (!harca(I.fiyat.altin || 0, I.fiyat.elmas || 0)) return false;
  D.ikramlar[id] = stok(id) + 1;
  degisti();
  return true;
}

// Kuşa ikram verir; sonuç metni ve favori olup olmadığını döndürür
export function ikramVer(k, id) {
  if (stok(id) <= 0) return null;
  const sevdi = FAVORI[k.tur] === id, c = sevdi ? 2 : 1;
  D.ikramlar[id]--;
  k.buff = k.buff || {};
  let metin = '';
  if (id === 'dari') { k.mutluluk = Math.min(100, k.mutluluk + 15 * c); k.tokluk = Math.min(100, k.tokluk + 20 * c); metin = 'Mutlu ve tok'; }
  else if (id === 'ay') { k.mutluluk = Math.min(100, k.mutluluk + 30 * c); metin = 'Çok mutlu'; }
  else if (id === 'meyve') { k.tuy = Math.max(0, +(k.tuy - 0.015 * c).toFixed(3)); metin = `Tüy değeri ${k.tuy.toFixed(3)}`; }
  else if (id === 'bal') { k.buff.nadir = true; metin = 'Gizli tür şansı ×2 (sonraki çiftleşme)'; }
  else if (id === 'kalsiyum') { k.buff.kalsiyum = true; metin = 'Sonraki kuluçka %30 kısa'; }
  else if (id === 'test') { k.testli = true; metin = 'Genleri Kuş Defteri\'nde'; }
  if (sevdi) { D.favoriKesif = D.favoriKesif || {}; D.favoriKesif[k.tur] = true; } // oyuncu sevdiği ikramı denerek keşfeder
  bagEkle(k, 'ikram', sevdi ? 2 : 1); bakimYap(k, 'ikram');
  xpEkle(sevdi ? 3 : 1);
  bildir(`${IKRAMLAR[id].ikon} ${k.ad}: ${metin}${sevdi ? ' · 💗 En sevdiği ikram!' : ''}`);
  degisti();
  return { sevdi };
}

export const favoriAdi = (tur) => IKRAMLAR[FAVORI[tur]] ? IKRAMLAR[FAVORI[tur]].ad : '';
void TURLER;
