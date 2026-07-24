// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function parseMediaMarkt() {
  return {
    site: "MediaMarkt",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(getText("[data-test='mms-price']")) ||
      cleanPrice(getText("[class*='Price']")) ||
      cleanPrice(getText("[class*='price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")),
    image:
      getAttr("picture img", "src") ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}
