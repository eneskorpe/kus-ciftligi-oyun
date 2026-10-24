// İzometrik (2:1) harita yardımcıları. (i, j) karo koordinatı, (x, y) dünya pikseli.
export const KARO_G = 128, KARO_Y = 64;
export const HARITA = 18; // 18 x 18 karo
export const KENAR = 1000; // haritanın çevresindeki boşluk
export const DUNYA_G = HARITA * KARO_G + KENAR * 2;
export const DUNYA_Y = HARITA * KARO_Y + KENAR * 2 + 120;
const X0 = DUNYA_G / 2, Y0 = KENAR + 120;

// Karonun üst köşesinin dünya konumu (kesirli değer de alır)
export function izoEkran(i, j) { return { x: X0 + (i - j) * KARO_G / 2, y: Y0 + (i + j) * KARO_Y / 2 }; }

export function ekranIzo(x, y) {
  const a = (x - X0) / (KARO_G / 2), b = (y - Y0) / (KARO_Y / 2);
  return { i: (a + b) / 2, j: (b - a) / 2 };
}

// w x d karoluk alanın dört köşesi: ust, sag, alt, sol
export function karoKoseleri(i, j, w = 1, d = 1) {
  return { ust: izoEkran(i, j), sag: izoEkran(i + w, j), alt: izoEkran(i + w, j + d), sol: izoEkran(i, j + d) };
}

export const lerpN = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const yukari = (n, h) => ({ x: n.x, y: n.y - h });
