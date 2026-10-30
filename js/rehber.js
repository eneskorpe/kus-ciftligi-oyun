// Bilge Baykuş: oyunun başında oyuncuyu adım adım yönlendiren rehber ve yeni binalar açıldığında gelen kısa tanıtımlar.
// Konuşma kutusu ekranın üstünde (yüz + yazı), köyde de baykuşun kendisi anlatılan binanın yanında durur; ok hedefi gösterir.
// Kayıt: D.rehber = { adim (sayı ya da 'bitti'), acildi: [tip], kuruldu: [tip] }
import { D, degisti, xpEkle, SINIRSIZ } from './durum.js';
import { BINALAR, YENI_BINALAR } from './binalar.js';
import { olayDinle } from './gorevler.js';
import * as M from './mekanik.js';
import { izoEkran } from './izo.js';

const $ = (s) => document.querySelector(s);
const AD = 'Bilge Baykuş';

// --- Öğretici adımları ---
// metin: sırayla gösterilen konuşmalar (Devam ile). bekle: adımı bitiren olay (mekanik.js gorevOlay). tamam: olay yerine durum.
// ipucu: konuşma bitince oyuncunun yapacağı iş. hedef: { bina } ya da { dom } (ok oraya bakar).
const ADIMLAR = [
  { yuz: 'konus', poz: 'selam', metin: [
    'Hoş geldin, genç kuşçu! Ben Bilge Baykuş. Bu köyün kuşlarını yıllardır şu defterime yazarım.',
    'Burası artık senin çiftliğin. Bak, üç küçük dostun seni bekliyordu bile!',
    'Gel, sana her şeyi adım adım göstereyim. Acelen varsa sağ üstteki ✖ ile beni susturabilirsin, hiç gücenmem.'] },
  { yuz: 'dusun', poz: 'goster', hedef: { bina: 'tuzak' }, bekle: 'tuzakKur', tamam: () => !!D.tuzak, metin: [
    'Önce yeni kuşlar bulalım. Şu gördüğün Tuzak Kulübesi. Merak etme, kuşlara hiç zarar vermez; içine yem koyarız, onlar da misafirliğe gelir.'],
  ipucu: 'Tuzak Kulübesi\'ne dokun ve 🌱 Kuş tohumu ile tuzak kur.' },
  { yuz: 'konus', poz: 'okur', hedef: { bina: 'tuzak' }, bekle: 'tuzakAc', tamam: () => !D.tuzak, metin: [
    'Harika! Şimdi biraz sabır. Kuşlar yemin kokusunu alınca kendiliğinden gelir.'],
  ipucu: 'Süre dolunca kulübenin üstünde kafes balonu çıkar: dokun ve tuzağı aç. Beklemek istemezsen ⚡ ile hızlandırabilirsin.' },
  { yuz: 'saskin', poz: 'sevinc', bekle: ['kusEkle', 'sat'], metin: [
    'Ooo, bak kim gelmiş! Her kuşun kendine has bir rengi, tüyü ve huyu vardır. Kartında hepsi yazıyor.'],
  ipucu: 'Karttaki 🏡 Köye al düğmesine dokun.' },
  { yuz: 'mutlu', poz: 'selam', bekle: 'sev', metin: [
    'Kuşlar sevgiyle büyür. Mutlu kuş şarkı söyler, altın kazandırır, yavru yapmaya da gönüllü olur.'],
  ipucu: 'Meydanda gezinen kuşlarından birine dokunup onu sev.' },
  { yuz: 'konus', poz: 'goster', hedef: { bina: 'yemlik' }, bekle: 'yemlikDoldur', tamam: () => M.yemlikFiyati() === 0, metin: [
    'Karnı tok kuş, mutlu kuştur! Kuşların acıkınca Yemlik\'e gidip kendileri yer. Yem biterse acıkıp üzülürler.'],
  ipucu: 'Yemlik\'e dokun ve 🌾 Doldur düğmesine bas.' },
  { yuz: 'dusun', poz: 'okur', hedef: { bina: 'kusevi' }, metin: [
    'Mutlu kuşların Kuş Evi\'nde altın biriktirir. Kuş ne kadar nadirse o kadar çok kazandırır.',
    'Kuş Evi\'nin üstünde altın yığını görünce dokun ve topla. Altınlarla köyünü büyüteceksin.'] },
  { yuz: 'konus', poz: 'goster', hedef: { bina: 'kulucka' }, bekle: 'ciftlestir', tamam: () => !!D.kulucka, metin: [
    'Şimdi en sevdiğim kısım: yavrular! Bir erkek ♂ ve bir dişi ♀ kuşu Kuluçka\'da buluşturursan yumurta yaparlar.',
    'Yalnız ikisinin de mutlu ve tok olması gerek. Aç ya da küskün kuş çiftleşmek istemez.'],
  ipucu: 'Kuluçka\'ya dokun, bir erkek ve bir dişi seç, sonra 💞 Çiftleştir.' },
  { yuz: 'saskin', poz: 'okur', hedef: { bina: 'kulucka' }, bekle: 'yumurta', tamam: () => !D.kulucka, metin: [
    'Yumurta kuluçkaya yatınca sabırla bekleriz. Yavru, renk genlerini anne ve babasından alır.',
    'Bazen hiç beklemediğin bir renk çıkar. Bazı türleri buluşturursan bambaşka bir tür bile doğabilir... Bu sır şimdilik aramızda! 🤫'],
  ipucu: 'Yumurta hazır olunca Kuluçka\'ya dokun ve 🥚 çatlat.' },
  { yuz: 'konus', poz: 'goster', hedef: { bina: 'tuzak' }, tamam: () => !!D.insaat || ['tuzak', 'kulucka', 'kusevi', 'yemlik'].some((t) => D.binalar[t].sv >= 2), metin: [
    'Köyün ustası Kunduz Usta\'yı gördün mü? Binaları o büyütür, yeni binaları da o kurar.',
    'Geliştirilen bina daha hızlı çalışır ve yeni şeyler açar. Tuzak Kulübesi Sv. 2 olunca ay çekirdeği bile kullanabilirsin!'],
  ipucu: 'Tuzak Kulübesi\'ne dokun ve ⬆️ Sv. 2 düğmesine bas.',
  // Seviye ya da altın yetmiyorsa oyuncu bekletilmez; ne yapacağı söylenip geçilir
  ipucuVarsa: () => D.seviye >= M.SV_GEREK[2] && (SINIRSIZ || D.altin >= M.GELISTIRME_FIYATI[2]),
  yedek: 'Seviyen 2 olunca ve 300 🪙 biriktirince Tuzak Kulübesi\'ne dokun, ⬆️ Sv. 2 düğmesine bas. Görevlerini yaparak hızlıca XP kazanırsın.' },
  { yuz: 'dusun', poz: 'okur', hedef: { bina: 'kunduz' }, metin: [
    'Usta boştayken evine dokunursan köydeki ağaçları ve kayaları da kaldırır. Hem yer açılır, hem de biraz altın kazanırsın.'] },
  { yuz: 'konus', poz: 'goster', hedef: { dom: '#dDuzenle' }, metin: [
    'Köyünü kendi zevkine göre de düzenleyebilirsin: binaları taşı, taş yollar çiz. Burası senin köyün!'] },
  { yuz: 'konus', poz: 'goster', hedef: { dom: '#dInsa' }, metin: [
    'Seviye atladıkça İnşa menüsünde yeni binalar açılır: tarla, değirmen, klinik ve daha neler neler! Her biri açıldığında gelip sana anlatacağım.'] },
  { yuz: 'dusun', poz: 'okur', hedef: { dom: '#dGorevler' }, metin: [
    'Bir de Görevler var. Her gün yeni görevler gelir, Kuşçu Nine de sana büyük hedefler verir. Ödülleri toplamayı unutma!',
    'Ansiklopedi\'de keşfettiğin türler birikir. Hepsini bulabilecek misin, merak ediyorum.'] },
  { yuz: 'mutlu', poz: 'sevinc', metin: [
    'İşte bu kadar! Artık sen de gerçek bir kuşçusun. 🎉',
    'Bu da benden küçük bir hediye: 100 🪙 ve 3 💎. Bir şeye takılırsan ben hep buralardayım!'], odul: true },
];

// --- Yeni binaların tanıtımları: oyuncu seviyesi yetince (acildi) ve bina ilk kez kurulunca (kuruldu) ---
const TANITIM = {
  tarla: ['Yaşasın, Tohum Tarlası artık açık! Kendi tohumunu yetiştirirsen tuzak ve yemlik için altın harcamazsın.',
    'Tarlan hazır! Dokun ve bir ekin seç. Hasat ettiğin tohumlar ambara gider; yemliği ve tuzağı onlarla doldurursun.'],
  klinik: ['Kuşlar da bazen nezle olur, tüy döker ya da halsizleşir. Artık Kuş Kliniği kurabilirsin!',
    'Klinik açıldı! Uzun süre aç ya da mutsuz kalan kuş rahatsızlanabilir. Buraya getir, hemen iyileştirelim. Check-up da bir süre korur.'],
  degirmen: ['Değirmen açıldı! Tarladaki hasadı öğütüp karışık yem ve leziz ikramlar yapabilirsin.',
    'Değirmen dönmeye başladı! Tohumlarını öğüt: karışık yem yemliğe, ikramlar Kuş Evi\'ndeki tepsiye gider.'],
  siparis: ['Köylüler kuşlarını çok merak ediyor! Sipariş Panosu kurarsan sana sipariş verecekler.',
    'Pano asıldı! Köylüler belli bir tür, renk ya da tüy kalitesinde kuş ister. Uygun kuşun varsa teslim et, güzel ödüller kap. Panonun üstünde 📜 görürsen uygun kuşun var demektir.'],
  kres: ['Minik yavrular için artık Kuş Kreşi kurabilirsin!',
    'Kreş hazır! Yumurtadan çıkan yavruyu kreşe gönder. Büyürken üç kez beslersen tüyü daha da güzel olur. Üstelik Kuş Evi\'nde yer kaplamaz.'],
  kule: ['Gözlem Kulesi artık kurulabilir! Oradan göle, dağa ve ormana bakarız; oralarda bambaşka kuşlar yaşıyor.'],
  muze: ['En güzel kuşlarını sergileyeceğin Kuş Müzesi artık kurulabilir!'],
  lab: ['Genetik Laboratuvarı açıldı! İki kuşun yavrusunun nasıl olabileceğini önceden görebileceksin.'],
};

// --- Durum ---
const parametre = new URLSearchParams(location.search);
if (!D.rehber || parametre.has('rehber')) {
  // Yeni oyunda öğretici baştan başlar; eski kayıtta ise oyuncu zaten ilerlemiştir, sadece sonraki tanıtımlar gelir
  const yeni = parametre.has('rehber') || (D.seviye === 1 && D.xp === 0 && !D.tuzak && D.kuslar.length <= 3);
  D.rehber = { adim: yeni ? 0 : 'bitti', acildi: yeni ? [] : YENI_BINALAR.filter((t) => D.seviye >= BINALAR[t].acilis),
    kuruldu: yeni ? [] : YENI_BINALAR.filter((t) => D.binalar[t] && D.binalar[t].sv > 0) };
}
const R = D.rehber;
let konusma = null; // { satirlar, n, yuz, poz, hedef, bitince, ipucu }
let yazi = { tam: '', n: 0, t: 0 };
let sahne = null, baykus = null, gecOnay = false;

// --- Kutu ---
function kutuKur() {
  document.body.insertAdjacentHTML('beforeend', `<div id="rehber" class="kutu"><img id="rehberYuz" alt="">
    <div class="rIc"><b>🦉 ${AD}</b><p id="rehberMetin"></p><div class="rAlt"><button id="rehberDevam">Devam ▸</button></div></div>
    <button id="rehberGec" title="Rehberi kapat">✖</button></div><div id="rehberOk"></div>`);
  $('#rehberDevam').onclick = (e) => { e.stopPropagation(); devam(); };
  $('#rehber').onclick = () => { if (yazi.n < yazi.tam.length) yazi.n = yazi.tam.length; }; // dokununca yazı hemen tamamlanır
  $('#rehberGec').onclick = (e) => {
    e.stopPropagation();
    if (R.adim === 'bitti') return kapat();
    if (!gecOnay) { gecOnay = true; $('#rehberMetin').textContent = 'Öğreticiyi atlamak istediğine emin misin? Emin isen ✖\'e bir kez daha dokun.'; yazi = { tam: '', n: 0 }; return; }
    R.adim = 'bitti'; degisti(); kapat();
  };
}

function goster(k) {
  konusma = k; gecOnay = false;
  document.body.classList.add('rehber-acik');
  $('#rehber').classList.add('acik');
  satirYaz();
}
function satirYaz() {
  const k = konusma, beklemede = k.n >= k.satirlar.length;
  $('#rehberYuz').src = `assets/rehber/yuz_${beklemede ? 'konus' : k.yuz}.png`;
  yazi = { tam: beklemede ? '👉 ' + k.ipucu : k.satirlar[k.n], n: 0 };
  $('#rehberMetin').textContent = '';
  $('#rehber').classList.toggle('gorev', beklemede);
  $('#rehberDevam').style.display = beklemede ? 'none' : '';
  $('#rehberDevam').textContent = k.n === k.satirlar.length - 1 && !k.ipucu ? (k.bitirYazi || 'Tamam ✓') : 'Devam ▸';
}
function devam() {
  const k = konusma;
  if (!k) return;
  if (yazi.n < yazi.tam.length) { yazi.n = yazi.tam.length; return; } // önce yazı bitsin
  k.n++;
  if (k.n < k.satirlar.length || k.ipucu) return satirYaz();
  kapat();
  k.bitince && k.bitince();
}
function kapat() {
  konusma = null;
  document.body.classList.remove('rehber-acik');
  $('#rehber').classList.remove('acik', 'gorev');
  $('#rehberOk').style.display = 'none';
}

// --- Akış ---
function adimBaslat() {
  if (R.adim === 'bitti') return;
  const A = ADIMLAR[R.adim];
  if (!A) { R.adim = 'bitti'; degisti(); return; }
  A.oldu = false;
  const ipucu = A.ipucuVarsa && !A.ipucuVarsa() ? null : A.ipucu;
  goster({ satirlar: ipucu || !A.yedek ? A.metin : [...A.metin, A.yedek], n: 0, yuz: A.yuz, poz: A.poz, hedef: A.hedef, ipucu, bitirYazi: A.odul ? 'Teşekkürler! 🎁' : null, bitince: adimBitti });
}
function adimBitti() {
  const A = ADIMLAR[R.adim];
  if (A && A.odul) { D.altin += 100; D.elmas += 3; xpEkle(20); }
  R.adim++;
  if (R.adim >= ADIMLAR.length) R.adim = 'bitti';
  degisti();
  if (baykus) baykus.zipla = 1;
  setTimeout(sirayaBak, 700);
}
// Beklenen olay oldu: ipucu gösteriliyorsa adım biter (konuşma sürerken olursa konuşma bitince hemen geçilir)
olayDinle((tip) => {
  if (R.adim === 'bitti' || !konusma || konusma.bitince !== adimBitti) return;
  const A = ADIMLAR[R.adim];
  if ([].concat(A.bekle).includes(tip)) { A.oldu = true; if (konusma.n >= konusma.satirlar.length) { kapat(); adimBitti(); } }
});
// Sırada ne var: öğretici adımı, yoksa bekleyen bina tanıtımı
function sirayaBak() {
  if (konusma || document.body.classList.contains('kusevi-modu') || document.body.classList.contains('duzen-modu')) return;
  if (R.adim !== 'bitti') return adimBaslat();
  for (const t of YENI_BINALAR) {
    const T = TANITIM[t];
    if (!T) continue;
    if (D.seviye >= BINALAR[t].acilis && !R.acildi.includes(t)) {
      R.acildi.push(t); degisti();
      return goster({ satirlar: [`🎉 Seviye ${BINALAR[t].acilis}! ${T[0]}`], n: 0, yuz: 'saskin', poz: 'sevinc', hedef: { dom: '#dInsa' } });
    }
    if (D.binalar[t] && D.binalar[t].sv > 0 && !R.kuruldu.includes(t)) {
      R.kuruldu.push(t); degisti();
      return goster({ satirlar: [T[1] || `${BINALAR[t].ad} kuruldu! Bu binanın işleri çok yakında başlıyor.`], n: 0, yuz: 'konus', poz: 'goster', hedef: { bina: t } });
    }
  }
}
export function rehberBastan() { R.adim = 0; degisti(); kapat(); sirayaBak(); }

// Ok: hedef bir düğmeyse onun üstünde, binaysa köydeki yerinde zıplar. Panel ya da pencere açıkken gizlenir.
function okGuncelle(zaman) {
  const ok = $('#rehberOk'), h = konusma && konusma.hedef;
  const kapali = !h || $('#modal').classList.contains('acik') || $('#binaPanel').classList.contains('acik');
  let x, y;
  if (!kapali && h.dom) {
    const r = $(h.dom).getBoundingClientRect();
    if (r.width) { x = r.left + r.width / 2; y = r.top; }
  } else if (!kapali && h.bina && sahne) {
    const b = sahne.binalar.find((v) => v.tip === h.bina), cam = sahne.cameras.main, c = sahne.game.canvas.getBoundingClientRect();
    if (b) {
      const o = c.width / sahne.scale.width;
      x = c.left + (b.tepe.x - cam.worldView.x) * cam.zoom * o; y = c.top + (b.tepe.y + 30 - cam.worldView.y) * cam.zoom * o;
    }
  }
  if (x === undefined) { ok.style.display = 'none'; return; }
  ok.style.display = 'block';
  ok.style.transform = `translate(${x - 22}px, ${y - 58 - Math.abs(Math.sin(zaman / 220)) * 12}px)`;
}

// --- Köydeki baykuş: anlatılan binanın önünde durur; konuşma yoksa görünmez ---
const POZ_OLCEK = { selam: 1, goster: 1, okur: 1, sevinc: 1.1 }, BOY = 150;
export function rehberKur(s) {
  sahne = s;
  for (const p of Object.keys(POZ_OLCEK)) if (!s.textures.exists('rehber_' + p)) return () => {};
  const img = s.add.image(0, 0, 'rehber_selam').setOrigin(0.5, 1).setVisible(false);
  baykus = { img, x: null, y: null, zipla: 0 };
  s.events.once('shutdown', () => { if (baykus && baykus.img === img) baykus = null; sahne = null; });
  setTimeout(sirayaBak, 1200);
  return (zaman, dt) => {
    okGuncelle(zaman);
    const k = konusma;
    img.setVisible(!!k);
    if (!k) { baykus.x = null; baykus.odak = null; return; }
    // Hedef binanın ön köşesinin solunda; hedef yoksa meydanda
    const b = k.hedef && k.hedef.bina && s.binalar.find((v) => v.tip === k.hedef.bina);
    if (b && baykus.odak !== b) { baykus.odak = b; const c = s.cameras.main; c.pan(b.tepe.x, b.tepe.y - c.worldView.height * 0.12, 700, 'Sine.easeInOut'); } // kamera binaya kayar; bina konuşma kutusunun altında kalsın
    const hedef = b ? { x: b.k.alt.x - 85, y: b.k.alt.y + 22 } : izoEkran(7.2, 12.2);
    if (baykus.x === null) { baykus.x = hedef.x; baykus.y = hedef.y; }
    const a = Math.min(1, dt / 250);
    baykus.x += (hedef.x - baykus.x) * a; baykus.y += (hedef.y - baykus.y) * a;
    const poz = k.n >= k.satirlar.length ? 'goster' : k.poz;
    if (img.texture.key !== 'rehber_' + poz) img.setTexture('rehber_' + poz);
    baykus.zipla = Math.max(0, baykus.zipla - dt / 600);
    const hop = poz === 'sevinc' ? Math.abs(Math.sin(zaman / 200)) * 14 : baykus.zipla * 30;
    img.setScale(BOY / 480 * POZ_OLCEK[poz] * (1 + Math.sin(zaman / 500) * 0.015)).setPosition(baykus.x, baykus.y - hop).setDepth(baykus.y + 2);
  };
}

kutuKur();
setInterval(() => {
  // İpucu beklerken olay daha önce olduysa ya da durum zaten sağlanmışsa adım biter
  if (konusma && konusma.bitince === adimBitti && konusma.n >= konusma.satirlar.length) {
    const A = ADIMLAR[R.adim];
    if (A && (A.oldu || (A.tamam && A.tamam()))) { kapat(); adimBitti(); }
  }
  // Yazı makinesi
  if (yazi.n < yazi.tam.length) { yazi.n = Math.min(yazi.tam.length, yazi.n + 3); $('#rehberMetin').textContent = yazi.tam.slice(0, yazi.n); }
  else if ($('#rehberMetin').textContent !== yazi.tam && yazi.tam) $('#rehberMetin').textContent = yazi.tam;
}, 30);
setInterval(() => { if (sahne) sirayaBak(); }, 3000);
