// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// calvinklein.co.uk Next.js ile derleniyor: sınıf adları karma taşıyor
// ("PriceDisplay_PriceDisplay__FIRRe") ama data-testid değerleri kararlı.
// Fiyat ürün başlığının kutusunda:
//   [data-testid='ProductHeader-component'] [data-testid='ProductHeaderPrice-PriceText']
// Aynı PriceDisplay bileşeni alttaki öneri kartlarında da kullanılıyor, o
// yüzden arama başlık bloğuyla sınırlı.
//
// JSON-LD burada yalnızca ad, marka ve görsel veriyor; teklif/fiyat yok.
// og:image ise ürün değil Calvin Klein logosu (.svg), kullanılmıyor.
function findCalvinKleinUkPriceText() {
  const header = document.querySelector("[data-testid='ProductHeader-component']");
  if (!header) return "";

  const node =
    header.querySelector("[data-testid='ProductHeaderPrice-PriceText']") ||
    header.querySelector("[data-testid*='PriceText']");

  return cleanText(node?.textContent);
}

function parseCalvinKleinUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "Calvin Klein UK",
    title: cleanText(getText("h1")) || structured?.title,
    price: cleanPrice(findCalvinKleinUkPriceText()),
    currency: "GBP",
    image:
      structured?.image ||
      findImageBySelectors([
        "img[src*='calvinklein-eu.scene7.com']",
        "[data-testid*='gallery'] img",
        "main picture img",
      ]),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
