// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function findSephoraUkMainImage() {
  const jsonLd = parseJsonLdProduct();

  // Stable sources first: not dependent on lazy-loaded gallery state.
  const stable =
    (jsonLd && jsonLd.image) ||
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content") ||
    getAttr("link[rel='image_src']", "href");

  if (stable && !/sprite|logo|icon|placeholder|data:image/i.test(stable)) {
    return toAbsoluteUrl(stable);
  }

  // Sephora keeps review/delivery text near the gallery. Do not use the
  // generic isBadImageCandidate text filter here, otherwise real product
  // images can be rejected as shipping/review assets.
  const selectors = [
    "[data-comp*='ProductImage'] img",
    "[data-at*='product_image'] img",
    "[data-testid*='product-image'] img",
    "[class*='product-image'] img",
    "[class*='ProductImage'] img",
    "[class*='product-media'] img",
    "[class*='ProductMedia'] img",
    "[class*='gallery'] img",
    "[class*='Gallery'] img",
    "[class*='carousel'] img",
    "main picture img",
    "img[src*='sephora']",
    "img[src*='productimages']",
    "img[src*='/media']",
    "main img",
  ];

  const imgs = Array.from(
    new Set(
      selectors.flatMap((selector) =>
        Array.from(document.querySelectorAll(selector)),
      ),
    ),
  );

  const candidates = imgs
    .map((img) => {
      const src = getImageUrl(img);
      if (!src) return null;

      if (
        /data:image|sprite|logo|icon|placeholder|loading|spacer|swatch|thumbnail|thumb|flag|payment|klarna|clearpay|paypal/i.test(
          src,
        )
      ) {
        return null;
      }

      const rect = img.getBoundingClientRect();
      const width = Math.max(0, rect.width);
      const height = Math.max(0, rect.height);
      const productish = /product|productimages|media|sephora|cdn|image/i.test(src);

      if (width < 90 && height < 90 && !productish) return null;

      let score = width + height;
      if (productish) score += 420;
      if (rect.left < window.innerWidth * 0.72) score += 150;
      if (rect.top < window.innerHeight) score += 100;
      if (/thumb|swatch|mini|small/i.test(src)) score -= 300;

      return { src, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.src || "";
}

function parseSephoraUk() {
  const jsonLd = parseJsonLdProduct();

  const title =
    getTextBySelectors([
      "h1",
      "[data-at='product_name']",
      "[class*='product-name']",
      "[class*='ProductName']",
    ]) ||
    (jsonLd && jsonLd.title) ||
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    cleanText(document.title);

  const price =
    cleanPrice(
      getTextBySelectors([
        "[data-at='product_price']",
        "[data-comp*='Price'] span",
        "[class*='product-price']",
        "[class*='ProductPrice']",
        "[class*='price']",
      ]),
    ) ||
    (jsonLd && jsonLd.price) ||
    cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
    cleanPrice(findMainPrice());

  const image = findSephoraUkMainImage() || findMainImage();

  return {
    site: "Sephora UK",
    title,
    price,
    image,
    url: window.location.href,
  };
}

