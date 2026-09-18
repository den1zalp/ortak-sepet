// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// konyalisaat.com.tr ürün sayfasında fiyat hem JSON-LD'de hem
// ".teso-product-info__price" içinde aynı; yapılandırılmış veri önce
// deneniyor, DOM yedek.
//
// h1 modeli veriyor ama ürün tipini yazmıyor ("Longines Hydroconquest
// L37694066"); JSON-LD adı "… Kol Saati" ile tamamlıyor ve sepette ürünün ne
// olduğu okunur kalıyor.
function parseKonyaliSaat() {
  const structured = parseJsonLdProduct();

  return {
    site: "Konyalı Saat",
    title: structured?.title || cleanText(getText("h1")),
    price:
      structured?.price ||
      formatTryPriceText(getText(".teso-product-info__price")),
    currency: structured?.currency || null,
    // og:image cdn-cgi dönüşümüyle 1200x630'a dolduruluyor (yanları beyaz);
    // JSON-LD dosyanın kendisini veriyor.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({
        minWidth: 300,
        minHeight: 300,
        cdnRegex: /contents\.konyalisaat\.com\.tr/i,
      }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
