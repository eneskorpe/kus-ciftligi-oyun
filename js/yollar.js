// Otomatik taş yollar: köyün ortasındaki meydan ve güneye inen giriş yolu sabittir; her binanın kapısının önünden
// meydana (ya da önceden döşenmiş bir yola) en kısa yol kendiliğinden döşenir. Bina taşınınca yollar yeniden hesaplanır.
// Yollar ağaç, kaya, fener, köy objeleri, gölet ve diğer binaların üstünden geçmez; mevcut yollara katılmayı sever.
import { HARITA } from './izo.js';

const k = (i, j) => i + ',' + j;

// Hiçbir zaman değişmeyen yollar: meydan (yemliğin çevresi) ve köyün girişine inen yol
export function sabitYollar() {
  const s = new Set();
  for (let i = 7; i <= 10; i++) for (let j = 11; j <= 13; j++) s.add(k(i, j));
  for (let j = 14; j < HARITA; j++) s.add(k(8, j));
  return s;
}

// Yolun ve binaların geçemeyeceği sabit karolar: ağaç, kaya, fener, köy objeleri (çitler iki karo) ve gölet
export function sabitEngeller(susler, objeler) {
  const e = new Set();
  for (const [tip, i, j] of susler) if (tip !== 'cicek') e.add(k(i, j));
  for (const [ad, i, j] of objeler) {
    e.add(k(Math.floor(i), Math.floor(j)));
    if (ad === 'cit_asagi') e.add(k(Math.floor(i) + 1, Math.floor(j)));
    if (ad === 'cit_yukari') e.add(k(Math.floor(i), Math.floor(j) + 1));
  }
  for (let i = 11; i <= 13; i++) for (let j = 10; j <= 12; j++) e.add(k(i, j)); // gölet
  e.add(k(14, 11));
  return e;
}

// yerler: [{ tip, i, j, w, d }], engel: Set('i,j') (ağaç, obje, gölet)
export function otomatikYollar(yerler, engel) {
  const yol = sabitYollar();
  const binaKarosu = new Set();
  for (const b of yerler) for (let i = b.i; i < b.i + b.w; i++) for (let j = b.j; j < b.j + b.d; j++) binaKarosu.add(k(i, j));
  const gecilmez = (i, j) => i < 0 || j < 0 || i >= HARITA || j >= HARITA || binaKarosu.has(k(i, j)) || engel.has(k(i, j));
  // Meydana yakın binalar önce: uzaktakiler onların yollarına katılabilsin
  const sirali = [...yerler].sort((a, b) => Math.hypot(a.i - 8.5, a.j - 12) - Math.hypot(b.i - 8.5, b.j - 12));
  for (const b of sirali) {
    // Kapı önü: önce sol-ön yüzün ortası, olmazsa sağ-ön yüz ve köşeler
    const adaylar = [[b.i + Math.floor(b.w / 2), b.j + b.d], [b.i + b.w, b.j + Math.floor(b.d / 2)], [b.i + b.w - 1, b.j + b.d], [b.i + b.w, b.j + b.d - 1]];
    const kapi = adaylar.find(([i, j]) => !gecilmez(i, j) || yol.has(k(i, j)));
    if (!kapi) continue;
    const yolu = ara(kapi, yol, gecilmez);
    if (yolu) for (const t of yolu) yol.add(t);
  }
  return yol;
}

// Kapıdan mevcut yollara en ucuz yol (4 yönlü; mevcut yol üstü çok ucuz, dönüş az pahalı: düz ve birleşen yollar)
function ara([bi, bj], yol, gecilmez) {
  if (yol.has(k(bi, bj))) return [k(bi, bj)];
  const N = HARITA, idx = (i, j, y) => (i * N + j) * 4 + y, mesafe = new Float64Array(N * N * 4).fill(Infinity), once = new Int32Array(N * N * 4).fill(-1);
  const YON = [[1, 0], [-1, 0], [0, 1], [0, -1]], acik = [];
  for (let y = 0; y < 4; y++) { mesafe[idx(bi, bj, y)] = 0; acik.push([0, bi, bj, y]); }
  let son = -1;
  while (acik.length) {
    acik.sort((a, b) => a[0] - b[0]);
    const [d, i, j, y] = acik.shift();
    if (d > mesafe[idx(i, j, y)]) continue;
    if (yol.has(k(i, j))) { son = idx(i, j, y); break; }
    YON.forEach(([di, dj], ny) => {
      const ni = i + di, nj = j + dj;
      if (gecilmez(ni, nj) && !yol.has(k(ni, nj))) return;
      const nd = d + (yol.has(k(ni, nj)) ? 0.2 : 1) + (ny !== y && d > 0 ? 0.6 : 0);
      if (nd < mesafe[idx(ni, nj, ny)]) { mesafe[idx(ni, nj, ny)] = nd; once[idx(ni, nj, ny)] = idx(i, j, y); acik.push([nd, ni, nj, ny]); }
    });
  }
  if (son < 0) return null;
  const sonuc = [];
  for (let n = son; n !== -1; n = once[n]) { const t = Math.floor(n / 4); sonuc.push(k(Math.floor(t / N), t % N)); }
  return sonuc;
}
