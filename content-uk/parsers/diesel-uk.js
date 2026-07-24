// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function getCssBackgroundImageUrl(element) {
  if (!element) return "";

  const backgroundImage = window.getComputedStyle(element).backgroundImage || "";
  const match = backgroundImage.match(/url\((['"]?)(.*?)\1\)/i);

  return toAbsoluteUrl(match?.[2] || "");
}

function findDieselMainImage() {
  const metaImage =
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content");

  if (metaImage && !isBadImageCandidate(metaImage)) {
    return toAbsoluteUrl(metaImage);
  }

  const galleryImage = findImageBySelectors([
    "main [class*='product-gallery']",
    "main [class*='ProductGallery']",
    "main [class*='product-media']",
    "main [class*='ProductMedia']",
    "main [class*='pdp'] picture",
    "main [class*='PDP'] picture",
    "main picture",
  ]);

  if (galleryImage) return galleryImage;

  const backgroundCandidates = Array.from(
    document.querySelectorAll(
      "main [class*='product'], main [class*='Product'], main [class*='gallery'], main [class*='Gallery'], main [class*='media'], main [class*='Media']",
    ),
  )
    .map((element) => {
      const src = getCssBackgroundImageUrl(element);
      const rect = element.getBoundingClientRect();

      if (!src || rect.width < 160 || rect.height < 160) return null;
      if (isBadImageCandidate(src, "", element)) return null;

      let score = rect.width * rect.height;
      if (rect.left < window.innerWidth * 0.72) score += 250000;
      if (/product|gallery|media|pdp/i.test(element.className || "")) score += 150000;

      return { src, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return backgroundCandidates[0]?.src || findMainImage();
}

function getDieselImageElements() {
  const selectors = [
    "main [class*='product-gallery'] img",
    "main [class*='ProductGallery'] img",
    "main [class*='product-media'] img",
    "main [class*='ProductMedia'] img",
    "main [class*='pdp'] img",
    "main [class*='PDP'] img",
    "main picture img",
    "main img",
  ];

  const images = selectors.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector)),
  );

  return Array.from(new Set(images))
    .map((img) => {
      const rect = img.getBoundingClientRect();
      const src = getImageUrl(img);
      const alt = cleanText(img.getAttribute("alt") || "");

      if (!src || isBadImageCandidate(src, alt, img)) return null;
      if (rect.width < 180 || rect.height < 180) return null;

      let score = rect.width * rect.height;
      if (rect.left < window.innerWidth * 0.72) score += 250000;
      score += Math.max(
        0,
        500000 - Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2) * 800,
      );
      if (/product|gallery|media|pdp/i.test(img.closest("[class]")?.className || "")) {
        score += 150000;
      }

      return { img, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map((candidate) => candidate.img);
}

async function createDieselImageDataUrl() {
  const images = getDieselImageElements();

  for (const img of images) {
    try {
      if (!img.complete || !img.naturalWidth) {
        await img.decode();
      }

      if (!img.naturalWidth || !img.naturalHeight) continue;

      const maxWidth = 320;
      const maxHeight = 420;
      const scale = Math.min(
        maxWidth / img.naturalWidth,
        maxHeight / img.naturalHeight,
        1,
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

      const context = canvas.getContext("2d");
      if (!context) continue;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);

      return canvas.toDataURL("image/jpeg", 0.82);
    } catch {
      // Cross-origin canvas engellenirse sıradaki görsel denenir.
    }
  }

  return "";
}

function parseDieselUk() {
  return {
    site: "Diesel UK",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      cleanPrice(getText("[class*='price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(findMainPrice()),
    image: findDieselMainImage(),
    url: window.location.href,
  };
}

