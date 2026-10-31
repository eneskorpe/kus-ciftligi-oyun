// Kişisel yuva ve başarı süsleri (docs/kus-bagi-tasarim.md 6. bölüm): süsler parayla alınmaz, kuşa baktıkça
// o kuşun başarısı olarak açılır ve Kuş Evi'nde tüneğinin çevresinde görünür. Kuş satılınca süsleri de onunla gider.
// k.suslar: açılan süslerin listesi. Sayaçlar: k.banyoSay, k.yavruSay, k.hediyeSay
import { D, bildir, simdi } from './durum.js';
import { kalp, seri } from './bag.js';
import { yildiz } from './egitim.js';

const GUN = 864e5;
const koydeGun = (k) => Math.floor((simdi() - (k.dogum || simdi())) / GUN);
// Her süs: açılma şartı ve ilerleme [şu an, hedef]. sadece: yalnız o türe (Epik ve Efsanevi türler)
export const SUSLER = {
  isimlik: { ad: 'İsimlik', ikon: '🏷️', sart: 'Köye geldi', ilerleme: () => [1, 1] },
  yastik: { ad: 'Tüy yastık', ikon: '🪶', sart: '1 kalp bağ', ilerleme: (k) => [kalp(k), 1] },
  salincak: { ad: 'Salıncak tünek', ikon: '🎠', sart: '3 kalp bağ', ilerleme: (k) => [kalp(k), 3] },
  havuz: { ad: 'Su kabı', ikon: '⛲', sart: '10 kez banyo', ilerleme: (k) => [k.banyoSay || 0, 10] },
  saksi: { ad: 'Çiçek saksısı', ikon: '🪴', sart: '7 gün art arda tam bakım', ilerleme: (k) => [seri(k), 7] },
  besik: { ad: 'Yumurta kabuğu beşik', ikon: '🥚', sart: 'İlk yavrusu', ilerleme: (k) => [k.yavruSay || 0, 1] },
  can: { ad: 'Çan', ikon: '🔔', sart: 'Ötüş 3 yıldız', ilerleme: (k) => [yildiz(k, 'otus'), 3] },
  merdiven: { ad: 'Merdiven ve halka', ikon: '🪜', sart: 'Hüner 3 yıldız', ilerleme: (k) => [yildiz(k, 'huner'), 3] },
  sandik: { ad: 'Hazine sandıkçığı', ikon: '🧰', sart: '10 hediye getirdi', ilerleme: (k) => [k.hediyeSay || 0, 10] },
  fener: { ad: 'Fener ve flama', ikon: '🏮', sart: '30 gündür köyde', ilerleme: (k) => [koydeGun(k), 30] },
  ayna: { ad: 'Kristal ayna', ikon: '🪞', sart: '"Kusursuz" tüy', ilerleme: (k) => [k.tuy < 0.07 ? 1 : 0, 1] },
  altinTunek: { ad: 'Altın tünek', ikon: '🏅', sart: '10 kalp: Can Dostu', ilerleme: (k) => [kalp(k), 10] },
  ozel_cennet: { ad: 'Tropik çiçek kemeri', ikon: '🌺', sart: '5 kalp bağ', sadece: 'cennet', ilerleme: (k) => [kalp(k), 5] },
  ozel_ketzal: { ad: 'Yeşim tapınak kapısı', ikon: '🗿', sart: '5 kalp bağ', sadece: 'ketzal', ilerleme: (k) => [kalp(k), 5] },
};
// Görseli hazır olan süsler (assets/yuva/). Görseli gelmeyenler açılır ama Kuş Evi'nde henüz görünmez
export const YUVA_GORSELLERI = ['isimlik', 'yastik', 'salincak', 'havuz', 'saksi', 'besik', 'can', 'merdiven', 'sandik', 'fener', 'ayna', 'altinTunek', 'ozel_cennet', 'ozel_ketzal'];

export const susVarMi = (k, id) => !SUSLER[id].sadece || SUSLER[id].sadece === k.tur;
export const kusSusleri = (k) => Object.keys(SUSLER).filter((id) => susVarMi(k, id));
export const acikSusler = (k) => (k.suslar || []).filter((id) => SUSLER[id] && susVarMi(k, id));
// Konfor: her süs mutluluğun azalmasını %4 yavaşlatır (en çok %40)
export const konforCarpani = (k) => Math.max(0.6, 1 - 0.04 * acikSusler(k).length);

// Şartı tutan süsleri açar. sessiz: eski kayıtlarda ilk açılışta bildirim yağmuru olmasın
export function yuvaKontrol(k, sessiz = false) {
  k.suslar = k.suslar || [];
  let yeni = false;
  for (const id of kusSusleri(k)) {
    if (k.suslar.includes(id)) continue;
    const [n, hedef] = SUSLER[id].ilerleme(k);
    if (n < hedef) continue;
    k.suslar.push(id); yeni = true;
    if (!sessiz) bildir(`🏆 ${k.ad} yuvası için yeni süs kazandı: ${SUSLER[id].ikon} ${SUSLER[id].ad}!`);
  }
  return yeni;
}

for (const k of D.kuslar) yuvaKontrol(k, true);
