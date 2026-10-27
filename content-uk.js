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

const AMAZON_FINANCE_SETTLE_MS = 5000;

// The UK scripts load at document_start so that an Amazon page can be read
// while it is still streaming in: on its 2 MB product page the title, the
// price and the monthly payment line under it ("Or £16.44/month (3 months) at
// no interest", sent in the HTML to eligible accounts) are parsed about a
// second before DOMContentLoaded, with the page's CSS already applied, so the
// hidden plan templates stay hidden. A read that comes in that early waits
// until the parser is past the price block, which the first of these sections
// after it marks.
const AMAZON_UK_AFTER_PRICE_BLOCK =
  "#inemi_feature_div, #tradeInPriceBlock_feature_div, #featurebullets_feature_div";

function waitForAmazonUkPriceBlock() {
  return new Promise((resolve) => {
    const isReady = () =>
      document.readyState !== "loading" || Boolean(document.querySelector(AMAZON_UK_AFTER_PRICE_BLOCK));

    if (isReady()) {
      resolve();
      return;
    }

    const done = () => {
      observer.disconnect();
      document.removeEventListener("DOMContentLoaded", done);
      resolve();
    };

    const observer = new MutationObserver(() => {
      if (isReady()) done();
    });

    observer.observe(document, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", done);
  });
}

// Whether a batch of mutations brought in finance wording. textContent needs
// no layout, so this is cheap enough to run on every batch Amazon makes while
// loading; the innerText check that decides needs a layout of both columns and
// would otherwise run hundreds of times, competing with the very script that
// fills the box. Hidden templates match here too, which is fine: the full
// check still leaves them out.
function mutationsMentionFinance(records) {
  for (const record of records) {
    const nodes = record.type === "childList" ? record.addedNodes : [record.target];

    for (const node of nodes) {
      if (AMAZON_UK_FINANCE_OFFER_PATTERN.test(stripZeroWidth(node.textContent))) return true;
    }
  }

  return false;
}

// Resolves with the finance offer as soon as Amazon draws the monthly payment
// box, or with null once the page is untilPageAgeMs old. A MutationObserver
// fires the moment the box is filled; the timer polling it replaced fell to a
// second or more per check in the background tab the price refresh opens,
// where timers are throttled.
function waitForAmazonUkFinance(untilPageAgeMs) {
  return new Promise((resolve) => {
    const remainingMs = untilPageAgeMs - performance.now();

    if (remainingMs <= 0) {
      resolve(null);
      return;
    }

    let done = false;
    let timer = null;

    const finish = (info) => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(info);
    };

    const check = () => {
      if (done) return;
      const info = findAmazonUkFinanceInfo();
      if (info?.installmentAvailable) finish(info);
    };

    const onMutations = (records) => {
      if (!done && mutationsMentionFinance(records)) check();
    };

    // The box lives in the product column or the buy box; watching only those
    // keeps carousels and ads further down from triggering a check. The class
    // and style attributes are watched because Amazon also reveals boxes by
    // dropping aok-hidden.
    const observer = new MutationObserver(onMutations);
    const zones = Array.from(document.querySelectorAll("#centerCol, #rightCol"));

    for (const zone of zones.length > 0 ? zones : [document.body || document.documentElement]) {
      observer.observe(zone, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }

    // One full look before giving up, in case the box came in a way the cheap
    // filter did not see (a stylesheet revealing it, say).
    timer = setTimeout(() => {
      check();
      finish(null);
    }, remainingMs);
    check();
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // The price refresh's second question to an Amazon UK page whose first read
  // found no monthly payment box: only the box is waited for. Parsing the
  // product again would read the whole page's text, which on Amazon forces a
  // layout of the entire page.
  if (message && message.type === "WAIT_AMAZON_FINANCE") {
    waitForAmazonUkFinance(AMAZON_FINANCE_SETTLE_MS).then(
      (finance) => sendResponse({ ok: true, finance }),
      () => sendResponse({ ok: false }),
    );

    return true;
  }

  if (message && message.type === "GET_PRODUCT") {
    (async () => {
      const productParser = getProductParserForCurrentPage();

      if (productParser?.id === "amazon-uk") await waitForAmazonUkPriceBlock();

      const product = await waitForUkProductFromPage();

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

      // Amazon fills the monthly payment box (#inemi_feature_div, empty in the
      // page's HTML) by script after the page is up, and later still in the
      // background tab the price refresh opens. A freshly opened page is
      // watched until it is AMAZON_FINANCE_SETTLE_MS old and answered the
      // moment the box shows; one that has been open longer, as when the user
      // adds from the popup, is read as it is. The price refresh asks with
      // skipFinanceSettle so that the wait does not hold one of its tab slots,
      // then waits for the box with WAIT_AMAZON_FINANCE.
      if (
        !message.skipFinanceSettle &&
        productParser?.id === "amazon-uk" &&
        product.installmentAvailable === false
      ) {
        const amazonFinanceInfo = await waitForAmazonUkFinance(AMAZON_FINANCE_SETTLE_MS);

        if (amazonFinanceInfo) {
          product.installmentAvailable = true;
          product.installmentText = amazonFinanceInfo.installmentText;
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
