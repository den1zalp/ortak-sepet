// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// zuhalmuzik.com'da fiyat kutusunda iki tutar var: "#content-last-price"
// üstü çizili liste fiyatı, "#content-price" ödenecek tutar. JSON-LD de
// ödenecek tutarı veriyor.
//
// Sayfada ayrıca "36 Aya Varan Taksit Fırsatı! 2401 TL x 36 ay" yazıyor ama bu
// Yapı Kredi **alışveriş kredisi**; kredi kartı taksiti değil ve paylaşılan
// taksit taraması bunu bilerek saymıyor.
function parseZuhalMuzik() {
  const structured = parseJsonLdProduct();

  return {
    site: "Zuhal Müzik",
    // JSON-LD adında "&amp;" kaçışı kalıyor; h1 temiz.
    title: cleanText(getText("h1")) || structured?.title,
    price: formatTryPriceText(getText("#content-price")) || structured?.price,
    currency: structured?.currency || null,
    // JSON-LD görseli 400 piksele küçültülmüş; og:image orijinali veriyor.
    image:
      getAttr("meta[property='og:image']", "content") ||
      structured?.image ||
      findProductImage({ minWidth: 300, minHeight: 300 }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
