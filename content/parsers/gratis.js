// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// gratis.com ürün sayfasında iki tutar var: büyük yazılan normal fiyat
// (79,00 TL) ve onun üstünde "Gratis Kart Fiyatı 47,00 TL". Kart fiyatını
// yalnızca Gratis kartı olanlar ödüyor, sepet listesi ise herkesin ödeyeceği
// tutarı göstermeli — bu yüzden normal fiyat alınıyor. JSON-LD tam olarak onu
// veriyor (offers.price = 79.00).
//
// Sayfadaki sınıf adları Tailwind ("text-[32px] font-bold ...") ve tasarım
// değişince kayıyor; seçici yazmak yerine yapılandırılmış veri okunuyor.
function parseGratis() {
  const structured = parseJsonLdProduct();

  return {
    site: "Gratis",
    title: cleanText(getText("h1")) || structured?.title,
    price: structured?.price,
    currency: structured?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300 }),
    url: window.location.href,
    // Jenerik yedek açık kalsaydı sayfadaki ilk tutar olan kart fiyatını
    // (47,00 TL) alma ihtimali vardı.
    preventPriceFallback: true,
  };
}
