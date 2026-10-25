// Oyun müziği ve doğa ortam sesi.
// Müzik: Suno'da üretilen parçalar (assets/muzik, tools/muzik_hazirla.py ile -16 LUFS'a eşitlendi).
//   Karışık sıra, tekrarsız: bütün parçalar çalmadan aynı parça gelmez; bir turun sonuncusu yenisinin ilki olmaz.
//   Parçalar arasında 3-5 sn sessizlik (doğa sesleri boşluğu doldurur).
// Ortam: uzaktan kuş ötüşleri (assets/sesler/ortam_1-4.mp3, ElevenLabs, 30 sn); müzikle birlikte sürekli çalar,
//   parçalar rastgele sırayla birbirine yumuşakça karışarak geçer. Gece kuşlar sustuğu için yavaşça kısılır.
// Düzeyler ses.js'teki oyuncu ayarından (sesSeviyesi). Tarayıcılar sesi ilk dokunuştan önce çalmaya izin vermediği için
// ilk dokunuşta başlar; ses düğmesi ve sekme gizlenince durur.
import { sesKapaliMi, sesSeviyesi } from './ses.js';

const MUZIK_EN = 0.28, ORTAM_EN = 0.42;        // ayar %100'deyken en yüksek ses (varsayılan ayarla müzik ~0.10, ortam ~0.21; kullanıcı kısık istedi)
const ARA = [3000, 5000], YUMUSAK = 1200;       // parçalar arası sessizlik, açılış/kapanış süresi (ms)
const ORTAM_ADET = 18, ORTAM_GECIS = 4;         // ortam parçası sayısı, parçalar arası karışma süresi (sn)

let liste = [], sira = [], sonCalan = null, bekleme = null, basladi = false, geceMi = () => false;
const oynatici = new Audio();
oynatici.preload = 'auto';
const muzikSesi = () => MUZIK_EN * sesSeviyesi('muzik');

function karistir() {
  const yeni = [...liste];
  for (let i = yeni.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [yeni[i], yeni[j]] = [yeni[j], yeni[i]]; }
  if (yeni.length > 1 && yeni[0] === sonCalan) [yeni[0], yeni[yeni.length - 1]] = [yeni[yeni.length - 1], yeni[0]]; // tur sınırında tekrar olmasın
  sira = yeni;
}

// Sesi yumuşakça bir değere götürür (ani başlama ve kesilmeler kulağı rahatsız etmesin)
function sesGotur(a, hedef, sure, sonra) {
  clearInterval(a.gecis);
  const bas = a.volume, t0 = performance.now();
  a.gecis = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / sure);
    a.volume = Math.max(0, Math.min(1, bas + (hedef - bas) * k));
    if (k >= 1) { clearInterval(a.gecis); if (sonra) sonra(); }
  }, 50);
}

function sonraki() {
  clearTimeout(bekleme);
  if (!liste.length || sesKapaliMi() || document.hidden) return;
  if (!sira.length) karistir();
  sonCalan = sira.shift();
  oynatici.src = 'assets/muzik/' + sonCalan.dosya;
  oynatici.volume = 0;
  oynatici.play().then(() => sesGotur(oynatici, muzikSesi(), YUMUSAK)).catch(() => { basladi = false; }); // izin yoksa ilk dokunuşta tekrar denenir
}

oynatici.addEventListener('ended', () => { bekleme = setTimeout(sonraki, ARA[0] + Math.random() * (ARA[1] - ARA[0])); });
oynatici.addEventListener('error', () => { bekleme = setTimeout(sonraki, 1000); }); // bozuk ya da eksik dosyayı atla

// --- Ortam: iki oynatıcı sırayla; biri biterken öbürü başlar ve sesler karışır ---
const ortam = [new Audio(), new Audio()];
let ortamNo = 0, ortamSon = 0;
const ortamSesi = () => (geceMi() ? 0 : ORTAM_EN * sesSeviyesi('efekt'));
function ortamBaslat() {
  if (sesKapaliMi() || document.hidden) return;
  let n; do n = 1 + Math.floor(Math.random() * ORTAM_ADET); while (n === ortamSon && ORTAM_ADET > 1);
  ortamSon = n;
  const a = ortam[ortamNo];
  ortamNo = 1 - ortamNo;
  a.src = `assets/sesler/ortam_${n}.mp3`;
  a.volume = 0;
  a.play().then(() => sesGotur(a, ortamSesi(), ORTAM_GECIS * 1000)).catch(() => {});
}
for (const a of ortam) {
  a.preload = 'auto';
  a.addEventListener('timeupdate', () => { // bitmeye az kala sıradakini başlat, bu yavaşça sönsün
    if (a.sondu || !a.duration || a.duration - a.currentTime > ORTAM_GECIS) return;
    a.sondu = true;
    sesGotur(a, 0, ORTAM_GECIS * 1000, () => a.pause());
    ortamBaslat();
  });
  a.addEventListener('play', () => { a.sondu = false; });
}

function devam() { // ses açıldı, düzey değişti ya da sekmeye dönüldü
  if (sesKapaliMi() || document.hidden || !basladi) return;
  if (oynatici.src && !oynatici.ended && oynatici.paused) oynatici.play().then(() => sesGotur(oynatici, muzikSesi(), YUMUSAK)).catch(() => {});
  else if (!oynatici.src || oynatici.ended) sonraki();
  else sesGotur(oynatici, muzikSesi(), 300);
  const calan = ortam.filter((a) => a.src && !a.paused && !a.sondu);
  if (!calan.length) { const bekleyen = ortam.find((a) => a.src && a.paused && !a.ended && !a.sondu); if (bekleyen) bekleyen.play().then(() => sesGotur(bekleyen, ortamSesi(), 800)).catch(() => {}); else ortamBaslat(); }
  else calan.forEach((a) => sesGotur(a, ortamSesi(), 300));
}
function durdur() {
  sesGotur(oynatici, 0, 400, () => oynatici.pause());
  for (const a of ortam) if (a.src && !a.paused) sesGotur(a, 0, 400, () => a.pause());
}

// gece: kuşların sustuğu saatleri söyleyen işlev (koy.js'ten)
export function muzikKur(gece) {
  if (muzikKur.kuruldu) return;
  muzikKur.kuruldu = true;
  if (gece) geceMi = gece;
  fetch('assets/muzik/liste.json').then((r) => r.json()).then((j) => { liste = j; karistir(); if (basladi) devam(); }).catch(() => {}); // liste geç yüklendiyse ilk dokunuş boşa gitmesin
  const ilkDokunus = () => { if (basladi) return; basladi = true; devam(); };
  window.addEventListener('pointerdown', ilkDokunus);
  window.addEventListener('keydown', ilkDokunus);
  window.addEventListener('sesDegisti', () => (sesKapaliMi() ? durdur() : devam()));
  document.addEventListener('visibilitychange', () => (document.hidden ? durdur() : devam()));
  // Gece-gündüz geçişinde ortam sesi yavaşça kısılır/açılır
  let sonGece = geceMi();
  setInterval(() => { const g = geceMi(); if (g !== sonGece) { sonGece = g; if (basladi && !sesKapaliMi()) ortam.forEach((a) => { if (!a.paused && !a.sondu) sesGotur(a, ortamSesi(), 5000); }); } }, 2000);
  window.muzik = { oynatici, ortam, sonraki, sira: () => sira, liste: () => liste }; // deneme için
}
