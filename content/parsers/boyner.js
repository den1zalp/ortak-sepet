// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// boyner.com.tr Next.js ile sunucuda render ediliyor; sınıf adları CSS
// Modules'tan geliyor ve sonlarında dağıtımla değişebilen bir karma taşıyor
// ("price_priceMain__DrVVQ"). Bu yüzden tam sınıf adı yerine karmanın
// öncesindeki kararlı parçayı arıyoruz.
//
// Ödenecek tutar sayfada üç kez basılıyor: ürün bilgisi bloğunda, yukarı
// kaydırınca çıkan yapışkan başlıkta ve alttaki öneri kartlarında. Öneri
// kartındaki tutar başka bir ürüne ait, o yüzden aramayı ürün bilgisi
// bloğuyla sınırlıyoruz.
//
// "price_priceMain" ile başlayan ikinci bir sınıf daha var
// ("price_priceMainText", içinde yalnızca "Sepette" yazıyor); iki alt çizgi
// karma ayıracı olduğu için "price_priceMain__" onu dışarıda bırakıyor.
function findBoynerPriceText() {
  return cleanText(
    getText("[class*='productInfoSectionPrice'] [class*='price_priceMain__']"),
  );
}

// Sepette uygulanan indirimlerde tutarın önüne "Sepette" yazısı ekleniyor
// ("Sepette11.058,99 TL"); cleanPrice metindeki ilk tutarı aldığı için bu ön
// ek sorun çıkarmıyor. Üstü çizili liste fiyatı ayrı bir sınıfta
// ("price_priceOldPrice") durduğundan hiç okunmuyor.

// Marka adı h1'in dışında: h1 "x Coca-Cola Beyaz Omuz Çanta" derken marka
// ayrı bir satırda "Converse" yazıyor. Sepette markasız başlık ürünü
// tanınmaz hâle getiriyor, ikisini birleştiriyoruz.
function findBoynerTitle() {
  const brand = cleanText(getText("[class*='productInfoSectionHeaderBrandName']"));
  const name = cleanText(getText("[class*='productInfoSectionHeaderProductName']"));

  if (brand && name && !name.toLowerCase().startsWith(brand.toLowerCase())) {
    return `${brand} ${name}`;
  }

  return (
    name ||
    // og:title ile document.title aynı: "<ad> - <ürün no> | Boyner".
    cleanText(getAttr("meta[property='og:title']", "content") || document.title).replace(
      /\s*-\s*\d+\s*\|\s*Boyner\s*$/i,
      "",
    )
  );
}

function parseBoyner() {
  return {
    site: "Boyner",
    title: findBoynerTitle(),
    price: cleanPrice(findBoynerPriceText()) || cleanPrice(findMainPrice()),
    // Pazaryeri ürünlerinin bir kısmında JSON-LD hiç basılmıyor; og:image her
    // üründe var ve seçili varyantın fotoğrafını gösteriyor.
    image:
      getAttr("meta[property='og:image']", "content") ||
      parseJsonLdProduct()?.image ||
      findProductImage({
        minWidth: 250,
        minHeight: 250,
        cdnRegex: /statics-mp\.boyner\.com\.tr/i,
      }),
    url: window.location.href,
  };
}
