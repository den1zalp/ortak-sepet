// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function parseIncehesap() {
  const mainPrice = findSiteMainPrice({
    titleSelectors: ["h1", "[class*='product'] h1", "[class*='Product'] h1"],
    minLeftRatio: 0.45,
    maxLeftRatio: 0.95,
    maxDistanceBelowTitle: 650,
  });

  return {
    site: "İncehesap",
    title:
      getFirstText([
        "h1",
        "[class*='product-name']",
        "[class*='ProductName']",
        "[class*='product-title']",
        "[class*='ProductTitle']",
      ]) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      cleanPrice(mainPrice) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
      cleanPrice(getFirstText(["[class*='price']", "[class*='Price']"])),
    image:
      findSiteMainImage({
        preferLeftSide: true,
        minWidth: 150,
        minHeight: 150,
        cdnRegex: /incehesap|product|urun|ürün|images|image|media|cdn/i,
      }) || getFirstAttr([".swiper-slide img", ".product-image img"], "src"),
    url: window.location.href,
  };
}


