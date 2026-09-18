// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// oysho.com/gb, Türkiye mağazasıyla aynı Inditex Angular kurulumu; ayrımı
// manifest'teki yol kalıbı yapıyor. Fiyat [data-testid='main-info-price']
// içinde, öneri kartları [data-testid='product-card-price'] kullanıyor.
function parseOyshoUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "Oysho UK",
    title: cleanText(getText("h1")) || structured?.title,
    price:
      cleanPrice(getText("[data-testid='main-info-price']")) || structured?.price,
    currency: structured?.currency || "GBP",
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findImageBySelectors(["img[src*='static.oysho.net']", "main picture img"]),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
