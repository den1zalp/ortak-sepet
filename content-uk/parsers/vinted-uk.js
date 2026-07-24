// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function parseVintedUk() {
  return {
    site: "Vinted UK",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      cleanPrice(getText("[data-testid*='item-price']")) ||
      cleanPrice(getText("[class*='price']")) ||
      cleanPrice(findMainPrice()),
    image:
      getAttr("[data-testid*='item-photo'] img", "src") ||
      getAttr("meta[property='og:image']", "content") ||
      findMainImage(),
    url: window.location.href,
  };
}


