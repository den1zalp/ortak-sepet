// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function priceInfoFromCandidate(candidate) {
  return {
    price: candidate?.text || null,
    currency: candidate?.currency || undefined,
    currencySymbol: candidate?.currencySymbol || undefined,
    region: candidate?.region || undefined,
  };
}

function readAliExpressBodyUnitPriceInfo() {
  const bodyText = getMarketplaceBodyText();
  const candidates = extractAnyPriceCandidates(bodyText)
    .filter((candidate) => candidate.currency === "GBP");

  const unitPrice = candidates
    .filter((candidate) => /\/\s*(?:lot|piece|pcs?|set|pack|unit)/i.test(candidate.text))
    .map((candidate) => {
      let score = 1000;
      if (/price\s+includes\s+vat|vat\s+included|incl(?:udes|\.)?\s+vat/i.test(candidate.afterContext)) score += 320;
      if (/reviews?|sold|ratings?/i.test(candidate.beforeContext)) score += 80;
      if (/coupon|voucher|refund|shipping|delivery|pick-?up/i.test(candidate.localContext)) score -= 160;
      return { ...candidate, score };
    })
    .sort((a, b) => b.score - a.score)[0];

  if (unitPrice) return priceInfoFromCandidate(unitPrice);

  const vatPrice = candidates
    .filter((candidate) => /price\s+includes\s+vat|vat\s+included|incl(?:udes|\.)?\s+vat/i.test(candidate.afterContext))
    .filter((candidate) => !/\boff\b|coupon|voucher|refund|shipping|delivery|pick-?up/i.test(candidate.localContext))
    .sort((a, b) => b.value - a.value)[0];

  return priceInfoFromCandidate(vatPrice);
}

function readAliExpressPriceInfo() {
  const unitBodyPrice = readAliExpressBodyUnitPriceInfo();
  if (unitBodyPrice.price) return unitBodyPrice;

  const directPrice = readMultiCurrencyPrice([
    "[data-pl='product-price']",
    "[data-pl*='product-price']",
    "[data-pl*='price']",
    "[class*='currentPriceText']",
    "[class*='price--current']",
    "[class*='price--wrap']",
    "[class*='product-price-current']",
    "[class*='product-price']",
    "[class*='ProductPrice']",
    "[class*='snow-price']",
    ".product-price-value",
    "[class*='price']",
  ]);

  if (directPrice.price) return directPrice;

  const bodyPrice = readMarketplaceBodyPriceInfo("GBP");
  if (bodyPrice.price) return bodyPrice;

  return readMarketplaceBodyPriceInfo();
}

function findAliExpressMainImage() {
  return (
    findImageBySelectors([
      "[class*='image-view--previewBox'] img",
      "[class*='image-view'] img",
      "[class*='magnifier'] img",
      "[class*='slider--img'] img",
      ".pdp-info img",
      "img[src*='ae-pic']",
      "img[src*='alicdn']",
    ]) ||
    getAttr("meta[property='og:image']", "content") ||
    findMainImage()
  );
}

function parseAliExpressUk() {
  const jsonLd = parseJsonLdProduct();

  const title =
    getTextBySelectors([
      "h1[data-pl='product-title']",
      "[data-pl='product-title']",
      "[class*='title--wrap'] h1",
      "[class*='product-title']",
      "h1",
    ]) ||
    (jsonLd && jsonLd.title) ||
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    cleanText(document.title);

  const priceInfo = readAliExpressPriceInfo();

  const image = findAliExpressMainImage() || (jsonLd && jsonLd.image) || "";

  return {
    site: "AliExpress",
    title,
    price: priceInfo.price || (jsonLd && jsonLd.price) || null,
    currency: priceInfo.currency,
    currencySymbol: priceInfo.currencySymbol,
    region: priceInfo.region,
    preventPriceFallback: true,
    image,
    url: window.location.href,
  };
}

