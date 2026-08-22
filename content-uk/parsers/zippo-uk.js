// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// zippo.co.uk, TR tarafındaki mağazayla aynı Shopify Dawn temasını kullanıyor
// ama ".product-price" özel sınıfı yok; fiyat düz ".price__sale"/".price__regular"
// bloklarında duruyor ("£52.90"). Sitenin meta[property='og:price:amount'] ve
// 'og:price:currency' etiketleri de doğru değeri verdiği için ikinci bir
// doğrulama kaynağı olarak kullanılıyor.
function findZippoUkPriceText() {
  return (
    cleanText(getText(".price__sale .price-item--sale")) ||
    cleanText(getText(".price__regular .price-item--regular"))
  );
}

function parseZippoUk() {
  const metaAmount = getAttr("meta[property='og:price:amount']", "content");
  const metaCurrency = String(
    getAttr("meta[property='og:price:currency']", "content") || "",
  ).toUpperCase();

  return {
    site: "Zippo UK",
    title: cleanText(getText("h1")),
    price:
      cleanPrice(findZippoUkPriceText()) ||
      formatStructuredPrice(metaAmount, metaCurrency) ||
      cleanPrice(findMainPrice()),
    currency: metaCurrency || null,
    // <img src> protokolsüz yazılıyor ("//www.zippo.co.uk/..."); toAbsoluteUrl
    // olmadan tarayıcı bunu sayfanın kendi origin'ine göre çözemeyebilir.
    image:
      toAbsoluteUrl(getAttr(".product__media-wrapper img", "src")) ||
      findMainImage(),
    url: window.location.href,
  };
}
