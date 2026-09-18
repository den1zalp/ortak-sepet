// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// Oysho, Pull&Bear ve Stradivarius aynı Inditex altyapısında: Angular ile
// render ediliyorlar, sınıf adları "ng-star-inserted" gibi eklerle geliyor ama
// data-testid değerleri kararlı:
//   [data-testid='main-info-price']     → ürünün kendi fiyatı
//   [data-testid='product-card-price']  → alttaki öneri kartları
//
// Üç mağazanın da JSON-LD'si ödenecek tutarı veriyor; fiyat geç render
// edildiğinde yapılandırılmış veri yedek kalıyor. Bölgeler tek alan adında
// ayrı yollarda (/tr/, /gb/) ve ayrımı manifest yapıyor.
function findInditexPriceText() {
  return cleanText(getText("[data-testid='main-info-price']"));
}

// Başlık: h1 bazı Inditex sayfalarında hiç basılmıyor (Pull&Bear), og:title ise
// site adını ekliyor.
function findInditexTitle(siteSuffixPattern) {
  return (
    cleanText(getText("h1")) ||
    cleanText(getAttr("meta[property='og:title']", "content")).replace(siteSuffixPattern, "")
  );
}

function parseInditexTrProduct(options) {
  const { site, siteSuffixPattern, cdnRegex } = options;
  const structured = parseJsonLdProduct();

  return {
    site,
    title: findInditexTitle(siteSuffixPattern) || structured?.title,
    price: formatTryPriceText(findInditexPriceText()) || structured?.price,
    currency: structured?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex }),
    url: window.location.href,
    // Sayfanın altındaki öneri kartları onlarca fiyat basıyor.
    preventPriceFallback: true,
  };
}
