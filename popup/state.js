// Ortak Sepet popup module: state.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

async function getCartItems() {
  return OrtakSepetCart.getItems();
}

async function saveCartItems(items) {
  await OrtakSepetCart.setItems(items);
}

async function getPurchasedItems() {
  const result = await browser.storage.local.get(PURCHASED_KEY);
  return result[PURCHASED_KEY] || [];
}

async function savePurchasedItems(items) {
  await browser.storage.local.set({
    [PURCHASED_KEY]: items,
  });
}

// Silme, alındı işaretleme gibi işlemlerden önce hem sepet hem alınanlar
// listesi burada saklanıyor; geri alma popup kapanıp açılsa da çalışsın diye
// bellekte değil depoda tutuluyor. Çağıran değişiklik yapmadan önce çağırır.
async function saveUndoSnapshot() {
  const [items, purchased] = await Promise.all([
    getCartItems(),
    getPurchasedItems(),
  ]);

  await browser.storage.local.set({
    [UNDO_KEY]: {
      items,
      purchased,
      at: Date.now(),
    },
  });
}

async function getUndoSnapshot() {
  const result = await browser.storage.local.get(UNDO_KEY);
  const snapshot = result[UNDO_KEY];

  if (!snapshot || !Array.isArray(snapshot.items)) return null;
  if (Date.now() - (snapshot.at || 0) > UNDO_WINDOW_MS) return null;

  return snapshot;
}

async function clearUndoSnapshot() {
  await browser.storage.local.remove(UNDO_KEY);
}

function setUndoVisible(isVisible) {
  undoBtn.hidden = !isVisible;
  undoBtn.textContent = translate("undo");
}

async function refreshUndoVisibility() {
  setUndoVisible(Boolean(await getUndoSnapshot()));
}

async function getViewMode() {
  const result = await browser.storage.local.get(VIEW_MODE_KEY);
  return result[VIEW_MODE_KEY] || "normal";
}

async function setViewMode(mode) {
  await browser.storage.local.set({
    [VIEW_MODE_KEY]: mode,
  });
}

async function getSortMode() {
  const result = await browser.storage.local.get(SORT_KEY);
  return SORT_OPTIONS.includes(result[SORT_KEY]) ? result[SORT_KEY] : "added";
}

async function setSortMode(mode) {
  currentSort = mode;
  await browser.storage.local.set({ [SORT_KEY]: mode });
}

// Fiyat sıralaması: kurla çevrilen görünümde bütün ürünler TL karşılığına göre
// birlikte sıralanıyor. Kur yokken para birimleri kıyaslanamıyor; önce para
// birimi, sonra tutar. Fiyatı okunamayan ürün her iki durumda da sonda.
const CURRENCY_ORDER = ["TRY", "GBP", "EUR", "USD"];

function getCurrencyRank(item) {
  const index = CURRENCY_ORDER.indexOf(getItemCurrency(item));
  return index === -1 ? CURRENCY_ORDER.length : index;
}

function compareByPrice(direction) {
  return (a, b) => {
    const priceA = extractNumberFromPrice(a.price);
    const priceB = extractNumberFromPrice(b.price);

    if (priceA === null || priceB === null) return (priceA === null) - (priceB === null);

    if (isConvertingCurrencies()) {
      const liraA = convertAmount(priceA, getItemCurrency(a), "TRY");
      const liraB = convertAmount(priceB, getItemCurrency(b), "TRY");
      if (liraA !== null && liraB !== null) return direction * (liraA - liraB);
    }

    return getCurrencyRank(a) - getCurrencyRank(b) || direction * (priceA - priceB);
  };
}

function compareText(getText) {
  const locale = currentLanguage === "en" ? "en-GB" : "tr-TR";
  return (a, b) => (getText(a) || "").localeCompare(getText(b) || "", locale, { sensitivity: "base" });
}

const ITEM_COMPARATORS = {
  "price-asc": compareByPrice(1),
  "price-desc": compareByPrice(-1),
  name: compareText((item) => item.title),
  store: compareText((item) => item.site),
};

// Sıralama yalnızca gösterimi değiştiriyor; depodaki sıra (eklenme sırası) aynı
// kalıyor. Gruplar kendi sıralarını koruyor, ürünler grubun içinde sıralanıyor.
function sortItems(items, mode) {
  if (mode === "newest") return [...items].reverse();

  const compare = ITEM_COMPARATORS[mode];
  return compare ? [...items].sort(compare) : items;
}

async function getCompactMode() {
  const result = await browser.storage.local.get(COMPACT_MODE_KEY);
  return result[COMPACT_MODE_KEY] === true;
}

async function setCompactMode(isCompact) {
  await browser.storage.local.set({
    [COMPACT_MODE_KEY]: Boolean(isCompact),
  });
}

function applyCompactMode(isCompact) {
  document.body.classList.toggle("compact-mode", Boolean(isCompact));
  if (compactViewBtn) {
    compactViewBtn.classList.toggle("is-active", Boolean(isCompact));
    compactViewBtn.setAttribute("aria-pressed", String(Boolean(isCompact)));
    const label = isCompact
      ? translate("normalView")
      : translate("compactView");
    compactViewBtn.title = label;
  }
}

// Content script'ler ürüne hangi bölgeden okunduğunu yazar. Para birimine
// bakmak yalnızca eski kayıtlar için geçerli bir tahmin; aksi hâlde euro veya
// dolar fiyatlı bir AliExpress ürünü Türkiye grubuna düşerdi.
let activeTab = "cart";

function isPurchasedTabActive() {
  return activeTab === "purchased";
}

// Üstteki işlem butonları, özet ve alt satır yalnızca sepetle ilgili; alınanlar
// sekmesinde gizleniyor ki kullanıcı hangi listeye baktığını şaşırmasın.
function applyActiveTab() {
  const showPurchased = isPurchasedTabActive();

  cartPanelEl.hidden = showPurchased;
  purchasedPanelEl.hidden = !showPurchased;
  actionGridEl.hidden = showPurchased;
  summarySectionEl.hidden = showPurchased;
  footerActionsEl.hidden = showPurchased;
  sortControlEl.hidden = showPurchased;

  cartTabBtn.classList.toggle("is-active", !showPurchased);
  purchasedTabBtn.classList.toggle("is-active", showPurchased);
  cartTabBtn.setAttribute("aria-selected", String(!showPurchased));
  purchasedTabBtn.setAttribute("aria-selected", String(showPurchased));
}

function getItemRegion(item) {
  if (item.region === "UK" || item.region === "TR") {
    return item.region;
  }

  return getItemCurrency(item) === "GBP" ? "UK" : "TR";
}

function getRegionLabel(region) {
  return region === "UK"
    ? translate("countryUnitedKingdom")
    : translate("countryTurkey");
}

function setStatus(message) {
  statusEl.textContent = message;
}

function getQuantity(item) {
  return OrtakSepetCart.getQuantity(item);
}

function isSelected(item) {
  return item.selected !== false;
}
