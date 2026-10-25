// Oyun müziği: Suno'da üretilen parçalar (assets/muzik, tools/muzik_hazirla.py ile -16 LUFS'a eşitlendi).
// Karışık sıra, tekrarsız: bütün parçalar çalmadan aynı parça gelmez; bir turun sonuncusu yenisinin ilki olmaz.
// Parçalar arasında 3-5 sn sessizlik (köyün doğa sesleri boşluğu doldurur). Ses düğmesi müziği de susturur.
// Tarayıcılar sesi ilk dokunuştan önce çalmaya izin vermediği için ilk dokunuşta başlar. Sekme gizlenince durur.
import { sesKapaliMi } from './ses.js';

const SES = 0.35, ARA = [3000, 5000], YUMUSAK = 1200; // ses düzeyi, parçalar arası sessizlik, açılış/kapanış süresi (ms)

let liste = [], sira = [], sonCalan = null, bekleme = null, basladi = false;
const oynatici = new Audio();
oynatici.preload = 'auto';

function karistir() {
  const yeni = [...liste];
  for (let i = yeni.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [yeni[i], yeni[j]] = [yeni[j], yeni[i]]; }
  if (yeni.length > 1 && yeni[0] === sonCalan) [yeni[0], yeni[yeni.length - 1]] = [yeni[yeni.length - 1], yeni[0]]; // tur sınırında tekrar olmasın
  sira = yeni;
}

// Sesi yumuşakça bir değere götürür (ani başlama ve kesilmeler kulağı rahatsız etmesin)
function sesGotur(hedef, sure, sonra) {
  clearInterval(sesGotur.t);
  const bas = oynatici.volume, t0 = performance.now();
  sesGotur.t = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / sure);
    oynatici.volume = bas + (hedef - bas) * k;
    if (k >= 1) { clearInterval(sesGotur.t); if (sonra) sonra(); }
  }, 50);
}

function sonraki() {
  clearTimeout(bekleme);
  if (!liste.length || sesKapaliMi() || document.hidden) return;
  if (!sira.length) karistir();
  sonCalan = sira.shift();
  oynatici.src = 'assets/muzik/' + sonCalan.dosya;
  oynatici.volume = 0;
  oynatici.play().then(() => sesGotur(SES, YUMUSAK)).catch(() => { basladi = false; }); // izin yoksa ilk dokunuşta tekrar denenir
}

oynatici.addEventListener('ended', () => { bekleme = setTimeout(sonraki, ARA[0] + Math.random() * (ARA[1] - ARA[0])); });
oynatici.addEventListener('error', () => { bekleme = setTimeout(sonraki, 1000); }); // bozuk ya da eksik dosyayı atla

function devam() { // ses açıldı ya da sekmeye dönüldü
  if (sesKapaliMi() || document.hidden || !basladi) return;
  if (oynatici.src && !oynatici.ended && oynatici.paused) oynatici.play().then(() => sesGotur(SES, YUMUSAK)).catch(() => {});
  else if (!oynatici.src || oynatici.ended) sonraki();
}
function durdur() { sesGotur(0, 400, () => oynatici.pause()); }

export function muzikKur() {
  if (muzikKur.kuruldu) return;
  muzikKur.kuruldu = true;
  fetch('assets/muzik/liste.json').then((r) => r.json()).then((j) => { liste = j; karistir(); }).catch(() => {});
  const ilkDokunus = () => { if (basladi) return; basladi = true; if (oynatici.src) devam(); else sonraki(); };
  window.addEventListener('pointerdown', ilkDokunus);
  window.addEventListener('keydown', ilkDokunus);
  window.addEventListener('sesDegisti', () => (sesKapaliMi() ? durdur() : devam()));
  document.addEventListener('visibilitychange', () => (document.hidden ? durdur() : devam()));
  window.muzik = { oynatici, sonraki, sira: () => sira, liste: () => liste }; // deneme için
}
