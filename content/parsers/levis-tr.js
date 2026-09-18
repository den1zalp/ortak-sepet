// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// levis.com.tr, vans.com.tr ile aynı T-Soft temasını kullanıyor: fiyat
// ".p-price" kutusunda, indirim yokken ".one-price", indirim varken
// ".new-price" (ödenecek) ve ".old-price" (üstü çizili) sınıflarında.
//
// JSON-LD önce deneniyor çünkü aynı altyapıda teklif fiyatı indirimli üründe
// de ödenecek tutarı veriyor ve tema sınıflarından daha kararlı.
function findLevisTrPriceText() {
  return (
    cleanText(getText(".p-price .new-price")) ||
    cleanText(getText(".p-price .one-price")) ||
    cleanText(getText(".p-price"))
  );
}

function parseLevisTr() {
  const structured = parseJsonLdProduct();

  return {
    site: "Levi's",
    // h1 ürün kodunu da basıyor ("... To The Bone 129430"); og:title aynı adı
    // kodsuz veriyor.
    title:
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      structured?.title ||
      cleanText(getText("h1")),
    price: structured?.price || cleanPrice(findLevisTrPriceText()),
    currency: structured?.currency || null,
    // og:image 440x440'a küçültülmüş; JSON-LD aynı dosyayı 1000x1000 veriyor.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}
