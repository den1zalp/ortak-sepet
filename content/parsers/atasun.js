// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// atasunoptik.com.tr, Vans TR ve Levi's TR ile aynı T-Soft temasında: fiyat
// ".p-price" kutusunda, indirimliyse ".new-price" (ödenecek) ve ".old-price"
// (üstü çizili), indirimsizde ".one-price" ya da yine ".new-price".
//
// Taksit bilgisi ürün adının hemen altında yazılı ("Peşin Fiyatına 6 Aya Varan
// Taksit"), jenerik tarama onu görüyor; burada ayrı bir iş yapmıyoruz.
function findAtasunPriceText() {
  return (
    cleanText(getText(".p-price .new-price")) ||
    cleanText(getText(".p-price .one-price")) ||
    cleanText(getText(".p-price"))
  );
}

function parseAtasun() {
  const structured = parseJsonLdProduct();

  return {
    site: "Atasun Optik",
    // JSON-LD adı tamamı büyük harf ve ürün koduyla ("AKSESUAR GÖZLÜK ZİNCİRİ
    // 00272"); h1 markayla birlikte okunur adı veriyor.
    title: cleanText(getText("h1")) || structured?.title,
    price: formatTryPriceText(findAtasunPriceText()) || structured?.price,
    currency: structured?.currency || null,
    // og:image 440 piksele küçültülmüş; JSON-LD orijinali veriyor.
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}
