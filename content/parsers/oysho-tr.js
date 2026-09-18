// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// oysho.com/tr, Pull&Bear ve Stradivarius ile aynı Inditex kurulumunda; ortak
// okuma content/parsers/inditex-shared.js içinde. Bölgeler tek alan adında
// ayrı yollarda (/tr/, /gb/) ve ayrımı manifest yapıyor.
function parseOyshoTr() {
  return parseInditexTrProduct({
    site: "Oysho",
    siteSuffixPattern: /\s*\|\s*OYSHO.*$/i,
    cdnRegex: /static\.oysho\.net/i,
  });
}
