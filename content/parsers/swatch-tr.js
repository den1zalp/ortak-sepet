// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// swatch.com tek alan adında her ülkeyi ayrı yolda sunuyor (/tr-tr/, /en-gb/);
// bölgeyi manifest'teki yol kalıbı ayırıyor.
//
// Fiyat hem JSON-LD'de hem ".price .sales .value" içinde ve para birimi başta
// yazılıyor ("TL 15.550,00"); cleanPrice bu biçimi tanıyor.
function parseSwatchTr() {
  const structured = parseJsonLdProduct();

  return {
    site: "Swatch",
    // h1 model adını veriyor ("MOONSWATCH 1965"); document.title sonuna ürün
    // kodunu ve site adını ekliyor.
    title: cleanText(getText("h1")) || structured?.title,
    price: structured?.price || formatTryPriceText(getText(".price .sales .value")),
    currency: structured?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /static\.swatch\.com/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
