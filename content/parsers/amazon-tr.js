// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function formatTryCurrencyFromNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;

  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)} TL`;
}

function cleanAmazonTryPrice(rawPrice) {
  const cleaned = cleanPrice(rawPrice);
  if (cleaned) return cleaned;

  const raw = cleanText(rawPrice);
  if (!raw) return null;

  const numericMatch = raw.match(/\b\d+(?:[.]\d{1,2})\b/);
  if (!numericMatch) return null;

  return formatTryCurrencyFromNumber(Number.parseFloat(numericMatch[0]));
}

function getAmazonMainAreaText() {
  const selectors = [
    "#rightCol",
    "#centerCol",
    "#desktop_buybox",
    "#buybox",
    "#availability",
    "#merchant-info",
    "#corePrice_feature_div",
    "#corePriceDisplay_desktop_feature_div",
    "#apex_desktop",
  ];

  return cleanText(
    selectors
      .map((selector) => document.querySelector(selector)?.innerText || "")
      .filter(Boolean)
      .join(" "),
  );
}

function isAmazonMainOfferUnavailable() {
  const text = getAmazonMainAreaText().toLocaleLowerCase("tr-TR");

  return /satın alma seçeneklerini gör|satin alma seceneklerini gor|şu anda mevcut değil|su anda mevcut degil|stokta yok|normalden yüksek fiyat|normalden yuksek fiyat|currently unavailable|see all buying options/i.test(text);
}

function findAmazonTrMainPrice() {
  const scopedSelectors = [
    "#corePrice_feature_div .a-price .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
    "#apex_desktop .a-price .a-offscreen",
    "#corePrice_feature_div #priceblock_ourprice",
    "#corePrice_feature_div #priceblock_dealprice",
    "#corePrice_feature_div #price_inside_buybox",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    "#price_inside_buybox",
    "#newBuyBoxPrice",
    "#tp_price_block_total_price_ww .a-offscreen",
    "#sns-base-price .a-offscreen",
  ];

  for (const selector of scopedSelectors) {
    const elements = Array.from(document.querySelectorAll(selector));

    for (const element of elements) {
      const text = cleanText(element.textContent || element.getAttribute("content") || "");
      const price = cleanAmazonTryPrice(text);

      if (price) return price;
    }
  }

  const metaPrice =
    cleanAmazonTryPrice(getAttr("meta[property='product:price:amount']", "content")) ||
    cleanAmazonTryPrice(getAttr("meta[property='og:price:amount']", "content"));

  if (metaPrice) return metaPrice;

  // Do not scan the whole page on Amazon. When the main offer is unavailable,
  // Amazon often shows recommendation carousels below the product and those
  // prices are not the current product price.
  if (isAmazonMainOfferUnavailable()) return null;

  return null;
}

function parseAmazonTr() {
  const mainPrice = findAmazonTrMainPrice();
  const offerUnavailable = !mainPrice && isAmazonMainOfferUnavailable();

  return {
    site: "Amazon TR",
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
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}

