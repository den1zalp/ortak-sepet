// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function findPazaramaMainPrice() {
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector("[class*='product-title']") ||
    document.querySelector("[class*='ProductTitle']");

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const elements = Array.from(
    document.querySelectorAll("span, div, p, strong"),
  );

  const candidates = elements
    .filter((element) => {
      if (!isVisibleElement(element)) return false;

      const text = cleanText(element.textContent);

      if (!looksLikeTryPrice(text)) return false;
      if (hasChildWithPriceText(element)) return false;
      if (text.length > 90) return false;

      const rect = element.getBoundingClientRect();

      if (titleRect) {
        if (rect.top < titleRect.bottom - 120) return false;
        if (rect.top > titleRect.bottom + 520) return false;
      }

      if (rect.left < window.innerWidth * 0.35) return false;
      if (rect.left > window.innerWidth * 0.85) return false;

      return true;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const text = cleanText(element.textContent);

      let score = 0;

      score += fontSize * 14;
      score += fontWeight / 60;

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 280 - distanceFromTitle);
      }

      if (/sepette/i.test(text)) score += 60;

      if (
        /taksit|garanti|sigorta|kargo|teslimat|indirim|puan|kampanya|hizmet|ay|başlayan|baslayan|detay/i.test(
          text,
        )
      ) {
        score -= 400;
      }

      return {
        text,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
}

function findPazaramaMainImage() {
  const title =
    cleanText(getText("h1")) ||
    cleanText(getAttr("meta[property='og:title']", "content"));

  const normalizedTitle = normalizeForBasicSearch(title);
  const images = Array.from(document.querySelectorAll("img"));

  const scoredImages = images
    .filter((img) => {
      if (!isVisibleElement(img)) return false;

      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";

      if (!src) return false;
      if (/logo|icon|sprite|placeholder|loading|badge/i.test(src)) return false;
      if (/logo|icon|sprite|placeholder|loading|badge/i.test(alt)) return false;

      const rect = img.getBoundingClientRect();

      if (rect.width < 120 || rect.height < 120) return false;

      return true;
    })
    .map((img) => {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      const alt = cleanText(img.getAttribute("alt") || "");
      const normalizedAlt = normalizeForBasicSearch(alt);
      const rect = img.getBoundingClientRect();

      let score = 0;

      score += rect.width + rect.height;

      if (rect.left < window.innerWidth * 0.55) score += 180;
      if (rect.top < window.innerHeight * 0.85) score += 120;

      if (/product|urun|ürün|images|media|resize|cdn/i.test(src)) score += 120;

      if (
        normalizedTitle &&
        normalizedAlt &&
        (normalizedTitle.includes(normalizedAlt.slice(0, 25)) ||
          normalizedAlt.includes(normalizedTitle.slice(0, 25)))
      ) {
        score += 250;
      }

      return {
        src,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    scoredImages[0]?.src ||
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content")
  );
}

function parsePazarama() {
  const mainPrice = findPazaramaMainPrice();

  return {
    site: "Pazarama",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      cleanPrice(mainPrice) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")),
    image: findPazaramaMainImage(),
    url: window.location.href,
  };
}
