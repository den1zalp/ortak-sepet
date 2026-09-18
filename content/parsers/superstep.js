// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// superstep.com.tr (Akinon) fiyatı hem JSON-LD'de hem [data-testid='price']
// içinde veriyor; ikisi de ödenecek tutar.
//
// Alttaki öneri kartları [data-testid='product-price'] kullanıyor, karışmıyor.
function parseSuperStep() {
  const structured = parseJsonLdProduct();

  return {
    site: "SuperStep",
    title: cleanText(getText("h1")) || structured?.title,
    price: formatTryPriceText(getText("[data-testid='price']")) || structured?.price,
    currency: structured?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /akinoncloudcdn\.com/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
