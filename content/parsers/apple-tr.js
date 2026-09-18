// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// apple.com tek alan adı altında her ülkeyi ayrı yolda sunuyor: /tr/ Türkiye,
// /uk/ İngiltere. İki mağaza ayrı content script bloklarında ve ayrımı
// manifest'teki yol kalıbı yapıyor ("*://*.apple.com/tr/*"), registry değil —
// hostIs("apple.com") ikisine de uyar.
//
// Ürün sayfasında JSON-LD var ve offers bir dizi; paylaşılan okuma dizinin ilk
// teklifini alıyor, o da seçili yapılandırmanın fiyatı.
//
// DOM yedeği ".rc-prices-fullprice": alttaki "Bunlar da ilgini çekebilir"
// kartları ".rf-recommendations-accessory-price" kullanıyor, karışmıyor.
function parseAppleTr() {
  const structured = parseJsonLdProduct();

  return {
    site: "Apple",
    title: cleanText(getText("h1")) || structured?.title,
    price:
      structured?.price ||
      formatTryPriceText(getText(".rc-prices-currentprice .rc-prices-fullprice")),
    currency: structured?.currency || null,
    // JSON-LD görseli 4000 piksel; og:image 1200x630 sosyal medya kırpması.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
