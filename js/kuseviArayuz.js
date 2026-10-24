// Kuş Evi ekranının arayüzü: köy ile geçiş, kuş bilgi kartı, avatar şeridi, eylemler, ikram tepsisi ve Kuş Defteri.
import { TURLER, kondisyonAdi } from './turler.js';
import { D, dinle, sureYazi, simdi } from './durum.js';
import { MUT_ADI, fenotip, TARIFLER } from './genetik.js';
import * as M from './mekanik.js';
import { IKRAMLAR, FAVORI, stok, ikramAl, ikramVer } from './ikram.js';
import { jeton, dugme, modalAc, cinsiyet, cubuk, rozet, kapat, metinler, bildirim } from './arayuz.js';

const $ = (s) => document.querySelector(s);
let oyun, acik = false, defterSekme = 'soy';
const sahne = () => oyun.scene.getScene('kusevi');
const secili = () => { const s = sahne(); return s && M.kusBul(s.secili); };

export function kuseviArayuzKur(o) {
  oyun = o;
  $('#dKusevi').onclick = () => gir();
  $('#dKoyeDon').onclick = () => cik();
  oyun.events.on('kuseviGir', (id) => gir(id));
  oyun.events.on('kuseviHazir', () => ciz());
  oyun.events.on('kuseviSev', sev);
  dinle(() => { if (acik) ciz(); });
  setInterval(() => { if (acik) ciz(); }, 5000);
}

function gir(id) {
  if (!D.kuslar.length) return bildirim('Henüz kuşun yok. Tuzak kurarak kuş yakalayabilirsin 🪤');
  $('#binaPanel').classList.remove('acik');
  $('#modal').classList.remove('acik');
  acik = true;
  document.body.classList.add('kusevi-modu');
  oyun.scene.sleep('koy');
  const s = sahne();
  const hedef = id || (s && s.secili) || D.kuslar[0].id;
  if (oyun.scene.isActive('kusevi') || oyun.scene.isSleeping('kusevi')) { oyun.scene.wake('kusevi'); s.kusSec(hedef); ciz(); }
  else oyun.scene.start('kusevi', { id: hedef });
}

function cik() {
  acik = false;
  document.body.classList.remove('kusevi-modu');
  oyun.scene.sleep('kusevi');
  oyun.scene.wake('koy');
}

function sec(id) { const s = sahne(); if (s) { s.kusSec(id); ciz(); } }

function sev() {
  const k = secili(), s = sahne();
  if (!k || !s) return;
  if (M.kusSev(k.id)) { s.kus.sevil(); bildirim(`💗 ${k.ad} sevildi! Mutluluk: ${Math.round(k.mutluluk)}`); }
  else { s.kus.oksan(); bildirim(`💗 ${k.ad} biraz önce sevildi. Okşamak için parmağını üstünde gezdir`); }
}

function ikramTikla(id) {
  const k = secili(), s = sahne();
  if (!k || !s) return;
  if (stok(id) <= 0) return satinAlSor(id);
  if (s.kus.durum !== 'bos' && s.kus.durum !== 'oksaniyor') return;
  const sonuc = ikramVer(k, id);
  if (sonuc) { s.ikramUcur(id); s.kus.ikramYe(sonuc.sevdi); }
}

function satinAlSor(id) {
  const I = IKRAMLAR[id], fiyat = I.fiyat.altin ? `${I.fiyat.altin} 🪙` : `${I.fiyat.elmas} 💎`;
  modalAc(`${kapat()}<div class="kart"><img class="ikramBuyuk" src="assets/kusevi/ikram_${id}.png" alt=""><h3>${I.ad}</h3><p>${I.aciklama}</p>
    <div class="dugmeler">${dugme(`Satın al · ${fiyat}`, () => { if (ikramAl(id)) { $('#modal').classList.remove('acik'); bildirim(`${I.ikon} ${I.ad} alındı`); } }, 'class="ana"')}</div></div>`);
}

// --- Çizim ---
function ciz() {
  const k = secili();
  if (!k) return;
  const tur = TURLER[k.tur], buff = k.buff || {};
  const etkiler = [buff.nadir && '🍯', buff.kalsiyum && '🧂', k.testli && '🧪'].filter(Boolean).join(' ');
  $('#kKart').innerHTML = `<div class="kkUst"><b>${k.ad}</b> ${cinsiyet(k)} <span>${tur.ad}</span> ${rozet(k.tur)}${etkiler ? `<span class="kkEtki" title="Aktif ikram etkileri">${etkiler}</span>` : ''}</div>
    <div class="kkAlt"><span>${MUT_ADI[fenotip(k.genler)]} · <b>${kondisyonAdi(k.tuy)}</b> (${k.tuy.toFixed(3)})</span>
    <span class="kkBar">😊 ${cubuk(k.mutluluk, '#ff8fb0')}</span><span class="kkBar">🌾 ${cubuk(k.tokluk, '#e9c46a')}</span></div>`;
  $('#kAvatar').innerHTML = D.kuslar.map((x) => {
    const durum = M.mesgulMu(x) ? '💞' : x.mutluluk < 40 ? '😢' : x.tokluk < 30 ? '🍽️' : '';
    return `<button class="kAv ${x.id === k.id ? 'secili' : ''}" data-is-av="${x.id}" title="${x.ad}">${jeton(x, 50)}${durum ? `<i>${durum}</i>` : ''}<small>${x.ad}</small></button>`;
  }).join('') + Array.from({ length: Math.max(0, M.kapasite() - D.kuslar.length) }, () => '<div class="kAv bos">＋</div>').join('');
  document.querySelectorAll('[data-is-av]').forEach((b) => { b.onclick = () => sec(+b.dataset.isAv); });
  $('#kTepsi').innerHTML = Object.entries(IKRAMLAR).map(([id, I]) => {
    const n = stok(id), fiyat = I.fiyat.altin ? `${I.fiyat.altin}🪙` : `${I.fiyat.elmas}💎`;
    return `<button class="kIkram ${n ? '' : 'yok'}" data-ikram="${id}" title="${I.ad}: ${I.aciklama}"><img src="assets/kusevi/ikram_${id}.png" alt="">
      <small>${I.ad}</small><b>${n ? n : fiyat}</b></button>`;
  }).join('');
  document.querySelectorAll('[data-ikram]').forEach((b) => { b.onclick = () => ikramTikla(b.dataset.ikram); });
}

// --- Kuş Defteri ---
const GEN_ADI = { ino: 'Ino (Lutino / Albino)', mavi: 'Mavi seri', alaca: 'Alaca' };
const IPUCU = {
  cennet: 'Avustralyalı geveze bir kuşla sarı tüylü bir şarkıcının aşkından doğduğu söylenir...',
};

export function defterAc(sekme = defterSekme) {
  const k = secili();
  if (!k) return;
  defterSekme = sekme;
  const sekmeler = [['soy', '🌳 Soy'], ['gen', '🧬 Genler'], ['ipucu', '💡 İpuçları']];
  let icerik = '';
  if (sekme === 'soy') {
    const yas = sureYazi(simdi() - (k.dogum || simdi()));
    const favoriBilinir = D.favoriKesif && D.favoriKesif[k.tur];
    icerik = `<p>${k.ebeveyn ? `👪 Anne-baba: <b>${k.ebeveyn.join(' & ')}</b>` : '🌿 Doğada yakalandı'}</p>
      <p>⏳ Köyde: <b>${yas}</b></p>
      <p>🍽️ En sevdiği ikram: <b>${favoriBilinir ? `${IKRAMLAR[FAVORI[k.tur]].ikon} ${IKRAMLAR[FAVORI[k.tur]].ad}` : '??? (farklı ikramlar dene)'}</b></p>
      <p><small>${metinler.turler[k.tur] ? metinler.turler[k.tur].tanim : ''}</small></p>`;
  } else if (sekme === 'gen') {
    icerik = `<p>Görünen renk: <b>${MUT_ADI[fenotip(k.genler)]}</b> · Tüy: <b>${kondisyonAdi(k.tuy)}</b> · Desen #${k.tohum}</p>` +
      Object.entries(GEN_ADI).map(([g, ad]) => {
        const kopya = k.genler[g][0] + k.genler[g][1];
        const cekinik = g !== 'alaca';
        let deger = '?';
        if (k.testli) deger = kopya === 0 ? 'Yok' : cekinik && kopya === 1 ? '🔸 Taşıyıcı (gizli, 1 kopya)' : '✅ Görünür';
        return `<div class="satir"><span class="ks"><b>${ad}</b><br><small>${deger}</small></span></div>`;
      }).join('') +
      (k.testli ? '<p><small>Taşıyıcı iki kuşu çiftleştirirsen yavruda bu renk görünebilir.</small></p>'
        : `<p><small>Gizli taşıyıcı genleri görmek için bu kuşa 🧪 Genetik test ikramı ver.</small></p>`);
  } else {
    const ilgili = TARIFLER.filter((t) => t.ebeveyn.includes(k.tur));
    icerik = ilgili.length ? ilgili.map((t) => {
      const biliniyor = D.kesifler.includes(t.tur), ad = TURLER[t.tur].ad;
      const metin = biliniyor
        ? `${t.ebeveyn.map((e) => TURLER[e].ad).join(' + ')} → <b>${ad}</b> (%${Math.round(t.sans * 100)} şans${t.kosul ? ', özel şartlar var' : ''})`
        : (IPUCU[t.tur] || (metinler.ketzalIpuclari[0] || 'Gizemli bir söylenti var...'));
      return `<div class="satir"><span class="ks"><b>${biliniyor ? '📖 ' + ad : '🔒 ???'}</b><br><small>${metin}</small></span></div>`;
    }).join('') : '<p>Bu türle ilgili bilinen bir gizli tarif yok... henüz.</p>';
    icerik += '<p><small>🍯 Ballı yem çubuğu, sonraki çiftleşmede gizli tür şansını ikiye katlar.</small></p>';
  }
  modalAc(`${kapat()}<h3>📖 ${k.ad} · Kuş Defteri</h3><div class="sekmeler">${sekmeler.map(([id, ad]) =>
    dugme(ad, () => defterAc(id), id === sekme ? 'class="ana"' : '')).join('')}</div>${icerik}`);
}

// Eylem düğmeleri (index.html'deki data-kusevi="...")
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-kusevi]');
  if (!b || !acik) return;
  const s = sahne(), eylem = b.dataset.kusevi;
  if (eylem === 'defter') return defterAc();
  if (!s || !s.kus || (s.kus.durum !== 'bos' && s.kus.durum !== 'oksaniyor')) return;
  if (eylem === 'sev') sev();
  else if (eylem === 'tara') s.kus.temizlen();
});
