// Arayüz: üst menü, bina panelleri, kuş seçme, Kuşlarım, Ansiklopedi ve yeni kuş kartı.
import { TURLER, kondisyonAdi, paletOlustur } from './turler.js';
import { D, simdi, dinle, degisti, bildirimAyarla, xpGerek, sureYazi } from './durum.js';
import { YEMLER, MUT_ADI, fenotip, kusGen, kusDegeri, tarifBul } from './genetik.js';
import * as M from './mekanik.js';
import { BINALAR, YENI_BINALAR } from './binalar.js';
import * as G from './gorevler.js';
import { sesKapaliMi, sesAyarla, sesSeviyesi, sesSeviyesiAyarla } from './ses.js';

const $ = (s) => document.querySelector(s);
let oyun, gorevPencereAcik = false, acikBina = null, secim = { e: null, d: null }, kartAcik = false;
export const metinler = { turler: {}, ketzalIpuclari: [] };
fetch('icerik/turler.json').then((r) => r.json()).then((j) => Object.assign(metinler, j)).catch(() => {});

export function arayuzKur(o) {
  oyun = o;
  bildirimAyarla(bildirim);
  dinle(() => { hudGuncelle(); if (acikBina) panelCiz(); });
  oyun.events.on('binaSecildi', (b) => {
    if (acikBina === b.tip) return panelKapat(); // açık binaya tekrar dokununca panel kapanır
    acikBina = b.tip; secim = { e: null, d: null }; panelCiz(); $('#binaPanel').classList.add('acik');
  });
  oyun.events.on('bosDokunus', panelKapat);
  $('#panelKapat').onclick = panelKapat;
  $('#modal').onclick = (e) => { if (e.target.id === 'modal' && !kartAcik) modalKapat(); };
  $('#dKuslar').onclick = kuslarimAc;
  $('#dInsa').onclick = insaMenusu;
  $('#dAnsiklopedi').onclick = ansiklopediAc;
  $('#dGorevler').onclick = gorevlerAc;
  $('#dBilgi').onclick = krediAc;
  const sesDugme = () => { $('#dSes img').src = `assets/arayuz/${sesKapaliMi() ? 'ses_kapali' : 'ses_acik'}.png`; };
  // Ses düğmesi ayar panelini açar: müzik ve doğa sesleri için ayrı düzey, tek dokunuşla hepsini kapat/aç
  const sesPanelCiz = () => {
    for (const [id, tur] of [['sMuzik', 'muzik'], ['sEfekt', 'efekt'], ['sTik', 'tiklama']]) { $('#' + id).value = Math.round(sesSeviyesi(tur) * 100); $('#' + id + 'Y').textContent = '%' + $('#' + id).value; }
    $('#sKapat').textContent = sesKapaliMi() ? '🔊 Sesleri aç' : '🔇 Bütün sesleri kapat';
    sesDugme();
  };
  $('#dSes').onclick = (e) => { e.stopPropagation(); $('#sesPanel').classList.toggle('acik'); sesPanelCiz(); };
  for (const [id, tur] of [['sMuzik', 'muzik'], ['sEfekt', 'efekt'], ['sTik', 'tiklama']]) $('#' + id).oninput = (e) => { sesSeviyesiAyarla(tur, e.target.value / 100); sesPanelCiz(); };
  $('#sKapat').onclick = () => { sesAyarla(sesKapaliMi()); sesPanelCiz(); };
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#sesPanel, #dSes')) $('#sesPanel').classList.remove('acik'); });
  sesPanelCiz();
  document.querySelectorAll('[data-yakinda]').forEach((b) => { b.onclick = () => bildirim(b.dataset.yakinda); });
  setInterval(() => { if (acikBina) panelCiz(); }, 1000);
  hudGuncelle();
}

function panelKapat() { acikBina = null; $('#binaPanel').classList.remove('acik'); }

// Metinlerdeki altın, elmas ve yıldız emojileri Gemini ikonlarıyla gösterilir (assets/arayuz)
const IKON_EMOJI = { '🪙': 'altin', '💎': 'elmas', '⭐': 'yildiz' };
export const ikonla = (html) => html.replace(/🪙|💎|⭐/g, (e) => `<img class="satirIk" src="assets/arayuz/${IKON_EMOJI[e]}.png" alt="${e}">`);
const kacir = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function bildirim(metin) {
  const b = $('#bildirim');
  b.innerHTML = ikonla(kacir(metin)); b.classList.add('acik');
  clearTimeout(bildirim.t); bildirim.t = setTimeout(() => b.classList.remove('acik'), 2400);
}

function hudGuncelle() {
  $('#seviye').textContent = D.seviye;
  $('#xpDolu').style.width = Math.min(100, D.xp / xpGerek(D.seviye) * 100) + '%';
  $('#altin').textContent = D.altin.toLocaleString('tr-TR');
  $('#elmas').textContent = D.elmas.toLocaleString('tr-TR');
  const n = G.hazirSayisi(), r = $('#gorevRozet');
  r.textContent = n; r.style.display = n ? 'flex' : 'none';
  if (gorevPencereAcik) gorevlerCiz();
}

// --- Küçük yardımcılar ---
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
// Kuşun renklerinden küçük bir jeton (başı ve gövdesi)
// Kuş portresi: oyunun çizimli türlerinde gerçek kuş resmi (renk mutasyonu yaklaşık bir filtreyle), diğerlerinde renk jetonu
const MUT_FILTRE = { lutino: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.15)', albino: 'grayscale(1) brightness(1.35)', mavi: 'hue-rotate(150deg) saturate(.9)' };
const RESIMLI = ['kanarya', 'ev_sercesi', 'saka', 'muhabbet', 'sultan', 'cennet', 'ketzal'];
export function jeton(k, boy = 44) {
  if (RESIMLI.includes(k.tur)) {
    const f = MUT_FILTRE[fenotip(k.genler)];
    return `<span class="jeton resim" style="width:${boy}px;height:${boy}px"><img src="assets/kuslar/${k.tur}/tasarim.png" alt=""${f ? ` style="filter:${f}"` : ''}></span>`;
  }
  const P = paletOlustur(kusGen(k));
  return `<span class="jeton" style="width:${boy}px;height:${boy}px;background:linear-gradient(160deg, ${hex(P.bas)} 0 46%, ${hex(P.govde)} 46% 78%, ${hex(P.kanat)} 78%)"></span>`;
}
export const cinsiyet = (k) => (k.cinsiyet === 'e' ? '<b class="erkek">♂</b>' : '<b class="disi">♀</b>');
export const cubuk = (oran, renk) => `<span class="cubuk"><i style="width:${Math.round(oran)}%;background:${renk}"></i></span>`;
export const rozet = (tur) => `<span class="rozet" data-n="${TURLER[tur].nadirlik}">${TURLER[tur].nadirlik}</span>`;
function kusSatiri(k) {
  return `${jeton(k)}<span class="ks"><b>${k.ad}</b> ${cinsiyet(k)} <small>${TURLER[k.tur].ad}</small><br>
    <small>${MUT_ADI[fenotip(k.genler)]} · ${kondisyonAdi(k.tuy)} (${k.tuy.toFixed(3)})</small><br>
    <span class="bars">😊 ${cubuk(k.mutluluk, '#ff8fb0')} 🌾 ${cubuk(k.tokluk, '#e9c46a')}</span></span>`;
}
// Düğme işleyicileri tek bir dinleyiciyle çağrılır; panel her saniye yenilense de tıklama kaybolmaz
const isleyiciler = new Map();
document.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-is]');
  if (b && !b.disabled && isleyiciler.has(b.dataset.is)) isleyiciler.get(b.dataset.is)();
});
export function dugme(metin, fn, ek = '') {
  const id = 'i' + Math.random().toString(36).slice(2, 9);
  if (isleyiciler.size > 400) for (const k of isleyiciler.keys()) if (!document.querySelector(`[data-is="${k}"]`)) isleyiciler.delete(k);
  isleyiciler.set(id, fn);
  return `<button data-is="${id}" ${ek}>${metin}</button>`;
}
// is: süreli iş (tuzak, kuluçka ya da inşaat); tip: hızlandırılacak işin D içindeki adı
function ilerleme(is, toplam, etiket, tip = acikBina === 'tuzak' ? 'tuzak' : 'kulucka') {
  const kalan = M.kalanSure(is), oran = 100 - kalan / toplam * 100;
  return `<div class="is"><div>${etiket} <b>${sureYazi(kalan)}</b></div>${cubuk(oran, '#7ad35a')}</div>
    <div class="dugmeler">${dugme(`⚡ Bitir · ${M.elmasFiyati(kalan)} 💎`, () => M.hizlandirElmas(tip))}
    ${dugme('📺 Reklam izle (−15 dk)', () => reklamIzle(tip))}</div>`;
}

function reklamIzle(tip) {
  const r = $('#reklam');
  r.classList.add('acik');
  let s = 3;
  r.querySelector('b').textContent = s;
  const t = setInterval(() => {
    s--; r.querySelector('b').textContent = s;
    if (s <= 0) { clearInterval(t); r.classList.remove('acik'); M.hizlandirReklam(tip); }
  }, 1000);
}

// --- Bina panelleri ---
function panelCiz() {
  const tip = acikBina, t = BINALAR[tip], B = D.binalar[tip];
  const ikon = { kusevi: 'kusevi', kulucka: 'yumurta', tuzak: 'kafes', yemlik: 'bos_yem' }[tip]; // başlıkta Gemini ikonu (yoksa emoji)
  $('#panelIkon').innerHTML = ikon ? `<img src="assets/arayuz/${ikon}.png" alt="">` : t.ikon;
  $('#panelAd').textContent = t.ad;
  $('#panelSeviye').textContent = B.sv ? 'Sv. ' + B.sv : 'İnşaat';
  $('#panelSeviye').style.display = t.sabit ? 'none' : '';
  $('#panelAciklama').textContent = t.aciklama;
  const I = D.insaat;
  let icerik = B.sv === 0 ? '' : ({ tuzak: tuzakPaneli, kulucka: kuluckaPaneli, kusevi: kuseviPaneli, yemlik: yemlikPaneli, kunduz: kunduzPaneli }[tip] || yakindaPaneli)();
  if (t.sabit) { /* geliştirilmeyen bina */ } else if (I && I.tip === tip) { // Kunduz Usta bu binada çalışıyor
    icerik += `<div class="gelistir" style="display:block">${ilerleme(I, I.bitis - I.bas, I.yeni ? '🦫 Kunduz Usta binayı inşa ediyor:' : `🦫 Kunduz Usta Sv. ${I.sv} için çalışıyor:`, 'insaat')}</div>`;
  } else if (B.sv < M.MAKS_SV && !t.islevYok) {
    const hedef = B.sv + 1, kilit = D.seviye < M.SV_GEREK[hedef], is = I || D.temizlik;
    const not = kilit ? `<small>🔒 Sv. ${hedef} için oyuncu seviyen ${M.SV_GEREK[hedef]} olmalı</small>`
      : I ? `<small>🦫 Usta şu an başka bir binada çalışıyor (${BINALAR[I.tip].ad})</small>`
      : D.temizlik ? '<small>🦫 Usta şu an köyde bir dekoru kaldırıyor</small>' : `<small>${M.BINA_ETKI[tip](hedef)}</small>`;
    icerik += `<div class="gelistir">${dugme(`${kilit ? '🔒' : '⬆️'} Sv. ${hedef} · ${M.GELISTIRME_FIYATI[hedef]} 🪙 · ${M.GELISTIRME_DK[hedef]} dk`, () => M.gelistir(tip), kilit || is ? 'disabled' : '')}
      ${not}</div>`;
  }
  $('#panelIcerik').innerHTML = ikonla(icerik);
}

function tuzakPaneli() {
  const T = D.tuzak;
  if (T && simdi() >= T.bitis) return `<p class="hazir">🪤 Tuzağa bir kuş düştü!</p><div class="dugmeler">${dugme('🎁 Tuzağı aç', () => kartAc(M.tuzakAc(), 'tuzak'), 'class="ana"')}</div>`;
  if (T) return ilerleme(T, M.tuzakSuresi(T.yem), `${YEMLER[T.yem].ikon} Tuzak bekliyor:`);
  return '<p class="baslik2">Yem seç ve tuzağı kur:</p><div class="yemler">' + Object.entries(YEMLER).map(([ad, Y]) => {
    const kilit = D.binalar.tuzak.sv < Y.svGerek;
    const kuslar = Object.keys(Y.turler).map((t) => TURLER[t].ad).join(', ');
    return `<div class="yem ${kilit ? 'kilit' : ''}"><span class="yi">${Y.ikon}</span><span><b>${Y.ad}</b><br><small>${kuslar}</small><br>
      <small>⏱ ${sureYazi(M.tuzakSuresi(ad))}${kilit ? ` · 🔒 Sv. ${Y.svGerek}` : ''}</small></span>
      ${dugme(`${Y.fiyat} 🪙`, () => M.tuzakKur(ad), kilit ? 'disabled' : '')}</div>`;
  }).join('') + '</div>';
}

function kuluckaPaneli() {
  const K = D.kulucka;
  if (K && K.asama === 'kulucka' && simdi() >= K.bitis) return `<p class="hazir">🐣 Yumurta çatlamak üzere!</p><div class="dugmeler">${dugme('🥚 Yumurtayı çatlat', () => kartAc(M.kuluckaAc(), 'kulucka'), 'class="ana"')}</div>`;
  if (K) {
    const a = M.kusBul(K.aId), b = M.kusBul(K.bId), ciftler = `<p class="cift">${a ? jeton(a, 30) + a.ad : '?'} 💞 ${b ? jeton(b, 30) + b.ad : '?'}</p>`;
    return K.asama === 'ciftlesme'
      ? ciftler + ilerleme(K, 2 * 60000, '💞 Çiftleşiyorlar:')
      : ciftler + ilerleme(K, M.kuluckaSuresi(K.cocuk.tur), '🥚 Yumurta kuluçkada:');
  }
  const yuva = (c) => {
    const k = secim[c] && M.kusBul(secim[c]);
    return `<div class="yuva">${k ? kusSatiri(k) : `<span class="bos">${c === 'e' ? '♂ Erkek' : '♀ Dişi'} kuş seç</span>`}
      ${dugme(k ? 'Değiştir' : 'Seç', () => kusSec(c))}</div>`;
  };
  const a = secim.e && M.kusBul(secim.e), b = secim.d && M.kusBul(secim.d);
  const ipucu = a && b && tarifBul(a, b) ? '<p class="ipucu">✨ Bu ikilinin yavrusu sürpriz olabilir...</p>' : '';
  return yuva('e') + yuva('d') + ipucu +
    `<div class="dugmeler">${dugme('💞 Çiftleştir', () => { if (M.ciftlestir(secim.e, secim.d)) secim = { e: null, d: null }; }, a && b ? 'class="ana"' : 'disabled')}</div>`;
}

function kuseviPaneli() {
  const B = D.binalar.kusevi, m = Math.floor(B.birikim);
  return `<p>🐦 Kuşlar: <b>${D.kuslar.length} / ${M.kapasite()}</b></p>
    <p>🪙 Mutlu kuşların kazandırdığı: <b>${m} / ${M.gelirKapasite()}</b></p>
    <div class="dugmeler">${dugme(`🪙 Topla`, () => M.geliriTopla(), m ? 'class="ana"' : 'disabled')}${dugme('🏠 İçeri gir', () => oyun.events.emit('kuseviGir'))}${dugme('🐦 Kuşlarım', kuslarimAc)}</div>`;
}

function kunduzPaneli() {
  const I = D.insaat, T = D.temizlik;
  if (T) return `<p>🦫 Usta şu an köyde bir <b>${T.ad.toLowerCase()}</b> kaldırıyor (+${T.altin} 🪙).</p>` + ilerleme(T, T.bitis - T.bas, 'Kalan süre:', 'temizlik');
  if (!I) return '<p>🦫 Usta evinde dinleniyor. Bir binanın panelinden <b>Geliştir</b>\'e, 🏗️ <b>İnşa</b> menüsünden yeni bir binaya ya da düzenle modunda bir ağaca basınca işe koyulur.</p>';
  return (I.yeni ? `<p>🦫 Usta şu an <b>${BINALAR[I.tip].ad}</b> binasını inşa ediyor.</p>` : `<p>🦫 Usta şu an <b>${BINALAR[I.tip].ad}</b> binasını Sv. ${I.sv}'e geliştiriyor.</p>`) +
    ilerleme(I, I.bitis - I.bas, 'Kalan süre:', 'insaat');
}

// İşlevi henüz eklenmemiş yeni binalar
function yakindaPaneli() {
  return '<p class="ipucu">🚧 Bu binanın işlevi çok yakında eklenecek. Şimdilik köyünü süslüyor!</p>';
}

// --- İnşa menüsü: oyuncu seviyesiyle açılan yeni binalar ---
function insaMenusu() {
  const satir = (tip) => {
    const T = BINALAR[tip], durum = M.binaDurumu(tip), [w, d] = T.boyut;
    const sag = durum === 'var' ? '<small>✅ Köyünde</small>'
      : durum === 'kilitli' ? `<small>🔒 Sv. ${T.acilis}</small>`
      : dugme(`${T.fiyat} 🪙`, () => { modalKapat(); oyun.events.emit('insaYerlestir', tip); }, 'class="ana"');
    return `<div class="yem ${durum === 'kilitli' ? 'kilit' : ''}"><span class="yi">${T.ikon}</span><span><b>${T.ad}</b><br><small>${T.aciklama}</small><br>
      <small>⏱ ${T.dk} dk · ${w}×${d} kare</small></span>${sag}</div>`;
  };
  const mesgul = D.insaat || D.temizlik ? '<p class="ipucu">🦫 Kunduz Usta şu an çalışıyor; yeni inşaat için işinin bitmesini bekle.</p>' : '';
  modalAc(`<h2>🏗️ İnşa et</h2><p><small>Seviye atladıkça yeni binalar açılır. Seçtiğin binayı köyde boş bir yere koy, Kunduz Usta inşa etsin.</small></p>${mesgul}
    <div class="yemler">${YENI_BINALAR.map(satir).join('')}</div><div class="dugmeler">${dugme('Kapat', modalKapat)}</div>`);
}

function yemlikPaneli() {
  const Y = D.binalar.yemlik, f = M.yemlikFiyati();
  return `<p>🌾 Yem: <b>${Y.stok} / ${M.yemlikKapasite()}</b> porsiyon</p>${cubuk(Y.stok / M.yemlikKapasite() * 100, '#e9c46a')}
    <p><small>Acıkan kuşlar buradan kendileri yer. Yem biterse acıkır ve mutsuz olurlar.</small></p>
    <div class="dugmeler">${dugme(`🌾 Doldur · ${f} 🪙`, () => M.yemlikDoldur(), f ? 'class="ana"' : 'disabled')}</div>`;
}

// --- Pencereler ---
export function modalAc(html) { gorevPencereAcik = false; $('#modalIc').innerHTML = ikonla(html); $('#modal').classList.add('acik'); }
function modalKapat() { kartAcik = false; gorevPencereAcik = false; $('#modal').classList.remove('acik'); }
export const kapat = () => dugme('<img src="assets/arayuz/kapat.png" alt="Kapat">', modalKapat, 'class="kapat"');

function kusSec(c) {
  const liste = D.kuslar.filter((k) => k.cinsiyet === c && !M.mesgulMu(k));
  modalAc(`${kapat()}<h3>${c === 'e' ? '♂ Erkek' : '♀ Dişi'} kuş seç</h3>` + (liste.length
    ? liste.map((k) => `<div class="satir">${kusSatiri(k)}${dugme('Seç', () => { secim[c] = k.id; modalKapat(); panelCiz(); })}</div>`).join('')
    : '<p>Uygun kuşun yok. Tuzak kurarak yeni kuşlar yakalayabilirsin.</p>'));
}

export function kuslarimAc() {
  const sat = new Set();
  const ciz = () => modalAc(`${kapat()}<h3>🐦 Kuşlarım (${D.kuslar.length} / ${M.kapasite()})</h3>` + D.kuslar.map((k) => {
    const sevBekle = k.sonSevme + 3600000 - simdi(), gorunen = D.kuslar.filter((x) => x.gorunur).length;
    return `<div class="satir">${kusSatiri(k)}<span class="eylem">
      ${dugme(sevBekle > 0 ? `💗 ${sureYazi(sevBekle)}` : '💗 Sev', () => { if (M.kusSev(k.id)) { oyun.events.emit('kusSevildi', k.id); ciz(); } }, sevBekle > 0 ? 'disabled' : '')}
      ${dugme(k.gorunur ? '👁 Köyde' : '🙈 Gizli', () => { if (!k.gorunur && gorunen >= 8) return bildirim('Köyde en fazla 8 kuş gezebilir'); k.gorunur = !k.gorunur; degisti(); ciz(); })}
      ${M.mesgulMu(k) ? '<small>💞 Kuluçkada</small>' : dugme(sat.has(k.id) ? `Emin misin? ${kusDegeri(k)} 🪙` : `🪙 Sat · ${kusDegeri(k)}`, () => {
        if (sat.has(k.id)) { M.kusSat(k.id); ciz(); } else { sat.add(k.id); ciz(); }
      }, sat.has(k.id) ? 'class="tehlike"' : '')}</span></div>`;
  }).join(''));
  ciz();
}

function ansiklopediAc() {
  const ipucu = (tur) => {
    if (tur === 'cennet') return 'Avustralyalı geveze bir kuşla sarı tüylü bir şarkıcının aşkından doğduğu söylenir...';
    if (tur === 'ketzal') return metinler.ketzalIpuclari.join(' ');
    return 'Tuzağa doğru yemi koyarsan belki gelir...';
  };
  modalAc(`${kapat()}<h3>📖 Kuş Ansiklopedisi (${D.kesifler.length} / ${Object.keys(TURLER).length})</h3>` + Object.entries(TURLER).map(([tur, t]) => {
    const m = metinler.turler[tur], acik = D.kesifler.includes(tur);
    return `<div class="satir ans ${acik ? '' : 'gizli'}"><span class="ks"><b>${acik ? t.ad : '???'}</b> ${rozet(tur)}<br>
      <small>${acik ? (m ? m.tanim : '') : '🔒 ' + ipucu(tur)}</small></span></div>`;
  }).join(''));
}

// Yeni kuş kartı: tuzaktan ya da yumurtadan çıkan kuş
function kartAc(kus, kaynak) {
  if (!kus) return;
  const doluysa = D.kuslar.length >= M.kapasite();
  kartAcik = true; // kart dışına dokununca kapanmasın, kuş kaybolmasın
  modalAc(`<div class="kart">${kus.yeniTur ? '<div class="yeniTur">✨ YENİ TÜR KEŞFEDİLDİ ✨</div>' : ''}
    <div class="kartJeton">${jeton(kus, 96)}</div>
    <h3>${kus.ad} ${cinsiyet(kus)}</h3><p>${TURLER[kus.tur].ad} ${rozet(kus.tur)}</p>
    <p>${MUT_ADI[fenotip(kus.genler)]} · <b>${kondisyonAdi(kus.tuy)}</b> (${kus.tuy.toFixed(3)}) · Desen #${kus.tohum}</p>
    <p><small>${metinler.turler[kus.tur] ? metinler.turler[kus.tur].kisilik : ''}</small></p>
    <div class="dugmeler">${dugme('🏡 Köye al', () => { if (M.kusEkle(kus)) { modalKapat(); oyun.events.emit('kusGeldi', kus, kaynak); } }, doluysa ? 'disabled' : 'class="ana"')}
    ${dugme(`🪙 Sat · ${kusDegeri(kus)}`, () => { D.kuslar.push(kus); M.kusSat(kus.id); modalKapat(); })}</div>
    ${doluysa ? '<p><small>Kuş Evi dolu. Geliştir ya da bir kuş sat.</small></p>' : ''}</div>`);
}

// --- Görevler ---
function gorevlerAc() { gorevlerCiz(); }
function gorevlerCiz() {
  const A = G.ANA[D.gorevler.anaNo], i = G.anaIlerleme();
  let html = `${kapat()}<h3>📜 Görevler</h3>`;
  if (A) {
    const m = G.anaMetin(D.gorevler.anaNo), hazir = i.ilerleme >= i.hedef;
    html += `<div class="nine"><span class="nineYuz">👵</span><div><b>Kuşçu Nine</b><p>${m.soz || m.baslik}</p></div></div>
      <div class="satir gorev ${hazir ? 'hazirG' : ''}"><span class="ks"><b>⭐ ${m.baslik}</b> <small>(${D.gorevler.anaNo + 1}/${G.ANA.length})</small><br>
      ${cubuk(i.ilerleme / i.hedef * 100, '#f2a516')} <small>${i.ilerleme}/${i.hedef}</small><br><small>Ödül: ${G.odulYazi(A.odul)}</small></span>
      ${dugme('Al', () => G.anaAl(), hazir ? 'class="ana"' : 'disabled')}</div>`;
  } else html += '<div class="nine"><span class="nineYuz">👵</span><div><b>Kuşçu Nine</b><p>Bütün görevlerimi bitirdin yavrum, sen artık gerçek bir kuşçusun!</p></div></div>';
  html += '<p class="baslik2"><b>☀️ Günlük görevler</b> <small>(her gün yenilenir)</small></p>';
  html += D.gorevler.gunluk.map((g, n) => {
    const t = G.GUNLUK_HAVUZ[g.id], hazir = !g.alindi && g.ilerleme >= t.hedef;
    return `<div class="satir gorev ${hazir ? 'hazirG' : ''} ${g.alindi ? 'alindi' : ''}"><span class="ks"><b>${t.ad}</b><br><small>${t.metin}</small><br>
      ${cubuk(g.ilerleme / t.hedef * 100, '#7ad35a')} <small>${g.ilerleme}/${t.hedef}</small> · <small>${G.odulYazi(t.odul)}</small></span>
      ${g.alindi ? '<small>✔ Alındı</small>' : dugme('Al', () => G.gunlukAl(n), hazir ? 'class="ana"' : 'disabled')}</div>`;
  }).join('');
  modalAc(html);
  gorevPencereAcik = true; // açıkken ilerleme değişirse yeniden çizilir
}
// --- Emeği geçenler (lisans gereği kaynak ve yazarlar) ---
function krediAc() {
  const bag = (url, metin) => (url ? `<a href="${url}" target="_blank" rel="noopener">${metin}</a>` : metin);
  modalAc(`${kapat()}<h3>ℹ️ Emeği geçenler</h3><div class="kredi">
    <p><b>🎶 Müzik</b></p><p>• Mara Records (Suno ile üretildi)</p>
    <p><b>🎵 Kuş sesleri</b></p><p>• Yakın cıvıltılar oyunun kendi kodunda üretilir, uzak doğa sesi ElevenLabs ile üretildi.</p>
    <p><b>🛠️ Yazılım</b></p><p>• ${bag('https://phaser.io', 'Phaser 3')} — MIT Lisansı, © Phaser Studio Inc.</p>
    <p><b>🎨 Görseller ve metinler</b></p><p>• Oyun için Google Gemini ile üretilmiştir.</p></div>`);
}