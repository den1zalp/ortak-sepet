// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// pullandbear.com/tr, Oysho ve Stradivarius ile aynı Inditex kurulumunda;
// ortak okuma content/parsers/inditex-shared.js içinde.
//
// Bu mağazada ürün sayfasında h1 hiç basılmıyor, ad yalnızca og:title'da ve
// JSON-LD'de duruyor.
function parsePullAndBearTr() {
  return parseInditexTrProduct({
    site: "Pull & Bear",
    siteSuffixPattern: /\s*\|\s*Pull&Bear.*$/i,
    cdnRegex: /static\.pullandbear\.net/i,
  });
}
