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
    const label = isCompact
      ? translate("normalView")
      : translate("compactView");
    compactViewBtn.setAttribute("aria-label", label);
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
