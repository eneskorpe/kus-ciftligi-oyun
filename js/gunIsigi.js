// Gece ve gündüz: köyün rengi gerçek saate göre değişir (şafak, gündüz, akşam, gece).
// Gece fenerler ve pencereler yanar, ateş böcekleri çıkar. Test: ?saat=22
import { saat } from './durum.js';

// [saat, renk tonu, karartma gücü 0-1]
const ANLAR = [[0, 0x34408f, 0.72], [5, 0x34408f, 0.72], [6.3, 0xffb48a, 0.35], [7.5, 0xffffff, 0], [17.3, 0xffffff, 0],
  [18.8, 0xff9a6a, 0.32], [20.3, 0x34408f, 0.72], [24, 0x34408f, 0.72]];

const karistir = (a, b, t) => {
  const k = (s) => [s >> 16 & 255, s >> 8 & 255, s & 255], A = k(a), B = k(b);
  return A.map((v, i) => Math.round(v + (B[i] - v) * t)).reduce((s, v) => (s << 8) | v, 0);
};

export function gunDurumu(s = saat()) {
  let i = 0;
  while (s > ANLAR[i + 1][0]) i++;
  const [s0, r0, g0] = ANLAR[i], [s1, r1, g1] = ANLAR[i + 1], t = (s - s0) / (s1 - s0);
  const ton = karistir(r0, r1, t), guc = g0 + (g1 - g0) * t;
  // Ekrandaki çarpma rengi: beyaz = değişiklik yok
  const carp = karistir(0xffffff, ton, guc);
  const gece = Math.max(0, Math.min(1, (guc - 0.3) / 0.4)); // fenerlerin parlaklığı
  const ikon = s >= 20.3 || s < 5.5 ? '🌙' : s < 7.5 ? '🌅' : s < 17.3 ? '☀️' : '🌇';
  return { carp, gece, ikon };
}

function isikDokusu(sahne) {
  if (sahne.textures.exists('isik')) return;
  const t = sahne.textures.createCanvas('isik', 128, 128), c = t.getContext();
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  t.refresh();
}

// noktalar: [{ x, y, olcek, renk }] gece yanacak ışıklar
export function gunIsigiKur(sahne, noktalar, alan) {
  isikDokusu(sahne);
  const cam = sahne.cameras.main;
  const ortu = sahne.add.rectangle(cam.width / 2, cam.height / 2, 40000, 40000, 0xffffff)
    .setScrollFactor(0).setDepth(98000).setBlendMode(Phaser.BlendModes.MULTIPLY);
  const isiklar = noktalar.map((n) => sahne.add.image(n.x, n.y, 'isik').setScale(n.olcek || 1.6).setTint(n.renk || 0xffc46b)
    .setBlendMode(Phaser.BlendModes.ADD).setDepth(98500).setAlpha(0));
  isiklar.forEach((s) => { s.taban = s.scaleX; });
  const bocekler = [];
  for (let i = 0; i < 26; i++) {
    const b = sahne.add.image(Phaser.Math.Between(alan.x1, alan.x2), Phaser.Math.Between(alan.y1, alan.y2), 'isik')
      .setScale(0.12).setTint(0xd8ff7a).setBlendMode(Phaser.BlendModes.ADD).setDepth(98600).setAlpha(0);
    b.faz = Math.random() * 6;
    bocekler.push(b);
    const gez = () => sahne.tweens.add({ targets: b, x: b.x + Phaser.Math.Between(-120, 120), y: b.y + Phaser.Math.Between(-60, 60),
      duration: Phaser.Math.Between(2500, 5000), ease: 'Sine.easeInOut', onComplete: () => {
        if (b.x < alan.x1 || b.x > alan.x2) b.x = Phaser.Math.Between(alan.x1, alan.x2);
        if (b.y < alan.y1 || b.y > alan.y2) b.y = Phaser.Math.Between(alan.y1, alan.y2);
        gez();
      } });
    gez();
  }
  const durum = { gece: 0 };
  sahne.gunIsigi = durum;
  return (zaman) => {
    const d = gunDurumu();
    durum.gece = d.gece; durum.ikon = d.ikon;
    // Gündüz karartma katmanı hiç çizilmez (her karede bütün ekranı boyamak ekran kartını yoruyordu)
    ortu.setVisible(d.carp !== 0xffffff);
    if (ortu.visible) ortu.setFillStyle(d.carp).setPosition(cam.width / 2, cam.height / 2);
    const aktif = d.gece > 0.01;
    isiklar.forEach((s) => s.setVisible(aktif));
    bocekler.forEach((b) => b.setVisible(aktif));
    if (!aktif) return;
    // Alev gibi hafif titreşim: farklı hızlarda iki dalga + ara sıra kısa bir göz kırpma
    isiklar.forEach((s, i) => {
      const t = Math.sin(zaman / 400 + i) * 0.05 + Math.sin(zaman / 97 + i * 2.3) * 0.03 + Math.sin(zaman / 53 + i * 5.1) * 0.02;
      const kirp = Math.sin(zaman / 1700 + i * 1.7) > 0.985 ? -0.12 : 0;
      s.setAlpha(d.gece * (0.55 + t + kirp)).setScale(s.taban * (1 + t * 0.4));
    });
    bocekler.forEach((b) => b.setAlpha(d.gece * (0.5 + 0.5 * Math.sin(zaman / 300 + b.faz))));
  };
}
