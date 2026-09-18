// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// jackjones.com, TR mağazasıyla (jackjones.com.tr) aynı Bestseller altyapısı.
// İki mağaza ayrı content script bloklarında: manifest'te UK bloğu yalnızca
// jackjones.com'a, TR bloğu jackjones.com.tr'ye enjekte ediliyor.
//
// Fiyat ".product-detail__price" bloğunda ve ".product-price__list-price"
// sınıfı ödenecek tutarı taşıyor; indirimli üründe ".product-price__sale-price"
// ekleniyor ve ödenecek olan o. Alttaki öneri kartları aynı sınıfları
// kullandığı için arama ürün bloğuyla sınırlı.
function findJackJonesUkPriceText() {
  return (
    cleanText(getText(".product-detail__price-section .product-price__sale-price")) ||
    cleanText(getText(".product-detail__price-section .product-price__list-price"))
  );
}

function parseJackJonesUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "Jack & Jones UK",
    title: cleanText(getText("h1")) || structured?.title,
    price: cleanPrice(findJackJonesUkPriceText()) || structured?.price,
    currency: structured?.currency || "GBP",
    // og:image adresinde "width=200" var; JSON-LD aynı dosyayı tam boyutta
    // veriyor.
    image:
      structured?.image ||
      findImageBySelectors([
        ".product-detail__gallery img",
        "main picture img",
        "img[src*='images.jackjones.com']",
      ]) ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
