// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// mi.com tek alan adı altında her ülkeyi ayrı yolda sunuyor (/tr/, /uk/);
// Apple'da olduğu gibi bölgeyi manifest'teki yol kalıbı ayırıyor, registry
// değil.
//
// Sayfadaki tutarlar ekran okuyucu öneki taşıyor ("Current Price TL46999.00")
// ve aynı ".mi-price" sınıfı "birlikte al" karusellerinde başka ürünler için
// de basılıyor. JSON-LD ise seçili ürünün fiyatını temiz veriyor; yapılandırma
// (hafıza/renk) değiştirildiğinde temel fiyatı gösterdiği için DOM'daki ana
// fiyat kutusu yedek olarak duruyor.
function findMiTrPriceText() {
  return (
    cleanText(getText(".main-section__info-section__price-container .mi-price span")) ||
    cleanText(getText(".buy-product__installment-price__sale span"))
  );
}

function parseMiTr() {
  const structured = parseJsonLdProduct();

  return {
    site: "Mi",
    // JSON-LD adı adres parçası ("redmi-note-17-pro-max-5g"); h1 okunur adı
    // veriyor. Genel bakış sayfasında h1'in sonunda "Genel bakış" yazıyor.
    title:
      cleanText(getText("h1")).replace(/\s*genel bak[ıi]ş\s*$/i, "") ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price: structured?.price || formatTryPriceText(findMiTrPriceText()),
    currency: structured?.currency || null,
    // og:image protokolsüz geliyor ("//i02.appmifile.com/...").
    image: toAbsoluteUrl(
      structured?.image || getAttr("meta[property='og:image']", "content"),
    ),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
