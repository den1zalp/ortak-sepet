// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// championstore.com (Champion'ın Avrupa/İngiltere mağazası) Shopify üzerinde.
// Burada JSON-LD **yanlış para birimi** yayımlıyor: sayfada £ 60.00 yazarken
// offers.priceCurrency "EUR" diyor. O teklife güvenmek ürünü sepette euro
// olarak işaretler ve sterlin toplamından düşürür; bu yüzden fiyat sayfadan
// okunuyor ve jenerik yedek kapalı.
//
// Ödenecek tutar ".product__prices .current" içinde; indirimli üründe aynı
// kutuda ".was"/".compare" gibi eski tutar da bulunuyor, onu almıyoruz.
function findChampionUkPriceText() {
  const box = document.querySelector(".product__prices");
  if (!box) return "";

  const node = box.querySelector(".current") || box;

  return cleanText(node.textContent);
}

function parseChampionUk() {
  return {
    site: "Champion UK",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")).replace(
        /\s*\|\s*Champion UK\s*$/i,
        "",
      ),
    price:
      cleanPrice(findChampionUkPriceText()) ||
      // og meta doğru para birimini veriyor (GBP), JSON-LD'nin aksine.
      formatStructuredPrice(
        getAttr("meta[property='og:price:amount']", "content"),
        getAttr("meta[property='og:price:currency']", "content") || "GBP",
      ),
    currency: "GBP",
    // og:image http:// ile yazılmış ve JSON-LD'deki adres bozuk
    // ("https:files/..."); galerideki gerçek dosyayı kullanıyoruz.
    image:
      findImageBySelectors([
        ".product__media img",
        "img[src*='/cdn/shop/files/']",
        "img[src*='championstore.com/cdn']",
      ]) ||
      toAbsoluteUrl(
        String(getAttr("meta[property='og:image']", "content") || "").replace(
          /^http:\/\//i,
          "https://",
        ),
      ),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
