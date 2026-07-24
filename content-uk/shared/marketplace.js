// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
function normalizeSplitAnyPriceText(text) {
  return cleanText(text)
    .replace(/[\u00a0\u202f]/g, " ")
    // Some marketplaces render currency, major units, decimal separator and
    // minor units in separate nodes, which becomes "$ 3 . 83", "£ 2 73"
    // or "£ 2 . 73 / lot" once textContent is read.
    .replace(/([£$€₺₽₴₹¥₩])\s*(\d{1,4})\s*[.,]\s*(\d{2})(?=\D|$)/g, "$1$2.$3")
    .replace(/([£$€₺₽₴₹¥₩])\s*(\d{1,4})\s+(\d{2})(?=\D|$)/g, "$1$2.$3")
    .replace(/\b(GBP|USD|EUR|TRY|TL|RUB|UAH|INR|JPY|CNY|KRW)\s+(\d{1,4})\s*[.,]\s*(\d{2})(?=\D|$)/gi, "$1 $2.$3")
    .replace(/\b(GBP|USD|EUR|TRY|TL|RUB|UAH|INR|JPY|CNY|KRW)\s+(\d{1,4})\s+(\d{2})(?=\D|$)/gi, "$1 $2.$3")
    .replace(/(\d{1,4})\s*[.,]\s*(\d{2})\s*\b(GBP|USD|EUR|TRY|TL|RUB|UAH|INR|JPY|CNY|KRW)\b/gi, "$1.$2 $3")
    .replace(/(\d{1,4})\s+(\d{2})\s*\b(GBP|USD|EUR|TRY|TL|RUB|UAH|INR|JPY|CNY|KRW)\b/gi, "$1.$2 $3");
}

function looksLikeAnyPrice(text) {
  if (!text) return false;

  const clean = normalizeSplitAnyPriceText(text);

  if (!/\d/.test(clean)) return false;
  if (clean.length > 320) return false;

  return MULTI_CURRENCY_SYMBOL_RE.test(clean) || MULTI_CURRENCY_CODE_RE.test(clean);
}

function parseAnyPriceNumber(priceText) {
  if (!priceText) return null;

  let cleaned = normalizeCurrencySymbols(priceText)
    .replace(/(?:US|AU|CA|NZ|HK|SG)?\s?[£₺$€₽₴₹¥₩]/gi, "")
    .replace(/\b(?:GBP|USD|EUR|TRY|TL|RUB|UAH|INR|JPY|CNY|KRW|AUD|CAD|CHF|PLN|SEK|NOK|DKK|AED|SAR|BRL)\b/gi, "")
    .replace(/\/\s*(?:lot|piece|pcs?|set|pack|unit).*/i, "")
    .replace(/[^\d.,\s]/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (!cleaned) return null;

  const commaIndex = cleaned.lastIndexOf(",");
  const dotIndex = cleaned.lastIndexOf(".");

  if (commaIndex !== -1 && dotIndex !== -1) {
    if (commaIndex > dotIndex) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (commaIndex !== -1) {
    const parts = cleaned.split(",");
    const allGroupsAfterFirstAreThreeDigits =
      parts.length > 1 && parts.slice(1).every((part) => part.length === 3);

    cleaned = allGroupsAfterFirstAreThreeDigits
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");
  } else if (dotIndex !== -1) {
    const parts = cleaned.split(".");
    const allGroupsAfterFirstAreThreeDigits =
      parts.length > 1 && parts.slice(1).every((part) => part.length === 3);

    if (allGroupsAfterFirstAreThreeDigits) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const value = Number.parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}

function detectCurrencyMeta(text) {
  const t = String(text || "");

  if (/£|\bGBP\b/i.test(t)) return { currency: "GBP", currencySymbol: "£", region: "UK" };
  if (/₺|\bTRY\b|\bTL\b/i.test(t)) return { currency: "TRY", currencySymbol: "TL", region: "TR" };
  if (/€|\bEUR\b/i.test(t)) return { currency: "EUR", currencySymbol: "€", region: "UK" };
  if (/\$|\bUSD\b/i.test(t)) return { currency: "USD", currencySymbol: "$", region: "UK" };
  if (/₽|\bRUB\b/i.test(t)) return { currency: "RUB", currencySymbol: "₽", region: "TR" };
  if (/₴|\bUAH\b/i.test(t)) return { currency: "UAH", currencySymbol: "₴", region: "TR" };
  if (/₹|\bINR\b/i.test(t)) return { currency: "INR", currencySymbol: "₹", region: "UK" };
  if (/₩|\bKRW\b/i.test(t)) return { currency: "KRW", currencySymbol: "₩", region: "UK" };
  if (/¥|\bJPY\b|\bCNY\b/i.test(t)) return { currency: "JPY", currencySymbol: "¥", region: "UK" };

  return { currency: null, currencySymbol: null, region: null };
}

function isImplausibleAnyPriceCandidate(candidate, rawText = "") {
  if (!candidate || candidate.value === null || candidate.value <= 0) return true;

  const combined = normalizeForSearch(`${candidate.text || ""} ${rawText || ""}`);

  // Common placeholder/test pattern that leaked from Temu's generated DOM.
  if (/123\s*456\s*789|123456789|987\s*654\s*321|987654321/i.test(combined)) {
    return true;
  }

  // A product page parser should never accept synthetic mega-values as the
  // main price. Real high-ticket items on supported UK marketplaces stay well
  // below this, while the bad Temu value is 123,456,789.01.
  if (candidate.value > 500000) return true;

  return false;
}

function isAuxiliaryCurrencyPriceContext(candidate) {
  if (!candidate) return false;

  const before = normalizeForSearch(candidate.beforeContext || "");
  const after = normalizeForSearch(candidate.afterContext || "");
  const local = normalizeForSearch(candidate.localContext || "");

  if (/pay\s*$|pay\s+(?:only\s+)?$/i.test(before)) return true;
  if (/\bpay\b/i.test(before) && /^(?:today|now|in|later|monthly|with|using)\b/i.test(after)) return true;

  if (/(?:orders?\s+over|basket\s+over|cart\s+over|spend\s+over|over|standard|shipping|delivery|from\s+this\s+seller)\s*:?\s*$/i.test(before)) {
    return true;
  }

  if (/\b(?:credit|coupon|voucher|refund|return|guarantee|adjustment|klarna|clearpay|paypal|instalment|installment)\b/i.test(local)) {
    return true;
  }

  return false;
}

function extractAnyPriceCandidates(raw) {
  if (!raw) return [];

  const text = normalizeSplitAnyPriceText(raw);
  if (!text) return [];

  const NUM = "(?:\\d{1,3}(?:[.,\\s]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)";
  const SYM = "[£₺$€₽₴₹¥₩]";
  const CODE = "(?:GBP|USD|EUR|TRY|TL|RUB|UAH|INR|JPY|CNY|KRW|AUD|CAD|CHF|PLN|SEK|NOK|DKK|AED|SAR|BRL)";

  const re = new RegExp(
    `(?:US|AU|CA|NZ|HK|SG)?\\s?${SYM}\\s?${NUM}(?:\\s*/\\s*(?:lot|piece|pcs?|set|pack|unit))?` +
      `|${NUM}\\s?${CODE}` +
      `|${CODE}\\s?${NUM}`,
    "gi",
  );

  const candidates = [];
  let match;

  while ((match = re.exec(text)) !== null) {
    const rawMatch = cleanText(match[0]);
    const before = text.slice(Math.max(0, match.index - 45), match.index);
    const after = text.slice(match.index + rawMatch.length, match.index + rawMatch.length + 70);
    const localContext = cleanText(`${before} ${rawMatch} ${after}`);

    if (/%\s*$/.test(before) || /^\s*%/.test(after)) continue;

    const value = parseAnyPriceNumber(rawMatch);
    const meta = detectCurrencyMeta(rawMatch);
    const candidate = {
      text: rawMatch
        .replace(/\s+/g, " ")
        .replace(/([£₺$€₽₴₹¥₩])\s+/g, "$1")
        .replace(/\s+([.,])/g, "$1")
        .replace(/(\d)\s*\/\s*/g, "$1/")
        .replace(/(\d)(GBP|USD|EUR|TRY|TL|RUB|UAH|INR|JPY|CNY|KRW|AUD|CAD|CHF|PLN|SEK|NOK|DKK|AED|SAR|BRL)$/i, "$1 $2")
        .replace(/^(GBP|USD|EUR|TRY|TL|RUB|UAH|INR|JPY|CNY|KRW|AUD|CAD|CHF|PLN|SEK|NOK|DKK|AED|SAR|BRL)(\d)/i, "$1 $2")
        .trim(),
      value,
      index: match.index,
      localContext,
      beforeContext: before,
      afterContext: after,
      currency: meta.currency,
      currencySymbol: meta.currencySymbol,
      region: meta.region,
    };

    if (isImplausibleAnyPriceCandidate(candidate, text)) continue;

    candidates.push(candidate);
  }

  const realPurchaseCandidates = candidates.filter(
    (candidate) => !isAuxiliaryCurrencyPriceContext(candidate),
  );
  const saleContext = /\boff\b|save|sale|was|rrp|regular|original|list\s*price/i.test(text);
  const minPurchaseValue = Math.min(
    ...realPurchaseCandidates.map((candidate) => candidate.value).filter((value) => value !== null),
  );

  for (const candidate of candidates) {
    candidate.isAuxiliaryPrice = isAuxiliaryCurrencyPriceContext(candidate);
    candidate.isLikelyOldPrice =
      saleContext &&
      !candidate.isAuxiliaryPrice &&
      Number.isFinite(minPurchaseValue) &&
      candidate.value > minPurchaseValue * 1.02;
  }

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.text}|${candidate.index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractAnyPriceText(raw) {
  const candidates = extractAnyPriceCandidates(raw);
  return candidates[0]?.text || null;
}

function hasChildWithAnyPriceText(element) {
  return Array.from(element.children || []).some((child) =>
    extractAnyPriceCandidates(child.textContent).length > 0,
  );
}

function getPriceElementSignal(element) {
  const signal = {
    oldPrice: false,
    currentPrice: false,
  };

  let current = element;

  for (let depth = 0; current && depth < 4; depth += 1) {
    const tag = (current.tagName || "").toLowerCase();
    const attrText = cleanText(
      [
        tag,
        current.getAttribute?.("class") || "",
        current.getAttribute?.("id") || "",
        current.getAttribute?.("data-testid") || "",
        current.getAttribute?.("data-test") || "",
        current.getAttribute?.("data-pl") || "",
        current.getAttribute?.("aria-label") || "",
      ].join(" "),
    );

    if (/\b(?:del|s)\b|old|original|regular|retail|rrp|was|before|strike|strikethrough|line-through|crossed|market/i.test(attrText)) {
      signal.oldPrice = true;
    }

    if (/current|sale|discount|deal|promo|now|final|active|price-current|currentprice|saleprice|price-sale/i.test(attrText)) {
      signal.currentPrice = true;
    }

    try {
      const style = window.getComputedStyle(current);
      const decoration = cleanText(`${style.textDecoration || ""} ${style.textDecorationLine || ""}`);

      if (/line-through/i.test(decoration)) {
        signal.oldPrice = true;
      }

      if (Number.parseFloat(style.opacity) < 0.55) {
        signal.oldPrice = true;
      }
    } catch {
      // Ignore detached nodes.
    }

    current = current.parentElement;
  }

  return signal;
}

function getMarketplaceBodyText() {
  return cleanText(document.body?.innerText || document.body?.textContent || "");
}

function readMarketplaceBodyPriceInfo(preferredCurrency = null) {
  const bodyText = getMarketplaceBodyText();
  const candidates = extractAnyPriceCandidates(bodyText)
    .filter((candidate) => !candidate.isAuxiliaryPrice)
    .filter((candidate) => !candidate.isLikelyOldPrice)
    .filter((candidate) => !preferredCurrency || candidate.currency === preferredCurrency);

  if (candidates.length === 0) {
    return {
      price: null,
      currency: undefined,
      currencySymbol: undefined,
      region: undefined,
    };
  }

  const scored = candidates.map((candidate) => {
    let score = scoreMultiCurrencyCandidate(candidate, bodyText, null, 120);

    if (/price\s+includes\s+vat|vat\s+included|incl(?:udes|\.)?\s+vat/i.test(candidate.localContext)) score += 320;
    if (/\/\s*(?:lot|piece|pcs?|set|pack|unit)/i.test(candidate.text)) score += 220;
    if (/customer\s+reviews?|reviews?\s*\||pick-?up|free\s+shipping|fast\s+delivery|coupon|voucher|refund/i.test(candidate.localContext)) score -= 260;
    if (/\boff\b|save|coupon|voucher/i.test(candidate.localContext)) score -= 180;

    return { ...candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return {
    price: best?.text || null,
    currency: best?.currency || undefined,
    currencySymbol: best?.currencySymbol || undefined,
    region: best?.region || undefined,
  };
}

function scoreMultiCurrencyCandidate(candidate, rawText = "", element = null, sourcePriority = 0) {
  const host = window.location.hostname;
  const raw = cleanText(rawText);
  const rawNormalized = normalizeForSearch(raw);
  const attrText = element
    ? cleanText(
        [
          element.getAttribute?.("class") || "",
          element.getAttribute?.("id") || "",
          element.getAttribute?.("data-testid") || "",
          element.getAttribute?.("data-pl") || "",
          element.getAttribute?.("aria-label") || "",
        ].join(" "),
      )
    : "";

  let score = sourcePriority;
  const elementSignal = element ? getPriceElementSignal(element) : { oldPrice: false, currentPrice: false };

  if (elementSignal.oldPrice) score -= 720;
  if (elementSignal.currentPrice && !elementSignal.oldPrice) score += 260;

  if (candidate.currencySymbol) score += 90;
  if (/\d+[.,]\d{2}/.test(candidate.text)) score += 45;
  if (/\/\s*(?:lot|piece|pcs?|set|pack|unit)/i.test(candidate.text)) score += 25;

  if (/price|current|sale|now|amount|value|goodsPrice|product-price|currentPrice/i.test(`${raw} ${attrText}`)) {
    score += 140;
  }

  if ((host.includes("temu") || host.includes("aliexpress") || host.includes("sephora")) && candidate.currency === "GBP") {
    score += 140;
  }

  if (/shipping|delivery|free\s+shipping|orders?\s+over|credit|coupon|voucher|refund|returns?|guarantee|adjustment/i.test(rawNormalized)) {
    score -= 80;
  }

  if (/pay\s*(?:today|now|in)|installment|instalment|klarna|clearpay|paypal|credit/i.test(candidate.localContext)) {
    score -= 360;
  }

  if (candidate.isAuxiliaryPrice) score -= 320;
  if (candidate.isLikelyOldPrice) score -= 240;

  if (/was|rrp|old|regular|original|list\s*price|strikethrough|line-through/i.test(candidate.localContext)) {
    score -= 180;
  }

  if (/\boff\b|sale|save/i.test(rawNormalized) && !candidate.isLikelyOldPrice && !candidate.isAuxiliaryPrice) {
    score += 55;
  }

  if (candidate.value > 10000) score -= 220;
  if (candidate.value > 50000) score -= 520;

  if (element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize) || 0;
    const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;

    score += fontSize * 8;
    score += fontWeight / 80;

    if (rect.top >= 0 && rect.top < window.innerHeight * 0.9) score += 80;
    if (rect.left > window.innerWidth * 0.25 && rect.left < window.innerWidth * 0.95) score += 45;

    const titleElement =
      document.querySelector("h1") ||
      document.querySelector("[data-pl='product-title']") ||
      document.querySelector("[data-testid*='title']") ||
      document.querySelector("[class*='title']");

    if (titleElement) {
      const titleRect = titleElement.getBoundingClientRect();
      const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
      score += Math.max(0, 360 - distanceFromTitle);
    }
  }

  return score;
}

function scoreAnyPriceCandidate(element, titleRect) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const fontSize = Number.parseFloat(style.fontSize) || 0;
  const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
  const text = cleanText(element.textContent);
  const candidates = extractAnyPriceCandidates(text);
  const bestCandidate = candidates
    .map((candidate) => ({
      text: candidate.text,
      score: scoreMultiCurrencyCandidate(candidate, text, element, 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  let score = bestCandidate?.score || 0;

  score += fontSize * 14;
  score += fontWeight / 60;

  if (titleRect) {
    const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
    score += Math.max(0, 320 - distanceFromTitle);
  }

  if (/off|save|was|rrp|delivery|shipping|coupon|voucher|points|orders over|extra|code|per /i.test(text)) {
    score -= 120;
  }

  return { text: bestCandidate?.text || candidates[0]?.text || text, score };
}

function findAnyCurrencyMainPrice() {
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector("[data-pl='product-title']") ||
    document.querySelector("[data-testid*='title']") ||
    document.querySelector("[class*='title']");

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const candidates = [];

  for (const element of Array.from(document.querySelectorAll("span, div, p, strong, ins, b, h1, h2"))) {
    if (!isVisibleElement(element)) continue;

    const text = cleanText(element.textContent);
    if (!text) continue;

    const attrText = cleanText(
      [
        element.getAttribute?.("class") || "",
        element.getAttribute?.("id") || "",
        element.getAttribute?.("data-testid") || "",
        element.getAttribute?.("data-pl") || "",
      ].join(" "),
    );

    if (text.length > 600) continue;
    if (text.length > 260 && !/price|amount|value|current|sale|goods|product/i.test(attrText)) {
      continue;
    }

    const extracted = extractAnyPriceCandidates(text);
    if (extracted.length === 0) continue;

    const rect = element.getBoundingClientRect();

    if (titleRect) {
      if (rect.top < titleRect.top - 650) continue;
      if (rect.top > titleRect.bottom + 1700) continue;
    }

    for (const candidate of extracted) {
      candidates.push({
        text: candidate.text,
        score: scoreMultiCurrencyCandidate(candidate, text, element, 0),
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.text || "";
}

function formatMetaPriceWithCurrency() {
  const amount =
    getAttr("meta[property='product:price:amount']", "content") ||
    getAttr("meta[property='og:price:amount']", "content") ||
    getAttr("meta[name='twitter:data1']", "content") ||
    getAttr("meta[name='price']", "content");

  if (!amount) return "";

  const currency = cleanText(
    getAttr("meta[property='product:price:currency']", "content") ||
      getAttr("meta[property='og:price:currency']", "content") ||
      getAttr("meta[name='product:price:currency']", "content"),
  ).toUpperCase();

  if (MULTI_CURRENCY_SYMBOL_RE.test(amount) || MULTI_CURRENCY_CODE_RE.test(amount)) {
    return cleanText(amount);
  }

  const num = cleanText(amount).match(/\d[\d.,]*\d|\d/);
  if (!num) return "";

  return currency ? `${num[0]} ${currency}` : num[0];
}

function readMultiCurrencyPrice(specificSelectors) {
  const sources = [];

  for (const [selectorIndex, selector] of (specificSelectors || []).entries()) {
    for (const element of document.querySelectorAll(selector)) {
      const text = cleanText(element.textContent || element.getAttribute?.("aria-label") || "");
      if (text) {
        sources.push({
          text,
          element,
          priority: 900 - selectorIndex * 18,
        });
      }
    }
  }

  const mainText = findAnyCurrencyMainPrice();
  if (mainText) sources.push({ text: mainText, element: null, priority: 520 });

  const metaText = formatMetaPriceWithCurrency();
  if (metaText) sources.push({ text: metaText, element: null, priority: 420 });

  const candidates = [];

  for (const source of sources) {
    for (const candidate of extractAnyPriceCandidates(source.text)) {
      if (isImplausibleAnyPriceCandidate(candidate, source.text)) continue;

      candidates.push({
        ...candidate,
        element: source.element || null,
        sourceText: source.text,
        score: scoreMultiCurrencyCandidate(
          candidate,
          source.text,
          source.element,
          source.priority,
        ),
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (best) {
    return {
      price: best.text,
      currency: best.currency || undefined,
      currencySymbol: best.currencySymbol || undefined,
      region: best.region || undefined,
    };
  }

  return {
    price: null,
    currency: undefined,
    currencySymbol: undefined,
    region: undefined,
  };
}

