// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// decathlon.com.tr, Decathlon'un "Vitamin" tasarım sistemini kullanıyor:
// ödenecek tutar ".vtmn-price_size--large" içinde tek parça basılıyor ("₺1.150").
// Sayfadaki diğer ".vtmn-price" düğümleri öneri kartlarına ait ve boyut sınıfı
// olarak bedeni taşıyorlar (".vtmn-price_size--TEK BEDEN"), bu yüzden seçiciyi
// ana fiyatın boyut sınıfıyla sınırlıyoruz.
function findDecathlonTrPriceText() {
  return cleanText(getText(".vtmn-price_size--large"));
}

// h1 seçili varyantın adını veriyor ("... - Yeşil - 110kg"); JSON-LD ve og:title
// ise ürünün temel varyantını ("... - Mavi - ...") yazıyor. Kullanıcı hangi rengi
// seçtiyse sepete o girmeli, bu yüzden h1 önce geliyor.
function findDecathlonTrTitle() {
  return (
    cleanText(getText("h1")) ||
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    cleanText(document.title).replace(/\s*-\s*Decathlon\s*$/i, "")
  );
}

function parseDecathlonTr() {
  const offer = findStructuredOffer();

  return {
    site: "Decathlon",
    title: findDecathlonTrTitle(),
    price:
      cleanPrice(findDecathlonTrPriceText()) ||
      (offer ? formatStructuredPrice(offer.price, offer.currency) : "") ||
      cleanPrice(findMainPrice()),
    currency: offer?.currency || null,
    // Galeri görsellerinin alt metni h1 ile birebir aynı, bu yüzden genel tarama
    // seçili rengin görselini buluyor. JSON-LD'deki görsel temel varyantın
    // olduğundan yalnızca yedek.
    image:
      findProductImage({
        minWidth: 200,
        minHeight: 200,
        cdnRegex: /mediadecathlon\.com/i,
      }) || parseJsonLdProduct()?.image,
    url: window.location.href,
  };
}
