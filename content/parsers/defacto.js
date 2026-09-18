// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// defacto.com.tr'de JSON-LD **liste fiyatını** yayımlıyor: indirimli üründe
// sayfada 699.99 TL ödenirken offers.price 999.99 diyor. Bu yüzden burada
// yapılandırılmış veriye fiyat için hiç bakılmıyor ve jenerik yedek de
// kapatılıyor (jenerik okuma da aynı JSON-LD'yi görürdü).
//
// Sayfadaki iki satırdan ilki ödenecek tutar, ikincisi üstü çizili liste
// fiyatı:
//   .first-line  .base-price.campaing-base-price → 699.99 TL
//   .second-line .base-price.lined-base-price    → 999.99 TL
// İndirim yokken ".campaing-base-price" bulunmuyor, ".first-line .base-price"
// tek başına kalıyor; o yüzden sınıf değil satır sırası esas alınıyor.
function findDefactoPriceText() {
  return (
    cleanText(getText(".product-detail__price .first-line .base-price")) ||
    cleanText(getText(".product-detail-view__price-amount .first-line .base-price"))
  );
}

// h1 rengi ve cinsiyeti yazmıyor ("%100 Pamuk Jean Bermuda Şort"); og:title
// ikisini de veriyor ama sonuna ürün kodunu ve site adını ekliyor
// ("Mavi Kadın %100 Pamuk Jean Bermuda Şort 3454875 | DeFacto").
function findDefactoTitle() {
  const fromMeta = cleanText(getAttr("meta[property='og:title']", "content")).replace(
    /\s*\d{5,}\s*\|\s*DeFacto\s*$/i,
    "",
  );

  return fromMeta || cleanText(getText("h1"));
}

function parseDefacto() {
  return {
    site: "DeFacto",
    title: findDefactoTitle(),
    // Site kuruşu nokta ile ve binlik ayıracı olmadan yazıyor ("1199.99 TL");
    // sepette diğer mağazalarla aynı biçimde görünsün diye yeniden yazılıyor.
    price: formatTryPriceText(findDefactoPriceText()),
    image:
      parseJsonLdProduct()?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /dfcdn\.defacto\.com\.tr/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
