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
  if (isSiteHost("decathlon.com.tr")) return "Decathlon";
  if (isSiteHost("zippo.com.tr")) return "Zippo";
  if (isSiteHost("birkenstock.com.tr")) return "Birkenstock";
  if (isSiteHost("crocs.com.tr")) return "Crocs";

  return window.location.hostname.replace(/^www\d*\./, "");
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

// Ürün görselini sayfadan seçer: yeterince büyük, görünür, logo/ikon olmayan ve
// alt metni ürün adına benzeyen görsel kazanır. Neredeyse her parser aynı
// taramaya ihtiyaç duyuyor; siteye göre değişen tek şey eşik boyutu ve CDN
// adresinin nasıl göründüğü, ikisi de parametre.
//
// Kendi kuralı olan siteler bunu kullanmaz: JeansLab'de asıl görsel dosya adının
// "-0" ile bitmesinden anlaşılıyor, IKEA ve Samsonite'de og:image zaten doğru.
function findProductImage(options = {}) {
  const {
    preferLeftSide = true,
    minWidth = 120,
    minHeight = 120,
    cdnRegex = /product|urun|ürün|images|image|media|catalog|cdn|resize/i,
    // Ürün adı görselin alt metniyle karşılaştırılıyor; h1 ürün adını vermeyen
    // sitelerde doğru başlığı gösteren seçici buradan verilir.
    titleSelectors = ["h1"],
  } = options;

  const title =
    titleSelectors.map((selector) => cleanText(getText(selector))).find(Boolean) ||
    cleanText(getAttr("meta[property='og:title']", "content"));

  const normalizedTitle = normalizeForBasicSearch(title);

  const scoredImages = Array.from(document.querySelectorAll("img"))
    .filter((img) => {
      if (!isVisibleElement(img)) return false;

      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";

      if (!src) return false;
      if (/logo|icon|sprite|placeholder|loading|badge|banner|avatar/i.test(src)) return false;
      if (/logo|icon|sprite|placeholder|loading|badge|banner|avatar/i.test(alt)) return false;

      const rect = img.getBoundingClientRect();

      if (rect.width < minWidth || rect.height < minHeight) return false;

      return true;
    })
    .map((img) => {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      const alt = cleanText(img.getAttribute("alt") || "");
      const normalizedAlt = normalizeForBasicSearch(alt);
      const rect = img.getBoundingClientRect();

      let score = 0;

      score += rect.width + rect.height;

      if (preferLeftSide && rect.left < window.innerWidth * 0.55) score += 250;
      if (rect.top < window.innerHeight * 0.9) score += 120;
      if (cdnRegex.test(src)) score += 140;

      if (
        normalizedTitle &&
        normalizedAlt &&
        (normalizedTitle.includes(normalizedAlt.slice(0, 25)) ||
          normalizedAlt.includes(normalizedTitle.slice(0, 25)))
      ) {
        score += 300;
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

// Turkce metni arama icin sadeleştirir: kucuk harf + aksansiz. Taksit ve kargo
// taramalarinin ikisi de bunu kullaniyor.
function normalizeTurkishText(text) {
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

  const normalized = normalizeTurkishText(rawBodyText);

  const paymentTabTexts = Array.from(
    document.querySelectorAll("div, section, li, span, p, button, a"),
  )
    .map((el) => cleanText(el.textContent))
    .filter(Boolean)
    .filter((text) => {
      const normalizedText = normalizeTurkishText(text);
      return /odeme kolayliklari|taksit secenekleri|aya varan taksit|baslayan taksit|alisveris kredisi/i.test(
        normalizedText,
      );
    });

  const joinedText = normalizeTurkishText(
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
    const normalized = normalizeTurkishText(text);
    return positivePatterns.some((pattern) => pattern.test(normalized));
  }

  function hasNegativeInstallmentText(text) {
    const normalized = normalizeTurkishText(text);
    return negativePatterns.some((pattern) => pattern.test(normalized));
  }

  const candidates = elements
    .filter((element) => {
      // Metin filtresi önce çalışır: getBoundingClientRect ve
      // getComputedStyle layout'u zorluyor, binlerce elemanda pahalı.
      const text = cleanText(element.textContent);
      if (!text || text.length > 320) return false;

      const normalized = normalizeTurkishText(text);
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

  const normalized = normalizeTurkishText(rawText);

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

  const normalized = normalizeTurkishText(container.textContent);

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
    const normalized = normalizeTurkishText(text);

    return /kartsiz taksit|kartsiz taksitle|kartsiz|alisveris kredisi|krediyle al|finansman|alisveris finansmani|hepsifinans|hepsi finans|kredili odeme|hepsipay/i.test(
      normalized,
    );
  }

  function isNegativeInstallmentText(text) {
    const normalized = normalizeTurkishText(text);

    return /bu urune taksit uygulanmiyor|taksit uygulanmiyor|taksit yok|taksit yapilamaz|taksit uygulanmaz|taksit secenegi bulunmamaktadir|taksit bulunmamaktadir|kredi kartina taksit yok|kredi karti taksiti yok/i.test(
      normalized,
    );
  }

  function hasBankOrCardKeyword(text) {
    const normalized = normalizeTurkishText(text);

    return /bonus|world|worldcard|axess|maximum|paraf|cardfinans|advantage|bankkart|kuveytturk|kuveyt turk|ziraat|is bankasi|iş bankasi|garanti|yapi kredi|yapikredi|akbank|vakifbank|halkbank|denizbank|qnb|enpara|teb|ing/i.test(
      normalized,
    );
  }

  function isExplicitRegularInstallmentText(text) {
    const normalized = normalizeTurkishText(text);

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
    const normalized = normalizeTurkishText(text);
    const normalizedContext = normalizeTurkishText(contextText);

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

      const normalized = normalizeTurkishText(text);

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

// "Ücretsiz kargo" tek başına bu ürünün kargosunun ücretsiz olduğunu
// söylemiyor: TR siteleri de ücretsiz kargoyu çoğunlukla bir sepet tutarına
// bağlıyor ve bunu her sayfada bant olarak basıyor ("2000 TL ve üzeri
// alışverişlerde Ücretsiz Kargo"). Eşiği yok saymak 300 TL'lik üründe bile
// "Ücretsiz kargo" yazdırıyordu — yanlış kargo bilgisi, bilgisiz kalmaktan
// kötü. (UK tarafında aynı düzeltme analyzeFreeShippingClaim() içinde.)
//
// İngilizcede eşik ifadenin ardından gelirken ("on orders over £70") Türkçede
// önüne geçiyor, o yüzden ifadenin iki yanına da bakılıyor.
const TRY_FREE_SHIPPING_CLAIM_PATTERN =
  "ucretsiz kargo|kargo bedava|bedava kargo|ucretsiz teslimat|teslimat ucretsiz|ucretsiz gonderim|kargo ucretsiz|kargosu bedava";

// Eşik ya bir tutara ("2000 tl ve uzeri") ya da tutarı izleyen bir alışveriş
// sözcüğüne bağlanıyor; ürünün kendi fiyatına takılmasın diye çıplak tutar
// yetmiyor, yanında "üzeri/üstü" gibi bir sözcük aranıyor.
const TRY_SHIPPING_THRESHOLD_RE =
  /\d[\d.,]*\s*(?:tl|₺)\s*(?:ve\s*)?(?:uzeri|uzerinde|uzerine|ustu|ustunde)|(?:uzeri|ustu|uzerinde)\s+(?:alisveris|siparis|sepet)|(?:minimum|en az)\s*\d[\d.,]*\s*(?:tl|₺)/i;

// "unconditional" | "conditional" | null döner. Sayfada birden fazla ifade
// olabiliyor (üst bant koşullu, ürün rozeti koşulsuz); bir tanesi bile
// koşulsuzsa ürün gerçekten ücretsiz kargolu sayılır.
function analyzeTryFreeShippingClaim(normalized) {
  const claimRegex = new RegExp(TRY_FREE_SHIPPING_CLAIM_PATTERN, "gi");
  let match;
  let sawClaim = false;

  while ((match = claimRegex.exec(normalized)) !== null) {
    sawClaim = true;

    const claimEnd = match.index + match[0].length;
    const beforeClaim = normalized.slice(Math.max(0, match.index - 80), match.index);
    const afterClaim = normalized.slice(claimEnd, claimEnd + 80);

    if (
      !TRY_SHIPPING_THRESHOLD_RE.test(beforeClaim) &&
      !TRY_SHIPPING_THRESHOLD_RE.test(afterClaim)
    ) {
      return "unconditional";
    }
  }

  return sawClaim ? "conditional" : null;
}

function findShippingInfo() {

  function analyzeShippingText(text) {
    const normalized = normalizeTurkishText(text);

    const paidShippingRegex =
      /kargo ucreti|kargo bedeli|teslimat ucreti|teslimat bedeli|ucretli kargo|nakliye ucreti/i;

    const genericShippingRegex =
      /kargo|teslimat|gonderim|kapinda|kargoya verilir|kargoda|bugun kargoda|yarin kapinda|hizli teslimat|teslim tarihi/i;

    const freeShippingClaim = analyzeTryFreeShippingClaim(normalized);

    if (freeShippingClaim === "unconditional") {
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

    // Ücretsiz kargo var ama bir eşiğe bağlı: bu üründe geçerli mi bilemiyoruz.
    // Metin, popup'ın i18n eşlemesi olan ifadeyle aynı tutuluyor
    // (bkz. popup/i18n.js → normalizeDeliveryText); nüans shippingConfidence'ta.
    if (freeShippingClaim === "conditional") {
      return {
        shippingAvailable: false,
        freeShipping: false,
        shippingText: "Sepette hesaplanır",
        shippingSource: "cart",
        shippingConfidence: "conditional",
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
  return (
    findProductImage({
      // Trendyol'da h1 yerine ".pr-new-br" marka + ürün adını veriyor.
      titleSelectors: [".pr-new-br", "h1"],
      minWidth: 100,
      minHeight: 100,
      cdnRegex: /cdn\.dsmcdn\.com|ty\d+|product|urun|ürün|images|media/i,
    }) ||
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content")
  );
}
