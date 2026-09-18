// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// mavi.com JSON-LD basmıyor; sayfadaki tek yapılandırılmış kaynak
// "product:price:amount" meta'sı (ödenecek tutarı veriyor, indirimde de).
//
// Fiyat kendi öge adında duruyor:
//   <product-price><div class="product-price-wrapper pdp">
//     <span class="price">1.599,99 TL</span>
//     <span class="old-price">1.999,99 TL</span>
// İndirimli üründe üstü çizili tutar ayrı sınıfta olduğu için ".price" tek
// başına ödenecek tutarı veriyor. ".pdp" sınırlaması önerilen ürün
// karusellerindeki aynı bileşeni dışarıda bırakmak için: onlar başka ürünün
// fiyatını gösteriyor.
function findMaviPriceText() {
  return (
    cleanText(getText("product-price .product-price-wrapper.pdp .price")) ||
    cleanText(getText(".product-details-info product-price .price"))
  );
}

function parseMavi() {
  const metaProduct = parseMetaProduct();

  return {
    site: "Mavi",
    // h1 yalnızca model adını veriyor ("Classic Denim Siyah Jean Pantolon");
    // og:title'da cinsiyet de var ("Kadın Classic Denim..."), sepette aynı
    // modelin kadın/erkek kalıbını ayırmak için o gerekiyor.
    title:
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(getText("h1")),
    price: cleanPrice(findMaviPriceText()) || metaProduct?.price || null,
    // og:image protokolsüz geliyor ("//sky-static.mavi.com/..."); sepette
    // ham hâliyle açılmıyor.
    image: toAbsoluteUrl(
      getAttr("meta[property='og:image']", "content") ||
        findProductImage({ minWidth: 250, minHeight: 250 }),
    ),
    url: window.location.href,
  };
}
