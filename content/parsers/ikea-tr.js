// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// ikea.com.tr, ikea.com'daki global "pip" arayüzünü kullanmıyor: fiyat
// ".product-price-box .price" içinde tek parça basılıyor. Sayfada ayrıca
// çapraz satış karuselleri var ve onların fiyatları da ".price" sınıfını
// taşıyor, bu yüzden seçiciyi ana fiyat kutusuyla sınırlıyoruz.
function findIkeaTrPriceText() {
  const mainPrice =
    cleanText(getText(".product-price-box .price")) ||
    cleanText(getText(".product-price-box"));

  if (mainPrice) return mainPrice;

  // Global IKEA arayüzü fiyatı tam sayı / kuruş olarak ayrı düğümlere böler;
  // varsa ekran okuyucu metni en güvenilir tek kaynak.
  const screenReaderPrice =
    cleanText(getText(".pip-temp-price__sr-text")) ||
    cleanText(getText(".pip-price__sr-text"));

  if (screenReaderPrice) return screenReaderPrice;

  const integerPart =
    cleanText(getText(".pip-temp-price__integer")) ||
    cleanText(getText(".pip-price__integer"));

  if (!integerPart) return "";

  const decimalPart = (
    cleanText(getText(".pip-temp-price__decimal")) ||
    cleanText(getText(".pip-price__decimal"))
  ).replace(/\D/g, "");

  return decimalPart
    ? `${integerPart},${decimalPart} TL`
    : `${integerPart} TL`;
}

function findIkeaTrTitle() {
  // ikea.com.tr'de h1 ürünün tam adını veriyor; og:title ise sonuna ürün
  // kodunu ve site adını ekliyor ("... - 29614536 | IKEA").
  const heading = cleanText(getText("h1"));
  if (heading) return heading;

  const productName = cleanText(getText(".pip-header-section__title--big"));
  const productType = cleanText(getText(".pip-header-section__description-text"));

  if (productName && productType) {
    return `${productName} ${productType}`;
  }

  const metaTitle = cleanText(getAttr("meta[property='og:title']", "content"))
    .replace(/\s*\|\s*IKEA.*$/i, "")
    .replace(/\s*[-–]\s*\d{6,}\s*$/, "");

  return productName || metaTitle || cleanText(document.title);
}

function findIkeaTrImage() {
  const metaImage = getAttr("meta[property='og:image']", "content");
  if (metaImage) return metaImage;

  const selectors = [
    ".product-detail-image img",
    ".product-image img",
    ".pip-media-grid__media-image",
    ".pip-aspect-ratio-image__image",
    "img.pip-image",
    "[class*='pip-media'] img",
  ];

  for (const selector of selectors) {
    const image = document.querySelector(selector);
    if (!image) continue;

    const src = image.currentSrc || image.src || image.getAttribute("src") || "";
    if (src) return src;
  }

  return getAttr("meta[name='twitter:image']", "content");
}

function parseIkeaTr() {
  return {
    site: "IKEA",
    title: findIkeaTrTitle(),
    price:
      cleanPrice(findIkeaTrPriceText()) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
      cleanPrice(findMainPrice()),
    image: findIkeaTrImage(),
    url: window.location.href,
  };
}
