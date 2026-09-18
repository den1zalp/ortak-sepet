// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// marksandspencer.com.tr (Akinon) fiyatı JSON-LD'de teklifin doğrudan altında
// değil, "priceSpecification" içinde yazıyor:
//   offers: { priceSpecification: { price: "1299.99", priceCurrency: "TRY" } }
// Paylaşılan parseJsonLdProduct() yalnızca offers.price'a bakıyor ve burada
// boş dönüyor; findStructuredOffer() bu iç içe biçimi de okuyor (Decathlon
// için eklenmişti).
//
// Sayfadaki görünür tutar Akinon'un <pz-price> bileşeninde ve metni sonradan
// geliyor, o yüzden yapılandırılmış veri birinci sırada.
function parseMarksAndSpencerTr() {
  const structured = parseJsonLdProduct();
  const offer = findStructuredOffer();

  return {
    site: "Marks & Spencer",
    title: cleanText(getText("h1")) || structured?.title,
    price:
      structured?.price ||
      formatStructuredPrice(offer?.price, offer?.currency || "TRY") ||
      formatTryPriceText(getAttr("meta[property='og:price:amount']", "content")),
    currency: structured?.currency || offer?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /akinoncloud\.com/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
