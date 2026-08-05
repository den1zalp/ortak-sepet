// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// IKEA splits the price across separate nodes (integer, decimal, currency), so
// the screen reader text is the most reliable single source when it is present.
function findIkeaUkPriceText() {
  const screenReaderPrice =
    cleanText(getText(".pip-temp-price__sr-text")) ||
    cleanText(getText(".pip-price__sr-text"));

  if (screenReaderPrice) return screenReaderPrice;

  const integerPart =
    cleanText(getText(".pip-temp-price__integer")) ||
    cleanText(getText(".pip-price__integer"));

  if (!integerPart) return "";

  const decimalPart = (
    cleanText(getText(".pip-temp-price__decimal")) ||
    cleanText(getText(".pip-price__decimal"))
  ).replace(/\D/g, "");

  return decimalPart ? `£${integerPart}.${decimalPart}` : `£${integerPart}`;
}

function findIkeaUkTitle() {
  const productName = cleanText(getText(".pip-header-section__title--big"));
  const productType = cleanText(getText(".pip-header-section__description-text"));

  if (productName && productType) {
    return `${productName} ${productType}`;
  }

  const metaTitle = cleanText(getAttr("meta[property='og:title']", "content"));

  return (
    productName ||
    metaTitle.replace(/\s*[-–|]\s*IKEA.*$/i, "") ||
    cleanText(getText("h1")) ||
    cleanText(document.title)
  );
}

function parseIkeaUk() {
  const metaImage = getAttr("meta[property='og:image']", "content");

  const image =
    (metaImage && !isBadImageCandidate(metaImage, "")
      ? toAbsoluteUrl(metaImage)
      : "") ||
    findImageBySelectors([
      ".pip-media-grid__media-image",
      ".pip-aspect-ratio-image__image",
      "img.pip-image",
      "[class*='pip-media']",
    ]) ||
    findMainImage();

  return {
    site: "IKEA UK",
    title: findIkeaUkTitle(),
    price:
      cleanPrice(findIkeaUkPriceText()) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
      cleanPrice(findMainPrice()),
    image,
    url: window.location.href,
  };
}
