// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function parseZara() {
  const mainPrice = findFashionMainPrice({
    titleSelectors: ["h1", "[data-qa-action='product-name']", "[class*='product-detail'] h1"],
    minLeftRatio: 0.45,
    maxLeftRatio: 0.95,
    maxDistanceBelowTitle: 520,
  });

  return {
    site: "Zara",
    title:
      getFirstTextFromAll([
        "h1",
        "[data-qa-action='product-name']",
        "[class*='product-name']",
        "[class*='ProductName']",
        "[class*='product-detail'] h1",
      ]) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      cleanPrice(getFirstTextFromAll([
        ".product-detail-info__price",
        ".product-detail-info__price-amount",
        ".price-current__amount",
        ".money-amount__main",
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
        cdnRegex: /zara|static|product|media|image|contents/i,
      }) || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}

