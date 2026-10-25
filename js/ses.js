// Köyün çevre sesleri: uzaktan gelen serçe cıvıltıları. Kayıt kullanılmaz, Web Audio ile anında üretilir.
// Kısık, seyrek (30-80 sn arası) ve her seferinde farklı bir türev çalar. Gece kuşlar susar.

let kapali = false;
try { kapali = localStorage.getItem('kusCiftligi_ses') === 'kapali'; } catch { /* yok */ }
export const sesKapaliMi = () => kapali;
export function sesAyarla(acik) {
  kapali = !acik;
  try { localStorage.setItem('kusCiftligi_ses', kapali ? 'kapali' : 'acik'); } catch { /* yok */ }
  window.dispatchEvent(new Event('sesDegisti')); // müzik çalar dinler (muzik.js)
}

// Ses düzeyleri (oyuncunun ayarı, 0-1): müzik ve doğa/efekt sesleri ayrı. Varsayılanlar kısık: müzik arkada alttan çalsın
const SEVIYE = { muzik: 0.35, efekt: 0.5 };
try { Object.assign(SEVIYE, JSON.parse(localStorage.getItem('kusCiftligi_sesSeviye')) || {}); } catch { /* yok */ }
export const sesSeviyesi = (tur) => SEVIYE[tur];
export function sesSeviyesiAyarla(tur, deger) {
  SEVIYE[tur] = Math.max(0, Math.min(1, deger));
  try { localStorage.setItem('kusCiftligi_sesSeviye', JSON.stringify(SEVIYE)); } catch { /* yok */ }
  window.dispatchEvent(new Event('sesDegisti'));
}

const r = (a, b) => a + Math.random() * (b - a);

// Serçe cıvıltısı türevleri. Her nota: t başlangıç, d süre (sn), f0 → f1 frekans (Hz), v şiddet (0-1)
const TUREVLER = [
  () => { const n = [], k = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < k; i++) n.push({ t: i * r(0.2, 0.28), d: 0.07, f0: 4200, f1: 3000, v: 1 }); return n; }, // "cik cik cik"
  () => [{ t: 0, d: 0.06, f0: 3800, f1: 2900, v: 1 }, { t: 0.11, d: 0.16, f0: 3200, f1: 3700, v: 0.7 }], // "cik-cirrr"
  () => { const n = []; for (let i = 0; i < 6; i++) n.push({ t: i * 0.09, d: 0.05, f0: r(3600, 4300), f1: r(2900, 3300), v: r(0.6, 0.9) }); return n; }, // telaşlı cıvıltı
  () => { // iki serçe karşılıklı: biri yakın, biri uzaktan cevap veriyor
    const n = [];
    for (let i = 0; i < 3; i++) n.push({ t: i * 0.24, d: 0.07, f0: 4100, f1: 3000, v: 1 });
    for (let i = 0; i < 2; i++) n.push({ t: 1.1 + i * 0.22, d: 0.07, f0: 3700, f1: 2800, v: 0.45, uzak: true });
    return n;
  },
  () => [{ t: 0, d: 0.08, f0: 4400, f1: 3200, v: 0.8 }], // tek, kısa "cik"
];

// Bir türev çalar. Ses kapalıysa ya da tarayıcı henüz sese izin vermediyse sessizce geçer.
export function cevreSesiCal(sahne, ses = 0.06) {
  const yonetici = sahne.sound, ctx = yonetici && yonetici.context;
  if (kapali || !ctx || yonetici.locked || document.hidden) return;
  if (ctx.state === 'suspended') ctx.resume();
  const notalar = TUREVLER[Math.floor(Math.random() * TUREVLER.length)]();
  const kayma = r(0.92, 1.08); // her serçe biraz farklı perdede
  const bas = ctx.currentTime + 0.05, cikis = ctx.createGain();
  cikis.gain.value = ses * r(0.7, 1.1) * SEVIYE.efekt * 1.4; // efekt ayarı (genel düzey %30 kısıldı)
  // Sesin geldiği yön: sağdan ya da soldan
  const yon = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (yon) { yon.pan.value = r(-0.8, 0.8); cikis.connect(yon).connect(yonetici.destination || ctx.destination); }
  else cikis.connect(yonetici.destination || ctx.destination);
  for (const { t, d, f0, f1, v, uzak } of notalar) {
    const o = ctx.createOscillator(), g = ctx.createGain(), s = bas + t;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0 * kayma, s);
    o.frequency.exponentialRampToValueAtTime(f1 * kayma, s + d);
    lfo.frequency.value = 28; lg.gain.value = f0 * 0.02;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.linearRampToValueAtTime(uzak ? v * 0.6 : v, s + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, s + d);
    o.connect(g).connect(cikis);
    o.start(s); lfo.start(s); o.stop(s + d + 0.02); lfo.stop(s + d + 0.02);
  }
  const sure = Math.max(...notalar.map((x) => x.t + x.d));
  setTimeout(() => { cikis.disconnect(); if (yon) yon.disconnect(); }, (sure + 0.5) * 1000);
}

// Dokunma sesleri: 'hisirti' (çalı/ağaç yaprak sesi), 'plop' (suya damla). Çok kısık ve kısa.
export function dokunmaSesi(sahne, tur, ses = 0.05) {
  const yonetici = sahne.sound, ctx = yonetici && yonetici.context;
  if (kapali || !ctx || yonetici.locked || document.hidden) return;
  if (ctx.state === 'suspended') ctx.resume();
  const cikis = ctx.createGain(), bas = ctx.currentTime + 0.01, hedef = yonetici.destination || ctx.destination;
  cikis.gain.value = ses * SEVIYE.efekt * 1.4;
  cikis.connect(hedef);
  if (tur === 'hisirti') {
    // Bant geçiren süzgeçten geçmiş, birkaç kez kabarıp sönen beyaz gürültü
    const sure = r(0.35, 0.5), tampon = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sure), ctx.sampleRate), d = tampon.getChannelData(0);
    for (let i = 0; i < d.length; i++) { const t = i / d.length; d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI * r(5, 7)))) * (1 - t); }
    const k = ctx.createBufferSource(), s = ctx.createBiquadFilter();
    k.buffer = tampon; s.type = 'bandpass'; s.frequency.value = r(2500, 3500); s.Q.value = 0.8;
    k.connect(s).connect(cikis); k.start(bas);
  } else if (tur === 'tak') { // çekiç: kısa, tok bir tahta vuruşu
    const o = ctx.createOscillator(), g = ctx.createGain(), f = r(180, 240);
    o.type = 'triangle';
    o.frequency.setValueAtTime(f * 2, bas); o.frequency.exponentialRampToValueAtTime(f, bas + 0.05);
    g.gain.setValueAtTime(1, bas); g.gain.exponentialRampToValueAtTime(0.0001, bas + 0.09);
    o.connect(g).connect(cikis); o.start(bas); o.stop(bas + 0.1);
  } else if (tur === 'plop') {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = r(500, 700);
    o.type = 'sine';
    o.frequency.setValueAtTime(f, bas); o.frequency.exponentialRampToValueAtTime(f * 2.6, bas + 0.09);
    g.gain.setValueAtTime(0.0001, bas); g.gain.linearRampToValueAtTime(1, bas + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, bas + 0.13);
    o.connect(g).connect(cikis); o.start(bas); o.stop(bas + 0.15);
  }
  setTimeout(() => cikis.disconnect(), 800);
}

// Köy sahnesinde seyrek aralıklarla çevre sesi planlar (sahne uyurken zamanlayıcı da durur)
export function cevreSesleriKur(sahne, geceMi) {
  const planla = () => sahne.time.delayedCall(r(30000, 80000), () => {
    if (!geceMi()) cevreSesiCal(sahne);
    planla();
  });
  planla();
}
