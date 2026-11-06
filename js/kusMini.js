// Türün renklerinden CSS ile çizilmiş küçük kuş (sağa bakar). Gemini çizimi olmayan türlerin jetonu, dürbün ve Gözlem Defteri için.
// boy: piksel; golge: true ise siyah siluet (defterde henüz görülmemiş tür)
import { TURLER } from './turler.js';
import { ONAYLI } from './kusGorsel.js';

export function kusMini(tur, boy = 44, golge = false) {
  // Çizimi onaylı türlerde Gemini tasarım görseli (siluette de aynı görsel karartılır)
  if (ONAYLI.includes(tur)) return `<img class="miniKus resimli${golge ? ' golge' : ''}" src="assets/kuslar/${tur}/tasarim.png" alt="" style="width:${boy}px;height:${boy}px">`;
  const T = TURLER[tur], R = T.renk, uzun = T.sekil.gaga === 'uzun', kanca = T.sekil.gaga === 'kanca';
  const v = `--govde:${R.govde};--karin:${R.karin};--bas:${R.bas};--tepe:${R.tepe || R.bas};--kanat:${R.kanat};--kanatUc:${R.kanatUc || R.kanat};`
    + `--kuyruk:${R.kuyruk};--gerdan:${R.gerdan || R.maske || R.yanak || R.karin};--gaga:${R.gaga}`;
  return `<span class="miniKus${golge ? ' golge' : ''}" style="font-size:${boy}px;${v}"><i class="mk-kuyruk${T.sekil.kuyruk === 'serit' || T.sekil.kuyruk === 'uzun' ? ' uzun' : ''}"></i>`
    + '<i class="mk-govde"></i><i class="mk-karin"></i><i class="mk-kanat"></i><i class="mk-bas"></i><i class="mk-gerdan"></i>'
    + `<i class="mk-goz"></i><i class="mk-gaga${uzun ? ' uzun' : kanca ? ' kanca' : ''}"></i></span>`;
}
