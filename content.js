// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function parseGenericProduct() {
  const jsonLdProduct = parseJsonLdProduct();
  if (jsonLdProduct && jsonLdProduct.title) return jsonLdProduct;

  const metaProduct = parseMetaProduct();
  if (metaProduct && metaProduct.title) return metaProduct;

  return {
    site: getSiteName(),
    title: cleanText(document.title),
    price: null,
    image: getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}

function normalizeProduct(product) {
  const fallback = parseGenericProduct();
  const installmentInfo = findInstallmentInfo();
  const shippingInfo = findShippingInfo();

  return {
    site: product?.site || fallback.site || getSiteName(),
    title: product?.title || fallback.title || cleanText(document.title),
    price: product?.price || (product?.preventPriceFallback === true ? null : fallback.price) || null,
    priceReadStatus: product?.priceReadStatus || fallback.priceReadStatus || null,
    priceUnavailableReason: product?.priceUnavailableReason || fallback.priceUnavailableReason || null,
    stockAvailable: product?.stockAvailable ?? fallback.stockAvailable ?? null,
    stockText: product?.stockText || fallback.stockText || "",
    image: product?.image || fallback.image || "",
    url: product?.url || window.location.href,

    currency: product?.currency || null,
    currencySymbol: product?.currencySymbol || null,
    region: product?.region || null,

    installmentAvailable: installmentInfo.installmentAvailable,
    installmentText: installmentInfo.installmentText,

    shippingAvailable: shippingInfo.shippingAvailable,
    freeShipping: shippingInfo.freeShipping,
    shippingText: shippingInfo.shippingText,
    shippingSource: shippingInfo.shippingSource,
    shippingConfidence: shippingInfo.shippingConfidence,
  };
}

function getProductParserForCurrentPage() {
  if (typeof getOrtakSepetParserForUrl !== "function") return null;
  return getOrtakSepetParserForUrl(window.location);
}

function getProductFromPage() {
  const parser = getProductParserForCurrentPage();
  const product = parser ? parser.parse() : parseGenericProduct();

  return normalizeProduct(product);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProductFromPage(maxWaitMs = 2200) {
  const parser = getProductParserForCurrentPage();

  if (!parser?.waitForPrice) {
    return getProductFromPage();
  }

  const startedAt = Date.now();
  let product = getProductFromPage();

  while ((!product.title || !product.price) && Date.now() - startedAt < maxWaitMs) {
    await wait(350);
    product = getProductFromPage();
  }

  return product;
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "GET_PRODUCT") {
    return waitForProductFromPage().then((product) => {
      if (!product.title) {
        return {
          ok: false,
          error: "Ürün adı okunamadı.",
        };
      }

      return {
        ok: true,
        product,
      };
    });
  }
});
