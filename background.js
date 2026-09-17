// Chrome arka planı service worker olarak çalıştırır ve polyfill ile ortak
// modülleri buradan yüklemek gerekir. Firefox ise event page kullanır: orada
// importScripts tanımsızdır ve aynı dosyalar zaten manifest'teki
// background.scripts ile gelir (Firefox'ta browser API'si yerleşik olduğu için
// polyfill no-op çalışır).
if (typeof importScripts === "function") {
  importScripts("browser-polyfill.js", "shared/category.js", "shared/cart.js");
}

const CART_KEY = OrtakSepetCart.CART_STORAGE_KEY;
const LANGUAGE_KEY = "ortakSepetLanguage";
const IMAGE_CACHE_LIMIT = 40;
const UPDATE_CONCURRENCY = 3;
const imageDataCache = new Map();

// Süren fiyat güncellemesi; popup buradan iptal edebiliyor.
let activePriceUpdate = null;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }

  return btoa(binary);
}

function rememberImageDataUrl(imageUrl, dataUrl) {
  if (imageDataCache.size >= IMAGE_CACHE_LIMIT) {
    const oldestKey = imageDataCache.keys().next().value;
    imageDataCache.delete(oldestKey);
  }

  imageDataCache.set(imageUrl, dataUrl);
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

  rememberImageDataUrl(imageUrl, dataUrl);
  return dataUrl;
}

async function addCurrentTabProduct(tabId) {
  if (!tabId) return;

  const response = await browser.tabs.sendMessage(tabId, {
    type: "GET_PRODUCT",
  });

  if (!response || !response.ok) {
    throw new Error(response?.error || "Bu sayfadan ürün okunamadı.");
  }

  await OrtakSepetCart.addProduct(response.product);
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
  const items = await OrtakSepetCart.getItems();

  const totalCount = items.reduce((sum, item) => {
    return sum + OrtakSepetCart.getQuantity(item);
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
        (response.product.price ||
          OrtakSepetCart.hasUnavailableMainPrice(response.product))
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

// Ürünün alan adına bakıyoruz; site adı üzerinden parça araması yanıltıyor
// ("Pazarama" içinde "zara" da geçiyor).
function itemHostMatches(item, domains) {
  let host = "";

  try {
    host = new URL(item?.url || "").hostname.replace(/^www\d*\./, "").toLowerCase();
  } catch {
    return false;
  }

  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

async function findMissingOriginForItem(item) {
  const origin = OrtakSepetCart.getDeclaredOriginForItem(item);

  if (!origin) return null;

  try {
    return (await browser.permissions.contains({ origins: [origin] })) ? null : origin;
  } catch {
    return null;
  }
}

function getUpdateProfile(item) {
  if (itemHostMatches(item, ["jeanslab.com"])) {
    return {
      tabTimeoutMs: 15000,
      initialDelayMs: 400,
      attempts: 2,
      waitMs: 300,
      acceptTitleOnly: true,
    };
  }

  if (itemHostMatches(item, ["diesel.com"])) {
    return {
      tabTimeoutMs: 15000,
      initialDelayMs: 500,
      attempts: 4,
      waitMs: 450,
      acceptTitleOnly: false,
    };
  }

  if (
    itemHostMatches(item, [
      "zara.com",
      "bershka.com",
      "hm.com",
      "ikea.com",
      "ikea.com.tr",
    ])
  ) {
    return {
      tabTimeoutMs: 15000,
      initialDelayMs: 650,
      attempts: 6,
      waitMs: 450,
      acceptTitleOnly: false,
    };
  }

  if (itemHostMatches(item, ["amazon.com.tr", "amazon.co.uk"])) {
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

  // İzin verilmemişse content script o sayfada çalışmaz; sekmeyi açıp altı kez
  // boşuna mesaj atmak yerine sebebi söyleyip çıkıyoruz. Popup bu durumu
  // "İzin ver" düğmesine çeviriyor — izin isteme kullanıcı tıklaması gerektirdiği
  // için arka plandan yapılamıyor.
  const missingOrigin = await findMissingOriginForItem(item);

  if (missingOrigin) {
    return {
      ok: false,
      needsPermission: true,
      item: {
        ...item,
        lastCheckedAt: new Date().toISOString(),
        lastUpdateStatus: "permission",
        lastUpdateError: `Site izni verilmemiş: ${missingOrigin}`,
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
    const productUnavailable =
      OrtakSepetCart.hasUnavailableMainPrice(freshProduct) && !freshProduct.price;
    const detectedPrice = productUnavailable
      ? null
      : freshProduct.price || item.detectedPrice || item.price || null;
    const newPrice = keepManualPrice ? item.price : detectedPrice;
    const priceChanged = keepManualPrice || productUnavailable
      ? false
      : !OrtakSepetCart.arePricesEqual(oldPrice, newPrice);

    const currency = freshProduct.currency || item.currency || OrtakSepetCart.detectCurrencyFromPrice(newPrice);

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

        currency,
        currencySymbol: freshProduct.currencySymbol || item.currencySymbol || OrtakSepetCart.currencySymbolForCurrency(currency),
        region: OrtakSepetCart.resolveRegion(freshProduct, currency) || item.region,

        installmentAvailable: OrtakSepetCart.mergeInstallmentAvailable(freshProduct, item),
        installmentText: OrtakSepetCart.mergeInstallmentText(freshProduct, item),

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
  const initialItems = await OrtakSepetCart.getItems();

  if (initialItems.length === 0) {
    return {
      ok: true,
      total: 0,
      updated: 0,
      changed: 0,
      failed: 0,
      needsPermission: 0,
      skipped: 0,
      cancelled: false,
    };
  }

  // Sadece id listesini sabitliyoruz. Her tur sepeti yeniden okuduğumuz için
  // güncelleme sürerken kullanıcının eklediği/sildiği ürünler ezilmiyor.
  const targetIds = initialItems.map((item) => item.id);
  const total = targetIds.length;

  const run = { cancelled: false };
  activePriceUpdate = run;

  let updated = 0;
  let changed = 0;
  let failed = 0;
  let needsPermission = 0;
  let skipped = 0;
  let completed = 0;
  let nextIndex = 0;

  // Ürünler sırayla değil, sınırlı sayıda paralel sekmede güncelleniyor.
  // Sekme açıp yüklenmesini beklemek işin neredeyse tamamı, bu yüzden
  // eşzamanlılık süreyi doğrudan kısaltıyor.
  async function runWorker() {
    while (!run.cancelled) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= targetIds.length) return;

      const items = await OrtakSepetCart.getItems();
      const currentItem = items.find((item) => item.id === targetIds[index]);

      if (!currentItem) {
        skipped += 1;
        completed += 1;
        continue;
      }

      completed += 1;

      await notifyProgress({
        type: "UPDATE_PRICES_PROGRESS",
        current: completed,
        total,
        title: currentItem.title || "Ürün",
      });

      const result = await updateSingleItem(currentItem);

      // İptal edilse bile okunan veri geçerli; yazıp öyle çıkıyoruz.
      const saved = await OrtakSepetCart.saveRefreshedItem(result.item);

      if (!saved) {
        // Ürün güncelleme sırasında sepetten çıkarılmış.
        skipped += 1;
      } else if (result.ok) {
        updated += 1;

        if (result.priceChanged) {
          changed += 1;
        }
      } else if (result.needsPermission) {
        // Hata değil, eksik izin: kullanıcının düzeltebileceği ayrı bir durum.
        needsPermission += 1;
      } else {
        failed += 1;
      }

      await delay(150);
    }
  }

  const workerCount = Math.min(UPDATE_CONCURRENCY, total);

  try {
    await Promise.all(
      Array.from({ length: workerCount }, () => runWorker()),
    );
  } finally {
    if (activePriceUpdate === run) {
      activePriceUpdate = null;
    }
  }

  const summary = {
    ok: true,
    total,
    updated,
    changed,
    failed,
    needsPermission,
    skipped,
    cancelled: run.cancelled,
  };

  await notifyProgress({
    type: "UPDATE_PRICES_DONE",
    ...summary,
  });

  return summary;
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

  if (message && message.type === "CANCEL_UPDATE_ALL_PRICES") {
    const wasRunning = Boolean(activePriceUpdate);

    if (activePriceUpdate) {
      activePriceUpdate.cancelled = true;
    }

    return Promise.resolve({ ok: true, wasRunning });
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
