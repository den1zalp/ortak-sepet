// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// penti.com'da ürünün kendi fiyatı ".pdp-prices .prc-last" içinde; alttaki
// öneri kartları ".pc-prc-last" / ".prd-price" kullanıyor, karışmıyor.
// JSON-LD de aynı tutarı veriyor ve yedek olarak duruyor.
//
// Tutar "₺1.399,99" biçiminde, sembol başta; cleanPrice bu biçimi tanıyor.
function parsePenti() {
  const structured = parseJsonLdProduct();

  return {
    site: "Penti",
    // h1 rengi yazmıyor, document.title yazıyor:
    // "Orquidea Çiçekli Pantolon Pijama Takımı PNQR55R126SK-MIX - Çok Renkli - Penti"
    // Ürün kodunu ve site adını atıp rengi bırakıyoruz.
    title:
      cleanText(document.title)
        .replace(/\s*-\s*Penti\s*$/i, "")
        .replace(/\s+[A-Z0-9]{6,}(?:-[A-Z0-9]+)?\s*(?=-)/, " ")
        .trim() ||
      cleanText(getText("h1")) ||
      structured?.title,
    price:
      formatTryPriceText(getText(".pdp-prices .prc-last")) || structured?.price,
    currency: structured?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /file-penti\.mncdn\.com/i }),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
