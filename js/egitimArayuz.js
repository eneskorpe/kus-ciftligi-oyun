// Kuş Evi'ndeki eğitim: yetenek listesi ve dört kısa mini oyun (Ötüş, Hüner, Konuşma, Getir).
// Pencere ekranın altında açılır, kuş yukarıda dersi canlandırır. Her oyun 0-3 puan verir (egitim.js dersBitti).
import { YETENEKLER, yetenekVarMi, yildiz, yildizYazi, kalanDers, dersBasla, dersBitti, YILDIZ_ESIK, MAKS_YILDIZ, EK_DERS_ELMAS } from './egitim.js';
import { dugme, modalAc, kapat, modalKilitle } from './arayuz.js';
import { sesKapaliMi, sesSeviyesi } from './ses.js';

const $ = (s) => document.querySelector(s);
let oyun = null, aktif = null; // aktif: süren mini oyunun durumu (zamanlayıcılar burada tutulur, kapanınca temizlenir)
const bekle = (ms) => new Promise((r) => { const t = setTimeout(r, ms); aktif && aktif.zaman.push(t); });
const kusSahne = () => oyun && oyun.scene.getScene('kusevi');
const kus = () => { const s = kusSahne(); return s && s.kus; };
const rastgele = (d) => d[Math.floor(Math.random() * d.length)];

export function egitimKur(o) { oyun = o; }

// Kısa nota sesi (ötüş oyunu); oyunun ses ayarına uyar
function nota(frekans, sure = 0.32) {
  const ctx = oyun && oyun.sound && oyun.sound.context;
  if (!ctx || sesKapaliMi()) return;
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(frekans * 2, t); o.frequency.exponentialRampToValueAtTime(frekans * 2.06, t + sure);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.18 * sesSeviyesi('efekt') * 2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + sure + 0.05);
}

// --- Yetenek listesi ---
export function egitimAc(k) {
  oyunuBitir();
  modalKilitle(false);
  $('#modal').classList.add('egitimModu');
  const kalan = kalanDers(k);
  const satir = ([tip, Y]) => {
    const y = yildiz(k, tip), p = (k.yetenek || {})[tip] || 0;
    const ilerleme = y >= MAKS_YILDIZ ? 'Usta! 🏆' : `${p - YILDIZ_ESIK[y]} / ${YILDIZ_ESIK[y + 1] - YILDIZ_ESIK[y]} puan`;
    return `<div class="satir"><span class="yi">${Y.ikon}</span><span class="ks"><b>${Y.ad}</b> ${yildizYazi(y)}<br>
      <small>${Y.oyun} · ${ilerleme}</small><br><small>${Y.etki(y)}</small></span>
      ${dugme(kalan ? '🎓 Ders' : `🎓 ${EK_DERS_ELMAS} 💎`, () => { if (dersBasla(k)) oyunBaslat(k, tip); }, 'class="ana"')}</div>`;
  };
  const liste = Object.entries(YETENEKLER).filter(([tip]) => yetenekVarMi(k, tip));
  modalAc(`${kapat()}<h3>🎓 ${k.ad} · Eğitim</h3>
    <p><small>${kalan ? `Bugün <b>${kalan}</b> ders hakkı kaldı.` : `Bugünkü 3 ders bitti. Ek ders ${EK_DERS_ELMAS} 💎.`} Her yıldız kuşun değerini %10 artırır.</small></p>` +
    liste.map(satir).join(''));
}

function oyunBaslat(k, tip) {
  aktif = { k, tip, puan: 0, zaman: [] };
  modalKilitle(true); // ders sürerken dışarı dokununca kapanmasın
  ({ otus: otusOyunu, huner: hunerOyunu, konusma: konusmaOyunu, getir: getirOyunu }[tip])(k);
}
function oyunuBitir() {
  if (aktif) { for (const t of aktif.zaman) { clearTimeout(t); clearInterval(t); } }
  aktif = null;
}
function sonuc(k, tip) {
  const puan = aktif ? aktif.puan : 0;
  oyunuBitir();
  modalKilitle(false);
  const r = dersBitti(k, tip, Math.min(3, puan)), Y = YETENEKLER[tip];
  const b = kus();
  if (b) { if (puan >= 2) b.sevil(); else if (!puan) b.basSalla(); }
  modalAc(`<div class="kart"><h3>${Y.ikon} ${Y.ad} dersi bitti!</h3>
    <p class="egitimSonuc">${'⭐'.repeat(Math.min(3, puan))}${'▫️'.repeat(3 - Math.min(3, puan))}</p>
    <p>+${r.kazanc} puan${r.yildizAtladi ? ` · <b>Yeni yıldız! ${yildizYazi(yildiz(k, tip))}</b>` : ''}</p>
    <div class="dugmeler">${dugme('Tamam', () => egitimAc(k), 'class="ana"')}</div></div>`);
}
const pencere = (k, tip, govde) => modalAc(`<h3>${YETENEKLER[tip].ikon} ${YETENEKLER[tip].ad} dersi · ${k.ad}</h3><div id="oyunAlani" class="oyunAlani">${govde}</div>`);
const mesaj = (m) => { const e = $('#oyunMesaj'); if (e) e.innerHTML = m; };

// --- 1. Ötüş: kuşun söylediği melodiyi sırayla tekrarla (2 tur; ikinci tur bir nota uzun) ---
const NOTALAR = [{ ad: 'Do', f: 523, renk: '#ff8fb0' }, { ad: 'Re', f: 587, renk: '#ffd34a' }, { ad: 'Mi', f: 659, renk: '#7ad35a' }, { ad: 'Fa', f: 698, renk: '#8fd0ff' }];
async function otusOyunu(k) {
  pencere(k, 'otus', `<p id="oyunMesaj">🎵 Dinle...</p><div class="notalar">${NOTALAR.map((N, i) => `<button class="nota" data-nota="${i}" style="background:${N.renk}" disabled>${N.ad}</button>`).join('')}</div>`);
  const A = aktif, uzunluk = 3 + Math.floor(yildiz(k, 'otus') / 2), dizi = Array.from({ length: uzunluk }, () => Math.floor(Math.random() * 4));
  const tusYak = async (i) => { const b = document.querySelector(`[data-nota="${i}"]`); nota(NOTALAR[i].f); const K = kus(); if (K) K.notaOt(); if (b) b.classList.add('yanik'); await bekle(380); if (b) b.classList.remove('yanik'); await bekle(120); };
  let hatasiz = true;
  for (let tur = 0; tur < 2; tur++) {
    if (tur) dizi.push(Math.floor(Math.random() * 4));
    mesaj('🎵 Dinle...'); await bekle(500); if (aktif !== A) return;
    for (const i of dizi) { await tusYak(i); if (aktif !== A) return; }
    mesaj('🎶 Şimdi sen söyle!');
    const dogru = await new Promise((coz) => {
      let n = 0;
      document.querySelectorAll('[data-nota]').forEach((b) => { b.disabled = false; b.onclick = () => {
        const i = +b.dataset.nota; nota(NOTALAR[i].f); const K = kus(); if (K) K.notaOt();
        if (i !== dizi[n]) { coz(false); return; }
        if (++n >= dizi.length) coz(true);
      }; });
    });
    document.querySelectorAll('[data-nota]').forEach((b) => { b.disabled = true; });
    if (aktif !== A) return;
    if (!dogru) { hatasiz = false; mesaj('❌ Yanlış nota!'); await bekle(800); break; }
    A.puan++; mesaj('✅ Harika!'); await bekle(700); if (aktif !== A) return;
  }
  if (hatasiz && A.puan === 2) A.puan = 3;
  sonuc(k, 'otus');
}

// --- 2. Hüner: işaret çubukta gidip gelir, yeşil alana gelince dokun (3 deneme) ---
async function hunerOyunu(k) {
  pencere(k, 'huner', `<p id="oyunMesaj">🤸 İşaret yeşil alana gelince dokun!</p><div class="ritim"><i id="ritimAlan"></i><b id="ritimIsaret"></b></div>
    <div class="dugmeler"><button id="ritimDugme" class="ana">Şimdi!</button></div>`);
  const A = aktif, y = yildiz(k, 'huner'), en = Math.max(12, 30 - y * 4), hiz = 0.9 + y * 0.18;
  const numara = y >= 4 ? 'don' : y >= 2 ? 'takla' : 'reverans';
  for (let deneme = 0; deneme < 3; deneme++) {
    const bas = 8 + Math.random() * (84 - en);
    $('#ritimAlan').style.left = bas + '%'; $('#ritimAlan').style.width = en + '%';
    let konum = 0, yon = 1, son = performance.now();
    const t = setInterval(() => { const n = performance.now(); konum += yon * hiz * (n - son) / 10; son = n; if (konum > 100) { konum = 100; yon = -1; } if (konum < 0) { konum = 0; yon = 1; } const e = $('#ritimIsaret'); if (e) e.style.left = konum + '%'; }, 16);
    A.zaman.push(t);
    const isabet = await new Promise((coz) => { $('#ritimDugme').onclick = () => coz(konum >= bas && konum <= bas + en); });
    clearInterval(t);
    if (aktif !== A) return;
    const K = kus();
    if (isabet) { A.puan++; mesaj('✅ Tam zamanında!'); if (K) K.numara(numara); } else { mesaj('❌ Kaçırdın!'); if (K) K.basSalla(); }
    await bekle(1300); if (aktif !== A) return;
    mesaj(`🤸 ${2 - deneme > 0 ? `${2 - deneme} deneme kaldı` : ''}`);
  }
  sonuc(k, 'huner');
}

// --- 3. Konuşma: kuş bir kelime söyler, doğru kartı seç (3 tur) ---
const KELIMELER = ['Merhaba', 'Günaydın', 'Cik cik', 'Tatlım', 'Kuşçu', 'Elma', 'Bal', 'Darı', 'Şeker', 'Yaşasın', 'Aferin', 'Sevgi', 'Güneş', 'Tüycük', 'Pamuk', 'Limon'];
async function konusmaOyunu(k) {
  pencere(k, 'konusma', '<p id="oyunMesaj">🗣️ Dikkatle dinle...</p><div class="kartlar" id="kartlar"></div>');
  const A = aktif, sure = Math.max(700, 1300 - yildiz(k, 'konusma') * 120);
  for (let tur = 0; tur < 3; tur++) {
    const dogru = rastgele(KELIMELER), secenek = [dogru];
    while (secenek.length < 3) { const w = rastgele(KELIMELER); if (!secenek.includes(w)) secenek.push(w); }
    secenek.sort(() => Math.random() - 0.5);
    $('#kartlar').innerHTML = '';
    mesaj(`🦜 “${dogru}”`); const K = kus(); if (K) K.konus(dogru + '!');
    await bekle(sure); if (aktif !== A) return;
    mesaj('Hangisini söyledi?');
    $('#kartlar').innerHTML = secenek.map((w) => `<button class="kelime" data-k="${w}">${w}</button>`).join('');
    const sec = await new Promise((coz) => document.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => coz(b.dataset.k); }));
    if (aktif !== A) return;
    if (sec === dogru) { A.puan++; mesaj('✅ Evet!'); } else { mesaj(`❌ “${dogru}” demişti`); const K2 = kus(); if (K2) K2.basSalla(); }
    await bekle(900); if (aktif !== A) return;
  }
  sonuc(k, 'konusma');
}

// --- 4. Getir: tohum bir yaprağın altına saklanır, yapraklar yer değiştirir; doğru yaprağı bul (3 tur) ---
async function getirOyunu(k) {
  pencere(k, 'getir', '<p id="oyunMesaj">🎁 Tohum nereye saklanacak?</p><div class="yapraklar" id="yapraklar"></div>');
  const A = aktif, y = yildiz(k, 'getir'), N = 6;
  for (let tur = 0; tur < 3; tur++) {
    let sira = Array.from({ length: N }, (_, i) => i); // ekrandaki sıraya göre yaprak numaraları
    const tohum = Math.floor(Math.random() * N);
    const ciz = (goster) => { $('#yapraklar').innerHTML = sira.map((n) => `<button class="yaprak" data-y="${n}" ${goster ? 'disabled' : ''}>${goster && n === tohum ? '🌰' : '🍃'}</button>`).join(''); };
    ciz(true); mesaj('👀 Tohuma iyi bak!');
    await bekle(1000); if (aktif !== A) return;
    ciz(false); document.querySelectorAll('.yaprak').forEach((b) => { b.disabled = true; });
    mesaj('🔀 Karışıyor...');
    for (let d = 0; d < 2 + y; d++) { // iki yaprak yer değiştirir
      const a = Math.floor(Math.random() * N); let b = Math.floor(Math.random() * N); if (b === a) b = (a + 1) % N;
      [sira[a], sira[b]] = [sira[b], sira[a]];
      ciz(false); document.querySelectorAll('.yaprak').forEach((e, i) => { e.disabled = true; if (i === a || i === b) e.classList.add('oynuyor'); });
      await bekle(Math.max(350, 650 - y * 50)); if (aktif !== A) return;
    }
    ciz(false); mesaj('Tohum hangi yaprağın altında?');
    const sec = await new Promise((coz) => document.querySelectorAll('[data-y]').forEach((b) => { b.onclick = () => coz(+b.dataset.y); }));
    if (aktif !== A) return;
    const K = kus();
    if (sec === tohum) { A.puan++; mesaj('✅ Buldun!'); if (K) K.numara('reverans'); } else { mesaj('❌ Orada değildi'); if (K) K.basSalla(); }
    ciz(true); await bekle(1000); if (aktif !== A) return;
  }
  sonuc(k, 'getir');
}

// Pencere kapanınca süren oyun bırakılır (ders hakkı harcanmış olur)
document.addEventListener('click', (e) => { if (e.target.closest('.kapat') && aktif) oyunuBitir(); });
new MutationObserver(() => { if (!$('#modal').classList.contains('acik')) { $('#modal').classList.remove('egitimModu'); if (aktif) oyunuBitir(); } })
  .observe($('#modal'), { attributes: true, attributeFilter: ['class'] });
