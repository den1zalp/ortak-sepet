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

    // Siteler tutarı "₺1.299", "1.299₺", "1.299 TL" gibi farklı biçimlerde
    // basıyor. Hepsini tek biçime indiriyoruz; sembol sonda olduğunda eskiden
    // para birimi tamamen düşüyordu.
    const numberText = cleanText(raw.replace(/₺/g, "").replace(/TL/gi, ""));
    const formatted = `${numberText} TL`;

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

// JSON-LD ve meta etiketleri fiyatı makine biçiminde verir ("1299.90") ve para
// birimini ayrı bir alanda söyler. Bu biçim görünür fiyat düzenimize uymadığı
// için cleanPrice onu okuyamıyordu; burada sayıyı doğrudan çevirip para
// birimini tahmin etmek yerine bildirilen değeri kullanıyoruz.
function parseStructuredPriceNumber(rawPrice) {
  if (rawPrice === null || rawPrice === undefined) return null;

  const text = String(rawPrice).trim();
  if (!text) return null;

  if (/^\d+(?:\.\d{1,2})?$/.test(text)) {
    const number = Number.parseFloat(text);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  return null;
}

function formatStructuredPrice(rawPrice, currency) {
  const number = parseStructuredPriceNumber(rawPrice);
  if (number === null) return null;

  const code = String(currency || "").toUpperCase();
  const format = (locale) =>
    number.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  switch (code) {
    case "TRY": return `${format("tr-TR")} TL`;
    case "GBP": return `£${format("en-GB")}`;
    case "USD": return `$${format("en-US")}`;
    case "EUR": return `€${format("de-DE")}`;
    case "": return `${format("tr-TR")} TL`;
    default: return `${format("en-US")} ${code}`;
  }
}


// Alan adı eşleşmesi parça aramasıyla yapılmamalı: "pazarama.com" içinde
// "zara" da geçiyor ve site adından fiyat/kargo kurallarına kadar her şey bu
// tespite bağlı.
function isSiteHost(domain) {
  const host = window.location.hostname.replace(/^www\d*\./, "");
  return host === domain || host.endsWith(`.${domain}`);
}

function getSiteName() {
  if (isSiteHost("zara.com")) return "Zara";
  if (isSiteHost("bershka.com")) return "Bershka";
  if (isSiteHost("hm.com")) return "H&M";
  if (isSiteHost("jeanslab.com")) return "JeansLab";
  if (isSiteHost("trendyol.com")) return "Trendyol";
  if (isSiteHost("hepsiburada.com")) return "Hepsiburada";
  if (isSiteHost("n11.com")) return "n11";
  if (isSiteHost("amazon.com.tr")) return "Amazon TR";
  if (isSiteHost("teknosa.com")) return "Teknosa";
  if (isSiteHost("vatanbilgisayar.com")) return "Vatan Bilgisayar";
  if (isSiteHost("mediamarkt.com.tr")) return "MediaMarkt";
  if (isSiteHost("pazarama.com")) return "Pazarama";
  if (isSiteHost("ciceksepeti.com")) return "Çiçeksepeti";
  if (isSiteHost("idefix.com")) return "idefix";
  if (isSiteHost("itopya.com")) return "İtopya";
  if (isSiteHost("incehesap.com")) return "İncehesap";
  if (isSiteHost("dr.com.tr")) return "D&R";
  if (isSiteHost("sephora.com.tr")) return "Sephora";
  if (isSiteHost("ikea.com.tr")) return "IKEA";
  if (isSiteHost("samsonite.com.tr")) return "Samsonite";

  return window.location.hostname.replace(/^www\d*\./, "");
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
      // Metin filtresi önce çalışır: getBoundingClientRect ve
      // getComputedStyle layout'u zorluyor, binlerce elemanda pahalı.
      const text = cleanText(element.textContent);
      if (!text || text.length > 320) return false;

      const normalized = normalizeInstallmentText(text);
      if (!/taksit|aylik|pesin fiyatina|peşin fiyatına|kredi karti|kartlara|\d+\s*x\s*[\d.,]+\s*tl/i.test(normalized)) {
        return false;
      }

      if (!isVisibleElement(element)) return false;

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

// samsonite.com.tr'de taksit tablosu "Ödeme Seçenekleri" akordiyonunun içinde
// ve akordiyon kapalı açılıyor: tablo DOM'da tam olarak duruyor ama kapsayıcının
// yüksekliği 0 olduğu için genel taramanın görünürlük kontrolüne takılıyor.
// Bu yüzden kutuyu doğrudan okuyoruz.
function findSamsoniteTrInstallmentInfo() {
  const container = document.querySelector("#divTaksitContainer, .taksitMain");

  if (!container) return null;

  const normalized = normalizeInstallmentText(container.textContent);

  if (!normalized) return null;

  // "Tek Çekim" satırı her üründe var; taksit gerçekten yapılabiliyorsa
  // tabloda "2 Taksit", "3 Taksit" gibi satırlar da bulunur.
  if (/\d+\s*taksit/i.test(normalized)) {
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

function findInstallmentInfo() {

  if (isSiteHost("samsonite.com.tr")) {
    const samsoniteInstallmentInfo = findSamsoniteTrInstallmentInfo();
    if (samsoniteInstallmentInfo) return samsoniteInstallmentInfo;
  }

  if (isSiteHost("jeanslab.com")) {
    return findJeansLabInstallmentInfo();
  }

  if (isSiteHost("trendyol.com")) {
    const trendyolInstallmentInfo = findTrendyolInstallmentInfo();
    if (trendyolInstallmentInfo) return trendyolInstallmentInfo;
  }

  if (isSiteHost("n11.com")) {
    return findN11InstallmentInfo();
  }

  if (isSiteHost("hepsiburada.com")) {
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
      // Önce ucuz metin filtresi, sonra layout okuyan görünürlük kontrolü.
      const text = cleanText(element.textContent);

      if (!text) return false;
      if (text.length > 320) return false;

      const normalized = normalizeInstallmentText(text);

      const hasInstallmentKeyword =
        /taksit|vade|pesin fiyatina|kredi karti|kartlara|kartina|bonus|world|worldcard|axess|maximum|paraf|cardfinans|advantage|bankkart|kuveytturk|finansman|alisveris kredisi|kartsiz|hepsifinans|hepsipay|\d+\s*x\s*[\d.,]+\s*tl/i.test(
          normalized,
        );

      if (!hasInstallmentKeyword) return false;

      if (!isVisibleElement(element)) return false;

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

  if (isSiteHost("amazon.com.tr")) {
    return {
      shippingAvailable: false,
      freeShipping: false,
      shippingText: "Teslimat sepette/adrese göre hesaplanır",
      shippingSource: "cart",
      shippingConfidence: "site-default",
    };
  }

  if (
    isSiteHost("trendyol.com") ||
    isSiteHost("hepsiburada.com") ||
    isSiteHost("n11.com") ||
    isSiteHost("zara.com") ||
    isSiteHost("bershka.com") ||
    isSiteHost("hm.com") ||
    isSiteHost("jeanslab.com")
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
        shippingText: isSiteHost("amazon.com.tr")
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
        shippingText: isSiteHost("amazon.com.tr")
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
      (isSiteHost("zara.com") ||
        isSiteHost("bershka.com") ||
        isSiteHost("hm.com") ||
        isSiteHost("jeanslab.com"))
    ) {
      return false;
    }

    if (result.freeShipping) return true;
    if (result.shippingText === "Kargo ücretli olabilir") return true;

    if (
      isSiteHost("trendyol.com") ||
      isSiteHost("hepsiburada.com") ||
      isSiteHost("n11.com")
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
      // Önce ucuz metin filtresi, sonra layout okuyan görünürlük kontrolü.
      const text = cleanText(element.textContent);

      if (!text) return false;
      if (text.length > 800) return false;

      const result = analyzeShippingText(text);
      if (!result) return false;

      if (!isVisibleElement(element)) return false;

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

      if (isSiteHost("amazon.com.tr") && rect.left > window.innerWidth * 0.55) {
        score += 200;
      }

      if (
        !isSiteHost("amazon.com.tr") &&
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

  if (isSiteHost("amazon.com.tr")) {
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

      const rawPrice = offers?.price ?? offers?.lowPrice ?? offers?.highPrice;
      const currency = String(offers?.priceCurrency || "").toUpperCase();

      return {
        site: getSiteName(),
        title: cleanText(product.name),
        price: formatStructuredPrice(rawPrice, currency) || cleanPrice(rawPrice),
        currency: currency || null,
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

  const currency = String(
    getAttr("meta[property='product:price:currency']", "content") ||
      getAttr("meta[property='og:price:currency']", "content") ||
      "",
  ).toUpperCase();

  if (!title && !price && !image) return null;

  return {
    site: getSiteName(),
    title: cleanText(title),
    price: formatStructuredPrice(price, currency) || cleanPrice(price),
    currency: currency || null,
    image,
    url: window.location.href,
  };
}
// Kendi parser'ı olmayan TR siteleri için genel fiyat tespiti. Ürün başlığına
// yakın, büyük ve kalın yazılmış TL tutarını seçer; taksit, kargo ve kampanya
// metinlerini eler.
function findMainPrice() {
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector("[class*='product-name']") ||
    document.querySelector("[class*='ProductName']");

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const elements = Array.from(
    document.querySelectorAll("span, div, p, strong, ins, b"),
  );

  const candidates = elements
    .map((element) => {
      const text = cleanText(element.textContent);

      if (!looksLikeTryPrice(text)) return null;
      if (text.length > 90) return null;
      if (hasChildWithPriceText(element)) return null;
      if (!isVisibleElement(element)) return null;

      const priceCandidate = extractTryPriceCandidates(text)[0];
      if (!priceCandidate) return null;

      const rect = element.getBoundingClientRect();

      if (titleRect) {
        if (rect.top < titleRect.bottom - 160) return null;
        if (rect.top > titleRect.bottom + 700) return null;
      }

      const style = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;

      let score = 0;

      score += fontSize * 14;
      score += fontWeight / 60;

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 300 - distanceFromTitle);
      }

      if (/sepette|indirimli|fiyat/i.test(text)) score += 60;

      if (
        /taksit|kargo|teslimat|kupon|kampanya|puan|favori|degerlendirme|değerlendirme|satici|satıcı|uye|üye|kredi|aylik|aylık|baslayan|başlayan/i.test(
          text,
        )
      ) {
        score -= 350;
      }

      return {
        text: priceCandidate.text,
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
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
      const text = cleanText(element.textContent);
      const bestPrice = getBestTrendyolPriceFromText(text);
      if (!bestPrice) continue;

      if (!isVisibleElement(element)) continue;

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
      // Ucuz elemeler önce: layout okuyan kontroller en sona kalıyor.
      const text = cleanText(element.textContent);

      if (!text || text.length > 140) return null;
      if (!/\d/.test(text)) return null;

      const bestPrice = getBestTrendyolPriceFromText(text);

      if (!bestPrice) return null;
      if (hasChildWithPriceText(element)) return null;
      if (!isVisibleElement(element)) return null;

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
