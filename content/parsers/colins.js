// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// colins.com.tr ödenecek tutarı ".product-detail-price" kutusunda yazıyor.
// Sayfada aynı tutar bir de taksit tablosunda ("Taksit Sayısı / Taksit
// Miktarı / Taksitli Tutar Toplam") onlarca kez geçiyor; seçiciyi fiyat
// kutusuyla sınırlamak, jenerik taramanın oradaki 2 taksit tutarını ana fiyat
// sanmasını engelliyor.
function parseColins() {
  const structured = parseJsonLdProduct();

  return {
    site: "Colin's",
    // h1 markayı yazmıyor; og:title "COLIN'S ..." diye başlıyor ve sepette
    // hangi mağazadan geldiği okunur kalıyor.
    title:
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(getText("h1")) ||
      structured?.title,
    // Site binlik ayıracını koymuyor ("1999,90 TL"); sepette diğer
    // mağazalarla aynı biçimde görünsün diye yeniden yazılıyor.
    price: formatTryPriceText(getText(".product-detail-price")) || structured?.price,
    currency: structured?.currency || null,
    // og:image 800 piksele küçültülmüş; JSON-LD aynı dosyanın orijinalini
    // veriyor.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300 }),
    url: window.location.href,
    // Fiyat kutusu okunamazsa taksit tablosundaki bir tutara düşmektense
    // fiyatsız kalmak doğru.
    preventPriceFallback: true,
  };
}
