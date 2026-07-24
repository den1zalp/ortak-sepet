// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function parseEbayUk() {
  const title =
    getTextBySelectors([
      "h1.x-item-title__mainTitle",
      "h1.x-item-title__mainTitle .ux-textspans",
      "[data-testid='x-item-title']",
      "[data-testid='x-item-title'] .ux-textspans",
      "h1[itemprop='name']",
      "h1",
    ]) ||
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    cleanText(document.title);

  const price =
    cleanPrice(getTextBySelectors([
      ".x-price-primary",
      ".x-price-primary .ux-textspans",
      "[data-testid='x-price-primary']",
      "[data-testid='x-price-primary'] .ux-textspans",
      "#prcIsum",
      "#mm-saleDscPrc",
      "[itemprop='price']",
      "[class*='price-primary']",
    ])) ||
    cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
    cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
    cleanPrice(findMainPrice());

  const image =
    findImageBySelectors([
      "#icImg",
      "img#icImg",
      "[data-testid='ux-image-carousel-item'] img",
      ".ux-image-carousel-item img",
      ".ux-image-carousel img",
      "img[src*='i.ebayimg.com']",
      "img[data-zoom-src*='i.ebayimg.com']",
    ]) ||
    getAttr("meta[property='og:image']", "content") ||
    findMainImage();

  return {
    site: "eBay UK",
    title,
    price,
    image,
    url: window.location.href,
  };
}

