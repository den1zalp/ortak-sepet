// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.

function findN11MainImage() {
  return (
    findProductImage({
      cdnRegex: /product|urun|ürün|images|media|catalog|cdn/i,
    }) ||
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content")
  );
}
function parseN11() {
  return {
    site: "n11",
    title:
      cleanText(getText(".proName")) ||
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(getText(".newPrice ins")) ||
      cleanPrice(getText(".priceContainer .newPrice")) ||
      cleanPrice(getText("[class*='price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")),
    image: findN11MainImage(),
    url: window.location.href,
  };
}

