// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function parseGenericProduct() {
  const jsonLdProduct = parseJsonLdProduct();
  if (jsonLdProduct && jsonLdProduct.title) return jsonLdProduct;

  const metaProduct = parseMetaProduct();
  if (metaProduct && metaProduct.title) return metaProduct;

  return {
    site: getSiteName(),
    title: cleanText(document.title),
    price: cleanPrice(findMainPrice()),
    image: findMainImage(),
    url: window.location.href,
  };
}

function normalizeProduct(product) {
  const fallback = parseGenericProduct();
  const financeInfo = findFinanceInfo();
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

    installmentAvailable: financeInfo.installmentAvailable,
    installmentText: financeInfo.installmentText,

    shippingAvailable: shippingInfo.shippingAvailable,
    freeShipping: shippingInfo.freeShipping,
    shippingText: shippingInfo.shippingText,
    shippingSource: shippingInfo.shippingSource,
    shippingConfidence: shippingInfo.shippingConfidence,
  };
}

function getProductParserForCurrentPage() {
  if (typeof getOrtakSepetUkParserForUrl !== "function") return null;
  return getOrtakSepetUkParserForUrl(window.location);
}

function getProductFromPage() {
  const parser = getProductParserForCurrentPage();
  const product = parser ? parser.parse() : parseGenericProduct();

  return normalizeProduct(product);
}

async function waitForUkProductFromPage(maxWaitMs = 2200) {
  const parser = getProductParserForCurrentPage();
  const shouldWaitForPrice = Boolean(parser?.waitForPrice);

  let latestProduct = getProductFromPage();
  const startedAt = Date.now();

  while (
    shouldWaitForPrice &&
    latestProduct?.title &&
    !latestProduct?.price &&
    Date.now() - startedAt < maxWaitMs
  ) {
    await wait(300);
    latestProduct = getProductFromPage();
  }

  return latestProduct;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "GET_PRODUCT") {
    (async () => {
      const product = await waitForUkProductFromPage();

      const productParser = getProductParserForCurrentPage();

      if (productParser?.id === "diesel-uk") {
        const captureImage = getDieselImageElements()[0];
        const captureRect = captureImage?.getBoundingClientRect();

        if (captureRect && captureRect.width > 0 && captureRect.height > 0) {
          product.imageCaptureRect = {
            left: captureRect.left,
            top: captureRect.top,
            width: captureRect.width,
            height: captureRect.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          };
        }

        product.image = (await createDieselImageDataUrl()) || product.image;

        const dieselFinanceInfo = await waitForDieselFinanceInfo();
        product.installmentAvailable = dieselFinanceInfo.installmentAvailable;
        product.installmentText = dieselFinanceInfo.installmentText;
      }

      if (!product.title) {
        sendResponse({
          ok: false,
          error: "Product title could not be read.",
        });
        return;
      }

      sendResponse({
        ok: true,
        product,
      });
    })().catch(() => {
      sendResponse({
        ok: false,
        error: "Product information could not be read.",
      });
    });

    return true;
  }

  return false;
});
