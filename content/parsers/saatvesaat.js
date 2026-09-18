// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// saatvesaat.com.tr Magento üzerinde: ödenecek tutar ".final-price .price"
// içinde (indirimliyse aynı kutuda ".special-price" sınıfıyla), üstü çizili
// liste fiyatı ayrı ".old-price" kutusunda duruyor.
//
// JSON-LD de aynı tutarı veriyor ve yedek olarak duruyor.
function parseSaatveSaat() {
  const structured = parseJsonLdProduct();

  return {
    site: "Saat & Saat",
    // JSON-LD adı ve og:title markayı yazmıyor ("CIWLH2229602 Kadın Kol
    // Saati"); h1 marka ile birlikte veriyor.
    title: cleanText(getText("h1")) || structured?.title,
    price: formatTryPriceText(getText(".final-price .price")) || structured?.price,
    currency: structured?.currency || null,
    // og:image 265 piksele dolduruluyor; JSON-LD dosyanın kendisini veriyor.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /saatvesaat\.com\.tr/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
