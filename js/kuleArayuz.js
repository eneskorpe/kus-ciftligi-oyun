// Gözlem Kulesi arayüzü: bina paneli (keşif gönderme ve karşılama), dürbün mini oyunu, Gözlem Defteri.
import { TURLER } from './turler.js';
import { D, sureYazi } from './durum.js';
import * as M from './mekanik.js';
import { BOLGELER, kuleDurumu, bolgeAcik, kesifYeri, kesifSuresi, kesifGonder, kesifHizlandir, kesifBitir, kusBulmaSansi,
  getirebilir, kalanBakis, durbunHakki, bakisBasla, durbunKusu, fotografCek, DEFTER_ODULU } from './kule.js';
import { dugme, modalAc, kapat, modalKilitle, cubuk, kusSatiri, bildirim, kartAc, rozet } from './arayuz.js';
import { kusMini } from './kusMini.js';

const $ = (s) => document.querySelector(s);
let secBolge = 'gol', yenile = () => {};
const BOLGE_SUSU = { gol: ['🌾', '🪷', '🌿', '🪨'], orman: ['🌳', '🌲', '🍄', '🌿'], dag: ['🪨', '⛰️', '🌲', '🪨'] };

// --- Bina paneli (arayuz.js panelCiz çağırır) ---
export function kulePaneli(panelCiz) {
  yenile = panelCiz;
  const K = kuleDurumu(), sv = D.binalar.kule.sv;
  if (!bolgeAcik(secBolge)) secBolge = 'gol';
  const isler = K.kesif.map((E, n) => {
    const k = M.kusBul(E.kusId), B = BOLGELER[E.bolge], kalan = M.kalanSure(E);
    if (kalan <= 0) return `<div class="is"><div class="hazir">${B.ikon} ${k ? k.ad : 'Kuşun'} ${B.den} döndü!</div></div>
      <div class="dugmeler">${dugme('🎁 Karşıla', () => { const s = kesifBitir(n); if (s && s.kus) kartAc(s.kus, 'kesif'); else panelCiz(); }, 'class="ana"')}</div>`;
    return `<div class="is"><div>${B.ikon} ${k ? k.ad : '?'} ${B.de}: <b>${sureYazi(kalan)}</b></div>${cubuk(100 - kalan / (E.bitis - E.bas) * 100, '#7ad35a')}</div>
      <div class="dugmeler">${dugme(`⚡ Bitir · ${M.elmasFiyati(kalan)} 💎`, () => kesifHizlandir(n))}</div>`;
  }).join('');
  const kalan = kalanBakis();
  const durbun = `<p class="baslik2">🔭 Dürbünle bak <small>(bugün ${kalan} / ${durbunHakki()})</small></p><div class="dugmeler">` +
    Object.entries(BOLGELER).map(([b, B]) => dugme(`${B.ikon} ${B.ad}${bolgeAcik(b) ? '' : ` 🔒 Sv. ${B.sv}`}`, () => durbunAc(b), bolgeAcik(b) && kalan ? '' : 'disabled')).join('') +
    `${dugme('📖 Gözlem Defteri', () => defterAc())}</div>`;
  const B = BOLGELER[secBolge], dolu = K.kesif.length >= kesifYeri();
  const bolgeler = '<div class="dugmeler">' + Object.entries(BOLGELER).map(([b, X]) =>
    dugme(`${X.ikon} ${X.ad} · ${bolgeAcik(b) ? `${X.erzak} 🪙` : `🔒 Sv. ${X.sv}`}`, () => { secBolge = b; panelCiz(); }, !bolgeAcik(b) ? 'disabled' : b === secBolge ? 'class="ana"' : '')).join('') + '</div>';
  const turler = Object.keys(B.turler).map((t) => (getirebilir(t) ? `${TURLER[t].ad}` : '???')).join(', ');
  const kuslar = [...D.kuslar].sort((a, b) => kusBulmaSansi(b) - kusBulmaSansi(a)).map((k) => {
    const d = M.mesgulMu(k) ? '<small>💤 Meşgul</small>' : dugme(`🧭 Gönder · %${Math.round(kusBulmaSansi(k) * 100)}`, () => kesifGonder(k.id, secBolge), dolu ? 'disabled' : 'class="ana"');
    return `<div class="satir">${kusSatiri(k)}<span class="dugmeSutun">${d}</span></div>`;
  }).join('');
  return isler + durbun + '<p class="baslik2">🧭 Keşfe kuş gönder</p>' + bolgeler +
    `<p><small>${B.ikon} ${B.aciklama}. ⏱ ${sureYazi(kesifSuresi(secBolge))} · Burada yaşayanlar: ${turler}</small></p>` +
    `<p><small>Gönderdiğin kuş yeni bir arkadaşla ya da hediyeyle döner. Bağı güçlü ve 🎁 Getir yeteneği iyi olan kuşun yeni kuş bulma şansı yüksektir. Nadir türleri önce dürbünle görmelisin. Aynı anda ${kesifYeri(sv)} keşif.</small></p>` + kuslar;
}

// --- Dürbün mini oyunu: 20 saniye, çalılardan başını uzatan kuşların fotoğrafını çek ---
let oyunDurum = null;
function oyunBitir() { if (oyunDurum) oyunDurum.zaman.forEach((t) => { clearTimeout(t); clearInterval(t); }); oyunDurum = null; }
new MutationObserver(() => { if (!$('#modal').classList.contains('acik') && oyunDurum) { const d = oyunDurum; oyunBitir(); sonucKaydet(d); } })
  .observe($('#modal'), { attributes: true, attributeFilter: ['class'] });

const YER = [[12, 58], [30, 70], [48, 56], [66, 72], [84, 60], [22, 40], [74, 42]]; // saklanma yerleri (yüzde)
export function durbunAc(bolge) {
  if (!bakisBasla()) return bildirim('Bugünkü dürbün bakışların bitti. Yarın yine gel 🔭');
  oyunBitir();
  const B = BOLGELER[bolge], susler = BOLGE_SUSU[bolge];
  const d = oyunDurum = { bolge, cekilen: [], zaman: [], sure: 20 };
  modalKilitle(true);
  modalAc(`<h3>🔭 ${B.ad} · Dürbün</h3><p id="durbunMesaj">Başını uzatan kuşlara dokun, fotoğrafını çek! <b id="durbunSure">20</b> sn · 📷 <b id="durbunSay">0</b></p>
    <div class="durbun bolge-${bolge}" id="durbun">${YER.map(([x, y], i) => `<div class="saklanma" style="left:${x}%;top:${y}%" data-yer="${i}"><span class="kusYuva"></span><span class="sus">${susler[i % susler.length]}</span></div>`).join('')}<div class="flas"></div></div>`);
  const dogur = () => {
    if (oyunDurum !== d) return;
    const bos = [...document.querySelectorAll('.saklanma')].filter((e) => !e.classList.contains('dolu'));
    if (!bos.length) return;
    const yer = bos[Math.floor(Math.random() * bos.length)], tur = durbunKusu(bolge), nadir = TURLER[tur].nadirlik !== 'Yaygın';
    const yuva = yer.querySelector('.kusYuva');
    yuva.innerHTML = kusMini(tur, 46);
    yer.classList.add('dolu', 'cikti');
    yuva.onclick = () => {
      if (!yer.classList.contains('cikti')) return;
      yer.classList.remove('cikti'); yer.classList.add('cekildi');
      d.cekilen.push(tur);
      const f = $('#durbun .flas'); f.classList.remove('yak'); void f.offsetWidth; f.classList.add('yak');
      $('#durbunSay').textContent = d.cekilen.length;
      $('#durbunMesaj').firstChild.textContent = `📷 ${TURLER[tur].ad}! `;
    };
    // Nadir kuş daha kısa görünür
    d.zaman.push(setTimeout(() => { yer.classList.remove('cikti'); }, nadir ? 850 : 1300));
    d.zaman.push(setTimeout(() => { yer.classList.remove('dolu', 'cekildi'); yuva.innerHTML = ''; yuva.onclick = null; }, (nadir ? 850 : 1300) + 400));
  };
  d.zaman.push(setInterval(() => { dogur(); if (Math.random() < 0.35) dogur(); }, 900));
  d.zaman.push(setInterval(() => {
    d.sure--; const e = $('#durbunSure'); if (e) e.textContent = d.sure;
    if (d.sure <= 0) { oyunBitir(); modalKilitle(false); sonucGoster(d); }
  }, 1000));
}
function sonucKaydet(d) { modalKilitle(false); return fotografCek(d.bolge, d.cekilen); }
function sonucGoster(d) {
  const yeni = sonucKaydet(d);
  const say = {}; d.cekilen.forEach((t) => { say[t] = (say[t] || 0) + 1; });
  modalAc(`<div class="kart"><h3>📷 ${BOLGELER[d.bolge].ad} fotoğrafları</h3>` +
    (d.cekilen.length ? `<div class="fotolar">${Object.entries(say).map(([t, n]) => `<span class="foto">${kusMini(t, 52)}<small>${TURLER[t].ad}${n > 1 ? ` ×${n}` : ''}${yeni.includes(t) ? '<br><b>✨ Yeni!</b>' : ''}</small></span>`).join('')}</div>`
      : '<p>Bu sefer hiç fotoğraf çekemedin. Bir dahaki sefere daha hızlı ol!</p>') +
    `<div class="dugmeler">${dugme('📖 Defter', () => defterAc())}${dugme('Tamam', () => { $('#modal').classList.remove('acik'); yenile(); }, 'class="ana"')}</div></div>`);
}

// --- Gözlem Defteri: bölge bölge görülen türler ---
export function defterAc() {
  const K = kuleDurumu();
  modalAc(`${kapat()}<h3>📖 Gözlem Defteri</h3><p><small>Dürbünle fotoğrafını çektiğin türler buraya işlenir. Bir bölgenin bütün türlerini bulunca +${DEFTER_ODULU} 💎.</small></p>` +
    Object.entries(BOLGELER).map(([b, B]) => {
      const turler = Object.keys(B.turler), gorulen = turler.filter((t) => K.defter[t]).length;
      return `<p class="baslik2">${B.ikon} ${B.ad} <small>${gorulen} / ${turler.length}${K.tamam.includes(b) ? ' 🏅' : ''}${bolgeAcik(b) ? '' : ` · 🔒 Kule Sv. ${B.sv}`}</small></p>` +
        turler.map((t) => {
          const n = K.defter[t];
          return `<div class="satir ${n ? '' : 'kilitli'}"><span class="defterKus">${kusMini(t, 40, !n)}</span><span class="ks"><b>${n ? TURLER[t].ad : '???'}</b> ${n ? rozet(t) : ''}<br>
            <small>${n ? `📷 ${n} fotoğraf${D.kesifler.includes(t) ? ' · 🏡 köyünde yaşadı' : ''}` : 'Henüz görülmedi'}</small></span></div>`;
        }).join('');
    }).join(''));
}
