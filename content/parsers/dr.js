// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// D&R ve idefix aynı altyapıyı kullanıyor; fiyat bloğu da benzer şekilde
// "alışveriş kredisi" ve kampanya satırlarıyla birlikte basılıyor. Bu yüzden
// genel skorlayıcıyı kullanıp yapılandırılmış veriyi öne alıyoruz.
function findDrMainImage() {
  const metaImage =
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content");

  if (metaImage) return metaImage;

  const images = Array.from(document.querySelectorAll("img"));

  const scoredImages = images
    .map((img) => {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";

      if (!src) return null;
      if (/logo|icon|sprite|placeholder|loading|badge/i.test(src)) return null;
      if (/logo|icon|sprite|placeholder|loading|badge/i.test(alt)) return null;
      if (!isVisibleElement(img)) return null;

      const rect = img.getBoundingClientRect();

      if (rect.width < 100 || rect.height < 100) return null;

      let score = rect.width + rect.height;

      if (/product|urun|ürün|images|media|catalog/i.test(src)) score += 140;
      if (rect.left < window.innerWidth * 0.5) score += 160;
      if (rect.top < window.innerHeight * 0.8) score += 100;

      return { src, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scoredImages[0]?.src || "";
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
