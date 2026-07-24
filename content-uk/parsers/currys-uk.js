// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function findCurrysMainImage() {
  const metaImage =
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content");

  if (metaImage && !isBadImageCandidate(metaImage, "")) {
    return toAbsoluteUrl(metaImage);
  }

  const selectors = [
    "main [class*='product'] img",
    "main [class*='Product'] img",
    "main [class*='gallery'] img",
    "main [class*='Gallery'] img",
    "main [class*='carousel'] img",
    "main picture img",
    "[data-testid*='product-image'] img",
    "[data-test*='product-image'] img",
    "img[src*='product']",
    "img[src*='currys']"
  ];

  const images = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
  const uniqueImages = Array.from(new Set(images));

  const candidates = uniqueImages
    .map((img, index) => {
      const src = getImageUrl(img);
      const alt = cleanText(img.getAttribute("alt") || "");
      if (!src) return null;
      if (isBadImageCandidate(src, alt, img)) return null;

      const rect = img.getBoundingClientRect();
      const width = Math.max(0, rect.width);
      const height = Math.max(0, rect.height);
      const area = width * height;

      const productish = /product|media|images|cdn|currys/i.test(src);

      if (area < 2500 && !productish) return null;

      let score = 0;

      score += area;
      score += Math.max(0, width + height) * 8;

      if (rect.left < window.innerWidth * 0.65) score += 35000;
      if (rect.top < window.innerHeight * 0.95) score += 25000;
      if (productish) score += 20000;

      if (/thumbnail|thumb|swatch|small|mini|selector/i.test(src)) score -= 45000;

      return { src, score, index };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });

  return candidates[0]?.src || "";
}


function parseCurrysUk() {
  const image =
    findCurrysMainImage() ||
    findImageBySelectors([
      "[data-testid*='product-image']",
      "[data-test*='product-image']",
      "[class*='ProductImage']",
      "[class*='product-image']",
      "[class*='product-gallery']",
      "[class*='ProductGallery']",
      "[class*='gallery']",
      "[class*='carousel']",
      "main picture",
      "main img",
      "img[src*='product']",
      "img[src*='currys']",
    ]) ||
    findMainImage();

  return {
    site: "Currys",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(getText("[data-test='product-price']")) ||
      cleanPrice(getText("[data-testid*='price']")) ||
      cleanPrice(getText("[class*='price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
      cleanPrice(findMainPrice()),
    image,
    url: window.location.href,
  };
}



