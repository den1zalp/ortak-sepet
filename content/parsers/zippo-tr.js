// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// zippo.com.tr Shopify Dawn temasını kullanıyor. Ödenecek tutar ".product-price"
// sınıfını taşıyan bir düğümde duruyor ("₺229,90"); bu sınıf yalnızca ana ürün
// fiyatında geçiyor, öneri kartlarındaki fiyat blokları farklı bir yapı
// kullanıyor. JSON-LD'deki offers alanında ise fiyat hiç yok (yalnızca
// priceCurrency/availability var), bu yüzden sayfadan okumaya güveniyoruz.
function findZippoTrPriceText() {
  return (
    cleanText(getText(".price__sale .price-item--sale .product-price")) ||
    cleanText(getText(".price__regular .price-item--regular .product-price")) ||
    cleanText(getText(".product-price"))
  );
}

function parseZippoTr() {
  return {
    site: "Zippo",
    // h1 temiz ürün adını veriyor; document.title sonuna site sloganı ekliyor.
    title:
      cleanText(getText("h1")) ||
      cleanText(document.title).replace(
        /\s*-\s*Orijinal Zippo.*$/i,
        "",
      ),
    price:
      cleanPrice(findZippoTrPriceText()) ||
      cleanPrice(findMainPrice()),
    // og:image sabit bir tanıtım görseli, ürüne özel değil; galerideki ilk
    // görsel ürünün kendisi.
    image:
      getAttr(".product__media-wrapper img", "src") ||
      findProductImage({
        minWidth: 150,
        minHeight: 150,
        cdnRegex: /zippo\.com\.tr\/images\/products/i,
      }),
    url: window.location.href,
  };
}
