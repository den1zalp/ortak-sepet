// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function getFirstText(selectors) {
  for (const selector of selectors) {
    const text = cleanText(getText(selector));
    if (text) return text;
  }

  return "";
}

function getFirstTextFromAll(selectors) {
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector));

    for (const element of elements) {
      const text = cleanText(element.textContent);
      if (text) return text;
    }
  }

  return "";
}

function getFirstAttr(selectors, attr) {
  for (const selector of selectors) {
    const value = cleanText(getAttr(selector, attr));
    if (value) return value;
  }

  return "";
}

function findSiteMainPrice(options = {}) {
  const {
    titleSelectors = ["h1"],
    minLeftRatio = 0.25,
    maxLeftRatio = 0.95,
    maxDistanceBelowTitle = 700,
    excludeRegex = /taksit|kargo|teslimat|puan|kampanya|sepet|liste|karşılaştır|karsilastir|favori|yorum|günün|gunun|en düşük|en dusuk|kredi kartı|kredi karti/i,
  } = options;

  const titleElement = titleSelectors
    .map((selector) => document.querySelector(selector))
    .find(Boolean);

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const candidates = Array.from(
    document.querySelectorAll("span, div, p, strong, b"),
  )
    .filter((element) => {
      if (!isVisibleElement(element)) return false;

      const text = cleanText(element.textContent);

      if (!looksLikeTryPrice(text)) return false;
      if (hasChildWithPriceText(element)) return false;
      if (text.length > 90) return false;
      if (excludeRegex.test(text)) return false;

      const rect = element.getBoundingClientRect();

      if (rect.left < window.innerWidth * minLeftRatio) return false;
      if (rect.left > window.innerWidth * maxLeftRatio) return false;

      if (titleRect) {
        if (rect.top < titleRect.top - 180) return false;
        if (rect.top > titleRect.bottom + maxDistanceBelowTitle) return false;
      }

      return true;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const text = cleanText(element.textContent);

      let score = 0;

      score += fontSize * 16;
      score += fontWeight / 50;
      score += Math.max(0, 120 - text.length);

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 320 - distanceFromTitle);
      }

      return {
        text,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
}

function findFashionMainPrice(options = {}) {
  const {
    titleSelectors = ["h1"],
    minLeftRatio = 0.35,
    maxLeftRatio = 0.98,
    maxDistanceBelowTitle = 850,
    excludeRegex = /taksit|kargo|teslimat|kampanya|sepet|beden|renk|model|stok|favori|değerlendirme|degerlendirme|yorum|ölçü|olcu/i,
  } = options;

  const titleElement = titleSelectors
    .map((selector) => document.querySelector(selector))
    .find(Boolean);

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const candidates = Array.from(
    document.querySelectorAll("span, div, p, strong, b, ins"),
  )
    .filter((element) => {
      if (!isVisibleElement(element)) return false;

      const text = cleanText(element.textContent);

      if (!looksLikeTryPrice(text)) return false;
      if (hasChildWithPriceText(element)) return false;
      if (text.length > 90) return false;
      if (excludeRegex.test(text)) return false;

      const rect = element.getBoundingClientRect();

      if (rect.left < window.innerWidth * minLeftRatio) return false;
      if (rect.left > window.innerWidth * maxLeftRatio) return false;

      if (titleRect) {
        if (rect.top < titleRect.top - 220) return false;
        if (rect.top > titleRect.bottom + maxDistanceBelowTitle) return false;
      }

      return true;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const className = String(element.className || "");
      const text = cleanText(element.textContent);
      const textDecoration = `${style.textDecorationLine} ${style.textDecoration}`;

      let score = 0;

      score += fontSize * 18;
      score += fontWeight / 55;
      score += Math.max(0, 130 - text.length);

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 360 - distanceFromTitle);
      }

      if (rect.left > window.innerWidth * 0.55) score += 120;
      if (/current|sale|final|discount|price/i.test(className)) score += 80;
      if (/line-through|strike|old|original|was|regular/i.test(`${className} ${textDecoration}`)) {
        score -= 450;
      }

      return {
        text,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
}

