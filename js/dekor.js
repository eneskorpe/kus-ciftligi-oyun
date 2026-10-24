import { sallananEkle } from './canlilik.js';

// Gemini dekorları (çimen, çalı, ...): tools/dekor_kes.py ile kesilip assets/dekor/ altına konur.
// Yeni bir set eklenince adları buraya eklenir.
export const DEKOR_ADLARI = ['cimen_kucuk', 'cimen_orta', 'cimen_uzun', 'cali_kucuk', 'cali_cicekli', 'egrelti', 'yonca', 'saz', 'cali_oval', 'fener',
  'cicek_papatya', 'cicek_sari', 'cicek_mavi', 'gelincik', 'lavanta', 'aycicegi', 'kadife', 'mantar', 'cicek_kasa',
  'tas_kucuk', 'kaya_yosunlu', 'tas_grubu', 'kutuk', 'kutuk_yatik', 'basamak_tas', 'odun_yigini', 'kaya_egrelti', 'tavsan_yuvasi',
  'bank', 'tabela', 'saman', 'fici', 'el_arabasi', 'kus_banyosu', 'sandiklar', 'cit_yukari', 'cit_asagi',
  'agac_cam', 'agac_hus', 'agac_elma', 'agac_cicekli', 'agac_sogut', 'fidan', 'golet', 'tavsan1', 'tavsan2', 'tavsan3',
  'kelebek1', 'kelebek2', 'kelebek3', 'ari1', 'ari2', 'ari3',
  'yaprak1', 'yaprak2', 'yaprak3', 'yaprak4', 'yaprak5', 'yaprak6'];

export const DEKOR_GRUP = {
  tutam: ['cimen_kucuk', 'cimen_kucuk', 'cimen_orta'],
  cali: ['cali_kucuk', 'cali_kucuk', 'cali_oval', 'cali_cicekli', 'egrelti'],
  seyrek: ['cimen_uzun', 'yonca', 'yonca'],
  kaya: ['tas_kucuk', 'tas_kucuk', 'tas_grubu', 'kaya_yosunlu'],
  orman: ['kutuk', 'kutuk_yatik', 'kaya_yosunlu', 'kaya_egrelti', 'tas_grubu'],
  cicek: ['cicek_papatya', 'cicek_sari', 'cicek_mavi', 'gelincik', 'lavanta', 'kadife'],
};

export function dekorlariYukle(sahne) {
  sahne.load.json('dekorMeta', 'assets/dekor/dekor.json');
  for (const ad of DEKOR_ADLARI) sahne.load.image('dekor_' + ad, `assets/dekor/${ad}.png`);
}

// Dekoru tabanı (x, y) noktasına basacak şekilde koyar; genislik dünya pikselidir
// Çitlerin tabanı eğik: ortalarından hizalanır
const OZEL_ORJ = { cit_yukari: [0.5, 0.8], cit_asagi: [0.5, 0.8] };

export function dekorKoy(sahne, ad, x, y, genislik, ters = false) {
  const M = (sahne.cache.json.get('dekorMeta') || {})[ad];
  if (!M || !sahne.textures.exists('dekor_' + ad)) return null;
  const n = sahne.add.image(x, y, 'dekor_' + ad).setOrigin(...(OZEL_ORJ[ad] || [0.5, M.tabanY / M.h])).setScale(genislik / M.w).setFlipX(ters).setDepth(y);
  sallananEkle(sahne, n, ad); // rüzgârda sallanacak mı (canlilik.js)
  return n;
}
