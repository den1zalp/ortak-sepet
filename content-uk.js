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

  const price =
    product?.price ||
    (product?.preventPriceFallback === true ? null : fallback.price) ||
    null;

  // The structured currency only applies when the price came from structured
  // data too; a parser that read the price off the page owns its own currency.
  const fallbackCurrency =
    price && price === fallback.price ? fallback.currency : null;

  return {
    site: product?.site || fallback.site || getSiteName(),
    title: product?.title || fallback.title || cleanText(document.title),
    price,
    priceReadStatus: product?.priceReadStatus || fallback.priceReadStatus || null,
    priceUnavailableReason: product?.priceUnavailableReason || fallback.priceUnavailableReason || null,
    stockAvailable: product?.stockAvailable ?? fallback.stockAvailable ?? null,
    stockText: product?.stockText || fallback.stockText || "",
    image: product?.image || fallback.image || "",
    url: product?.url || window.location.href,

    currency: product?.currency || fallbackCurrency || null,
    currencySymbol: product?.currencySymbol || null,
    region: product?.region || "UK",

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

function getRawProductFromPage() {
  const parser = getProductParserForCurrentPage();
  return parser ? parser.parse() : parseGenericProduct();
}

// Finance taraması body metnini, shadow root'ları ve iframe'leri geziyor.
// Yoklama döngüsünde sadece parser'ı çalıştırıp bu taramayı ürün oturduktan
// sonra bir kez yapıyoruz.
async function waitForUkProductFromPage(maxWaitMs = 2200) {
  const parser = getProductParserForCurrentPage();
  const shouldWaitForPrice = Boolean(parser?.waitForPrice);

  let latestProduct = getRawProductFromPage();
  const startedAt = Date.now();

  while (
    shouldWaitForPrice &&
    latestProduct?.title &&
    !latestProduct?.price &&
    Date.now() - startedAt < maxWaitMs
  ) {
    await wait(300);
    latestProduct = getRawProductFromPage();
  }

  return normalizeProduct(latestProduct);
}

const AMAZON_FINANCE_SETTLE_MS = 10000;

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

      // Amazon fills the monthly payment box seconds after the page has loaded,
      // and later still in the background tab the price refresh opens (timers
      // and requests are throttled there). A freshly opened page is given until
      // it is AMAZON_FINANCE_SETTLE_MS old; one that has been open longer, as
      // when the user adds from the popup, is read as it is.
      if (productParser?.id === "amazon-uk" && product.installmentAvailable === false) {
        while (performance.now() < AMAZON_FINANCE_SETTLE_MS) {
          await wait(400);
          const amazonFinanceInfo = findAmazonUkFinanceInfo();

          if (amazonFinanceInfo?.installmentAvailable) {
            product.installmentAvailable = true;
            product.installmentText = amazonFinanceInfo.installmentText;
            break;
          }
        }
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
