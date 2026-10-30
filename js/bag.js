// Kuşla bağ (0-10 kalp) ve günlük bakım rutini (docs/kus-bagi-tasarim.md).
// k.bag: biriken bağ puanı (düşmez). k.bakim: { gun, ikram, banyo, sev, kazanc: { kaynak: o gün kazanılan } }
// k.seri: art arda "bakımlı gün" sayısı, k.sonBakimli: son bakımlı günün tarihi
import { D, bugun, bildir, saat } from './durum.js';

// Her kalp için gereken toplam bağ puanı (kalp ilerledikçe biraz daha zor)
export const BAG_ESIK = [0, 20, 50, 90, 140, 200, 270, 350, 440, 540, 650];
export const MAKS_KALP = 10;
export const kalp = (k) => { let n = 0; while (n < MAKS_KALP && (k.bag || 0) >= BAG_ESIK[n + 1]) n++; return n; };
// Bir sonraki kalbe ilerleme (0-1)
export const kalpIlerleme = (k) => { const n = kalp(k); return n >= MAKS_KALP ? 1 : ((k.bag || 0) - BAG_ESIK[n]) / (BAG_ESIK[n + 1] - BAG_ESIK[n]); };

// Kaynak başına puan ve günlük üst sınır: bağ bir günde kasılamaz, kuşla her gün biraz vakit geçirmek gerekir
const KAYNAK = { sev: { puan: 6, gunluk: 18 }, ikram: { puan: 5, gunluk: 20 }, banyo: { puan: 12, gunluk: 12 }, bakim: { puan: 15, gunluk: 15 }, egitim: { puan: 8, gunluk: 24 } };

// Kalp ödülleri (kalp sayısına ulaşınca bir kez bildirilir)
export const KALP_ODULLERI = {
  2: 'Huyu ortaya çıktı',
  3: 'Köyde ona dokununca sana sevinçle zıplar',
  5: "Kuş Evi'ne kazandırdığı altın +%25",
  7: 'Yavrularının tüyü daha güzel olur',
  10: 'Can Dostu oldunuz! 🏅',
};
// Kalp 5: gelir +%25 (utangaç kuş Can Dostu olunca +%50). Şarkıcı kuş ötüşüyle ziyaretçi çeker: +%10
export const gelirCarpani = (k) => (kalp(k) >= 5 ? (k.huy === 'utangac' && kalp(k) >= MAKS_KALP ? 1.5 : 1.25) : 1) * (k.huy === 'sarkici' ? 1.1 : 1);
export const canDostu = (k) => kalp(k) >= MAKS_KALP;

function bakimGunu(k) {
  const g = bugun();
  if (!k.bakim || k.bakim.gun !== g) k.bakim = { gun: g, ikram: 0, banyo: 0, sev: 0, kazanc: {} };
  return k.bakim;
}
export const bakimDurumu = (k) => bakimGunu(k);
export const bugunYikandiMi = (k) => !!bakimGunu(k).banyo;

// Bağ puanı ekler (günlük sınırla); kalp atlarsa bildirir. Dönen: eklenen puan
export function bagEkle(k, kaynak, carpan = 1) {
  const K = KAYNAK[kaynak], B = bakimGunu(k);
  const once = kalp(k), kalan = K.gunluk - (B.kazanc[kaynak] || 0);
  if (k.huy === 'utangac') carpan *= 0.75; // utangaç kuşun bağı yavaş dolar
  if (k.huy === 'uykucu' && (saat() >= 20 || saat() < 6)) carpan *= 1.5; // uykucu kuş gece daha çok bağlanır
  const puan = Math.min(kalan, Math.round(K.puan * carpan));
  if (puan <= 0) return 0;
  B.kazanc[kaynak] = (B.kazanc[kaynak] || 0) + puan;
  k.bag = (k.bag || 0) + puan;
  const sonra = kalp(k);
  if (sonra > once) bildir(`💗 ${k.ad} ile bağınız ${sonra} kalp oldu!${KALP_ODULLERI[sonra] ? ' ' + KALP_ODULLERI[sonra] : ''}`);
  if (once < HUY_KALP && sonra >= HUY_KALP && HUYLAR[k.huy]) bildir(`🎭 ${k.ad} aslında ${HUYLAR[k.huy].ikon} ${HUYLAR[k.huy].ad.toLocaleLowerCase('tr')} bir kuşmuş! ${HUYLAR[k.huy].etki}`);
  return puan;
}

// Günlük bakım kutusu işaretlenir (ikram, banyo, sev). Üçü tamamlanınca "bakımlı gün": ek bağ ve seri ödülleri
const dunGun = () => { const d = new Date(Date.now() - 864e5); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function bakimYap(k, kutu) {
  const B = bakimGunu(k);
  if (B[kutu]) return;
  B[kutu] = 1;
  if (!(B.ikram && B.banyo && B.sev)) return;
  k.seri = k.sonBakimli === dunGun() ? (k.seri || 0) + 1 : 1;
  k.sonBakimli = B.gun;
  bagEkle(k, 'bakim');
  let odul = '';
  if (k.seri % 7 === 0) { D.elmas += 1; odul = ' +1 💎'; }
  else if (k.seri % 3 === 0) { k.tuy = Math.max(0, +(k.tuy - 0.01).toFixed(3)); odul = ' Tüyü biraz parladı ✨'; }
  bildir(`✅ ${k.ad} bugün tam bakım gördü! 🔥 ${k.seri} gün${odul}`);
}
// Seri bugün ya da dün devam ediyorsa gösterilir, daha eskiyse kopmuştur
export const seri = (k) => (k.sonBakimli === bugun() || k.sonBakimli === dunGun() ? k.seri || 0 : 0);

// --- Huylar: her kuşun bir huyu var; 2 kalpte ortaya çıkar, yavruya anne ya da babadan geçebilir ---
export const HUY_KALP = 2;
export const HUYLAR = {
  sarkici: { ad: 'Şarkıcı', ikon: '🎵', etki: "Kuş Evi'ne +%10 altın kazandırır, sık öter" },
  suslu: { ad: 'Süslü', ikon: '🪞', etki: 'Banyodan %50 daha parlak çıkar' },
  merakli: { ad: 'Meraklı', ikon: '🔍', etki: 'Köyde gezerken ara sıra tohum ya da altın bulur' },
  uykucu: { ad: 'Uykucu', ikon: '😴', etki: 'Geceleri bağınız daha hızlı güçlenir' },
  obur: { ad: 'Obur', ikon: '🍽️', etki: 'İkramlar iki kat etki eder ama çabuk acıkır' },
  utangac: { ad: 'Utangaç', ikon: '🙈', etki: 'Bağı yavaş dolar; Can Dostu olunca değeri ve geliri çok artar' },
  neseli: { ad: 'Neşeli', ikon: '🎉', etki: 'Köydeki diğer kuşlar daha geç üzülür' },
};
export const huyAcik = (k) => kalp(k) >= HUY_KALP;
const rastgele = (d) => d[Math.floor(Math.random() * d.length)];
// Yavru %60 ihtimalle anne ya da babasının huyunu alır
export const huySec = (ebeveynHuy) => (ebeveynHuy && ebeveynHuy.some(Boolean) && Math.random() < 0.6 ? rastgele(ebeveynHuy.filter(Boolean)) : rastgele(Object.keys(HUYLAR)));

// Her kuşun kendine özel, gizli bir sevdiği ikram var (çoğunlukla türünün sevdiği). Denerken keşfedilir.
export const FAVORI_SECENEK = ['dari', 'ay', 'meyve', 'bal'];
export const favoriSec = (turFavori) => (Math.random() < 0.4 ? turFavori : rastgele(FAVORI_SECENEK));

// Eski kayıtlardaki kuşlara huy verilir (sevdiği ikram türününki olarak kalır)
for (const k of [...D.kuslar, ...(D.kres || []).map((y) => y.kus)]) if (!k.huy) k.huy = huySec();
