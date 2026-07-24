// Chrome arka planı service worker olarak çalıştırır ve polyfill'i buradan
// yüklemek gerekir. Firefox ise event page kullanır: orada importScripts
// tanımsızdır ve polyfill zaten manifest'teki background.scripts ile gelir
// (Firefox'ta browser API'si yerleşik olduğu için polyfill no-op çalışır).
if (typeof importScripts === "function") {
  importScripts("browser-polyfill.js");
}

const CART_KEY = "ortakSepetItems";
const LANGUAGE_KEY = "ortakSepetLanguage";
const imageDataCache = new Map();

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }

  return btoa(binary);
}

async function fetchImageAsDataUrl(imageUrl) {
  if (!/^https?:\/\//i.test(imageUrl || "")) {
    throw new Error("Geçersiz görsel adresi.");
  }

  if (imageDataCache.has(imageUrl)) {
    return imageDataCache.get(imageUrl);
  }

  const response = await fetch(imageUrl, {
    credentials: "omit",
    cache: "force-cache",
    referrerPolicy: "no-referrer",
  });

  if (!response.ok) {
    throw new Error(`Görsel indirilemedi: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const dataUrl = `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;

  imageDataCache.set(imageUrl, dataUrl);
  return dataUrl;
}

async function getCartItems() {
  const result = await browser.storage.local.get(CART_KEY);
  return result[CART_KEY] || [];
}

async function saveCartItems(items) {
  await browser.storage.local.set({
    [CART_KEY]: items,
  });
}

function getQuantity(item) {
  return item.quantity && item.quantity > 0 ? item.quantity : 1;
}

function normalizeUrl(url) {
  if (!url) return "";

  try {
    const parsedUrl = new URL(url);
    parsedUrl.hash = "";

    const removableParams = [
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

    for (const param of removableParams) {
      parsedUrl.searchParams.delete(param);
    }

    return parsedUrl.toString();
  } catch {
    return url;
  }
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

function regionForCurrency(currency) {
  return ["TRY", "RUB", "UAH"].includes(currency) ? "TR" : "UK";
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

function hasUnavailableMainPrice(product) {
  return (
    product?.priceReadStatus === "unavailable" ||
    product?.priceUnavailableReason === "noActiveOffer" ||
    product?.stockAvailable === false
  );
}

async function addProductToCart(product) {
  if (!product || !product.title || (!product.price && !hasUnavailableMainPrice(product))) {
    throw new Error("Ürün bilgisi okunamadı.");
  }

  const items = await getCartItems();
  const productUrl = normalizeUrl(product.url);

  const existingItem = items.find((item) => {
    return normalizeUrl(item.url) === productUrl;
  });

  if (existingItem) {
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
    existingItem.currency = product.currency || detectCurrencyFromPrice(existingItem.price);
    existingItem.currencySymbol = product.currencySymbol || currencySymbolForCurrency(existingItem.currency);
    existingItem.region = product.region || existingItem.region || regionForCurrency(existingItem.currency);
    existingItem.installmentAvailable = product.installmentAvailable;
    existingItem.installmentText = product.installmentText;
    existingItem.shippingAvailable = product.shippingAvailable;
    existingItem.freeShipping = product.freeShipping;
    existingItem.shippingText = product.shippingText;
    existingItem.shippingSource = product.shippingSource;
    existingItem.shippingConfidence = product.shippingConfidence;
    existingItem.updatedAt = new Date().toISOString();

    await saveCartItems(items);
    await updateBadge();
    return;
  }

  const productCurrency = product.currency || detectCurrencyFromPrice(product.price);

  items.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...product,
    currency: productCurrency,
    currencySymbol: product.currencySymbol || currencySymbolForCurrency(productCurrency),
    region: product.region || regionForCurrency(productCurrency),
    quantity: 1,
    selected: true,
    category: null,
    addedAt: new Date().toISOString(),
  });

  await saveCartItems(items);
  await updateBadge();
}

async function addCurrentTabProduct(tabId) {
  if (!tabId) return;

  const response = await browser.tabs.sendMessage(tabId, {
    type: "GET_PRODUCT",
  });

  if (!response || !response.ok) {
    throw new Error(response?.error || "Bu sayfadan ürün okunamadı.");
  }

  await addProductToCart(response.product);
}

async function getLanguage() {
  const result = await browser.storage.local.get(LANGUAGE_KEY);
  return result[LANGUAGE_KEY] || "tr";
}

async function getContextMenuTitle() {
  const language = await getLanguage();
  return language === "en" ? "Add to Ortak Sepet" : "Ortak Sepet'e ekle";
}

async function createContextMenus() {
  await browser.contextMenus.removeAll();
  await browser.contextMenus.create({
    id: "add-to-ortak-sepet",
    title: await getContextMenuTitle(),
    contexts: ["page"],
  });
}

async function updateContextMenuLanguage() {
  try {
    await browser.contextMenus.update("add-to-ortak-sepet", {
      title: await getContextMenuTitle(),
    });
  } catch {
    await createContextMenus();
  }
}

async function updateBadge() {
  const items = await getCartItems();

  const totalCount = items.reduce((sum, item) => {
    const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    return sum + quantity;
  }, 0);

  await browser.action.setBadgeText({
    text: totalCount === 0 ? "" : totalCount > 99 ? "99+" : String(totalCount),
  });

  await browser.action.setBadgeBackgroundColor({
    color: "#E53935",
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(text) {
  if (!text) return "";
  return String(text).replace(/\s+/g, " ").trim();
}

function extractNumberFromPrice(priceText) {
  if (!priceText) return null;

  let cleaned = String(priceText)
    .replace(/TL|TRY|GBP/gi, "")
    .replace(/[₺£]/g, "")
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

function arePricesEqual(oldPrice, newPrice) {
  const oldNumber = extractNumberFromPrice(oldPrice);
  const newNumber = extractNumberFromPrice(newPrice);

  if (oldNumber !== null && newNumber !== null) {
    return Math.abs(oldNumber - newNumber) < 0.01;
  }

  return cleanText(oldPrice) === cleanText(newPrice);
}

async function notifyProgress(payload) {
  try {
    await browser.runtime.sendMessage(payload);
  } catch {
    // Popup kapalıysa progress mesajını geç.
  }
}

async function waitForTabComplete(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };

    const finish = () => {
      cleanup();
      resolve();
    };

    const fail = (message) => {
      cleanup();
      reject(new Error(message));
    };

    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        finish();
      }
    };

    const timer = setTimeout(() => {
      fail("Sayfa yüklenme süresi doldu.");
    }, timeoutMs);

    browser.tabs.onUpdated.addListener(onUpdated);

    browser.tabs
      .get(tabId)
      .then((tab) => {
        if (tab.status === "complete") {
          finish();
        }
      })
      .catch(() => {
        fail("Sekme okunamadı.");
      });
  });
}

async function readProductFromTabWithRetry(tabId, options = {}) {
  const {
    attempts = 10,
    waitMs = 900,
    acceptTitleOnly = false,
  } = options;
  let lastPartialProduct = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await browser.tabs.sendMessage(tabId, {
        type: "GET_PRODUCT",
      });

      if (
        response &&
        response.ok &&
        response.product &&
        response.product.title &&
        (response.product.price || hasUnavailableMainPrice(response.product))
      ) {
        return response.product;
      }

      if (
        acceptTitleOnly &&
        response &&
        response.ok &&
        response.product &&
        response.product.title
      ) {
        lastPartialProduct = response.product;
      }
    } catch {
      // content.js henüz hazır olmayabilir.
    }

    if (attempt < attempts) {
      await delay(waitMs);
    }
  }

  if (lastPartialProduct) {
    return lastPartialProduct;
  }

  throw new Error("Ürün bilgisi veya fiyat okunamadı.");
}

function isUnknownInstallmentInfo(product) {
  if (!product) return true;

  const text = cleanText(product.installmentText || "").toLocaleLowerCase("tr-TR");

  return (
    product.installmentAvailable === null ||
    product.installmentAvailable === undefined ||
    text.includes("bilgisi bulunamadı") ||
    text.includes("bilinmiyor") ||
    text.includes("unknown")
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

function getUpdateProfile(item) {
  const source = `${item?.site || ""} ${item?.url || ""}`.toLocaleLowerCase("tr-TR");

  if (source.includes("jeanslab")) {
    return {
      tabTimeoutMs: 15000,
      initialDelayMs: 400,
      attempts: 2,
      waitMs: 300,
      acceptTitleOnly: true,
    };
  }

  if (source.includes("diesel")) {
    return {
      tabTimeoutMs: 15000,
      initialDelayMs: 500,
      attempts: 4,
      waitMs: 450,
      acceptTitleOnly: false,
    };
  }

  if (
    source.includes("zara") ||
    source.includes("bershka") ||
    source.includes("hm.com") ||
    source.includes("h&m")
  ) {
    return {
      tabTimeoutMs: 15000,
      initialDelayMs: 650,
      attempts: 6,
      waitMs: 450,
      acceptTitleOnly: false,
    };
  }

  if (source.includes("amazon")) {
    return {
      tabTimeoutMs: 18000,
      initialDelayMs: 800,
      attempts: 8,
      waitMs: 600,
      acceptTitleOnly: false,
    };
  }

  return {
    tabTimeoutMs: 15000,
    initialDelayMs: 600,
    attempts: 6,
    waitMs: 500,
    acceptTitleOnly: false,
  };
}

async function updateSingleItem(item) {
  if (!item.url) {
    return {
      ok: false,
      item: {
        ...item,
        lastUpdateStatus: "failed",
        lastUpdateError: "Ürün linki yok.",
        lastCheckedAt: new Date().toISOString(),
      },
    };
  }

  let tab = null;

  try {
    const updateProfile = getUpdateProfile(item);

    tab = await browser.tabs.create({
      url: item.url,
      active: false,
    });

    await waitForTabComplete(tab.id, updateProfile.tabTimeoutMs);
    await delay(updateProfile.initialDelayMs);

    const freshProduct = await readProductFromTabWithRetry(tab.id, {
      attempts: updateProfile.attempts,
      waitMs: updateProfile.waitMs,
      acceptTitleOnly: updateProfile.acceptTitleOnly,
    });

    const oldPrice = item.price || null;
    const keepManualPrice = item.manualPrice === true;
    const productUnavailable = hasUnavailableMainPrice(freshProduct) && !freshProduct.price;
    const detectedPrice = productUnavailable
      ? null
      : freshProduct.price || item.detectedPrice || item.price || null;
    const newPrice = keepManualPrice ? item.price : detectedPrice;
    const priceChanged = keepManualPrice || productUnavailable
      ? false
      : !arePricesEqual(oldPrice, newPrice);

    return {
      ok: true,
      priceChanged,
      oldPrice,
      newPrice,
      item: {
        ...item,

        title: freshProduct.title || item.title,
        price: productUnavailable && !keepManualPrice ? null : newPrice,
        detectedPrice,
        manualPrice: keepManualPrice,
        priceReadStatus: freshProduct.priceReadStatus || (productUnavailable ? "unavailable" : item.priceReadStatus || null),
        priceUnavailableReason: freshProduct.priceUnavailableReason || (productUnavailable ? "noActiveOffer" : item.priceUnavailableReason || null),
        stockAvailable: freshProduct.stockAvailable ?? (productUnavailable ? false : item.stockAvailable ?? null),
        stockText: freshProduct.stockText || (productUnavailable ? "noActiveOffer" : item.stockText || ""),
        image: freshProduct.image || item.image,
        site: freshProduct.site || item.site,
        url: item.url,

        installmentAvailable: mergeInstallmentAvailable(freshProduct, item),
        installmentText: mergeInstallmentText(freshProduct, item),

        shippingAvailable: freshProduct.shippingAvailable,
        freeShipping: freshProduct.freeShipping,
        shippingText: freshProduct.shippingText,
        shippingSource: freshProduct.shippingSource,
        shippingConfidence: freshProduct.shippingConfidence,

        previousPrice: productUnavailable && oldPrice ? oldPrice : priceChanged ? oldPrice : item.previousPrice,
        lastCheckedAt: new Date().toISOString(),
        lastUpdateStatus: productUnavailable && !keepManualPrice ? "unavailable" : keepManualPrice ? "manual-kept" : "success",
        lastUpdateError: null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      item: {
        ...item,
        lastCheckedAt: new Date().toISOString(),
        lastUpdateStatus: "failed",
        lastUpdateError: error.message || "Güncelleme başarısız.",
      },
    };
  } finally {
    if (tab && tab.id) {
      try {
        await browser.tabs.remove(tab.id);
      } catch {
        // Sekme zaten kapanmış olabilir.
      }
    }
  }
}

async function updateAllPrices() {
  const items = await getCartItems();

  if (items.length === 0) {
    return {
      ok: true,
      total: 0,
      updated: 0,
      changed: 0,
      failed: 0,
    };
  }

  const updatedItems = [...items];

  let updated = 0;
  let changed = 0;
  let failed = 0;

  for (let index = 0; index < updatedItems.length; index++) {
    const currentItem = updatedItems[index];

    await notifyProgress({
      type: "UPDATE_PRICES_PROGRESS",
      current: index + 1,
      total: updatedItems.length,
      title: currentItem.title || "Ürün",
    });

    const result = await updateSingleItem(currentItem);

    updatedItems[index] = result.item;

    if (result.ok) {
      updated += 1;

      if (result.priceChanged) {
        changed += 1;
      }
    } else {
      failed += 1;
    }

    await saveCartItems(updatedItems);
    await delay(250);
  }

  await notifyProgress({
    type: "UPDATE_PRICES_DONE",
    total: updatedItems.length,
    updated,
    changed,
    failed,
  });

  return {
    ok: true,
    total: updatedItems.length,
    updated,
    changed,
    failed,
  };
}


browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "add-to-ortak-sepet" || !tab || !tab.id) {
    return;
  }

  addCurrentTabProduct(tab.id).catch(() => {
    // Desteklenmeyen veya henüz hazır olmayan sayfalarda sessiz geç.
  });
});

browser.runtime.onMessage.addListener((message) => {
  if (message && message.type === "UPDATE_ALL_PRICES") {
    return updateAllPrices();
  }

  if (message && message.type === "FETCH_IMAGE_AS_DATA_URL") {
    return fetchImageAsDataUrl(message.url)
      .then((dataUrl) => ({ ok: true, dataUrl }))
      .catch((error) => ({ ok: false, error: error.message }));
  }

  return false;
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  if (changes[CART_KEY]) {
    updateBadge();
  }

  if (changes[LANGUAGE_KEY]) {
    updateContextMenuLanguage();
  }
});

browser.runtime.onInstalled.addListener(() => {
  updateBadge();
  createContextMenus();
});
browser.runtime.onStartup.addListener(() => {
  updateBadge();
  createContextMenus();
});

updateBadge();
