// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function parseHm() {
  const mainPrice = findFashionMainPrice({
    titleSelectors: ["h1", "[class*='ProductName']", "[class*='product-name']"],
    minLeftRatio: 0.45,
    maxLeftRatio: 0.98,
    maxDistanceBelowTitle: 760,
  });

  return {
    site: "H&M",
    title:
      getFirstTextFromAll([
        "h1",
        "[class*='ProductName']",
        "[class*='product-name']",
        "[class*='ProductTitle']",
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
        minWidth: 170,
        minHeight: 220,
        cdnRegex: /hm|hennes|product|media|image|assets|akamai/i,
      }) || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}

