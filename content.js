// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function parseGenericProduct() {
  const jsonLdProduct = parseJsonLdProduct();
  if (jsonLdProduct && jsonLdProduct.title && jsonLdProduct.price) {
    return jsonLdProduct;
  }

  const metaProduct = parseMetaProduct();
  if (metaProduct && metaProduct.title && metaProduct.price) {
    return metaProduct;
  }

  // Yapılandırılmış veride fiyat yoksa sayfadan okumayı dene; aksi hâlde
  // parser'ı olmayan sitelerde fiyat hep boş kalır.
  const fallbackPrice = cleanPrice(findMainPrice());

  return {
    site: getSiteName(),
    title:
      jsonLdProduct?.title ||
      metaProduct?.title ||
      cleanText(document.title),
    price: jsonLdProduct?.price || metaProduct?.price || fallbackPrice || null,
    currency: jsonLdProduct?.currency || metaProduct?.currency || null,
    image:
      jsonLdProduct?.image ||
      metaProduct?.image ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}

function normalizeProduct(product) {
  const fallback = parseGenericProduct();
  const installmentInfo = findInstallmentInfo();
  const shippingInfo = findShippingInfo();

  const price =
    product?.price ||
    (product?.preventPriceFallback === true ? null : fallback.price) ||
    null;

  // Yapılandırılmış verinin para birimi yalnızca fiyat da oradan geldiyse
  // geçerli; parser sayfadan kendi fiyatını okuduysa ona ait değil.
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
    region: product?.region || "TR",

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

function getRawProductFromPage() {
  const parser = getProductParserForCurrentPage();
  return parser ? parser.parse() : parseGenericProduct();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Yoklama döngüsü yalnızca parser'ı çalıştırır. Taksit ve kargo taraması tüm
// sayfayı gezdiği için pahalıdır; onu döngü içinde değil, ürün oturduktan
// sonra bir kez yapıyoruz.
async function waitForProductFromPage(maxWaitMs = 2200) {
  const parser = getProductParserForCurrentPage();
  let product = getRawProductFromPage();

  if (parser?.waitForPrice) {
    const startedAt = Date.now();

    while (
      (!product?.title || !product?.price) &&
      Date.now() - startedAt < maxWaitMs
    ) {
      await wait(350);
      product = getRawProductFromPage();
    }
  }

  return normalizeProduct(product);
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
