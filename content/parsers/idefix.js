// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function findIdefixMainPrice() {
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector("[class*='ProductName']") ||
    document.querySelector("[class*='product-name']");

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
      if (text.length > 70) return false;

      const rect = element.getBoundingClientRect();

      if (titleRect) {
        if (rect.top < titleRect.bottom - 80) return false;
        if (rect.top > titleRect.bottom + 420) return false;
      }

      if (rect.left < window.innerWidth * 0.25) return false;
      if (rect.left > window.innerWidth * 0.75) return false;

      return true;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const text = cleanText(element.textContent);

      let score = 0;

      score += fontSize * 10;
      score += fontWeight / 70;

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 240 - distanceFromTitle);
      }

      if (/sepette indirim/i.test(text)) score += 120;
      if (
        /ay alışveriş kredisi|alisveris kredisi|taksit|puan|kargo|satici|satıcı|kampanya/i.test(
          text,
        )
      ) {
        score -= 300;
      }

      return {
        text,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
}

function findIdefixMainImage() {
  const title =
    cleanText(getText("h1")) ||
    cleanText(getAttr("meta[property='og:title']", "content"));

  const images = Array.from(document.querySelectorAll("img"));

  const scoredImages = images
    .filter((img) => {
      if (!isVisibleElement(img)) return false;

      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";

      if (!src) return false;
      if (/placeholder|logo|icon|sprite|badge/i.test(src)) return false;
      if (/placeholder|logo|icon|sprite|badge/i.test(alt)) return false;

      const rect = img.getBoundingClientRect();

      if (rect.width < 80 || rect.height < 80) return false;

      return true;
    })
    .map((img) => {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      const alt = cleanText(img.getAttribute("alt") || "");
      const rect = img.getBoundingClientRect();

      let score = 0;

      score += rect.width + rect.height;

      if (
        title &&
        alt &&
        normalizeForBasicSearch(title).includes(
          normalizeForBasicSearch(alt).slice(0, 25),
        )
      ) {
        score += 300;
      }

      if (/image|product|urun|ürün/i.test(src)) score += 120;
      if (rect.left < window.innerWidth * 0.5) score += 120;
      if (rect.top < window.innerHeight * 0.75) score += 80;

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

function normalizeForBasicSearch(text) {
  return String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseIdefix() {
  const mainPrice = findIdefixMainPrice();

  return {
    site: "idefix",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      cleanPrice(mainPrice) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")),
    image: findIdefixMainImage(),
    url: window.location.href,
  };
}

function findIdefixMainPrice() {
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector("[class*='ProductName']") ||
    document.querySelector("[class*='product-name']");

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
      if (text.length > 80) return false;

      const rect = element.getBoundingClientRect();

      if (titleRect) {
        if (rect.top < titleRect.bottom - 100) return false;
        if (rect.top > titleRect.bottom + 460) return false;
      }

      if (rect.left < window.innerWidth * 0.25) return false;
      if (rect.left > window.innerWidth * 0.78) return false;

      return true;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const text = cleanText(element.textContent);

      let score = 0;

      score += fontSize * 12;
      score += fontWeight / 60;

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 260 - distanceFromTitle);
      }

      if (/sepette indirim/i.test(text)) score += 130;

      if (
        /ay alışveriş kredisi|ay alisveris kredisi|alisveris kredisi|taksit|puan|kargo|satici|satıcı|kampanya|premium|ecoplus|detay/i.test(
          text,
        )
      ) {
        score -= 350;
      }

      return {
        text,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
}

function findIdefixMainImage() {
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
      if (/placeholder|logo|icon|sprite|badge/i.test(src)) return false;
      if (/placeholder|logo|icon|sprite|badge/i.test(alt)) return false;

      const rect = img.getBoundingClientRect();

      if (rect.width < 80 || rect.height < 80) return false;

      return true;
    })
    .map((img) => {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      const alt = cleanText(img.getAttribute("alt") || "");
      const normalizedAlt = normalizeForBasicSearch(alt);
      const rect = img.getBoundingClientRect();

      let score = 0;

      score += rect.width + rect.height;

      if (
        normalizedTitle &&
        normalizedAlt &&
        (normalizedTitle.includes(normalizedAlt.slice(0, 25)) ||
          normalizedAlt.includes(normalizedTitle.slice(0, 25)))
      ) {
        score += 300;
      }

      if (/image|product|urun|ürün|catalog|media/i.test(src)) score += 120;
      if (rect.left < window.innerWidth * 0.5) score += 160;
      if (rect.top < window.innerHeight * 0.8) score += 100;

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

function parseIdefix() {
  const mainPrice = findIdefixMainPrice();

  return {
    site: "idefix",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      cleanPrice(mainPrice) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")),
    image: findIdefixMainImage(),
    url: window.location.href,
  };
}

