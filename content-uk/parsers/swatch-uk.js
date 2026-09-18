// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// swatch.com/en-gb, Türkiye mağazasıyla aynı Salesforce Commerce kurulumu;
// ayrımı manifest'teki yol kalıbı yapıyor. Fiyat JSON-LD'de ve
// ".price .sales .value" içinde.
function parseSwatchUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "Swatch UK",
    title: cleanText(getText("h1")) || structured?.title,
    price: structured?.price || cleanPrice(getText(".price .sales .value")),
    currency: structured?.currency || "GBP",
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findImageBySelectors(["img[src*='static.swatch.com']", "main picture img"]),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
