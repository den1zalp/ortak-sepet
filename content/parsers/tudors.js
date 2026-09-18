// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// tudors.com Ticimax altyapısında; fiyat kutusunda üç tutar birden duruyor:
//   #fiyat .spanFiyat           → liste fiyatı (999,99 TL)
//   #indirimliFiyat .spanFiyat  → herkesin ödediği indirimli tutar (374,99 TL)
//   .sPric                      → "Sepette 299,99 TL", yalnızca Tudors üyesine
//
// Üye fiyatını almıyoruz: sepette o tutarı yalnızca giriş yapmış üyeler
// görüyor, sepet listesi ise herkesin ödeyeceği tutarı göstermeli. İndirim
// yoksa #indirimliFiyat boş kalıyor, liste fiyatına düşülüyor.
function findTudorsPriceText() {
  return (
    cleanText(getText("#indirimliFiyat .spanFiyat")) ||
    cleanText(getText("#fiyat .spanFiyat"))
  );
}

function parseTudors() {
  const structured = parseJsonLdProduct();

  return {
    site: "Tudors",
    // og:title kategori adını yazıyor ("Erkek Slim Fit Dar Kesim Gömlek -
    // TUDORS"); h1 ürünün kendi adını veriyor.
    title: cleanText(getText("h1")) || structured?.title,
    price: cleanPrice(findTudorsPriceText()) || structured?.price,
    currency: structured?.currency || null,
    // og:image cdn-cgi dönüşümünden geçiyor; JSON-LD dosyanın kendisini
    // veriyor.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300 }),
    url: window.location.href,
    // Sayfanın altında onlarca öneri kartı fiyatı var; ana fiyat okunamazsa
    // onlardan birine düşmemeli.
    preventPriceFallback: true,
  };
}
