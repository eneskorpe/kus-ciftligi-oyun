// Bilge Baykuş: oyunun başında oyuncuyu adım adım yönlendiren rehber ve yeni binalar açıldığında gelen kısa tanıtımlar.
// Konuşma kutusu ekranın üstünde (yüz + yazı), köyde de baykuşun kendisi anlatılan binanın yanında durur; ok hedefi gösterir.
// Kayıt: D.rehber = { adim (sayı ya da 'bitti'), acildi: [tip], kuruldu: [tip] }
import { D, degisti, xpEkle, xpGerek } from './durum.js';
import { BINALAR, YENI_BINALAR } from './binalar.js';
import { olayDinle } from './gorevler.js';
import * as M from './mekanik.js';
import { izoEkran } from './izo.js';
import { bugunYikandiMi } from './bag.js';

const $ = (s) => document.querySelector(s);
const AD = 'Bilge Baykuş';

// --- Öğretici adımları ---
// metin: sırayla gösterilen konuşmalar (Devam ile). bekle: adımı bitiren olay (mekanik.js gorevOlay). tamam: olay yerine durum.
// ipucu: konuşma bitince oyuncunun yapacağı iş. hedef: { bina } ya da { dom } (ok oraya bakar).
const ADIMLAR = [
  { yuz: 'konus', poz: 'selam', metin: [
    'Hoş geldin, genç kuşçu! Ben Bilge Baykuş. Bu köyün kuşlarını yıllardır şu defterime yazarım.',
    'Burası artık senin çiftliğin. Bak, üç küçük dostun seni bekliyordu bile!',
    'Gel, sana her şeyi adım adım göstereyim. Ben anlatayım, sen yap; birlikte öğrenelim!'] },
  { yuz: 'dusun', poz: 'goster', hedef: { bina: 'tuzak' }, bekle: 'tuzakKur', tamam: () => !!D.tuzak, metin: [
    'Önce yeni kuşlar bulalım. Şu gördüğün Tuzak Kulübesi. Merak etme, kuşlara hiç zarar vermez; içine yem koyarız, onlar da misafirliğe gelir.'],
  ipucu: 'Tuzak Kulübesi\'ne dokun ve 🌱 Kuş tohumu ile tuzak kur.' },
  { yuz: 'saskin', poz: 'goster', hedef: { bina: 'tuzak' }, bekle: 'hizlandir:tuzak', tamam: () => !D.tuzak || M.kalanSure(D.tuzak) <= 0, metin: [
    'Kuşların gelmesi biraz sürer... Ama beklemek zorunda değiliz!',
    'Yukarıdaki parlak taşları gördün mü? Onlar 💎 elmas. Elmasla bekleme sürelerini anında bitirirsin. Hadi ilkini birlikte kullanalım!'],
  ipucu: 'Tuzak Kulübesi\'ne dokun ve ⚡ Bitir düğmesine bas.' },
  { yuz: 'mutlu', poz: 'sevinc', hedef: { bina: 'tuzak' }, bekle: 'tuzakAc', tamam: () => !D.tuzak, metin: [
    'İşte bu kadar hızlı! Bak, tuzağa bir kuş gelmiş bile.'],
  ipucu: 'Tuzak Kulübesi\'ne dokun ve 🎁 Tuzağı aç.' },
  { yuz: 'saskin', poz: 'sevinc', bekle: ['kusEkle', 'sat'], metin: [
    'Ooo, bak kim gelmiş! Her kuşun kendine has bir rengi, tüyü ve huyu vardır. Kartında hepsi yazıyor.'],
  ipucu: 'Karttaki 🏡 Köye al düğmesine dokun.' },
  { yuz: 'mutlu', poz: 'selam', bekle: 'sev', metin: [
    'Kuşlar sevgiyle büyür. Mutlu kuş şarkı söyler, altın kazandırır, yavru yapmaya da gönüllü olur.'],
  ipucu: 'Meydanda gezinen kuşlarından birine dokunup onu sev.' },
  { yuz: 'konus', poz: 'goster', hedef: { bina: 'banyo' }, tamam: () => (D.banyo || []).length > 0 || D.kuslar.some(bugunYikandiMi), metin: [
    'Bak, bu da Kuş Banyosu! Kuşların burada yıkanır, tüyleri pırıl pırıl parlar.',
    'Her kuşunla her gün biraz vakit geçir: ikram ver, yıkat, sev. Böylece aranızdaki bağ güçlenir 💗. Bağı güçlü kuş daha çok kazandırır ve çok daha değerli olur.'],
  ipucu: "Kuş Banyosu'na dokun ve bir kuşunu 🛁 Yıkat." },
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
  { yuz: 'mutlu', poz: 'goster', hedef: { bina: 'kulucka' }, bekle: 'hizlandir:kulucka', tamam: () => !D.kulucka || D.kulucka.asama === 'kulucka', metin: [
    'Ne tatlılar! Biraz baş başa kalmaları lazım... ama biz meraklıyız, değil mi? Bir elmasla hızlandıralım!'],
  ipucu: 'Kuluçka\'ya dokun ve ⚡ Bitir düğmesine bas.' },
  { yuz: 'saskin', poz: 'okur', hedef: { bina: 'kulucka' }, bekle: 'hizlandir:kulucka', tamam: () => !D.kulucka || M.kalanSure(D.kulucka) <= 0, metin: [
    'Yumurta kuluçkaya yattı! Yavru, renk genlerini anne ve babasından alır. Bazen hiç beklemediğin bir renk çıkar.',
    'Ben yavruyu görmek için sabırsızlanıyorum. Bir elmas daha harcayıp hemen çatlatalım!'],
  ipucu: 'Kuluçka\'ya dokun ve ⚡ Bitir düğmesine bas.' },
  { yuz: 'mutlu', poz: 'sevinc', hedef: { bina: 'kulucka' }, bekle: 'yumurta', tamam: () => !D.kulucka, metin: [
    'Yumurta çatlamak üzere! Bazı türleri buluşturursan bambaşka bir tür bile doğabilir... Bu sır şimdilik aramızda! 🤫'],
  ipucu: 'Kuluçka\'ya dokun ve 🥚 Yumurtayı çatlat.' },
  { yuz: 'konus', poz: 'goster', hedef: { bina: 'tuzak' }, tamam: () => !!D.insaat || ['tuzak', 'kulucka', 'kusevi', 'yemlik'].some((t) => D.binalar[t].sv >= 2), metin: [
    'Köyün ustası Kunduz Usta\'yı gördün mü? Binaları o büyütür, yeni binaları da o kurar.',
    'Geliştirilen bina daha hızlı çalışır ve yeni şeyler açar. Tuzak Kulübesi Sv. 2 olunca ay çekirdeği bile kullanabilirsin!'],
  ipucu: 'Tuzak Kulübesi\'ne dokun ve ⬆️ Sv. 2 düğmesine bas.',
  // İlk geliştirme mutlaka yapılabilsin: seviye ya da altın eksikse baykuş tamamlar
  once: () => {
    if (D.seviye < M.SV_GEREK[2]) { D.xp = xpGerek(D.seviye); xpEkle(0); }
    if (D.altin < M.GELISTIRME_FIYATI[2]) D.altin = M.GELISTIRME_FIYATI[2];
  } },
  { yuz: 'saskin', poz: 'goster', hedef: { bina: 'tuzak' }, bekle: 'hizlandir:insaat', tamam: () => !D.insaat, atla: () => !D.insaat, metin: [
    'Usta işe koyuldu bile! Büyük binalar uzun sürer ama elmas burada da işe yarar.'],
  ipucu: 'Tuzak Kulübesi\'ne dokun ve ⚡ Bitir düğmesine bas.' },
  { yuz: 'dusun', poz: 'okur', metin: [
    'Gördün mü? Elmasla hiç beklemeden ilerlersin. Elmas kazanmak da kolay: her seviye atladığında, görevlerde ve ödüllerde gelir.',
    'Bir yerde bekleme süresi görürsen ⚡ düğmesini hatırla!'] },
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
    kuruldu: yeni ? [] : YENI_BINALAR.filter((t) => D.binalar[t] && D.binalar[t].sv > 0), duyuru: yeni ? ['bag', 'huy'] : [] };
}
const R = D.rehber;
R.duyuru = R.duyuru || [];
// Sonradan eklenen sistemlerin eski oyunculara bir kez anlatılması
const DUYURULAR = {
  bag: { hedef: { bina: 'banyo' }, satirlar: [
    'Sana güzel bir haberim var! Artık kuşlarınla gerçek bir bağ kurabilirsin 💗',
    'Meydandaki kuş banyosu artık bir bina: kuşlarını orada yıkat, tüyleri parlasın. Her kuş günde bir kez yıkanır.',
    'Her gün ikram ver, yıkat ve sev; kuşunun kartındaki bakım kutuları dolsun. Bağı güçlü kuş daha çok altın kazandırır ve çok daha değerli olur. 10 kalpte Can Dostu olursunuz!'] },
  huy: { hedef: { dom: '#dKusevi' }, satirlar: [
    'Defterime yeni bir şey yazdım: her kuşun kendine has bir huyu varmış! Kimi şarkıcı, kimi meraklı, kimi de uykucu...',
    'Bir kuşla bağın 2 kalbe ulaşınca huyunu öğrenirsin. Huylar işe de yarar: süslü kuş banyodan daha parlak çıkar, meraklı kuş yerde altın bulur.',
    "Bir de her kuşun kendine özel sevdiği bir ikram var. Kuş Evi'nde farklı ikramlar dene, bakalım hangisine bayılacak!"] },
};
let konusma = null; // { satirlar, n, yuz, poz, hedef, bitince, ipucu }
let yazi = { tam: '', n: 0, t: 0 };
let sahne = null, baykus = null;

// --- Kutu ---
function kutuKur() {
  document.body.insertAdjacentHTML('beforeend', `<div id="rehber" class="kutu"><img id="rehberYuz" alt="">
    <div class="rIc"><b>🦉 ${AD}</b><p id="rehberMetin"></p><div class="rAlt"><button id="rehberDevam">Devam ▸</button></div></div>
    <button id="rehberGec" title="Rehberi kapat">✖</button></div><div id="rehberOk"></div>`);
  $('#rehberDevam').onclick = (e) => { e.stopPropagation(); devam(); };
  $('#rehber').onclick = () => { if (yazi.n < yazi.tam.length) yazi.n = yazi.tam.length; }; // dokununca yazı hemen tamamlanır
  $('#rehberGec').onclick = (e) => { e.stopPropagation(); kapat(); }; // yalnızca bina tanıtımlarında görünür
}

function goster(k) {
  konusma = k;
  $('#rehberGec').style.display = k.bitince === adimBitti ? 'none' : ''; // öğretici atlanmaz, adım adım anlatılır
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
  if (A.atla && A.atla()) { R.adim++; degisti(); return adimBaslat(); } // bu adımın konusu yok (ör. inşaat başlamadı)
  A.oldu = false;
  if (A.once) { A.once(); degisti(); }
  goster({ satirlar: A.metin, n: 0, yuz: A.yuz, poz: A.poz, hedef: A.hedef, ipucu: A.ipucu, bitirYazi: A.odul ? 'Teşekkürler! 🎁' : null, bitince: adimBitti });
}
function adimBitti() {
  const A = ADIMLAR[R.adim];
  if (A && A.odul) { D.altin += 100; D.elmas += 3; xpEkle(20); }
  if (A && A.ipucu) xpEkle(10); // oyuncunun yaptığı her iş biraz XP kazandırır
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
  for (const [id, Y] of Object.entries(DUYURULAR)) {
    if (R.duyuru.includes(id)) continue;
    R.duyuru.push(id); degisti();
    return goster({ satirlar: Y.satirlar, n: 0, yuz: 'saskin', poz: 'goster', hedef: Y.hedef });
  }
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
  const B = document.body.classList, kapali = !h || $('#modal').classList.contains('acik') || $('#binaPanel').classList.contains('acik') || B.contains('kusevi-modu') || B.contains('duzen-modu');
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
