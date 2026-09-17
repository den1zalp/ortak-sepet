// Ortak Sepet - UK stores' shared parser.
//
// This file does not belong to a single site: many registry entries call
// parsePlatformProduct() with their own options. Nearly every store added here
// publishes schema.org Product data on the product page (SFCC, Shopify, Next.js
// storefronts and most in-house ones). While that data is there, writing
// per-site selectors would redo the same job in the fragile way — class names
// change with every redesign, JSON-LD does not.
//
// The price order is deliberately "structured data first": a discounted product
// shows both the payable amount and the struck-through list price, and picking
// the wrong one with a selector is a mistake this repo has made more than once.
// offers.price is the payable amount. When structured data is missing, the
// site's own selectors run, and after that normalizeProduct's generic scan.
//
// A site that needs real logic (a late-rendering price, its own image rule,
// wrong JSON-LD) moves out of here into its own file; ifixit-uk.js is one.

// Platform price selectors. These are fallbacks only: they never run while the
// structured data can be read. Each list puts the "payable amount" classes
// first and the generic one last, so a discounted product cannot hand back the
// struck-through list price.
const UK_SFCC_PRICE_SELECTORS = [
  ".prices .sales .value",
  ".price .sales .value",
  ".product-price .sales",
  "[data-price]",
];

const UK_SHOPIFY_PRICE_SELECTORS = [
  ".price__sale .price-item--sale",
  ".price-item--sale",
  ".product__price .money",
  ".price .money",
];

function findUkPlatformStructuredPrice(structured) {
  if (structured?.price) return { price: structured.price, currency: structured.currency };

  const offer = findStructuredOffer();

  if (!offer) return { price: null, currency: null };

  return {
    price: formatStructuredPrice(offer.price, offer.currency),
    currency: offer.currency || null,
  };
}

function parsePlatformProduct(options = {}) {
  const {
    site,
    titleSelectors = [],
    priceSelectors = [],
    preventPriceFallback = false,
  } = options;

  const structured = parseJsonLdProduct();
  const structuredPrice = findUkPlatformStructuredPrice(structured);

  const title =
    getTextBySelectors([...titleSelectors, "h1"]) ||
    cleanText(structured?.title) ||
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    cleanText(document.title);

  // Structured data does not always carry the payable amount: some stores put
  // the list price there and show it struck through on the page. When that
  // happens the price is read off the page instead.
  const structuredIsStruck =
    Boolean(structuredPrice.price) && isStruckThroughPrice(structuredPrice.price);

  const domPrice = priceSelectors.length
    ? cleanPrice(getTextBySelectors(priceSelectors))
    : null;

  const price = structuredIsStruck
    ? cleanPrice(findSalePriceNearStruckPrice(structuredPrice.price)) ||
      domPrice ||
      cleanPrice(findMainPrice()) ||
      structuredPrice.price
    : structuredPrice.price || domPrice;

  // The structured currency only applies when the price came from there too; a
  // price read off the page already carries its symbol through cleanPrice.
  const currency = price && price === structuredPrice.price ? structuredPrice.currency : null;

  // Structured data and og:image first: scanning the page for the biggest
  // picture can land on a campaign banner. The scan is the last resort, for
  // stores that publish neither.
  const image =
    structured?.image || getAttr("meta[property='og:image']", "content") || findMainImage();

  return {
    site,
    title,
    price: price || null,
    currency: currency || null,
    image,
    url: window.location.href,
    preventPriceFallback,
  };
}

// Inditex stores (Pull&Bear, Stradivarius) render the product with JavaScript
// and most pages carry no JSON-LD, so the price falls back to the scored scan
// in core.js rather than to a class name that changes every season.
function parseInditexProduct(site) {
  const structured = parseJsonLdProduct();
  const structuredPrice = findUkPlatformStructuredPrice(structured);

  return {
    site,
    title:
      getTextBySelectors([
        "h1",
        "[data-qa-action='product-name']",
        "[class*='product-name']",
        "[class*='product-detail'] h1",
      ]) ||
      cleanText(structured?.title) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      structuredPrice.price ||
      cleanPrice(
        getTextBySelectors([
          "[class*='current-price-elem']",
          "[class*='price-current']",
          "[class*='money-amount__main']",
        ]),
      ) ||
      cleanPrice(findMainPrice()),
    currency: structuredPrice.price ? structuredPrice.currency : null,
    image: findMainImage() || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}
