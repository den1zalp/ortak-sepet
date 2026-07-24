// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function parseItopya() {
  const mainPrice = findSiteMainPrice({
    titleSelectors: ["h1", "[class*='product'] h1", "[class*='Product'] h1"],
    minLeftRatio: 0.55,
    maxLeftRatio: 0.97,
    maxDistanceBelowTitle: 650,
  });

  return {
    site: "İtopya",
    title:
      getFirstText([
        "h1",
        "[class*='product-name']",
        "[class*='ProductName']",
        "[class*='product-title']",
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
        minWidth: 140,
        minHeight: 140,
        cdnRegex: /itopya|product|urun|ürün|images|image|media|cdn/i,
      }) || getFirstAttr([".swiper-slide img", ".product-image img"], "src"),
    url: window.location.href,
  };
}

