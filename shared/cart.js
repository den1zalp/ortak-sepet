// Ortak Sepet - shared cart storage logic.
//
// Both entry points that can add a product (the popup button and the background
// context menu) go through this module, so an item is stored exactly the same
// way no matter where it came from. Every write re-reads storage first: the
// price refresh can run for minutes and must not write back a stale snapshot of
// the whole cart over changes the user made in the meantime.
var OrtakSepetCart = (function () {
  const CART_STORAGE_KEY = "ortakSepetItems";
  const VIEW_MODE_STORAGE_KEY = "ortakSepetViewMode";

  const TRACKING_PARAMS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "trackingId",
    "gclid",
    "fbclid",
    "yclid",
    "ttclid",
    "msclkid",
  ];

  function cleanText(text) {
    if (!text) return "";
    return String(text).replace(/\s+/g, " ").trim();
  }

  function normalizeUrl(url) {
    if (!url) return "";

    try {
      const parsedUrl = new URL(url);
      parsedUrl.hash = "";

      for (const param of TRACKING_PARAMS) {
        parsedUrl.searchParams.delete(param);
      }

      return parsedUrl.toString();
    } catch {
      return url;
    }
  }

  // Firefox MV3'te manifest'teki host izinleri isteğe bağlı sayılıyor: kurulumda
  // onaylananlar veriliyor, ama güncellemeyle eklenen yeni bir site kullanıcıya
  // hiç sorulmadan izinsiz kalıyor (Firefox bug 1893232). İzin yoksa content
  // script o sayfada hiç çalışmaz; ürün eklenemez, fiyat güncellenemez ve
  // kullanıcı yalnızca "başarısız" görür. Sebebi ayırt edebilmek için ürünün
  // alan adını manifest'te ilan ettiğimiz origin kalıbıyla eşleştiriyoruz.
  //
  // Eşleşme alan adı bazında; "*://*.zara.com/*" kalıbını parça araması yapıp
  // "pazarama.com" ile eşleştirmemek için host'un tamamına bakılıyor.
  // Kalıpların çoğu tüm siteyi kapsıyor ("*://*.zara.com/*") ama biri yola da
  // bağlı: Birkenstock'un İngiltere mağazası global alan adının /gb/ yolunda.
  // Eşleşme alan adı üzerinden yapıldığı için ilk "/" sonrasını atıyoruz;
  // yoksa o ürün hiçbir origin'e düşmez ve eksik izin fark edilmezdi.
  function originToDomain(origin) {
    return String(origin || "")
      .replace(/^\*:\/\/(\*\.)?/, "")
      .replace(/\/.*$/, "");
  }

  function itemMatchesDomain(item, domain) {
    if (!domain) return false;

    let host = "";

    try {
      host = new URL(item?.url || "").hostname.replace(/^www\d*\./, "").toLowerCase();
    } catch {
      return false;
    }

    return host === domain || host.endsWith(`.${domain}`);
  }

  function getDeclaredOriginForItem(item) {
    const declared = globalThis.browser?.runtime?.getManifest?.().host_permissions || [];

    return (
      declared.find((origin) => itemMatchesDomain(item, originToDomain(origin))) || null
    );
  }

  // Verilmemiş izinleri tekilleştirip döndürür. Tarayıcı izin API'sini
  // vermiyorsa boş liste dönüyor: kullanıcıya düzeltemeyeceği bir uyarı
  // göstermektense hiç göstermemek doğru.
  async function findMissingOrigins(items) {
    let grantedOrigins = [];

    try {
      grantedOrigins = (await globalThis.browser.permissions.getAll()).origins || [];
    } catch {
      return [];
    }

    const granted = new Set(grantedOrigins);
    const missing = new Set();

    for (const item of items || []) {
      const origin = getDeclaredOriginForItem(item);

      if (origin && !granted.has(origin)) {
        missing.add(origin);
      }
    }

    return Array.from(missing);
  }

  function detectCurrencyFromPrice(priceText) {
    const text = String(priceText || "");

    if (/£|\bGBP\b/i.test(text)) return "GBP";
    if (/₺|\bTRY\b|\bTL\b/i.test(text)) return "TRY";
    if (/€|\bEUR\b/i.test(text)) return "EUR";
    if (/\$|\bUSD\b/i.test(text)) return "USD";
    if (/₽|\bRUB\b/i.test(text)) return "RUB";
    if (/₴|\bUAH\b/i.test(text)) return "UAH";
    if (/₹|\bINR\b/i.test(text)) return "INR";
    if (/₩|\bKRW\b/i.test(text)) return "KRW";
    if (/¥|\bJPY\b|\bCNY\b/i.test(text)) return "JPY";

    return "TRY";
  }

  function currencySymbolForCurrency(currency) {
    switch (currency) {
      case "GBP": return "£";
      case "USD": return "$";
      case "EUR": return "€";
      case "TRY": return "TL";
      case "RUB": return "₽";
      case "UAH": return "₴";
      case "INR": return "₹";
      case "KRW": return "₩";
      case "JPY":
      case "CNY": return "¥";
      default: return currency || "TL";
    }
  }

  // Only used for items saved before content scripts started stamping a region.
  // Anything the extension stores today carries an explicit "TR" or "UK".
  function regionForCurrency(currency) {
    return currency === "GBP" ? "UK" : "TR";
  }

  function resolveRegion(product, currency) {
    if (product?.region === "TR" || product?.region === "UK") {
      return product.region;
    }

    return regionForCurrency(currency);
  }

  // Strips every currency symbol and separator, not just the Turkish and
  // British ones, so euro or dollar priced items compare as numbers too.
  function extractNumberFromPrice(priceText) {
    if (!priceText) return null;

    let cleaned = String(priceText).replace(/[^\d.,]/g, "").trim();

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

  function arePricesEqual(oldPrice, newPrice) {
    const oldNumber = extractNumberFromPrice(oldPrice);
    const newNumber = extractNumberFromPrice(newPrice);

    if (oldNumber !== null && newNumber !== null) {
      return Math.abs(oldNumber - newNumber) < 0.01;
    }

    return cleanText(oldPrice) === cleanText(newPrice);
  }

  function getQuantity(item) {
    return item?.quantity && item.quantity > 0 ? item.quantity : 1;
  }

  function hasUnavailableMainPrice(product) {
    return (
      product?.priceReadStatus === "unavailable" ||
      product?.priceUnavailableReason === "noActiveOffer" ||
      product?.stockAvailable === false
    );
  }

  // Turkish parsers report "Taksit bilgisi bulunamadı" and the UK ones report
  // "Finance information not found" when the payment widget has not rendered.
  // Both mean "unknown", and unknown must never overwrite a value that was read
  // successfully before.
  function isUnknownInstallmentInfo(product) {
    if (!product) return true;

    if (
      product.installmentAvailable === null ||
      product.installmentAvailable === undefined
    ) {
      return true;
    }

    const text = cleanText(product.installmentText || "").toLowerCase();

    return (
      text.includes("bilgisi bulunamadı") ||
      text.includes("bilgisi bulunamadi") ||
      text.includes("bilinmiyor") ||
      text.includes("unknown") ||
      text.includes("not found")
    );
  }

  function mergeInstallmentAvailable(freshProduct, currentItem) {
    return isUnknownInstallmentInfo(freshProduct)
      ? currentItem.installmentAvailable
      : freshProduct.installmentAvailable;
  }

  function mergeInstallmentText(freshProduct, currentItem) {
    return isUnknownInstallmentInfo(freshProduct)
      ? currentItem.installmentText
      : freshProduct.installmentText;
  }

  async function getItems() {
    const result = await browser.storage.local.get(CART_STORAGE_KEY);
    return result[CART_STORAGE_KEY] || [];
  }

  async function setItems(items) {
    await browser.storage.local.set({
      [CART_STORAGE_KEY]: items,
    });
  }

  async function getViewMode() {
    const result = await browser.storage.local.get(VIEW_MODE_STORAGE_KEY);
    return result[VIEW_MODE_STORAGE_KEY] || "normal";
  }

  function shouldCategorize(viewMode) {
    return viewMode === "category" && typeof categorizeProduct === "function";
  }

  function applyProductToExistingItem(existingItem, product) {
    existingItem.quantity = getQuantity(existingItem) + 1;
    existingItem.selected = true;
    existingItem.title = product.title || existingItem.title;

    if (existingItem.manualPrice === true) {
      existingItem.detectedPrice = product.price || existingItem.detectedPrice;
    } else if (product.price) {
      existingItem.price = product.price;
    } else if (hasUnavailableMainPrice(product)) {
      existingItem.previousPrice = existingItem.price || existingItem.previousPrice;
      existingItem.price = null;
    }

    existingItem.priceReadStatus = product.priceReadStatus || existingItem.priceReadStatus || null;
    existingItem.priceUnavailableReason = product.priceUnavailableReason || existingItem.priceUnavailableReason || null;
    existingItem.stockAvailable = product.stockAvailable ?? existingItem.stockAvailable ?? null;
    existingItem.stockText = product.stockText || existingItem.stockText || "";

    existingItem.image = product.image || existingItem.image;

    const currency = product.currency || detectCurrencyFromPrice(existingItem.price);
    existingItem.currency = currency;
    existingItem.currencySymbol = product.currencySymbol || currencySymbolForCurrency(currency);
    existingItem.region = resolveRegion(product, currency);

    existingItem.installmentAvailable = mergeInstallmentAvailable(product, existingItem);
    existingItem.installmentText = mergeInstallmentText(product, existingItem);

    existingItem.shippingAvailable = product.shippingAvailable;
    existingItem.freeShipping = product.freeShipping;
    existingItem.shippingText = product.shippingText;
    existingItem.shippingSource = product.shippingSource;
    existingItem.shippingConfidence = product.shippingConfidence;
    existingItem.updatedAt = new Date().toISOString();

    return existingItem;
  }

  function createId() {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createItem(product) {
    const currency = product.currency || detectCurrencyFromPrice(product.price);

    return {
      id: createId(),
      ...product,
      currency,
      currencySymbol: product.currencySymbol || currencySymbolForCurrency(currency),
      region: resolveRegion(product, currency),
      quantity: 1,
      selected: true,
      category: null,
      addedAt: new Date().toISOString(),
    };
  }

  // Adds a product, or bumps the quantity when the same URL is already in the
  // cart. Resolves to "added" or "increased" so callers can pick a message.
  // Fiyatı okunamayan ürün de eklenir: arayüz "Ana fiyat yok" olarak gösterir
  // ve toplamlara dahil etmez. Ürün adı ise zorunlu; content script zaten
  // adsız sayfada ok:false döndürür.
  async function addProduct(product) {
    if (!product || !product.title) {
      throw new Error("Ürün bilgisi okunamadı.");
    }

    const viewMode = await getViewMode();
    const items = await getItems();
    const productUrl = normalizeUrl(product.url);

    const existingItem = items.find(
      (item) => normalizeUrl(item.url) === productUrl,
    );

    if (existingItem) {
      applyProductToExistingItem(existingItem, product);

      if (shouldCategorize(viewMode)) {
        existingItem.category = categorizeProduct(existingItem);
      }

      await setItems(items);
      return { status: "increased", item: existingItem };
    }

    const newItem = createItem(product);

    if (shouldCategorize(viewMode)) {
      newItem.category = categorizeProduct(newItem);
    }

    items.push(newItem);
    await setItems(items);

    return { status: "added", item: newItem };
  }

  // Writes back a single refreshed item. Storage is re-read first so a refresh
  // that started minutes ago cannot resurrect items the user removed or undo
  // quantity changes made while it was running.
  async function saveRefreshedItem(refreshedItem) {
    if (!refreshedItem || !refreshedItem.id) return false;

    const items = await getItems();
    const index = items.findIndex((item) => item.id === refreshedItem.id);

    if (index === -1) return false;

    items[index] = {
      ...refreshedItem,
      // The user can change these while the refresh is running; keep theirs.
      quantity: items[index].quantity,
      selected: items[index].selected,
      category: items[index].category,
    };

    await setItems(items);
    return true;
  }

  return {
    CART_STORAGE_KEY,
    addProduct,
    arePricesEqual,
    cleanText,
    createId,
    currencySymbolForCurrency,
    detectCurrencyFromPrice,
    extractNumberFromPrice,
    findMissingOrigins,
    getDeclaredOriginForItem,
    getItems,
    getQuantity,
    getViewMode,
    hasUnavailableMainPrice,
    isUnknownInstallmentInfo,
    mergeInstallmentAvailable,
    mergeInstallmentText,
    normalizeUrl,
    regionForCurrency,
    resolveRegion,
    saveRefreshedItem,
    setItems,
  };
})();
