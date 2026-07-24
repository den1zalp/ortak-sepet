// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function readTemuPriceInfo() {
  const directPrice = readMultiCurrencyPrice([
    "[data-testid*='price']",
    "[aria-label*='price' i]",
    "[class*='goodsPrice']",
    "[class*='goods-price']",
    "[class*='currentPrice']",
    "[class*='CurrentPrice']",
    "[class*='salePrice']",
    "[class*='SalePrice']",
    "[class*='productPrice']",
    "[class*='ProductPrice']",
    "[class*='price']",
    "[class*='Price']",
    "[class*='_2de9ERAH']",
  ]);

  if (directPrice.price) return directPrice;

  const bodyPrice = readMarketplaceBodyPriceInfo("USD");
  if (bodyPrice.price) return bodyPrice;

  return readMarketplaceBodyPriceInfo();
}

function parseTemuUk() {
  const jsonLd = parseJsonLdProduct();

  const title =
    getTextBySelectors([
      "[class*='goods-title'] h1",
      "[class*='ProductTitle']",
      "[class*='goodsTitle']",
      "h1",
    ]) ||
    (jsonLd && jsonLd.title) ||
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    cleanText(document.title);

  const priceInfo = readTemuPriceInfo();

  const image =
    findImageBySelectors([
      "[class*='gallery'] img",
      "[class*='Gallery'] img",
      "[class*='mainImage'] img",
      "[class*='goods-img'] img",
      "img[src*='kwcdn']",
      "img[src*='temu']",
      "main img",
    ]) ||
    getAttr("meta[property='og:image']", "content") ||
    findMainImage();

  return {
    site: "Temu",
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

const MULTI_CURRENCY_SYMBOL_RE = /[£₺$€₽₴₹¥₩]/;
const MULTI_CURRENCY_CODE_RE = /\b(?:GBP|USD|EUR|TRY|TL|RUB|UAH|INR|JPY|CNY|KRW|AUD|CAD|CHF|PLN|SEK|NOK|DKK|AED|SAR|BRL)\b/i;

