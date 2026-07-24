// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function parseTrendyol() {
  const mainPrice = findTrendyolMainPrice();

  return {
    site: "Trendyol",
    title:
      cleanText(getText(".pr-new-br")) ||
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(mainPrice) ||
      cleanPrice(getText(".prc-dsc")) ||
      cleanPrice(getText(".prc-slg")) ||
      cleanPrice(getText("[class*='price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")),
    image: findTrendyolMainImage(),
    url: window.location.href,
  };
}

