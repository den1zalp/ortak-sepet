// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// desa.com.tr, Tudors ile aynı Ticimax teması. Fiyat kutusunda iki tutar
// olabiliyor:
//   #indirimliFiyat / #fiyat2 .spanFiyat → tek ürün için ödenecek tutar
//   .sPric .sptPrice                     → "2. ürüne %50 indirim 4.895 TL"
//
// İkinci ürün kampanyası tek ürün alana geçerli değil, alınmıyor.
function findDesaPriceText() {
  return (
    cleanText(getText("#indirimliFiyat .spanFiyat")) ||
    cleanText(getText("#fiyat2 .spanFiyat")) ||
    cleanText(getText("#fiyat .spanFiyat"))
  );
}

function parseDesa() {
  const structured = parseJsonLdProduct();

  return {
    site: "Desa",
    title: cleanText(getText("h1")) || structured?.title,
    price: formatTryPriceText(findDesaPriceText()) || structured?.price,
    currency: structured?.currency || null,
    // og:image cdn-cgi dönüşümünden geçiyor; JSON-LD dosyanın kendisini veriyor.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /static\.ticimax\.cloud/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
