// Çimenin canlılığı: dokunun üstüne kodla eklenen katmanlar.
// 1) Renk lekeleri: güneşli açık ve gölgeli koyu büyük öbekler, yol kenarında hafif sararmış çimen, orman kenarında koyulaşma.
// 2) Temas gölgeleri: bina, ağaç, çalı, taş ve köy objelerinin dibinde yumuşak gölge (objeler zemine "otursun").
// 3) Rüzgâr dalgası: esinti geçerken çimenin üstünden açık renkli bir ışık dalgası süpürür.
// Lekeler ve gölgeler bir kez düşük çözünürlüklü tuvale çizilir ve büyütülerek tek parça gösterilir (her kare ucuz).
import { HARITA, izoEkran, karoKoseleri } from './izo.js';

const LEKE_OLCEK = 8, GOLGE_OLCEK = 4; // tuval pikseli başına dünya pikseli

function alan() {
  const a = izoEkran(-9, -9), b = izoEkran(HARITA + 9, -9), c = izoEkran(HARITA + 9, HARITA + 9), d = izoEkran(-9, HARITA + 9);
  return { x: d.x, y: a.y, w: b.x - d.x, h: c.y - a.y };
}

// Dünya koordinatında yumuşak, yassı (izometrik) bir leke
function leke(ctx, A, olcek, x, y, rx, renk, alfa, yassi = 0.5) {
  const px = (x - A.x) / olcek, py = (y - A.y) / olcek, r = rx / olcek;
  ctx.save();
  ctx.translate(px, py); ctx.scale(1, yassi);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(${renk},${alfa})`); g.addColorStop(0.55, `rgba(${renk},${alfa * 0.6})`); g.addColorStop(1, `rgba(${renk},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function tuval(sahne, ad, A, olcek) {
  if (sahne.textures.exists(ad)) sahne.textures.remove(ad);
  return sahne.textures.createCanvas(ad, Math.ceil(A.w / olcek), Math.ceil(A.h / olcek));
}

function lekelerCiz(sahne, A, rnd, yol) {
  const t = tuval(sahne, 'zemin_leke', A, LEKE_OLCEK), ctx = t.getContext();
  const nokta = () => izoEkran(-8 + rnd() * (HARITA + 16), -8 + rnd() * (HARITA + 16));
  // Güneşli açık öbekler ve gölgeli koyu öbekler
  for (let n = 0; n < 70; n++) { const p = nokta(); leke(ctx, A, LEKE_OLCEK, p.x, p.y, 140 + rnd() * 220, '226,255,130', 0.26 + rnd() * 0.1); }
  for (let n = 0; n < 55; n++) { const p = nokta(); leke(ctx, A, LEKE_OLCEK, p.x, p.y, 120 + rnd() * 200, '28,96,44', 0.2 + rnd() * 0.1); }
  // Küçük, daha belirgin çayır benekleri (ölçek çeşitliliği)
  for (let n = 0; n < 160; n++) { const p = nokta(); leke(ctx, A, LEKE_OLCEK, p.x, p.y, 40 + rnd() * 50, rnd() < 0.5 ? '236,255,150' : '40,110,50', 0.18); }
  // Yol kenarında çiğnenmiş, hafif sararmış çimen
  for (const anahtar of yol) {
    const [i, j] = anahtar.split(',').map(Number), m = izoEkran(i + 0.5, j + 0.5);
    leke(ctx, A, LEKE_OLCEK, m.x, m.y, 120, '214,206,110', 0.18);
  }
  // Orman kenarına doğru çimen koyulaşır (köy ortası ışıklı kalır)
  const m = izoEkran(HARITA / 2, HARITA / 2), cx = (m.x - A.x) / LEKE_OLCEK, cy = (m.y - A.y) / LEKE_OLCEK, r = (HARITA * 64 + 300) / LEKE_OLCEK;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, r * 0.75, 0, 0, r * 1.6);
  g.addColorStop(0, 'rgba(18,64,34,0)'); g.addColorStop(1, 'rgba(18,64,34,0.32)');
  ctx.fillStyle = g; ctx.fillRect(-cx - 10, -cy * 2 - 10, t.width + 20, t.height * 2 + 20);
  ctx.restore();
  t.refresh();
  return sahne.add.image(A.x, A.y, 'zemin_leke').setOrigin(0).setScale(LEKE_OLCEK).setDepth(-100000.5);
}

// Hangi objenin altına ne genişlikte (görsel enine oranla) ve ne koyulukta gölge düşer
function golgeAyari(ad) {
  if (/^(tutam|cimen|yonca|seyrek|yaprak|kelebek|ari|tavsan\d|golet|basamak_tas)/.test(ad)) return null;
  if (/agac|fidan/.test(ad)) return [0.34, 0.3];
  if (/^cali/.test(ad)) return [0.44, 0.24];
  if (/tas|kaya|kutuk|mantar|odun/.test(ad)) return [0.46, 0.22];
  if (/cicek|gelincik|lavanta|aycicegi|kadife|egrelti|saz/.test(ad)) return [0.36, 0.12];
  return [0.42, 0.26]; // bank, tabela, fener, saman, sandık, el arabası, kuş banyosu...
}

function golgelerCiz(sahne, A, binalar, yol) {
  const t = tuval(sahne, 'zemin_golge', A, GOLGE_OLCEK), ctx = t.getContext();
  const renk = '34,46,26';
  for (const o of sahne.children.list) {
    if (o.type !== 'Image' || !o.texture || o.depth > 90000) continue;
    const anahtar = o.texture.key;
    if (!/^(dekor_|bina_agac$)/.test(anahtar)) continue;
    const ayar = golgeAyari(anahtar.replace(/^dekor_|^bina_/, ''));
    if (!ayar) continue;
    leke(ctx, A, GOLGE_OLCEK, o.x, o.y - 2, o.displayWidth * ayar[0], renk, Math.min(0.55, ayar[1] * 1.5), 0.42);
  }
  for (const b of binalar) {
    const k = karoKoseleri(b.i, b.j, ...b.tanim.boyut), x = (k.sol.x + k.sag.x) / 2, y = (k.ust.y + k.alt.y) / 2;
    leke(ctx, A, GOLGE_OLCEK, x, y + 4, (k.sag.x - k.sol.x) * 0.46, renk, 0.45, 0.5);
  }
  if (yol) yolKenarlari(ctx, A, yol);
  t.refresh();
  return sahne.add.image(A.x, A.y, 'zemin_golge').setOrigin(0).setScale(GOLGE_OLCEK).setDepth(-99998);
}

// Taş yol çimenden biraz aşağıda dursun: çimenin bittiği kenarlarda yolun içine doğru yumuşak gölge düşer.
// Işık yukarıdan geldiği için arka kenarlar (ekranda üst) koyu, ön kenarlar hafif gölgeli.
function yolKenarlari(ctx, A, yol) {
  const p = (n) => ({ x: (n.x - A.x) / GOLGE_OLCEK, y: (n.y - A.y) / GOLGE_OLCEK });
  for (const anahtar of yol) {
    const [i, j] = anahtar.split(',').map(Number), m = p(izoEkran(i + 0.5, j + 0.5));
    const K = { ust: p(izoEkran(i, j)), sag: p(izoEkran(i + 1, j)), alt: p(izoEkran(i + 1, j + 1)), sol: p(izoEkran(i, j + 1)) };
    // [kenar köşeleri, kenarın öbür yanındaki karo, gölge koyuluğu, içeri genişlik (karonun oranı)]
    for (const [a, b, komsu, alfa, en] of [[K.ust, K.sag, [i, j - 1], 0.42, 0.3], [K.sol, K.ust, [i - 1, j], 0.42, 0.3],
      [K.sag, K.alt, [i + 1, j], 0.16, 0.16], [K.alt, K.sol, [i, j + 1], 0.16, 0.16]]) {
      if (yol.has(komsu.join(','))) continue;
      const orta = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ic = { x: (m.x - orta.x) * en, y: (m.y - orta.y) * en };
      const g = ctx.createLinearGradient(orta.x, orta.y, orta.x + ic.x, orta.y + ic.y);
      g.addColorStop(0, `rgba(40,34,22,${alfa})`); g.addColorStop(1, 'rgba(40,34,22,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + ic.x, b.y + ic.y); ctx.lineTo(a.x + ic.x, a.y + ic.y); ctx.closePath(); ctx.fill();
    }
  }
}

function dalgaDokusu(sahne) {
  if (sahne.textures.exists('ruzgar_dalga')) return;
  const t = sahne.textures.createCanvas('ruzgar_dalga', 256, 32), ctx = t.getContext();
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, 'rgba(255,255,210,0)'); g.addColorStop(0.45, 'rgba(255,255,210,0.8)');
  g.addColorStop(0.55, 'rgba(255,255,210,1)'); g.addColorStop(1, 'rgba(255,255,210,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 32);
  t.refresh();
}

export function zeminKatmanlariKur(sahne, binalar, yol, rnd) {
  const A = alan();
  lekelerCiz(sahne, A, rnd, yol);
  golgelerCiz(sahne, A, binalar, yol);
  dalgaDokusu(sahne);
  // İki şerit: biri önde güçlü, biri biraz geride zayıf (çimen dalga dalga parlar). Yollar bunun üstünde kalır.
  const dalgalar = [0, 260].map((geri) => ({ geri, n: sahne.add.image(0, A.y + A.h / 2, 'ruzgar_dalga')
    .setDisplaySize(geri ? 340 : 520, A.h).setBlendMode(Phaser.BlendModes.ADD).setDepth(-100000.4).setVisible(false) }));
  return () => {
    const e = sahne.esinti;
    if (!e) return;
    const v = sahne.cameras.main.worldView;
    for (const { geri, n } of dalgalar) {
      const x = e.x - geri, gorunur = e.guc > 0 && x > v.x - 400 && x < v.right + 400;
      n.setVisible(gorunur);
      if (gorunur) n.setPosition(x, n.y).setAlpha((geri ? 0.05 : 0.09) * e.guc);
    }
  };
}
