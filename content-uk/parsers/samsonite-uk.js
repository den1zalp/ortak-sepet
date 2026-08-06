// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// samsonite.co.uk Salesforce Commerce Cloud kullanıyor: ödenecek tutar
// ".product-price__adjusted-price" içinde, üstü çizili liste fiyatı ayrı bir
// düğümde duruyor. Sayfadaki diğer ".product-price" düğümleri öneri
// kartlarına ait, o yüzden ana blokla sınırlı seçicileri kullanıyoruz.
function findSamsoniteUkPriceText() {
  return (
    cleanText(getText(".product-main-block--name-price .product-price__adjusted-price")) ||
    cleanText(getText(".product-prices .product-price__adjusted-price")) ||
    cleanText(getText(".product-price__adjusted-price"))
  );
}

// og:image gerçek ürün görselini paylaşım şablonunun içine gömüyor
// (beyaz zeminli "extension_base.png" + oimg parametresi). Galerideki ana
// görsel hem doğru hem de kırpılmamış.
function findSamsoniteUkImage() {
  const mainImage = document.querySelector("img.product-main-image");
  const src = mainImage ? getImageUrl(mainImage) : "";

  return (
    src ||
    findImageBySelectors([
      ".product-main-image",
      "[class*='product-images'] img",
      "[class*='pdp-carousel'] img",
    ]) ||
    findMainImage()
  );
}

function parseSamsoniteUk() {
  // h1 yalnızca model adını veriyor ("C-Lite Spinner (4 wheels) 75cm"); og:title
  // rengi de taşıyor, yoksa aynı valizin iki rengi sepette ayırt edilemiyor.
  const metaTitle = cleanText(getAttr("meta[property='og:title']", "content")).replace(
    /\s*\|\s*Samsonite.*$/i,
    "",
  );

  return {
    site: "Samsonite UK",
    title: metaTitle || cleanText(getText("h1")),
    price: cleanPrice(findSamsoniteUkPriceText()),
    image: findSamsoniteUkImage(),
    url: window.location.href,
  };
}
