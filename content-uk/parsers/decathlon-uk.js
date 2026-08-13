// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// decathlon.co.uk, TR tarafındaki Vitamin sürümünden farklı bir arayüz kullanıyor:
// ödenecek tutar sepet kutusundaki ".vp-price-amount" düğümünde duruyor ve
// indirim varsa "--sale" sınıfını alıyor. Aynı sınıf sayfanın altındaki öneri
// kartlarında da geçiyor, o yüzden seçiciyi sepet kutusuyla sınırlıyoruz.
function findDecathlonUkPriceText() {
  return (
    cleanText(getText(".buy-box__section--price .vp-price-amount--sale")) ||
    cleanText(getText(".buy-box__section--price .vp-price-amount--large")) ||
    cleanText(getText(".buy-box__section--price .vp-price-amount")) ||
    cleanText(getText(".vp-price--large .vp-price-amount"))
  );
}

function findDecathlonUkTitle() {
  return (
    cleanText(getText("h1")) ||
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    cleanText(document.title).replace(/\s*\|\s*Decathlon.*$/i, "")
  );
}

function parseDecathlonUk() {
  const offer = findStructuredOffer();

  return {
    site: "Decathlon UK",
    title: findDecathlonUkTitle(),
    price:
      cleanPrice(findDecathlonUkPriceText()) ||
      (offer ? formatStructuredPrice(offer.price, offer.currency) : "") ||
      cleanPrice(findMainPrice()),
    currency: offer?.currency || null,
    // Ürün adresinde model kimliği olduğu için JSON-LD görseli seçili modelin
    // görseli oluyor; sayfa taramasına gerek kalmıyor.
    image: parseJsonLdProduct()?.image || findMainImage(),
    url: window.location.href,
  };
}
