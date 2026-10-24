// tools/pot_yap.py görselleri 2'nin katı boyutlu tuvallere yerleştirir (mipmap için).
// Burada her görselin çerçevesi asıl boyutuna geri kırpılır; oyundaki ölçüler değişmez.
const KLASORLER = [['assets/dekor', 'dekor_'], ['assets/binalar', 'bina_'], ['assets/arayuz', 'ui_'], ['assets/kunduz', 'kunduz_'], ['assets/insaat', 'insaat_'], ['assets/manzara', 'manzara_']];

export function potYukle(sahne) {
  for (const [klasor, on] of KLASORLER) sahne.load.json('pot_' + on, `${klasor}/pot.json`);
}

const potBoyu = (n) => 2 ** Math.ceil(Math.log2(n));

// Diskteki dosyaya dokunmadan aynı işi bellekte yapar (kuş parçaları: kesme ve yerleşim araçları asıl PNG'leri okuyor).
// Adı kalıba uyan her görsel 2'nin katı boyutlu bir tuvale kopyalanır, aynı adla yeniden kaydedilir ve çerçevesi asıl boyuta kırpılır.
export function potBellek(sahne, kalip) {
  const T = sahne.textures;
  for (const anahtar of T.getTextureKeys()) {
    if (!kalip.test(anahtar)) continue;
    const doku = T.get(anahtar), resim = doku.getSourceImage();
    if (!(resim instanceof HTMLImageElement)) continue; // zaten tuval (işlenmiş ya da boyanmış)
    const w = resim.width, h = resim.height, pw = potBoyu(w), ph = potBoyu(h);
    if (pw === w && ph === h) continue;
    const tuval = document.createElement('canvas');
    tuval.width = pw; tuval.height = ph;
    tuval.getContext('2d').drawImage(resim, 0, 0);
    T.remove(anahtar);
    T.addCanvas(anahtar, tuval).get().setSize(w, h, 0, 0);
  }
}

export function potUygula(sahne) {
  for (const [, on] of KLASORLER) {
    const kayit = sahne.cache.json.get('pot_' + on) || {};
    for (const [dosya, [w, h]] of Object.entries(kayit)) {
      const anahtar = on + dosya.replace(/\.png$/, '');
      if (!sahne.textures.exists(anahtar)) continue;
      const cerceve = sahne.textures.get(anahtar).get();
      if (cerceve.width !== w || cerceve.height !== h) cerceve.setSize(w, h, 0, 0);
    }
  }
}
