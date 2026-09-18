// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// lacoste.com/gb Salesforce Commerce üzerinde ve JSON-LD teklifi dizi olarak
// basıyor ([{ price: 105, priceCurrency: "GBP" }]); paylaşılan okuma dizinin
// ilk teklifini alıyor, o da seçili rengin fiyatı.
//
// Sayfadaki tutar ".js-pdp-price" kutusunda. Aynı sayfada "bu kombini tamamla"
// ve öneri kartları da fiyat basıyor, o yüzden DOM yedeği ürün kutusuyla
// sınırlı.
//
// Türkiye mağazası ayrı alan adında (lacoste.com.tr) ve Akinon üzerinde;
// manifest'te TR bloğuna düşüyor.
function parseLacosteUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "Lacoste UK",
    title: cleanText(getText("h1")) || structured?.title,
    price: structured?.price || cleanPrice(getText(".js-pdp-price")),
    currency: structured?.currency || "GBP",
    image:
      structured?.image ||
      findImageBySelectors([
        "img[src*='image1.lacoste.com']",
        ".pdp-image img",
        "main picture img",
      ]) ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
