// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// apple.com/uk, TR mağazasıyla aynı alan adında; ayrımı manifest'teki yol
// kalıbı yapıyor ("*://*.apple.com/uk/*"). Sayfa yapısı da aynı: JSON-LD'de
// offers dizisi, DOM'da ".rc-prices-fullprice".
//
// Sayfanın altbilgisinde Barclays taksitli ödeme metinleri geçiyor ("monthly
// payment plan"); bunlar ürüne ait bir taksit teklifi değil, jenerik finance
// taraması altbilgiye bakmadığı için sorun çıkarmıyor.
function parseAppleUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "Apple UK",
    title: cleanText(getText("h1")) || structured?.title,
    price:
      structured?.price ||
      cleanPrice(getText(".rc-prices-currentprice .rc-prices-fullprice")),
    currency: structured?.currency || "GBP",
    // JSON-LD 4000 piksel görsel veriyor; og:image sosyal medya kırpması.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findImageBySelectors(["img[src*='store.storeimages.cdn-apple.com']"]),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
