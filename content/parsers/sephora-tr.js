// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function getBestSrcFromSrcsetForSephora(srcset) {
  if (!srcset) return "";

  const candidates = String(srcset)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const pieces = part.split(/\s+/);
      const url = pieces[0] || "";
      const descriptor = pieces[1] || "";
      let score = 1;

      if (descriptor.endsWith("w")) {
        score = Number.parseInt(descriptor, 10) || 1;
      } else if (descriptor.endsWith("x")) {
        score = (Number.parseFloat(descriptor) || 1) * 1000;
      }

      return { url, score };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.url || "";
}

function toAbsoluteUrlForSephora(url) {
  if (!url) return "";

  try {
    return new URL(url, window.location.href).toString();
  } catch {
    return url;
  }
}

function getSephoraImageUrl(img) {
  if (!img) return "";

  const picture = img.closest("picture");
  const sourceSrcset = picture
    ? Array.from(picture.querySelectorAll("source"))
        .map((source) => source.getAttribute("srcset") || source.getAttribute("data-srcset") || "")
        .find(Boolean)
    : "";

  const candidates = [
    img.currentSrc,
    img.getAttribute("data-zoom-src"),
    img.getAttribute("data-src"),
    img.getAttribute("data-lazy-src"),
    img.getAttribute("data-original"),
    img.getAttribute("data-image"),
    img.getAttribute("data-hires"),
    getBestSrcFromSrcsetForSephora(img.getAttribute("srcset")),
    getBestSrcFromSrcsetForSephora(sourceSrcset),
    img.src,
    img.getAttribute("src"),
  ].filter(Boolean);

  const usable = candidates.find((url) =>
    !/data:image|base64|placeholder|loading|spacer|transparent|blank|sprite|logo|icon/i.test(url),
  );

  return toAbsoluteUrlForSephora(usable || candidates[0] || "");
}

function findSephoraMainImage() {
  const jsonLd = parseJsonLdProduct();

  const stable =
    (jsonLd && jsonLd.image) ||
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content") ||
    getAttr("link[rel='image_src']", "href");

  if (stable && !/sprite|logo|icon|placeholder|data:image/i.test(stable)) {
    return toAbsoluteUrlForSephora(stable);
  }

  const selectors = [
    "[data-comp*='ProductImage'] img",
    "[data-at*='product_image'] img",
    "[data-testid*='product-image'] img",
    "[class*='product-image'] img",
    "[class*='ProductImage'] img",
    "[class*='product-gallery'] img",
    "[class*='product-media'] img",
    "[class*='ProductMedia'] img",
    "[class*='gallery'] img",
    "[class*='Gallery'] img",
    "[class*='swiper-slide-active'] img",
    "main picture img",
    "img[src*='sephora']",
    "img[src*='productimages']",
    "img[src*='/media']",
    "main img",
  ];

  const images = Array.from(
    new Set(
      selectors.flatMap((selector) =>
        Array.from(document.querySelectorAll(selector)),
      ),
    ),
  );

  const candidates = images
    .map((img) => {
      const src = getSephoraImageUrl(img);
      if (!src) return null;

      if (/sprite|logo|icon|placeholder|loading|spacer|swatch|thumbnail|thumb|flag|payment|klarna|clearpay|paypal/i.test(src)) {
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

  return (
    candidates[0]?.src ||
    findSiteMainImage({
      cdnRegex: /product|media|sephora|image|images|cdn|resize/i,
    }) ||
    ""
  );
}

function parseSephora() {
  const jsonLd = parseJsonLdProduct();

  const title =
    getFirstText([
      "h1",
      "[class*='product-name']",
      "[class*='ProductName']",
      "[class*='pdp-title']",
    ]) ||
    (jsonLd && jsonLd.title) ||
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    cleanText(document.title);

  const price =
    cleanPrice(
      getFirstTextFromAll([
        "[class*='product-price']",
        "[class*='ProductPrice']",
        "[class*='current-price']",
        "[class*='price']",
      ]),
    ) ||
    cleanPrice(findSiteMainPrice()) ||
    (jsonLd && jsonLd.price) ||
    cleanPrice(getAttr("meta[property='product:price:amount']", "content"));

  const image = findSephoraMainImage() || (jsonLd && jsonLd.image) || "";

  return {
    site: "Sephora",
    title,
    price,
    image,
    url: window.location.href,
  };
}

