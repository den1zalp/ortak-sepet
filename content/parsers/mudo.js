// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// mudo.com.tr (Akinon) JSON-LD'de ödenecek tutarı veriyor: sayfada 2.999 TL
// üstü çizili, 1.599 TL ödenecek dururken offers.price 1599 diyor.
//
// Sayfadan seçiciyle okumak burada riskli: ürün bloğunda "Bu üründen 47.97 TL
// değerinde puan kazanabilirsiniz" ve "Peşin Fiyatına 4 Taksit! (4 x 399,75
// TL)" gibi başka tutarlar da var.
//
// h1 sayfada birden fazla: ilki ürün adı, sonrakiler KVKK metninin başlıkları.
// getText("h1") ilkini aldığı için sorun çıkmıyor.
function parseMudo() {
  const structured = parseJsonLdProduct();

  return {
    site: "Mudo",
    title: cleanText(getText("h1")) || structured?.title,
    price: structured?.price,
    currency: structured?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /mudo\.akinoncloudcdn\.com/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
