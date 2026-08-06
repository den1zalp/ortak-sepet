// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function findVatanMainImage() {
  return (
    findProductImage({
      cdnRegex: /vatan|product|urun|ürün|images|media|resize/i,
    }) ||
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content")
  );
}

function parseVatan() {
  return {
    site: "Vatan Bilgisayar",
    title:
      cleanText(getText("h1")) ||
      cleanText(getText(".product-list__product-name")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(getText(".product-list__price")) ||
      cleanPrice(getText(".product-price")) ||
      cleanPrice(getText("[class*='price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")),
    image: findVatanMainImage(),
    url: window.location.href,
  };
}

