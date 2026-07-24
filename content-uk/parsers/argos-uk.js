// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function parseArgosUk() {
  const image =
    findImageBySelectors([
      "[data-test='product-media']",
      "[data-test*='product-media']",
      "[data-test='product-image']",
      "[data-test*='product-image']",
      "[data-testid*='product-image']",
      "[data-testid*='media']",
      "[class*='ProductImage']",
      "[class*='product-image']",
      "[class*='MediaGallery']",
      "[class*='media-gallery']",
      "[class*='gallery']",
      "main picture",
      "main img",
      "img[src*='scene7']",
      "img[src*='product']",
    ]) ||
    findMainImage() ||
    getAttr("meta[property='og:image']", "content");

  return {
    site: "Argos",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(getText("[data-test='product-price']")) ||
      cleanPrice(getText("[data-test*='price']")) ||
      cleanPrice(getText("[class*='price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
      cleanPrice(findMainPrice()),
    image,
    url: window.location.href,
  };
}



