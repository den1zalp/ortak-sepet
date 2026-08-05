// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function findCiceksepetiMainImage() {
  const metaImage =
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content");

  if (metaImage) return metaImage;

  const selectors = [
    "[class*='product-detail'] img",
    "[class*='ProductDetail'] img",
    "[class*='gallery'] img",
    "[class*='Gallery'] img",
    "img[src*='ciceksepeti']",
  ];

  const images = selectors.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector)),
  );

  const scoredImages = Array.from(new Set(images))
    .map((img) => {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";

      if (!src) return null;
      if (/logo|icon|sprite|placeholder|loading|badge/i.test(src)) return null;
      if (!isVisibleElement(img)) return null;

      const rect = img.getBoundingClientRect();

      if (rect.width < 100 || rect.height < 100) return null;

      let score = rect.width + rect.height;

      if (rect.left < window.innerWidth * 0.55) score += 180;
      if (rect.top < window.innerHeight * 0.9) score += 120;

      return { src, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scoredImages[0]?.src || "";
}

function parseCiceksepeti() {
  return {
    site: "Çiçeksepeti",
    title:
      cleanText(getText("h1")) ||
      cleanText(getText("[class*='product-name']")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(getText(".product-price__new")) ||
      cleanPrice(getText("[class*='productPrice']")) ||
      cleanPrice(getText("[class*='product-price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
      cleanPrice(findMainPrice()),
    image: findCiceksepetiMainImage(),
    url: window.location.href,
  };
}
