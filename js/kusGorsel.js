// Çizim görseli olan türlerin parça yerleşimi. Birimler kuşun yerel birimidir:
// gövde merkezine göre (sağa bakan kuş), en: parçanın hedef genişliği, orj: döndürme noktası (0-1).
// Ölçüler raw/<tur>_tasarim görselinden alındı.
import { pikselDonustur, TURLER } from './turler.js';
import { YERLESIM } from './kusYerlesim.js';

// Oyuncunun onayladığı çizimler. Listede olmayan türler köyde kod çizimiyle görünür, atölyede önizlenir.
export const ONAYLI = ['kanarya', 'ev_sercesi', 'saka', 'muhabbet', 'sultan', 'cennet', 'ketzal'];

// Gaga: sadece tam (kapalı) gaga görseli kullanılır; alt çene ve ağız içi kodla çizilir (kus.js cenesiCiz).

export const PARCALAR = ['govde', 'bas', 'gagaUst', 'gagaAlt', 'kanat', 'acikKanat', 'kuyruk', 'bacak'];

// Otomatik yerleşimin üstüne elle yapılan düzeltmeler (Atölye'de 'Tasarımla karşılaştır' ile ayarlanır)
const ELLE = {};

const birlestir = (a, b) => {
  if (!b) return a;
  const s = { ...a };
  for (const [k, v] of Object.entries(b)) s[k] = v && typeof v === 'object' && !Array.isArray(v) ? birlestir(a[k] || {}, v) : v;
  return s;
};

export const GORSEL_TURLER = {
  ...Object.fromEntries(Object.entries(YERLESIM).map(([tur, y]) => [tur, birlestir(y, ELLE[tur])])),
  kanarya: { // elle ayarlandı
    tasarim: { k: 0.14, x: 538, y: 656 },
    govde: { x: 0, y: -2, en: 67 },
    karin: { x: 14, y: 4, rx: 12.5, ry: 15 },         // gövde görselinde karın rengi yok, kodla eklenir
    boyun: [8, -24],                                  // başın döndüğü nokta
    bas: { x: -0.7, y: -20, en: 64 },                 // boyna göre
    goz: [10.8, -20.8],                               // boyna göre
    gaga: [24.5, -13.5],                              // boyna göre
    gagaUst: { en: 12.5, orj: [0.06, 0.55] },
    gagaAlt: { x: 0.5, y: 0.5, en: 7.5, orj: [0.06, 0.25] }, // kapalıyken üst gaganın arkasında tamamen gizli kalır
    kanat: { x: 5.5, y: -13, en: 50, orj: [0.86, 0.3] },
    acikKanat: { en: 44, orj: [0.8, 0.85], aci: -2.0 }, // yukarıda geriye, aşağıda yere doğru bakar
    kanatArka: { x: 10, y: -17 },
    kuyruk: { x: -27, y: 9, en: 28, orj: [0.93, 0.28] },
    bacaklar: [[-5.3, 25], [7.3, 25]],
    bacak: { boy: 10.5, orj: [0.42, 0.03] },
  },
};

export function gorselleriYukle(sahne) {
  for (const tur of Object.keys(GORSEL_TURLER)) {
    const parcalar = [...PARCALAR, ...(GORSEL_TURLER[tur].ibik ? ['ibik'] : [])];
    // Koni gagalar ağız çizgisinden bölünmüş halde (tools/gaga_bol.py); papağanların kanca gagası tek parça
    if (TURLER[tur].sekil.gaga !== 'kanca') {
      parcalar.push('gagaUstBol', 'gagaAltBol');
      sahne.load.json(`gagaCizgi_${tur}`, `assets/kuslar/${tur}/gaga.json`);
    }
    for (const p of parcalar) sahne.load.image(`kus_${tur}_${p}`, `assets/kuslar/${tur}/${p}.png`);
  }
}

// Mutasyon ve tüy değerine göre boyanmış doku anahtarı (gerekirse bir kez üretilir)
export function boyaliDoku(sahne, tur, parca, gen) {
  const kaynak = `kus_${tur}_${parca}`;
  const normal = gen.mutasyon === 'normal' && gen.tuy >= 0.15 && gen.tuy < 0.38;
  if (normal || !sahne.textures.exists(kaynak)) return kaynak;
  const anahtar = `${kaynak}__${gen.mutasyon}_${Math.round(gen.tuy * 40)}`;
  if (sahne.textures.exists(anahtar)) return anahtar;
  const resim = sahne.textures.get(kaynak).getSourceImage();
  const tuval = sahne.textures.createCanvas(anahtar, resim.width, resim.height);
  const ctx = tuval.getContext();
  ctx.drawImage(resim, 0, 0);
  const veri = ctx.getImageData(0, 0, resim.width, resim.height), d = veri.data;
  const korunur = parca.startsWith('gaga') || parca === 'bacak';
  const onbellek = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    let yeni = onbellek.get(k);
    if (!yeni) { yeni = pikselDonustur(d[i], d[i + 1], d[i + 2], gen.mutasyon, gen.tuy, korunur); onbellek.set(k, yeni); }
    d[i] = yeni[0]; d[i + 1] = yeni[1]; d[i + 2] = yeni[2];
  }
  ctx.putImageData(veri, 0, 0);
  tuval.refresh();
  // Kaynak 2'nin katı tuvale yerleşmişse (pot.js potBellek) boyalı kopyanın çerçevesi de asıl boyuta kırpılır
  const kf = sahne.textures.get(kaynak).get();
  if (kf.width !== resim.width || kf.height !== resim.height) tuval.get().setSize(kf.width, kf.height, 0, 0);
  return anahtar;
}
