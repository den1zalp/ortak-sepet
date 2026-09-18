// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// lcw.com ürün sayfasında ödenecek tutar ".product-detail__price
// .current-price" içinde; aynı ".current-price" sınıfı alttaki öneri
// kartlarında da geçtiği için ürün bloğuyla sınırlanıyor.
//
// og:title kullanılmıyor: ürün adı yerine "Tişört - LC WAIKIKI - 399,99 TL"
// gibi kategori + fiyat metni basıyor. h1 markayı da içeren tam adı veriyor
// ("LCW Kids Beyaz Polo Yaka Erkek Çocuk Pike Tişört"), JSON-LD'deki ad ise
// markasız.
// Sepette indirim varsa iki tutar yazılı: ".current-price" sepet öncesini,
// ".price-in-cart" rozeti ödemede geçerli olanı gösteriyor (449,99 TL yerine
// 399,99 TL). Ödenecek tutar sepet fiyatı, o yüzden o önce deneniyor.
function findLcWaikikiPriceText() {
  return (
    cleanText(getText(".product-detail__price .price-in-cart")) ||
    cleanText(getText(".product-detail__price .current-price"))
  );
}

function parseLcWaikiki() {
  const structured = parseJsonLdProduct();

  return {
    site: "LC Waikiki",
    title: cleanText(getText("h1")) || structured?.title,
    price: cleanPrice(findLcWaikikiPriceText()) || structured?.price,
    currency: structured?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300 }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
