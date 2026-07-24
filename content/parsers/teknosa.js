// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function parseTeknosa() {
  return {
    site: "Teknosa",
    title:
      cleanText(getText(".pdp-title")) ||
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(getText(".prc")) ||
      cleanPrice(getText(".price")) ||
      cleanPrice(getText("[class*='price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")),
    image:
      getAttr(".gallery img", "src") ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}
