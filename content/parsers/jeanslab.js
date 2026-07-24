// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function findJeansLabMainPrice() {
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector("[class*='product-name']") ||
    document.querySelector("[class*='ProductName']");

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;
  const priceElements = Array.from(
    document.querySelectorAll("span, div, p, strong, b"),
  ).filter((element) => {
    if (!isVisibleElement(element)) return false;

    const text = cleanText(element.textContent);
    if (!looksLikeTryPrice(text)) return false;
    if (text.length > 140) return false;

    const rect = element.getBoundingClientRect();

    if (rect.left < window.innerWidth * 0.45) return false;
    if (rect.left > window.innerWidth * 0.99) return false;

    if (titleRect) {
      if (rect.top < titleRect.top - 80) return false;
      if (rect.top > titleRect.bottom + 320) return false;
    }

    return true;
  });

  const struckPriceItems = priceElements
    .map((element) => {
      const style = window.getComputedStyle(element);
      const className = String(element.className || "");
      const textDecoration = `${style.textDecorationLine} ${style.textDecoration}`;

      if (!/line-through|strike/i.test(`${className} ${textDecoration}`)) {
        return null;
      }

      const prices = extractTryPriceCandidates(cleanText(element.textContent));
      if (prices.length === 0) return null;

      return {
        value: prices[0].value,
        rect: element.getBoundingClientRect(),
      };
    })
    .filter(Boolean);

  const candidates = priceElements
    .map((element) => {
      const text = cleanText(element.textContent);
      const normalizedPriceText = text.replace(/(TL|₺)(?=\d)/gi, "$1 ");
      const prices = extractTryPriceCandidates(normalizedPriceText);
      if (prices.length === 0) return null;

      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const className = String(element.className || "");
      const textDecoration = `${style.textDecorationLine} ${style.textDecoration}`;
      const isStruck = /line-through|strike/i.test(`${className} ${textDecoration}`);

      if (isStruck) return null;

      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const selectedPrice = prices[prices.length - 1];
      const isSinglePrice = prices.length === 1;
      const followsStruckPrice = struckPriceItems.some((item) => {
        const sameColumn = Math.abs(rect.left - item.rect.left) < 80;
        const belowOldPrice = rect.top >= item.rect.top - 4 && rect.top <= item.rect.top + 80;
        const differentPrice = Math.abs(selectedPrice.value - item.value) > 0.01;

        return sameColumn && belowOldPrice && differentPrice;
      });

      let score = 0;

      score += fontSize * 16;
      score += fontWeight / 50;
      score += Math.max(0, 120 - text.length);

      if (isSinglePrice) score += 260;
      if (prices.length > 1) score += 80;
      if (followsStruckPrice) score += 1200;
      if (/MuiTypography|price|Price/i.test(className)) score += 80;

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 260 - distanceFromTitle);
      }

      return {
        text: selectedPrice.text,
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
}

function findJeansLabPriceFromPriceNodes() {
  const candidates = Array.from(
    document.querySelectorAll(
      "[class*='price'], [class*='Price'], [class*='sale'], [class*='Sale'], [id*='price'], [id*='Price']",
    ),
  )
    .map((element) => {
      const text = cleanText(
        [
          element.textContent,
          element.getAttribute?.("content"),
          element.getAttribute?.("aria-label"),
          element.getAttribute?.("title"),
        ].join(" "),
      );

      if (!text || text.length > 220) return null;

      const normalized = normalizeInstallmentText(text);
      if (/taksit|kargo|teslimat|beden|renk|stok/i.test(normalized)) return null;

      const style = window.getComputedStyle(element);
      const className = String(element.className || "");
      const textDecoration = `${style.textDecorationLine} ${style.textDecoration}`;

      if (/line-through|strike|old|original|was|regular/i.test(`${className} ${textDecoration}`)) {
        return null;
      }

      const prices = extractTryPriceCandidates(text.replace(/(TL|₺)(?=\d)/gi, "$1 "));
      if (prices.length === 0) return null;

      let score = 0;
      if (/sale|discount|current|final|price/i.test(className)) score += 160;
      if (prices.length === 1) score += 100;

      return {
        text: prices[prices.length - 1].text,
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
}

function findJeansLabPriceFromPageText() {
  const bodyText = cleanText(document.body?.innerText || document.body?.textContent || "");
  if (!bodyText) return "";

  const productTopText = bodyText
    .split(/Ürün Bilgileri|Urun Bilgileri|Teslimat ve İade|Teslimat ve Iade|Taksit Seçenekleri|Taksit Secenekleri/i)[0]
    .replace(/(TL|₺)(?=\d)/gi, "$1 ");
  const topCandidates = extractTryPriceCandidates(productTopText);

  if (topCandidates.length > 0) {
    return topCandidates[topCandidates.length - 1].text;
  }

  const pageCandidates = extractTryPriceCandidates(
    bodyText
      .replace(/(TL|₺)(?=\d)/gi, "$1 ")
      .replace(/Taksit Sayısı.*$/i, ""),
  );

  if (pageCandidates.length === 0) return "";

  return pageCandidates[pageCandidates.length - 1].text;
}

function findJeansLabMainImage() {
  const title = cleanText(getText("h1"));
  const normalizedTitle = normalizeForBasicSearch(title);

  const candidates = Array.from(document.querySelectorAll("img"))
    .filter((image) => {
      if (!isVisibleElement(image)) return false;

      const src = image.currentSrc || image.src || image.getAttribute("src") || "";
      const alt = image.getAttribute("alt") || "";

      if (!src) return false;
      if (!/img-jeanslab\.mncdn\.com/i.test(src)) return false;
      if (/img-jeanslab-test|JeansLab125|logo|banner/i.test(src)) return false;
      if (/logo|banner/i.test(alt)) return false;

      const rect = image.getBoundingClientRect();

      if (rect.width < 150 || rect.height < 150) return false;

      return true;
    })
    .map((image) => {
      const src = image.currentSrc || image.src || image.getAttribute("src") || "";
      const alt = cleanText(image.getAttribute("alt") || "");
      const normalizedAlt = normalizeForBasicSearch(alt);
      const rect = image.getBoundingClientRect();

      let score = 0;

      score += rect.width + rect.height;

      if (rect.left > window.innerWidth * 0.08 && rect.left < window.innerWidth * 0.65) {
        score += 260;
      }

      if (rect.top < window.innerHeight * 0.9) {
        score += 160;
      }

      if (/\/base\/originals\//i.test(src)) {
        score += 180;
      }

      if (/-0\.(jpg|jpeg|png|webp)/i.test(src)) {
        score += 220;
      }

      if (
        normalizedTitle &&
        normalizedAlt &&
        (normalizedTitle.includes(normalizedAlt) ||
          normalizedAlt.includes(normalizedTitle))
      ) {
        score += 260;
      }

      return {
        src,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.src || "";
}

function parseJeansLab() {
  const mainPrice = findJeansLabMainPrice();

  return {
    site: "JeansLab",
    title:
      getFirstTextFromAll([
        "h1",
        "[class*='product-name']",
        "[class*='ProductName']",
        "[class*='product-title']",
        "[class*='ProductTitle']",
      ]) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      cleanPrice(mainPrice) ||
      cleanPrice(findJeansLabPriceFromPriceNodes()) ||
      cleanPrice(findJeansLabPriceFromPageText()) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")) ||
      cleanPrice(getFirstText(["[class*='price']", "[class*='Price']"])),
    image: findJeansLabMainImage(),
    url: window.location.href,
  };
}

