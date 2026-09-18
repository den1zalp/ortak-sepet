// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// underarmour.com.tr Akinon üzerinde ve fiyatı <pz-price> bileşeniyle sonradan
// yazıyor; stokta olmayan üründe fiyat kutusu tamamen boş kalıyor. Bu yüzden
// sırayla yapılandırılmış veri, og etiketi ve DOM deneniyor.
//
// Taksit tablosu ("Banka / Kart / Taksit") ürün adının hemen altında duruyor;
// paylaşılan tarama onu görüyor.
function findUnderArmourTrPriceText() {
  return (
    cleanText(getText(".product-info__price-wrapper .price")) ||
    cleanText(getText(".product-info__price-wrapper"))
  );
}

function parseUnderArmourTr() {
  const structured = parseJsonLdProduct();
  const offer = findStructuredOffer();

  return {
    site: "Under Armour",
    // h1 rengi yazmıyor ("Erkek UA Sportstyle Rüzgarlık"); document.title rengi
    // de veriyor ama sonuna barkod ve site adı ekliyor.
    title:
      cleanText(document.title)
        .replace(/\s*\|\s*Under Armour\s*$/i, "")
        .replace(/\s+\d{8,}$/, "") ||
      cleanText(getText("h1")) ||
      structured?.title,
    price:
      structured?.price ||
      formatStructuredPrice(offer?.price, offer?.currency || "TRY") ||
      formatTryPriceText(findUnderArmourTrPriceText()) ||
      formatTryPriceText(getAttr("meta[property='og:price:amount']", "content")),
    currency: structured?.currency || offer?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /img-underarmour\.mncdn\.com/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
