// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function parseBershka() {
  const mainPrice = findFashionMainPrice({
    titleSelectors: ["h1", "[class*='product-title']", "[class*='ProductTitle']"],
    minLeftRatio: 0.55,
    maxLeftRatio: 0.98,
    maxDistanceBelowTitle: 620,
  });

  return {
    site: "Bershka",
    title:
      getFirstTextFromAll([
        "h1",
        "[class*='product-title']",
        "[class*='ProductTitle']",
        "[class*='product-name']",
        "[class*='ProductName']",
      ]) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      cleanPrice(getFirstTextFromAll([
        ".product-detail-info__price",
        ".price-elem.product-detail-info__price",
        ".current-price-elem-cxc",
      ])) ||
      cleanPrice(mainPrice) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
      cleanPrice(getFirstText(["[class*='price']", "[class*='Price']"])),
    image:
      findSiteMainImage({
        preferLeftSide: true,
        minWidth: 180,
        minHeight: 220,
        cdnRegex: /bershka|static|product|media|image|contents/i,
      }) || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}

