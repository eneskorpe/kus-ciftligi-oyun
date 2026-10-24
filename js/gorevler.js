// Görevler: her gün yenilenen 3 günlük görev + oyuncuyu adım adım ilerleten ana görevler (Kuşçu Nine).
// Oyunda bir şey olunca mekanik.js gorevOlay('tip', miktar) çağırır.
import { TURLER, kondisyonAdi, tohumluRastgele } from './turler.js';
import { D, bugun, degisti, bildir, xpEkle } from './durum.js';

// tip: sayılan olay; hedef: kaç kez; odul: { altin, elmas, xp }
export const GUNLUK_HAVUZ = {
  tuzak3: { ad: 'Tuzak ustası', metin: 'Tuzaktan 3 kuş al', tip: 'tuzakAc', hedef: 3, odul: { altin: 60, xp: 15 } },
  sev5: { ad: 'Sevgi dolu gün', metin: 'Kuşlarını 5 kez sev', tip: 'sev', hedef: 5, odul: { altin: 40, xp: 10 } },
  yumurta1: { ad: 'Yeni hayat', metin: 'Bir yumurta çatlat', tip: 'yumurta', hedef: 1, odul: { elmas: 1, xp: 15 } },
  cift2: { ad: 'Aşk havası', metin: '2 kez çiftleştir', tip: 'ciftlestir', hedef: 2, odul: { altin: 80, xp: 15 } },
  yemlik1: { ad: 'Dolu tabaklar', metin: 'Yemliği doldur', tip: 'yemlikDoldur', hedef: 1, odul: { altin: 30, xp: 8 } },
  gelir200: { ad: 'Kumbara', metin: 'Kuş Evi\'nden 200 altın topla', tip: 'gelirTopla', hedef: 200, odul: { elmas: 1, xp: 15 } },
  sat2: { ad: 'Pazar günü', metin: '2 kuş sat', tip: 'sat', hedef: 2, odul: { altin: 50, xp: 10 } },
  dari2: { ad: 'Darı kokusu', metin: 'Salkım darıyla 2 tuzak kur', tip: 'tuzakKur:dari', hedef: 2, odul: { altin: 70, xp: 12 } },
};

// Ana görevler sırayla açılır. durum: o anki duruma bakan görevler (olay saymaz)
export const ANA = [
  { tip: 'tuzakKur', hedef: 1, odul: { altin: 50, xp: 10 } },
  { tip: 'tuzakAc', hedef: 1, odul: { altin: 50, xp: 10 } },
  { tip: 'sev', hedef: 1, odul: { altin: 30, xp: 5 } },
  { tip: 'yemlikDoldur', hedef: 1, odul: { altin: 40, xp: 10 } },
  { tip: 'ciftlestir', hedef: 1, odul: { altin: 80, xp: 15 } },
  { tip: 'yumurta', hedef: 1, odul: { elmas: 2, xp: 20 } },
  { durum: () => D.binalar.tuzak.sv >= 2, odul: { altin: 150, xp: 25 } },
  { tip: 'tuzakKur:ay', hedef: 1, odul: { altin: 100, xp: 20 } },
  { durum: () => D.kuslar.length >= 8, odul: { elmas: 3, xp: 30 } },
  { durum: () => D.kesifler.includes('cennet'), odul: { elmas: 5, xp: 50 } },
  { durum: () => D.kuslar.some((k) => kondisyonAdi(k.tuy) === 'Kusursuz'), odul: { elmas: 5, xp: 50 } },
  { durum: () => D.kesifler.includes('ketzal'), odul: { elmas: 25, xp: 200 } },
];

// Kuşçu Nine'nin sözleri (Gemini yazdı); yüklenemezse sade metin kullanılır
const YEDEK = ['İlk tuzağını kur', 'Tuzaktan ilk kuşunu al', 'Bir kuşunu sev', 'Yemliği doldur', 'İki kuşu çiftleştir', 'Bir yumurta çatlat',
  'Tuzak Kulübesi Sv. 2', 'Ay çekirdeğiyle tuzak kur', 'Köyde 8 kuşa ulaş', `${TURLER.cennet.ad} keşfet`, 'Kusursuz tüylü bir kuş edin', `${TURLER.ketzal.ad} keşfet`];
export const anaMetin = (no) => (anaMetinler[no] || { baslik: YEDEK[no], soz: '' });
let anaMetinler = [];
fetch('icerik/gorevler.json').then((r) => r.json()).then((j) => { anaMetinler = j.ana || []; }).catch(() => {});

// Gün değiştiyse 3 yeni günlük görev seç (aynı gün her açılışta aynı görevler)
export function gunluguYenile() {
  const G = D.gorevler, gun = bugun();
  if (G.gun === gun) return;
  const rnd = tohumluRastgele([...gun].reduce((h, c) => h * 31 + c.charCodeAt(0) | 0, 7)), havuz = Object.keys(GUNLUK_HAVUZ);
  const secilen = [];
  while (secilen.length < 3) { const id = havuz[Math.floor(rnd() * havuz.length)]; if (!secilen.includes(id)) secilen.push(id); }
  G.gun = gun;
  G.gunluk = secilen.map((id) => ({ id, ilerleme: 0, alindi: false }));
  degisti();
}

// Ana görevin olay sayacı, görev açıldığında sıfırdan başlar
export function gorevOlay(tip, miktar = 1) {
  const G = D.gorevler;
  let tamam = false;
  for (const g of G.gunluk) {
    const t = GUNLUK_HAVUZ[g.id];
    if (!g.alindi && t.tip === tip && g.ilerleme < t.hedef) { g.ilerleme = Math.min(t.hedef, g.ilerleme + miktar); if (g.ilerleme >= t.hedef) tamam = true; }
  }
  const A = ANA[G.anaNo];
  if (A && A.tip === tip) { G.sayac.ana = (G.sayac.ana || 0) + miktar; if (G.sayac.ana >= A.hedef) tamam = true; }
  if (tamam) bildir('📜 Bir görev tamamlandı! Ödülünü al');
}

export const anaIlerleme = () => {
  const A = ANA[D.gorevler.anaNo];
  if (!A) return null;
  return A.durum ? { ilerleme: +A.durum(), hedef: 1 } : { ilerleme: Math.min(A.hedef, D.gorevler.sayac.ana || 0), hedef: A.hedef };
};

function odulVer(o) {
  D.altin += o.altin || 0; D.elmas += o.elmas || 0;
  if (o.xp) xpEkle(o.xp);
  bildir(`🎁 Ödül: ${odulYazi(o)}`);
}
export const odulYazi = (o) => [o.altin && `${o.altin} 🪙`, o.elmas && `${o.elmas} 💎`, o.xp && `${o.xp} XP`].filter(Boolean).join(' · ');

export function gunlukAl(n) {
  const g = D.gorevler.gunluk[n], t = g && GUNLUK_HAVUZ[g.id];
  if (!t || g.alindi || g.ilerleme < t.hedef) return;
  g.alindi = true;
  odulVer(t.odul);
  degisti();
}

export function anaAl() {
  const G = D.gorevler, A = ANA[G.anaNo], i = anaIlerleme();
  if (!A || i.ilerleme < i.hedef) return;
  G.anaNo++; G.sayac.ana = 0;
  odulVer(A.odul);
  degisti();
}

// Ödülü alınabilecek görev sayısı (Görevler düğmesindeki rozet)
export function hazirSayisi() {
  let n = D.gorevler.gunluk.filter((g) => !g.alindi && g.ilerleme >= GUNLUK_HAVUZ[g.id].hedef).length;
  const i = anaIlerleme();
  if (i && i.ilerleme >= i.hedef) n++;
  return n;
}
