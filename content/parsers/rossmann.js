// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// rossmann.com.tr'de JSON-LD **liste fiyatını** yayımlıyor: indirimli üründe
// sayfada 159,00 TL ödenirken offers.price 249 diyor. Bu yüzden fiyat yalnızca
// DOM'dan okunuyor ve jenerik yedek kapalı (jenerik okuma da JSON-LD'yi
// görürdü).
//
// Tutar üç ayrı düğüme bölünmüş ("159," + "00" + "TL") ve indirimli üründe
// kutuda iki tutar var: solda liste fiyatı, sağda ödenecek tutar. Metni
// boşluklardan arındırıp **sondaki** tutarı alıyoruz; indirim yoksa kutuda tek
// tutar bulunuyor ve o da odur.
function findRossmannPriceText() {
  const box = document.querySelector(".price-final_price");
  if (!box) return "";

  const compact = String(box.innerText || box.textContent || "").replace(/\s+/g, "");
  const matches = compact.match(/\d[\d.]*,\d{2}TL/g);

  return matches ? matches[matches.length - 1] : "";
}

function parseRossmann() {
  const structured = parseJsonLdProduct();

  return {
    site: "Rossmann",
    title: cleanText(getText("h1")) || structured?.title,
    price: formatTryPriceText(findRossmannPriceText()),
    // Görsel için JSON-LD güvenli: og:image 265 piksele küçültülmüş
    // ("mnpadding/265/265/..."), JSON-LD dosyanın kendisini veriyor.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 250, minHeight: 250, cdnRegex: /cdn\.rossmann\.com\.tr/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
