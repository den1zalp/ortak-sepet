// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// tr.calvinklein.com, Vans TR / Levi's TR / Atasun ile aynı T-Soft teması:
// fiyat ".p-price" kutusunda, indirimsizde ".one-price", indirimde
// ".new-price" (ödenecek) ve ".old-price" (üstü çizili).
//
// İngiltere mağazası ayrı bir alan adında (calvinklein.co.uk) ve bambaşka bir
// altyapıda; o content-uk/parsers/calvinklein-uk.js içinde.
function findCalvinKleinTrPriceText() {
  return (
    cleanText(getText(".p-price .new-price")) ||
    cleanText(getText(".p-price .one-price")) ||
    cleanText(getText(".p-price"))
  );
}

// h1 tamamı küçük harf yazıyor ("erkek 90s straight jean pantolon"), og:title
// rengi atlıyor. document.title ikisini de veriyor ama sonuna ürün kodunu ve
// site adını ekliyor: "Erkek 90S Straight Jean Pantolon Mavi LV040430MFRRF |
// Calvin Klein".
function findCalvinKleinTrTitle() {
  const fromTitle = cleanText(document.title)
    .replace(/\s*\|\s*Calvin Klein\s*$/i, "")
    .replace(/\s+[A-Z0-9]{8,}$/, "");

  return (
    fromTitle ||
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    cleanText(getText("h1"))
  );
}

function parseCalvinKleinTr() {
  return {
    site: "Calvin Klein",
    title: findCalvinKleinTrTitle(),
    price:
      formatTryPriceText(findCalvinKleinTrPriceText()) ||
      // Sayfa JSON-LD basmıyor; meta'daki tutar zaten biçimlenmiş geliyor
      // ("8.619,00 TL").
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")),
    // og:image 440 piksele küçültülmüş; galerideki dosya tam boyutta.
    image:
      findProductImage({
        minWidth: 300,
        minHeight: 300,
        cdnRegex: /st-calvinkleinecom\.mncdn\.com/i,
      }) || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    // Sayfanın altındaki "önerilen ürünler" kartları onlarca fiyat basıyor.
    preventPriceFallback: true,
  };
}
