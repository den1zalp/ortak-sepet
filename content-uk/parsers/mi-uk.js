// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// mi.com/uk, TR mağazasıyla aynı alan adında; ayrımı manifest'teki yol kalıbı
// yapıyor ("*://*.mi.com/uk/*").
//
// Sayfadaki tutarlar ekran okuyucu öneki taşıyor ("Current Price £429") ve
// aynı ".mi-price" sınıfı "birlikte al" karusellerinde başka ürünler için de
// kullanılıyor; JSON-LD seçili ürünün fiyatını temiz veriyor.
function parseMiUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "Mi UK",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      structured?.price ||
      cleanPrice(getText(".main-section__info-section__price-container .mi-price span")) ||
      cleanPrice(getText(".buy-product__installment-price__sale span")),
    currency: structured?.currency || "GBP",
    // og:image protokolsüz ("//i02.appmifile.com/...").
    image: toAbsoluteUrl(
      structured?.image || getAttr("meta[property='og:image']", "content"),
    ),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
