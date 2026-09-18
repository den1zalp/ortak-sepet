// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// stradivarius.com/gb, Türkiye mağazasıyla aynı Inditex kurulumu; ayrımı
// manifest'teki yol kalıbı yapıyor.
function parseStradivariusUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "Stradivarius UK",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")).replace(
        /\s*\|\s*STRADIVARIUS.*$/i,
        "",
      ) ||
      structured?.title,
    price:
      cleanPrice(getText("[data-testid='main-info-price']")) || structured?.price,
    currency: structured?.currency || "GBP",
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findImageBySelectors(["img[src*='stradivarius']", "main picture img"]),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
