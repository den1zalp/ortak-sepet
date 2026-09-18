// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// lacoste.com.tr Akinon altyapısında: sınıf adları Tailwind ama fiyatın
// data-testid'i kararlı ([data-testid='price']). JSON-LD de ödenecek tutarı
// veriyor, ikisi birbirini yedekliyor.
//
// İngiltere mağazası ayrı alan adında (lacoste.com/gb) ve Salesforce Commerce
// üzerinde; o content-uk/parsers/lacoste-uk.js içinde.
function parseLacosteTr() {
  const structured = parseJsonLdProduct();

  return {
    site: "Lacoste",
    // h1 rengi de yazıyor ("L.12.12 Erkek Slim Fit Yeşil Polo");
    // document.title sonuna model kodunu ekliyor.
    title: cleanText(getText("h1")) || structured?.title,
    price: structured?.price || formatTryPriceText(getText("[data-testid='price']")),
    currency: structured?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({
        minWidth: 300,
        minHeight: 300,
        cdnRegex: /lacostetr\.akinoncloudcdn\.com/i,
      }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
