// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function findCiceksepetiMainImage() {
  return (
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content") ||
    findProductImage({
      minWidth: 100,
      minHeight: 100,
      cdnRegex: /ciceksepeti|product|urun|ürün|images|media|cdn/i,
    })
  );
}

function parseCiceksepeti() {
  return {
    site: "Çiçeksepeti",
    title:
      cleanText(getText("h1")) ||
      cleanText(getText("[class*='product-name']")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(getText(".product-price__new")) ||
      cleanPrice(getText("[class*='productPrice']")) ||
      cleanPrice(getText("[class*='product-price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
      cleanPrice(findMainPrice()),
    image: findCiceksepetiMainImage(),
    url: window.location.href,
  };
}
