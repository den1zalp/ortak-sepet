// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// adidas.co.uk ile adidas.com.tr aynı platformu kullanıyor; karşılığı
// content/parsers/adidas-tr.js — birine yapılan düzeltme çoğu zaman ötekinde
// de geçerli.
//
// JSON-LD "ProductGroup" düğümü basıyor ve içinde offers yok, yani fiyat
// yalnızca DOM'da. Ödenecek tutar indirimli üründe de indirimsizde de
// "main-price" testid'sinde; üstü çizili liste fiyatı ayrı bir testid'de
// ("original-price") duruyor, yani hiç okunmuyor. Ekran okuyucu için eklenen
// "Price"/"Sale price" ön ekini cleanPrice zaten eliyor.
//
// Aramayı ürün sayfasının fiyat bileşeniyle sınırlamak şart: sayfada
// "price-component" testid'sini taşıyan başka kutular da var ve ilki alttaki
// öneri kartına ait. Ürünün kendi kutusu ek olarak "_pdp_" sınıfını taşıyor.
function findAdidasUkPriceText() {
  return cleanText(
    getText("[data-testid='price-component'][class*='_pdp_'] [data-testid='main-price']"),
  );
}

// h1 marka ve renk taşımıyor ("Samba OG Shoes"); og:title üçünü birden
// veriyor ("adidas Samba OG Shoes - White | adidas UK"). Aynı ayakkabının iki
// rengi sepette ancak böyle ayırt ediliyor.
function findAdidasUkTitle() {
  const fromMeta = cleanText(getAttr("meta[property='og:title']", "content")).replace(
    /\s*\|\s*adidas.*$/i,
    "",
  );

  return fromMeta || cleanText(getText("[data-testid='product-title']"));
}

function parseAdidasUk() {
  return {
    site: "Adidas UK",
    title: findAdidasUkTitle(),
    price: cleanPrice(findAdidasUkPriceText()),
    currency: "GBP",
    // og:image sosyal paylaşım için 1200x630'a kırpılmış hâli; galerideki
    // fotoğraf ürünün kendisi ve seçili rengi gösteriyor.
    image:
      getImageUrl(document.querySelector("picture[data-testid='pdp-gallery-picture'] img")) ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    // Alttaki öneri kartlarının da fiyatı var; jenerik tarama onlardan birini
    // seçebilir. Yanlış fiyat, fiyatsız üründen kötü.
    preventPriceFallback: true,
  };
}
