// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// watsons.com.tr (SAP Commerce) ürün sayfasında og etiketi hiç yok; ad, fiyat
// ve görsel yalnızca JSON-LD'de ve DOM'da duruyor.
//
// Fiyat özel bir bileşende: <e2core-price class="price"><span class="price__current">
// <span class="price__default-value">7,95 ₺</span>. Aynı bileşen alttaki öneri
// kartlarında da geçtiği için seçici ürün bloğuyla sınırlı.
function parseWatsons() {
  const structured = parseJsonLdProduct();

  return {
    site: "Watsons",
    // document.title marka adını iki kez ve ürün kodunu da yazıyor
    // ("WATSONS Watsons ... 1484651 | Watsons"); h1 temiz.
    title: cleanText(getText("h1")) || structured?.title,
    price:
      structured?.price ||
      cleanPrice(getText(".product-add-to-cart__price-details .price__default-value")),
    currency: structured?.currency || null,
    image:
      structured?.image ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /media\.watsons\.com\.tr/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
