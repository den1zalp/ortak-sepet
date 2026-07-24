// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function parseAmazonUk() {
  const mainPrice = findAmazonUkMainPrice();
  const offerUnavailable = !mainPrice && isAmazonUkMainOfferUnavailable();

  return {
    site: "Amazon UK",
    title: cleanText(getText("#productTitle")) || cleanText(getText("h1")),
    price: mainPrice,
    preventPriceFallback: true,
    priceReadStatus: offerUnavailable ? "unavailable" : mainPrice ? "ok" : null,
    priceUnavailableReason: offerUnavailable ? "noActiveOffer" : null,
    stockAvailable: offerUnavailable ? false : null,
    stockText: offerUnavailable ? "noActiveOffer" : "",
    image:
      getAttr("#landingImage", "src") ||
      getAttr("#imgBlkFront", "src") ||
      getAttr("meta[property='og:image']", "content") ||
      findMainImage(),
    url: window.location.href,
  };
}

