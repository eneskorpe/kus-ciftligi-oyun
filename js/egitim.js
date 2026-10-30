// Eğitim ve yetenekler (docs/kus-bagi-tasarim.md): Kuş Evi'nde kısa mini oyunlarla ders. Her kuşa günde 3 ders, sonra elmasla ek ders.
// k.yetenek: { otus, huner, konusma, getir } biriken ders puanı. k.ders: { gun, sayi }
import { D, bugun, bildir, degisti, xpEkle, harca } from './durum.js';
import { bagEkle } from './bag.js';

export const YETENEKLER = {
  otus: { ad: 'Ötüş', ikon: '🎵', oyun: 'Melodiyi sırayla tekrarla', etki: (y) => `Kuş Evi geliri +%${y * 5}${y >= 1 ? ', köyde sesli öter' : ''}` },
  huner: { ad: 'Hüner', ikon: '🤸', oyun: 'Doğru anda dokun', etki: (y) => (y ? `Köyde dokununca ${y >= 5 ? 'dönerek uçar' : y >= 3 ? 'takla atar' : 'reverans yapar'}` : 'Köyde dokununca numara yapar') },
  konusma: { ad: 'Konuşma', ikon: '🗣️', oyun: 'Söylediği kelimeyi bul', sadece: ['muhabbet', 'sultan', 'cennet'], etki: (y) => (y ? `Köyde ara sıra ${y} farklı söz söyler` : 'Köyde konuşur') },
  getir: { ad: 'Getir', ikon: '🎁', oyun: 'Tohumun saklandığı yaprağı bul', etki: (y) => `Her gün %${y * 20} ihtimalle hediye getirir${y >= 5 ? ' (bazen 💎)' : ''}` },
};
export const MAKS_YILDIZ = 5;
export const YILDIZ_ESIK = [0, 3, 8, 15, 24, 35]; // yıldız için gereken toplam ders puanı (her ders 0-3 puan)
export const GUNLUK_DERS = 3;
export const EK_DERS_ELMAS = 1;

export const yetenekVarMi = (k, tip) => !YETENEKLER[tip].sadece || YETENEKLER[tip].sadece.includes(k.tur);
export const yildiz = (k, tip) => { const p = (k.yetenek || {})[tip] || 0; let n = 0; while (n < MAKS_YILDIZ && p >= YILDIZ_ESIK[n + 1]) n++; return n; };
export const toplamYildiz = (k) => Object.keys(YETENEKLER).reduce((t, y) => t + yildiz(k, y), 0);
// Arayüzde dolu yıldızlar altın, boşlar soluk; bildirimlerde düz yazı (ör. 2/5 ★)
export const yildizYazi = (n) => `<span class="yildizlar">${'★'.repeat(n)}<span class="bosYildiz">${'★'.repeat(MAKS_YILDIZ - n)}</span></span>`;
const yildizDuz = (n) => `${n}/${MAKS_YILDIZ} ★`;
export const kalanDers = (k) => (k.ders && k.ders.gun === bugun() ? Math.max(0, GUNLUK_DERS - k.ders.sayi) : GUNLUK_DERS);

// Ders başlatılabilir mi: günlük hak varsa ücretsiz, yoksa elmasla. Dönen: true ise ders başlar
export function dersBasla(k) {
  if (!k.ders || k.ders.gun !== bugun()) k.ders = { gun: bugun(), sayi: 0 };
  if (k.ders.sayi < GUNLUK_DERS) { k.ders.sayi++; return true; }
  if (!harca(0, EK_DERS_ELMAS)) return false;
  return true;
}
// Mini oyun bitti: puan (0-3) yeteneğe eklenir. Şarkıcı kuşun ötüş dersi iki kat sayılır
export function dersBitti(k, tip, puan) {
  k.yetenek = k.yetenek || {};
  const once = yildiz(k, tip), kazanc = puan * (tip === 'otus' && k.huy === 'sarkici' ? 2 : 1);
  k.yetenek[tip] = (k.yetenek[tip] || 0) + kazanc;
  if (puan > 0) bagEkle(k, 'egitim');
  xpEkle(2 + puan);
  const sonra = yildiz(k, tip), Y = YETENEKLER[tip];
  if (sonra > once) bildir(`🎓 ${k.ad}: ${Y.ikon} ${Y.ad} ${yildizDuz(sonra)}! ${Y.etki(sonra)}`);
  else bildir(puan ? `🎓 ${k.ad} ${Y.ad.toLocaleLowerCase('tr')} dersinden +${kazanc} puan aldı` : `🎓 ${k.ad} bu derste pek odaklanamadı, yarın yine dene`);
  degisti();
  return { kazanc, yildizAtladi: sonra > once };
}

// Ötüş: Kuş Evi geliri her yıldızda +%5
export const otusGelir = (k) => 1 + 0.05 * yildiz(k, 'otus');

// Konuşma: yıldız arttıkça söylediği sözler çoğalır
export const sozler = (k) => ['Cik cik!', 'Merhaba!', `${k.ad}!`, 'Kuşçu geldi!', 'Seni seviyorum!'].slice(0, yildiz(k, 'konusma'));

// Getir: günde bir kez, yıldız × %20 ihtimalle hediye (mekanik.js tik çağırır)
export function getirTik(k) {
  const y = yildiz(k, 'getir');
  if (!y || k.getirGun === bugun()) return false;
  k.getirGun = bugun();
  if (Math.random() >= y * 0.2) return false;
  const r = Math.random();
  if (y >= 5 && r < 0.12) { D.elmas += 1; bildir(`🎁 ${k.ad} sana parlak bir 💎 getirdi!`); }
  else if (r < 0.55 && D.binalar.tarla) { const n = 4 + y * 2; D.tohumlar.dari += n; bildir(`🎁 ${k.ad} ağzında ${n} 🌾 darıyla geldi!`); }
  else { const n = 10 + y * 8; D.altin += n; bildir(`🎁 ${k.ad} sana ${n} 🪙 getirdi!`); }
  return true;
}
