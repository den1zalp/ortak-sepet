// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// beymen.com fiyat kutusunda dört tutar birden gösterebiliyor:
//   del#priceOld   .m-price__old          → liste fiyatı (üstü çizili)
//   ins#priceNew   .m-price__new          → ara indirim (bu da üstü çizili olabiliyor)
//   .m-price__lastPrice                   → tek ürün için ödenecek tutar
//   .m-price__campaignPrice               → "2 ve üzeri 5.180 TL" çoklu alım kampanyası
//
// Sepete tek ürün ekleniyor, o yüzden çoklu alım tutarı alınmıyor; ödenecek
// tutar ".m-price__lastPrice". İndirim yoksa o alan boş kalıyor ve sırayla
// yeni/eski fiyata düşülüyor.
function findBeymenPriceText() {
  return (
    cleanText(getText(".m-price__lastPrice")) ||
    cleanText(getText(".m-price__new")) ||
    cleanText(getText(".m-price__old"))
  );
}

function parseBeymen() {
  const structured = parseJsonLdProduct();

  return {
    site: "Beymen",
    // h1 marka ve rengi de yazıyor ("Beymen Club Ekru Kadın Deri Topuklu
    // Ayakkabı"); JSON-LD adı markasız, document.title ürün kodunu ekliyor.
    title: cleanText(getText("h1")) || structured?.title,
    price: formatTryPriceText(findBeymenPriceText()) || structured?.price,
    currency: structured?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /cdn\.beymen\.com/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
