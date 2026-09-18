// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// jackjones.com.tr ile jackjones.com aynı Bestseller altyapısını kullanıyor;
// TR tarafı burada, UK tarafı content-uk/parsers/jackjones-uk.js içinde.
//
// Fiyat ".product-detail__price" bloğunda. Sınıf adı ".product-price__list-price"
// olsa da içinde ödenecek tutar yazıyor; indirimli üründe listeye
// ".product-price__sale-price" ekleniyor ve o zaman ödenecek olan odur.
//
// Sayfanın altındaki öneri kartları aynı ".product-price__list-price" sınıfını
// kullanıyor, o yüzden arama ürün bloğuyla sınırlı.
function findJackJonesPriceText(root) {
  return (
    cleanText(getText(`${root} .product-price__sale-price`)) ||
    cleanText(getText(`${root} .product-price__list-price`))
  );
}

function parseJackJonesTr() {
  const structured = parseJsonLdProduct();

  return {
    site: "Jack & Jones",
    title: cleanText(getText("h1")) || structured?.title,
    price:
      cleanPrice(findJackJonesPriceText(".product-detail__price-section")) ||
      structured?.price,
    currency: structured?.currency || null,
    // og:image adresine "width=200" ekleniyor; sepette bulanık kalıyor.
    // JSON-LD aynı dosyayı boyut parametresi olmadan veriyor.
    image:
      structured?.image ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /images\.jackjones/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
