// Kuş türleri: bölge bölge renk paleti ve şekil ayarları.
// Renk bölgeleri: govde (sırt), karin, bas, kanat, kanatUc, kuyruk, gaga, bacak
// İsteğe bağlı: tepe, ense, maske, yanak, gerdan, kanatBant, sokum, ibik, gozHalka
export const TURLER = {
  ev_sercesi: {
    ad: 'Ev Serçesi', nadirlik: 'Yaygın', boyut: 0.95,
    renk: { govde: '#a37a52', karin: '#ebe2d0', bas: '#9a8c80', tepe: '#8c847d', ense: '#8f5c37', yanak: '#e6dfd2',
      gerdan: '#2f2826', kanat: '#8a6140', kanatUc: '#4e3422', kanatBant: '#f4ecdc', kuyruk: '#6e4c33', gaga: '#3b3433', bacak: '#d2a48c' },
    sekil: { kuyruk: 'yelpaze', kuyrukBoy: 24, gaga: 'koni', yanakBoy: 7 },
    yumurta: { renk: '#f1e8d6', benek: '#8a6a4a' },
  },
  saka: {
    ad: 'Saka', nadirlik: 'Yaygın', boyut: 0.92,
    renk: { govde: '#c9a072', karin: '#f4ece2', bas: '#f6f2ea', tepe: '#262222', ense: '#262222', maske: '#d8352a',
      kanat: '#262222', kanatUc: '#2e2a2a', kanatBant: '#f7c81e', kuyruk: '#262222', gaga: '#f1dccb', bacak: '#d8b8a8' },
    sekil: { kuyruk: 'yelpaze', kuyrukBoy: 22, gaga: 'koni', yanakBoy: 0 },
    yumurta: { renk: '#dbeef5', benek: '#b0503a' },
  },
  kanarya: {
    ad: 'Kanarya', nadirlik: 'Yaygın', boyut: 0.95,
    renk: { govde: '#ffd23a', karin: '#ffe98c', bas: '#ffd93f', kanat: '#f4c21e', kanatUc: '#e2a400', kuyruk: '#f0bc18',
      gaga: '#f7b98a', bacak: '#f2b9a0' },
    sekil: { kuyruk: 'yelpaze', kuyrukBoy: 24, gaga: 'koni', yanakBoy: 0 },
    yumurta: { renk: '#fbf0c2', benek: null },
  },
  muhabbet: {
    ad: 'Muhabbet Kuşu', nadirlik: 'Nadir', boyut: 1.0,
    renk: { govde: '#78c240', karin: '#8bd64a', bas: '#ffe64d', ense: '#78c240', yanak: '#4a63c8', kanat: '#7cc444',
      kanatUc: '#2f5a24', kuyruk: '#2c58a0', gaga: '#e9c98e', bacak: '#9fa6b8' },
    sekil: { kuyruk: 'uzun', kuyrukBoy: 46, gaga: 'kanca', yanakBoy: 3.2, desen: 'dalgali', gerdanBenek: true },
    yumurta: { renk: '#fbfbf8', benek: null },
  },
  sultan: {
    ad: 'Sultan Papağanı', nadirlik: 'Nadir', boyut: 1.12,
    renk: { govde: '#9c9a98', karin: '#aaa8a6', bas: '#f6df5a', yanak: '#ff8a3d', ibik: '#f1d64c', kanat: '#8e8c8a',
      kanatUc: '#5e5c5a', kanatBant: '#f5f3ee', kuyruk: '#7d7b79', gaga: '#a3958d', bacak: '#b8a6a0' },
    sekil: { kuyruk: 'uzun', kuyrukBoy: 54, gaga: 'kanca', yanakBoy: 6.5, ibik: 'sultan' },
    yumurta: { renk: '#f8f0e0', benek: null },
  },
  cennet: {
    ad: 'Cennet Papağanı', nadirlik: 'Epik', boyut: 1.0,
    renk: { govde: '#5fbf4a', karin: '#7cd65c', bas: '#ff8a6b', maske: '#ff5d4a', gozHalka: '#ffffff', kanat: '#52b03e',
      kanatUc: '#2f7d2a', sokum: '#3d86e0', kuyruk: '#3a9a5a', gaga: '#ffe9c2', bacak: '#c8b0a8' },
    sekil: { kuyruk: 'yelpaze', kuyrukBoy: 20, gaga: 'kanca', yanakBoy: 0 },
    yumurta: { renk: '#ffd9e4', benek: null },
  },
  ketzal: {
    ad: 'Ketzal', nadirlik: 'Efsanevi', boyut: 1.2,
    renk: { govde: '#1fa35a', karin: '#d9233a', bas: '#21b563', ibik: '#29c770', kanat: '#178c4c', kanatUc: '#0d5c32',
      kuyruk: '#1fae5c', gaga: '#f2c94c', bacak: '#7d6a5a' },
    sekil: { kuyruk: 'serit', kuyrukBoy: 95, gaga: 'koni', yanakBoy: 0, ibik: 'tuylu' },
    yumurta: { renk: '#1f9e5a', benek: '#f5d36a' },
  },
};

export const MUTASYONLAR = { normal: 'Normal', lutino: 'Lutino', albino: 'Albino', mavi: 'Mavi seri', alaca: 'Alaca' };

// Tüy değeri (CS:GO'daki float gibi): düşük olan daha iyi
export function kondisyonAdi(tuy) {
  if (tuy < 0.07) return 'Kusursuz';
  if (tuy < 0.15) return 'Parlak';
  if (tuy < 0.38) return 'İyi';
  if (tuy < 0.45) return 'Sıradan';
  return 'Mat';
}

// Desen tohumundan her seferinde aynı sırayı veren rastgele sayı üreteci
export function tohumluRastgele(tohum) {
  let a = tohum * 2654435761 >>> 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// --- Renk yardımcıları (HSL) ---
const sinirla = (v) => Math.max(0, Math.min(1, v));

function hexHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  return rgbHsl(n >> 16 & 255, n >> 8 & 255, n & 255);
}

function rgbHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function hslSayi([h, s, l]) {
  h = ((h % 360) + 360) % 360; s = sinirla(s); l = sinirla(l);
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}

export function koyulastir(sayi, oran) {
  const r = (sayi >> 16 & 255) * oran, g = (sayi >> 8 & 255) * oran, b = (sayi & 255) * oran;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

// Gerçek mutasyonların yaklaşık renk etkisi
const MUTASYON_RENK = {
  // Lutino: siyah/yeşil/mavi pigment gider, kuş sarıya döner
  lutino([h, s, l]) {
    if (s < 0.15) return l > 0.75 ? [h, s, l] : [50, 0.55, 0.84 + l * 0.08];
    if (h >= 70 && h <= 270) return [52, Math.max(s, 0.85), sinirla(l + 0.1)];
    if (h > 15 && h < 45 && l < 0.6) return [48, 0.6, 0.8];
    return [h, s, l];
  },
  // Albino: neredeyse her şey beyaz
  albino([h, s, l]) { return [45, 0.16, 0.72 + l * 0.27]; },
  // Mavi seri: sarı pigment gider; yeşil → mavi, sarı → beyaz
  mavi([h, s, l]) {
    if (s < 0.15) return [h, s, l];
    if (h >= 35 && h < 75) return [205, 0.12, 0.74 + l * 0.24];
    if (h >= 75 && h <= 175) return [200 + (h - 110) * 0.4, s, l];
    if (h < 35 || h > 330) return l < 0.6 ? [215, 0.12, l] : [210, 0.08, l];
    return [h, s, l];
  },
};

function kondisyonRenk([h, s, l], tuy) {
  if (tuy < 0.07) return [h, s * 1.12, l * 1.03];
  if (tuy < 0.15) return [h, s * 1.06, l];
  if (tuy < 0.38) return [h, s, l];
  if (tuy < 0.45) return [h, s * 0.85, l * 0.97];
  const k = (tuy - 0.45) / 0.55;
  return [h, s * (0.75 - 0.45 * k), l * (0.95 - 0.1 * k) + 0.05 * k];
}

// Çizim görsellerindeki tek bir pikselin rengini gene göre dönüştürür (r, g, b: 0-255).
// Koyu dış çizgi pikselleri olduğu gibi kalır. korunur: gaga ve bacak gibi pigmentsiz parçalar.
export function pikselDonustur(r, g, b, mutasyon, tuy, korunur) {
  let hsl = rgbHsl(r, g, b);
  if (hsl[2] < 0.3 && hsl[1] < 0.6) return [r, g, b];
  if (korunur) {
    if (mutasyon !== 'lutino' && mutasyon !== 'albino') return [r, g, b];
    hsl = [8, 0.65, Math.max(hsl[2], 0.78)];
  } else {
    const donustur = MUTASYON_RENK[mutasyon];
    if (donustur) hsl = donustur(hsl);
    hsl = kondisyonRenk(hsl, tuy);
  }
  const n = hslSayi(hsl);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}

// Gen bilgisinden (tür, mutasyon, tüy değeri) çizimde kullanılacak sayısal paleti çıkarır
export function paletOlustur(gen) {
  const tur = TURLER[gen.tur];
  const donustur = MUTASYON_RENK[gen.mutasyon];
  const palet = {};
  for (const [bolge, hex] of Object.entries(tur.renk)) {
    let hsl = hexHsl(hex);
    const korunur = bolge === 'gaga' || bolge === 'bacak' || bolge === 'gozHalka';
    if (donustur && !korunur) hsl = donustur(hsl);
    if (!korunur) hsl = kondisyonRenk(hsl, gen.tuy);
    palet[bolge] = hslSayi(hsl);
  }
  // Lutino ve albino kuşlarda göz kırmızı, gaga ve bacaklar pembemsi olur
  const kirmiziGoz = gen.mutasyon === 'lutino' || gen.mutasyon === 'albino';
  palet.goz = kirmiziGoz ? 0xb8283a : 0x231a22;
  if (kirmiziGoz) { palet.gaga = 0xf5cbb8; palet.bacak = 0xf3c2b4; }
  return palet;
}
