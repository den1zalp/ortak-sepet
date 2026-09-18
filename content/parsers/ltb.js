// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// ltbjeans.com MUI/emotion ile derleniyor: sınıf adları ("muirtl-wglvtz")
// her derlemede değişebilen karmalar, seçici yazmak kalıcı olmaz. JSON-LD
// Product ise ödenecek tutarı veriyor — indirimli üründe sayfada 1.649,99 TL
// ödenecek, 2.199,99 TL üstü çizili dururken offers.price 1649.99 diyor.
//
// Görsel için de JSON-LD tercih ediliyor: sayfadaki <img> adreslerinde çift
// bölü var ("ltbimg.mncdn.com//i/..."), JSON-LD'deki adres temiz.
function parseLtb() {
  const structured = parseJsonLdProduct();

  return {
    site: "LTB",
    title: structured?.title || cleanText(getText("h1")),
    price: structured?.price || cleanPrice(findMainPrice()),
    currency: structured?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300 }),
    url: window.location.href,
  };
}
