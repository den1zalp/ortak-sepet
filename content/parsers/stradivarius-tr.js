// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// stradivarius.com/tr, Oysho ve Pull&Bear ile aynı Inditex kurulumunda; ortak
// okuma content/parsers/inditex-shared.js içinde.
function parseStradivariusTr() {
  return parseInditexTrProduct({
    site: "Stradivarius",
    siteSuffixPattern: /\s*\|\s*STRADIVARIUS.*$/i,
    cdnRegex: /static\.stradivarius\.net|\.stradivarius\.com/i,
  });
}
