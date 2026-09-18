// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// karaca.com'da meta etiketi ile JSON-LD farklı tutar yazıyor:
//   product:price:amount = 1999.00  → liste fiyatı
//   offers.price         = 1799     → ödenecek tutar (sayfada "Tek Çekim")
// Bu yüzden meta'ya hiç bakılmıyor.
//
// Sayfadaki görünür tutarlar taksit tablosunda ("2 Taksit x 959,77 TL
// 1.919,53 TL"); oradan okumak taksitli toplamı ana fiyat sanmaya götürür,
// o yüzden jenerik yedek de kapalı.
function parseKaraca() {
  const structured = parseJsonLdProduct();

  return {
    site: "Karaca",
    title: cleanText(getText("h1")) || structured?.title,
    price: structured?.price,
    currency: structured?.currency || null,
    // og:image 250 piksele küçültülmüş; JSON-LD 695 piksel veriyor.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /cdn\.karaca\.com/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
