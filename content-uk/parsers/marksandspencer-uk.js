// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// marksandspencer.com fiyatı JSON-LD'de "priceSpecification" içinde veriyor
// (offers.price yok); findStructuredOffer() bu biçimi okuyor.
//
// DOM yedeği ürün girişinin fiyat kutusu: sınıf adları karma taşıyor
// ("price_root__KL398") ama "price_root" öneki kalıcı.
function parseMarksAndSpencerUk() {
  const structured = parseJsonLdProduct();
  const offer = findStructuredOffer();

  return {
    site: "Marks & Spencer UK",
    title: cleanText(getText("h1")) || structured?.title,
    price:
      structured?.price ||
      formatStructuredPrice(offer?.price, offer?.currency || "GBP") ||
      cleanPrice(getText("[class*='price_root'], [class*='product-intro_price']")),
    currency: structured?.currency || offer?.currency || "GBP",
    image:
      findImageBySelectors([
        "img[src*='assets.digitalcontent.marksandspencer.app']",
        "main picture img",
      ]) ||
      structured?.image ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
