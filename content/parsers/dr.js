// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// D&R ve idefix aynı altyapıyı kullanıyor; fiyat bloğu da benzer şekilde
// "alışveriş kredisi" ve kampanya satırlarıyla birlikte basılıyor. Bu yüzden
// genel skorlayıcıyı kullanıp yapılandırılmış veriyi öne alıyoruz.
function findDrMainImage() {
  return (
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content") ||
    findProductImage({
      minWidth: 100,
      minHeight: 100,
      cdnRegex: /product|urun|ürün|images|media|catalog/i,
    })
  );
}

function parseDr() {
  return {
    site: "D&R",
    title:
      cleanText(getText("h1")) ||
      cleanText(getText("[class*='ProductName']")) ||
      cleanText(getText("[class*='product-name']")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(getText("[class*='ProductPrice']")) ||
      cleanPrice(getText("[class*='product-price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
      cleanPrice(findMainPrice()),
    image: findDrMainImage(),
    url: window.location.href,
  };
}
