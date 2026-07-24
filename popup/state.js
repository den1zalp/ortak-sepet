// Ortak Sepet popup module: state.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

async function getCartItems() {
  const result = await browser.storage.local.get(CART_KEY);
  return result[CART_KEY] || [];
}

async function saveCartItems(items) {
  await browser.storage.local.set({
    [CART_KEY]: items,
  });
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

function getItemRegion(item) {
  if (item.region === "UK" || getItemCurrency(item) === "GBP") {
    return "UK";
  }

  return "TR";
}

function getRegionLabel(region) {
  return region === "UK"
    ? translate("countryUnitedKingdom")
    : translate("countryTurkey");
}

function setStatus(message) {
  statusEl.textContent = message;
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getQuantity(item) {
  return item.quantity && item.quantity > 0 ? item.quantity : 1;
}

function isSelected(item) {
  return item.selected !== false;
}
