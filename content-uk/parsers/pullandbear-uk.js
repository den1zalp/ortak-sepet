// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// pullandbear.com/gb, Türkiye mağazasıyla aynı Inditex kurulumu; ayrımı
// manifest'teki yol kalıbı yapıyor. Fiyat [data-testid='main-info-price']
// içinde, öneri kartları [data-testid='product-card-price'] kullanıyor.
//
// Bu mağazada ürün sayfasında h1 basılmıyor; ad og:title ve JSON-LD'de.
function parsePullAndBearUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "Pull & Bear UK",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")).replace(
        /\s*\|\s*Pull&Bear.*$/i,
        "",
      ) ||
      structured?.title,
    price:
      cleanPrice(getText("[data-testid='main-info-price']")) || structured?.price,
    currency: structured?.currency || "GBP",
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findImageBySelectors(["img[src*='static.pullandbear.net']", "main picture img"]),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
