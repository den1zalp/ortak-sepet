// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function getText(selector) {
  const element = document.querySelector(selector);
  return element ? element.textContent.trim() : "";
}

function getAttr(selector, attr) {
  const element = document.querySelector(selector);
  return element ? element.getAttribute(attr) || "" : "";
}

function cleanText(text) {
  if (!text) return "";
  return String(text).replace(/\s+/g, " ").trim();
}


function parseTryPriceNumber(priceText) {
  if (!priceText) return null;

  let cleaned = String(priceText)
    .replace(/TL|TRY/gi, "")
    .replace(/₺/g, "")
    .replace(/\s/g, "")
    .trim();

  const commaIndex = cleaned.lastIndexOf(",");
  const dotIndex = cleaned.lastIndexOf(".");

  if (commaIndex !== -1 && dotIndex !== -1) {
    if (commaIndex > dotIndex) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (commaIndex !== -1) {
    cleaned = cleaned.replace(",", ".");
  } else if (dotIndex !== -1) {
    const parts = cleaned.split(".");
    const allGroupsAfterFirstAreThreeDigits =
      parts.length > 1 && parts.slice(1).every((part) => part.length === 3);

    if (allGroupsAfterFirstAreThreeDigits) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const number = Number.parseFloat(cleaned);
  return Number.isNaN(number) ? null : number;
}

function normalizeSplitTryPriceText(text) {
  return cleanText(text)
    // Some stores render decimal parts in separate DOM nodes: "4.499 10 TL".
    .replace(/(\d{1,3}(?:[.]\d{3})+)\s+(\d{1,2})\s*(TL|₺)/gi, "$1,$2 TL")
    // Same issue without thousand dots: "4 499 10 TL".
    .replace(/\b(\d{1,3})\s+(\d{3})\s+(\d{1,2})\s*(TL|₺)\b/gi, "$1.$2,$3 TL")
    // Split thousand group: "4 999 TL".
    .replace(/\b(\d{1,3})\s+(\d{3})\s*(TL|₺)\b/gi, "$1.$2 TL");
}

function extractTryPriceCandidates(rawPrice) {
  const text = normalizeSplitTryPriceText(rawPrice);
  if (!text) return [];

  const regex = /₺\s*\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?|\d{1,3}(?:[.]\d{3})+(?:,\d{1,2})?\s*(?:TL|₺)?|\d+(?:,\d{1,2})\s*(?:TL|₺)?|\d+\s*(?:TL|₺)/gi;

  const candidates = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const raw = cleanText(match[0]);
    const before = text.slice(Math.max(0, match.index - 3), match.index);
    const after = text.slice(match.index + raw.length, match.index + raw.length + 8);

    if (/%\s*$/.test(before) || /^\s*%/.test(after)) continue;

    const value = parseTryPriceNumber(raw);
    if (value === null || value <= 0) continue;

    const formatted = /TL|₺/i.test(raw) ? raw.replace(/₺\s*/, "") : `${raw} TL`;

    candidates.push({
      text: cleanText(formatted),
      value,
      index: match.index,
    });
  }

  return candidates;
}

function getBestTrendyolPriceFromText(text) {
  const normalized = normalizeSplitTryPriceText(text);
  const candidates = extractTryPriceCandidates(normalized);

  if (candidates.length === 0) return null;

  const sepetteIndex = normalized.toLocaleLowerCase("tr-TR").indexOf("sepette");

  if (sepetteIndex !== -1) {
    const afterSepette = candidates.find((candidate) => candidate.index > sepetteIndex);
    if (afterSepette) return afterSepette;
  }

  return candidates[0];
}

function cleanPrice(rawPrice) {
  if (!rawPrice) return null;

  const candidates = extractTryPriceCandidates(rawPrice);
  if (candidates.length === 0) return null;

  return candidates[0].text;
}


function getSiteName() {
  const host = window.location.hostname.replace("www.", "");

  if (host.includes("zara")) return "Zara";
  if (host.includes("bershka")) return "Bershka";
  if (host.includes("hm.com")) return "H&M";
  if (host.includes("jeanslab")) return "JeansLab";
  if (host.includes("trendyol")) return "Trendyol";
  if (host.includes("hepsiburada")) return "Hepsiburada";
  if (host.includes("n11")) return "n11";
  if (host.includes("amazon")) return "Amazon TR";
  if (host.includes("teknosa")) return "Teknosa";
  if (host.includes("vatanbilgisayar")) return "Vatan Bilgisayar";
  if (host.includes("mediamarkt")) return "MediaMarkt";
  if (host.includes("pazarama")) return "Pazarama";
  if (host.includes("ciceksepeti")) return "Çiçeksepeti";
  if (host.includes("idefix")) return "idefix";
  if (host.includes("itopya")) return "İtopya";
  if (host.includes("incehesap")) return "İncehesap";
  if (host.includes("dr.com.tr")) return "D&R";
  if (host.includes("sephora")) return "Sephora";

  return host;
}

function isVisibleElement(element) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function looksLikeTryPrice(text) {
  if (!text) return false;

  const clean = cleanText(text);

  return /(TL|₺)/i.test(clean) && /\d/.test(clean) && clean.length <= 70;
}

function hasChildWithPriceText(element) {
  return Array.from(element.children || []).some((child) =>
    looksLikeTryPrice(child.textContent),
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

function normalizeInstallmentText(text) {
  return cleanText(text)
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function getNearbyText(element, depth = 3) {
  const parts = [];
  let current = element;

  for (let i = 0; i < depth && current; i++) {
    const text = cleanText(current.textContent);
    if (text && text.length <= 500) {
      parts.push(text);
    }

    current = current.parentElement;
  }

  return cleanText(parts.join(" "));
}
function findHepsiburadaInstallmentInfo() {
  // Hepsiburada'da kredi kartı taksiti görünür metinden okunamaz: "Kredi Kart
  // Taksitleri" sekmesi tamamen client-side ve oturuma bağlı render edilir,
  // anonim oturumda hiç basılmaz. Buna karşılık sunucudan gelen JSON'daki
  // paymentTag alanı her üründe bulunur ve taksit varsa "kredi-karti-<N>-taksit"
  // etiketini taşır. Etiket kredi kartına özel olduğu için Hepsipay / alışveriş
  // kredisi gibi kartsız seçenekler doğal olarak kapsam dışında kalır.
  const scriptText = Array.from(document.querySelectorAll("script"))
    .map((script) => script.textContent || "")
    .join(" ");

  // Alan hiç yoksa şema değişmiş olabilir; kararı genel tespite bırak.
  if (!/"paymentTag"\s*:/.test(scriptText)) return null;

  if (/kredi-karti-\d+-taksit/.test(scriptText)) {
    return {
      installmentAvailable: true,
      installmentText: "Taksit var",
    };
  }

  return {
    installmentAvailable: false,
    installmentText: "Taksit yok",
  };
}

function findN11InstallmentInfo() {
  const rawBodyText =
    document.body?.textContent || document.documentElement?.textContent || "";

  const normalized = normalizeInstallmentText(rawBodyText);

  const paymentTabTexts = Array.from(
    document.querySelectorAll("div, section, li, span, p, button, a"),
  )
    .map((el) => cleanText(el.textContent))
    .filter(Boolean)
    .filter((text) => {
      const normalizedText = normalizeInstallmentText(text);
      return /odeme kolayliklari|taksit secenekleri|aya varan taksit|baslayan taksit|alisveris kredisi/i.test(
        normalizedText,
      );
    });

  const joinedText = normalizeInstallmentText(
    [rawBodyText, ...paymentTabTexts].join(" \n "),
  );

  if (
    /bu urune taksit uygulanmiyor|taksit uygulanmiyor|taksit yok|taksit yapilamaz|taksit uygulanmaz|taksit secenegi bulunmamaktadir/i.test(
      joinedText,
    )
  ) {
    return {
      installmentAvailable: false,
      installmentText: "Taksit yok",
    };
  }

  if (
    /\d+\s*aya?\s*varan\s*taksit/i.test(joinedText) ||
    /\d+\s*taksit/i.test(joinedText) ||
    /taksit miktari|taksitli toplam tutar/i.test(joinedText) ||
    /baslayan taksit/i.test(joinedText) ||
    /taksit firsati/i.test(joinedText)
  ) {
    return {
      installmentAvailable: true,
      installmentText: "Taksit var",
    };
  }

  if (
    /alisveris kredisi/i.test(joinedText) &&
    !/\d+\s*taksit|aya varan taksit|baslayan taksit|taksit miktari|taksitli toplam tutar/i.test(
      joinedText,
    )
  ) {
    return {
      installmentAvailable: false,
      installmentText: "Taksit bilgisi bulunamadı",
    };
  }

  return {
    installmentAvailable: false,
    installmentText: "Taksit bilgisi bulunamadı",
  };
}
function findTrendyolInstallmentInfo() {
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector(".pr-new-br") ||
    document.querySelector("[class*='product-title']");

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const elements = Array.from(
    document.querySelectorAll("button, a, span, div, p, li"),
  );

  const positivePatterns = [
    /\d+\s*aya?\s*varan\s*taksit/i,
    /\d+\s*taksit\s*firsati/i,
    /taksit\s*firsati/i,
    /pesin\s*fiyatina\s*\d+\s*taksit/i,
    /pesin\s*fiyatina\s*\d+\s*x/i,
    /peşin\s*fiyatına\s*\d+\s*taksit/i,
    /aylik\s*[\d.,]+\s*tl'?den\s*basla/i,
    /aylik\s*[\d.,]+\s*tl'?den\s*baslayan/i,
    /\d+\s*x\s*[\d.,]+\s*tl/i,
    /kartlara\s*\d+\s*taksit/i,
    /kredi\s*kartina\s*taksit/i,
  ];

  const negativePatterns = [
    /taksit\s*yok/i,
    /taksit\s*yapilamaz/i,
    /taksit\s*uygulanmaz/i,
    /taksit\s*secenegi\s*bulunmamaktadir/i,
  ];

  function hasPositiveInstallmentText(text) {
    const normalized = normalizeInstallmentText(text);
    return positivePatterns.some((pattern) => pattern.test(normalized));
  }

  function hasNegativeInstallmentText(text) {
    const normalized = normalizeInstallmentText(text);
    return negativePatterns.some((pattern) => pattern.test(normalized));
  }

  const candidates = elements
    .filter((element) => {
      if (!isVisibleElement(element)) return false;

      const text = cleanText(element.textContent);
      if (!text || text.length > 320) return false;

      const normalized = normalizeInstallmentText(text);
      if (!/taksit|aylik|pesin fiyatina|peşin fiyatına|kredi karti|kartlara|\d+\s*x\s*[\d.,]+\s*tl/i.test(normalized)) {
        return false;
      }

      const rect = element.getBoundingClientRect();

      if (titleRect) {
        if (rect.top < titleRect.bottom - 140) return false;
        if (rect.top > titleRect.bottom + 1250) return false;
      }

      return true;
    })
    .map((element) => ({
      text: cleanText(element.textContent),
      contextText: getNearbyText(element, 3),
    }));

  const negativeMatch = candidates.find((candidate) =>
    hasNegativeInstallmentText(candidate.contextText),
  );

  if (negativeMatch) {
    return {
      installmentAvailable: false,
      installmentText: "Taksit yok",
    };
  }

  const positiveMatch = candidates.find((candidate) =>
    hasPositiveInstallmentText(`${candidate.text} ${candidate.contextText}`),
  );

  if (positiveMatch) {
    return {
      installmentAvailable: true,
      installmentText: "Taksit var",
    };
  }

  // Trendyol sometimes renders the payment option differently in background tabs.
  // As a fallback, scan a limited product/payment area instead of relying only on visible nodes.
  const scopedText = cleanText(
    [
      document.querySelector("[class*='payment']")?.textContent,
      document.querySelector("[class*='Payment']")?.textContent,
      document.querySelector("[class*='product-detail']")?.textContent,
      document.querySelector("main")?.textContent,
      document.body?.textContent,
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 16000),
  );

  if (hasNegativeInstallmentText(scopedText)) {
    return {
      installmentAvailable: false,
      installmentText: "Taksit yok",
    };
  }

  if (hasPositiveInstallmentText(scopedText)) {
    return {
      installmentAvailable: true,
      installmentText: "Taksit var",
    };
  }

  return null;
}

function findJeansLabInstallmentInfo() {
  const rawText = cleanText(
    [
      document.body?.innerText,
      document.body?.textContent,
      document.querySelector("[class*='Accordion']")?.textContent,
      document.querySelector("[class*='accordion']")?.textContent,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const normalized = normalizeInstallmentText(rawText);

  const hasInstallmentSection =
    /taksit secenekleri/i.test(normalized) ||
    /taksit sayisi/i.test(normalized) ||
    /taksit miktari/i.test(normalized) ||
    /taksitli toplam tutar/i.test(normalized);

  const hasInstallmentRows =
    /taksit sayisi.*taksit miktari.*taksitli toplam tutar/i.test(normalized) &&
    /\d+\s*[\d.]+,\d{2}\s*tl/i.test(normalized);

  if (hasInstallmentSection || hasInstallmentRows) {
    return {
      installmentAvailable: true,
      installmentText: "Taksit var",
    };
  }

  return {
    installmentAvailable: false,
    installmentText: "Taksit bilgisi bulunamadı",
  };
}

function findInstallmentInfo() {
  const host = window.location.hostname;

  if (host.includes("jeanslab")) {
    return findJeansLabInstallmentInfo();
  }

  if (host.includes("trendyol")) {
    const trendyolInstallmentInfo = findTrendyolInstallmentInfo();
    if (trendyolInstallmentInfo) return trendyolInstallmentInfo;
  }

  if (host.includes("n11")) {
    return findN11InstallmentInfo();
  }

  if (host.includes("hepsiburada")) {
    const hepsiburadaInstallmentInfo = findHepsiburadaInstallmentInfo();
    if (hepsiburadaInstallmentInfo) return hepsiburadaInstallmentInfo;
  }

  const titleElement =
    document.querySelector("[data-test-id='title']") ||
    document.querySelector("#productTitle") ||
    document.querySelector("h1");

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const elements = Array.from(
    document.querySelectorAll("button, a, span, div, p, li"),
  );

  function isCardlessInstallmentText(text) {
    const normalized = normalizeInstallmentText(text);

    return /kartsiz taksit|kartsiz taksitle|kartsiz|alisveris kredisi|krediyle al|finansman|alisveris finansmani|hepsifinans|hepsi finans|kredili odeme|hepsipay/i.test(
      normalized,
    );
  }

  function isNegativeInstallmentText(text) {
    const normalized = normalizeInstallmentText(text);

    return /bu urune taksit uygulanmiyor|taksit uygulanmiyor|taksit yok|taksit yapilamaz|taksit uygulanmaz|taksit secenegi bulunmamaktadir|taksit bulunmamaktadir|kredi kartina taksit yok|kredi karti taksiti yok/i.test(
      normalized,
    );
  }

  function hasBankOrCardKeyword(text) {
    const normalized = normalizeInstallmentText(text);

    return /bonus|world|worldcard|axess|maximum|paraf|cardfinans|advantage|bankkart|kuveytturk|kuveyt turk|ziraat|is bankasi|iş bankasi|garanti|yapi kredi|yapikredi|akbank|vakifbank|halkbank|denizbank|qnb|enpara|teb|ing/i.test(
      normalized,
    );
  }

  function isExplicitRegularInstallmentText(text) {
    const normalized = normalizeInstallmentText(text);

    if (isCardlessInstallmentText(normalized)) {
      return false;
    }

    return (
      /pesin fiyatina\s*\d+\s*taksit/i.test(normalized) ||
      /pesin fiyatina\s*\d+\s*x/i.test(normalized) ||
      /\d+\s*aya?\s*varan\s*taksit/i.test(normalized) ||
      /taksit\s*firsati/i.test(normalized) ||
      /aylik\s*[\d.,]+\s*tl'?den\s*basla/i.test(normalized) ||
      /\d+\s*taksit/i.test(normalized) ||
      /tl'?den baslayan taksitlerle/i.test(normalized) ||
      /den baslayan taksitlerle/i.test(normalized) ||
      /baslayan taksitlerle/i.test(normalized) ||
      /taksitlerle/i.test(normalized) ||
      (/\d+\s*x\s*[\d.,]+\s*tl/i.test(normalized) &&
        hasBankOrCardKeyword(normalized)) ||
      /kredi kartina taksit|kredi karti taksiti|kredi karti ile taksit|kartlara taksit|kartina taksit|banka kartlarina taksit|bankalara ozel taksit/i.test(
        normalized,
      ) ||
      /bonus.*taksit|world.*taksit|worldcard.*taksit|axess.*taksit|maximum.*taksit|paraf.*taksit|cardfinans.*taksit|advantage.*taksit|bankkart.*taksit/i.test(
        normalized,
      )
    );
  }

  function isWeakInstallmentText(text, contextText) {
    const normalized = normalizeInstallmentText(text);
    const normalizedContext = normalizeInstallmentText(contextText);

    if (isCardlessInstallmentText(normalizedContext)) {
      return false;
    }

    return /taksit secenekleri|taksitli odeme|taksitle ode|taksitle al/i.test(
      normalized,
    );
  }

  const candidates = elements
    .filter((element) => {
      if (!isVisibleElement(element)) return false;

      const text = cleanText(element.textContent);

      if (!text) return false;
      if (text.length > 320) return false;

      const normalized = normalizeInstallmentText(text);

      const hasInstallmentKeyword =
        /taksit|vade|pesin fiyatina|kredi karti|kartlara|kartina|bonus|world|worldcard|axess|maximum|paraf|cardfinans|advantage|bankkart|kuveytturk|finansman|alisveris kredisi|kartsiz|hepsifinans|hepsipay|\d+\s*x\s*[\d.,]+\s*tl/i.test(
          normalized,
        );

      if (!hasInstallmentKeyword) return false;

      const rect = element.getBoundingClientRect();

      if (titleRect && rect.top < titleRect.bottom - 70) return false;
      if (titleRect && rect.top > titleRect.bottom + 950) return false;

      return true;
    })
    .map((element) => ({
      text: cleanText(element.textContent),
      contextText: getNearbyText(element, 3),
    }));

  const negativeMatch = candidates.find((candidate) =>
    isNegativeInstallmentText(candidate.contextText),
  );

  if (negativeMatch) {
    return {
      installmentAvailable: false,
      installmentText: "Taksit yok",
    };
  }

  const explicitRegularMatch = candidates.find((candidate) =>
    isExplicitRegularInstallmentText(candidate.text),
  );

  if (explicitRegularMatch) {
    return {
      installmentAvailable: true,
      installmentText: "Taksit var",
    };
  }

  const weakRegularMatch = candidates.find((candidate) =>
    isWeakInstallmentText(candidate.text, candidate.contextText),
  );

  if (weakRegularMatch) {
    return {
      installmentAvailable: true,
      installmentText: "Taksit var",
    };
  }

  return {
    installmentAvailable: false,
    installmentText: "Taksit bilgisi bulunamadı",
  };
}

function getDefaultShippingInfoForSite() {
  const host = window.location.hostname;

  if (host.includes("amazon")) {
    return {
      shippingAvailable: false,
      freeShipping: false,
      shippingText: "Teslimat sepette/adrese göre hesaplanır",
      shippingSource: "cart",
      shippingConfidence: "site-default",
    };
  }

  if (
    host.includes("trendyol") ||
    host.includes("hepsiburada") ||
    host.includes("n11") ||
    host.includes("zara") ||
    host.includes("bershka") ||
    host.includes("hm.com") ||
    host.includes("jeanslab")
  ) {
    return {
      shippingAvailable: false,
      freeShipping: false,
      shippingText: "Sepette hesaplanır",
      shippingSource: "cart",
      shippingConfidence: "site-default",
    };
  }

  return {
    shippingAvailable: false,
    freeShipping: false,
    shippingText: "Sepette hesaplanır",
    shippingSource: "cart",
    shippingConfidence: "unknown",
  };
}

function findShippingInfo() {
  const host = window.location.hostname;

  function normalizeForSearch(text) {
    return cleanText(text)
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
  }

  function analyzeShippingText(text) {
    const normalized = normalizeForSearch(text);

    const freeShippingRegex =
      /ucretsiz kargo|kargo bedava|bedava kargo|ucretsiz teslimat|teslimat ucretsiz|ucretsiz gonderim|kargo ucretsiz|kargosu bedava/i;

    const paidShippingRegex =
      /kargo ucreti|kargo bedeli|teslimat ucreti|teslimat bedeli|ucretli kargo|nakliye ucreti/i;

    const genericShippingRegex =
      /kargo|teslimat|gonderim|kapinda|kargoya verilir|kargoda|bugun kargoda|yarin kapinda|hizli teslimat|teslim tarihi/i;

    if (freeShippingRegex.test(normalized)) {
      return {
        shippingAvailable: true,
        freeShipping: true,
        shippingText: host.includes("amazon")
          ? "Ücretsiz teslimat"
          : "Ücretsiz kargo",
        shippingSource: "product-page",
        shippingConfidence: "explicit",
      };
    }

    if (paidShippingRegex.test(normalized)) {
      return {
        shippingAvailable: true,
        freeShipping: false,
        shippingText: "Kargo ücretli olabilir",
        shippingSource: "product-page",
        shippingConfidence: "explicit",
      };
    }

    if (genericShippingRegex.test(normalized)) {
      return {
        shippingAvailable: true,
        freeShipping: false,
        shippingText: host.includes("amazon")
          ? "Teslimat bilgisi var"
          : "Kargo/teslimat bilgisi var",
        shippingSource: "product-page",
        shippingConfidence: "generic",
      };
    }

    return null;
  }

  function shouldUseResult(result) {
    if (!result) return false;

    if (
      result.shippingConfidence === "generic" &&
      (host.includes("zara") ||
        host.includes("bershka") ||
        host.includes("hm.com") ||
        host.includes("jeanslab"))
    ) {
      return false;
    }

    if (result.freeShipping) return true;
    if (result.shippingText === "Kargo ücretli olabilir") return true;

    if (
      host.includes("trendyol") ||
      host.includes("hepsiburada") ||
      host.includes("n11")
    ) {
      return false;
    }

    return true;
  }

  function collectTextFromElement(element) {
    const texts = [];

    const textContent = cleanText(element.textContent);
    if (textContent) texts.push(textContent);

    const attrs = [
      "aria-label",
      "title",
      "data-csa-c-delivery-price",
      "data-csa-c-delivery-time",
      "data-csa-c-delivery-type",
      "data-csa-c-delivery-condition",
    ];

    for (const attr of attrs) {
      const value = element.getAttribute(attr);
      if (value) texts.push(cleanText(value));
    }

    return texts;
  }

  const prioritySelectors = [
    "#mir-layout-DELIVERY_BLOCK",
    "#deliveryBlockMessage",
    "#fast-track-message",
    "#deliveryMessageMirId",
    "#contextualIngressPtLabel_deliveryShortLine",
    "#contextualIngressPtLabel_deliveryShortLine .a-text-bold",
    "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE",
    "#mir-layout-DELIVERY_BLOCK-slot-SECONDARY_DELIVERY_MESSAGE_LARGE",
    "[id*='DELIVERY_BLOCK']",
    "[id*='deliveryBlock']",
    "[id*='Delivery']",
    "[id*='delivery']",
    "[data-csa-c-delivery-price]",
    "[data-csa-c-delivery-time]",

    "[data-test-id*='cargo']",
    "[data-test-id*='kargo']",
    "[data-test-id*='shipping']",
    "[data-test-id*='delivery']",
    "[class*='cargo']",
    "[class*='kargo']",
    "[class*='shipping']",
    "[class*='delivery']",
    "[class*='Delivery']",
    "[class*='Shipment']",
    "[class*='free']",
    "[class*='Free']",
  ];

  const priorityCandidates = [];

  for (const selector of prioritySelectors) {
    const elements = Array.from(document.querySelectorAll(selector));

    for (const element of elements) {
      if (!isVisibleElement(element)) continue;

      const texts = collectTextFromElement(element);

      for (const text of texts) {
        if (!text) continue;
        if (text.length > 1200) continue;

        const result = analyzeShippingText(text);

        if (result) {
          priorityCandidates.push({
            text,
            result,
            score: result.freeShipping ? 1000 : 500,
          });
        }
      }
    }
  }

  const freePriorityMatch = priorityCandidates.find(
    (candidate) => candidate.result.freeShipping,
  );

  if (freePriorityMatch) {
    return freePriorityMatch.result;
  }

  const usablePriorityMatch = priorityCandidates
    .sort((a, b) => b.score - a.score)
    .find((candidate) => shouldUseResult(candidate.result));

  if (usablePriorityMatch) {
    return usablePriorityMatch.result;
  }

  const titleElement =
    document.querySelector("[data-test-id='title']") ||
    document.querySelector("#productTitle") ||
    document.querySelector("h1");

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const elements = Array.from(
    document.querySelectorAll("button, a, span, div, p, li, strong"),
  );

  const candidates = elements
    .filter((element) => {
      if (!isVisibleElement(element)) return false;

      const text = cleanText(element.textContent);

      if (!text) return false;
      if (text.length > 800) return false;

      const result = analyzeShippingText(text);
      if (!result) return false;

      const rect = element.getBoundingClientRect();

      if (titleRect) {
        if (rect.top < titleRect.bottom - 160) return false;
        if (rect.top > titleRect.bottom + 1200) return false;
      }

      return true;
    })
    .map((element) => {
      const text = cleanText(element.textContent);
      const rect = element.getBoundingClientRect();
      const result = analyzeShippingText(text);

      let score = 0;

      if (result?.freeShipping) score += 800;
      if (result?.shippingAvailable) score += 200;

      score += Math.max(0, 260 - text.length);

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 300 - distanceFromTitle);
      }

      if (host.includes("amazon") && rect.left > window.innerWidth * 0.55) {
        score += 200;
      }

      if (
        !host.includes("amazon") &&
        rect.left > window.innerWidth * 0.25 &&
        rect.left < window.innerWidth * 0.9
      ) {
        score += 80;
      }

      return {
        text,
        result,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const freeCandidate = candidates.find(
    (candidate) => candidate.result.freeShipping,
  );

  if (freeCandidate) {
    return freeCandidate.result;
  }

  const usableCandidate = candidates.find((candidate) =>
    shouldUseResult(candidate.result),
  );

  if (usableCandidate) {
    return usableCandidate.result;
  }

  if (host.includes("amazon")) {
    const bodyText = cleanText(document.body.innerText || "");
    const bodyResult = analyzeShippingText(bodyText);

    if (bodyResult && bodyResult.freeShipping) {
      return bodyResult;
    }
  }

  return getDefaultShippingInfoForSite();
}

function findProductInJsonLd(data) {
  if (!data) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findProductInJsonLd(item);
      if (found) return found;
    }
  }

  if (typeof data === "object") {
    const type = data["@type"];

    const isProduct =
      type === "Product" || (Array.isArray(type) && type.includes("Product"));

    if (isProduct) {
      return data;
    }

    if (data["@graph"]) {
      const foundInGraph = findProductInJsonLd(data["@graph"]);
      if (foundInGraph) return foundInGraph;
    }

    for (const key of Object.keys(data)) {
      if (typeof data[key] === "object") {
        const found = findProductInJsonLd(data[key]);
        if (found) return found;
      }
    }
  }

  return null;
}

function parseJsonLdProduct() {
  const scripts = document.querySelectorAll(
    "script[type='application/ld+json']",
  );

  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent);
      const product = findProductInJsonLd(json);

      if (!product) continue;

      const offers = Array.isArray(product.offers)
        ? product.offers[0]
        : product.offers;

      let image = "";

      if (Array.isArray(product.image)) {
        image = product.image[0];
      } else if (typeof product.image === "string") {
        image = product.image;
      } else if (product.image && product.image.url) {
        image = product.image.url;
      }

      return {
        site: getSiteName(),
        title: cleanText(product.name),
        price: cleanPrice(
          offers?.price || offers?.lowPrice || offers?.highPrice,
        ),
        image,
        url: window.location.href,
      };
    } catch {
      continue;
    }
  }

  return null;
}

function parseMetaProduct() {
  const title =
    getAttr("meta[property='og:title']", "content") ||
    getAttr("meta[name='twitter:title']", "content") ||
    document.title;

  const image =
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content");

  const price =
    getAttr("meta[property='product:price:amount']", "content") ||
    getAttr("meta[property='og:price:amount']", "content") ||
    getAttr("meta[name='price']", "content");

  if (!title && !price && !image) return null;

  return {
    site: getSiteName(),
    title: cleanText(title),
    price: cleanPrice(price),
    image,
    url: window.location.href,
  };
}
function findTrendyolMainPrice() {
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector(".pr-new-br") ||
    document.querySelector("[class*='product-title']");

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const preferredSelectors = [
    ".prc-dsc",
    ".prc-slg",
    "[class*='prc-dsc']",
    "[class*='prc-slg']",
    "[class*='product-price']",
    "[class*='price-container']",
    "[class*='Price']",
    "[class*='price']",
  ];

  const selectorCandidates = [];

  for (const selector of preferredSelectors) {
    const selectedElements = Array.from(document.querySelectorAll(selector));

    for (const element of selectedElements) {
      if (!isVisibleElement(element)) continue;

      const text = cleanText(element.textContent);
      const bestPrice = getBestTrendyolPriceFromText(text);
      if (!bestPrice) continue;

      const rect = element.getBoundingClientRect();

      if (titleRect) {
        if (rect.top < titleRect.bottom - 140) continue;
        if (rect.top > titleRect.bottom + 560) continue;
      }

      if (rect.left < window.innerWidth * 0.22) continue;
      if (rect.left > window.innerWidth * 0.88) continue;

      const style = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;

      let score = 500;
      score += fontSize * 16;
      score += fontWeight / 50;

      if (/sepette|indirimli|fiyat/i.test(text)) score += 90;
      if (/taksit|kargo|teslimat|kupon|kampanya|puan|favori|değerlendirme|degerlendirme|satıcı|satici|ay|başlayan|baslayan/i.test(text)) {
        score -= 260;
      }

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 300 - distanceFromTitle);
      }

      selectorCandidates.push({
        text: bestPrice.text,
        score,
      });
    }
  }

  if (selectorCandidates.length > 0) {
    selectorCandidates.sort((a, b) => b.score - a.score);
    return selectorCandidates[0].text;
  }

  const elements = Array.from(
    document.querySelectorAll("span, div, p, strong"),
  );

  const candidates = elements
    .map((element) => {
      if (!isVisibleElement(element)) return null;

      const text = cleanText(element.textContent);
      const bestPrice = getBestTrendyolPriceFromText(text);

      if (!bestPrice) return null;
      if (hasChildWithPriceText(element)) return null;
      if (text.length > 140) return null;

      const rect = element.getBoundingClientRect();

      if (titleRect) {
        if (rect.top < titleRect.bottom - 100) return null;
        if (rect.top > titleRect.bottom + 520) return null;
      }

      if (rect.left < window.innerWidth * 0.25) return null;
      if (rect.left > window.innerWidth * 0.85) return null;

      const style = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;

      let score = 0;

      score += fontSize * 14;
      score += fontWeight / 60;

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 280 - distanceFromTitle);
      }

      if (/sepette|indirimli|fiyat/i.test(text)) score += 60;

      if (
        /taksit|kargo|teslimat|kupon|kampanya|puan|favori|değerlendirme|degerlendirme|satıcı|satici|ay|başlayan|baslayan/i.test(
          text,
        )
      ) {
        score -= 350;
      }

      return {
        text: bestPrice.text,
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
}

function findTrendyolMainImage() {
  const title =
    cleanText(getText(".pr-new-br")) ||
    cleanText(getText("h1")) ||
    cleanText(getAttr("meta[property='og:title']", "content"));

  const normalizedTitle = normalizeForBasicSearch(title);
  const images = Array.from(document.querySelectorAll("img"));

  const scoredImages = images
    .filter((img) => {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";

      if (!src) return false;
      if (/logo|icon|sprite|placeholder|loading|badge/i.test(src)) return false;
      if (/logo|icon|sprite|placeholder|loading|badge/i.test(alt)) return false;

      const rect = img.getBoundingClientRect();

      if (rect.width < 100 || rect.height < 100) return false;

      return true;
    })
    .map((img) => {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      const alt = cleanText(img.getAttribute("alt") || "");
      const normalizedAlt = normalizeForBasicSearch(alt);
      const rect = img.getBoundingClientRect();

      let score = 0;

      score += rect.width + rect.height;

      if (rect.left < window.innerWidth * 0.55) score += 200;
      if (rect.top < window.innerHeight * 0.9) score += 120;

      if (/cdn\.dsmcdn\.com|ty\d+|product|urun|ürün|images|media/i.test(src)) {
        score += 160;
      }

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
