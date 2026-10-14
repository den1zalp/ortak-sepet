// Ortak Sepet popup module: init.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

addCurrentProductBtn.addEventListener("click", addCurrentProduct);
categorizeProductsBtn.addEventListener("click", categorizeProducts);
installmentProductsBtn.addEventListener("click", () => toggleGrouping("installment"));
updateAllPricesBtn.addEventListener("click", onUpdatePricesClick);
exportCsvBtn.addEventListener("click", exportCartAsCsv);
backupCartBtn.addEventListener("click", exportCartAsJson);

// Geri yükleme ayrı bir sekmede: dosya seçici açılınca popup kapanıyor ve
// seçimi işleyecek kod da onunla gidiyor.
restoreCartBtn.addEventListener("click", () => {
  browser.tabs.create({ url: browser.runtime.getURL("popup/restore.html") });
});
copyCartBtn.addEventListener("click", copyCartToClipboard);
countryGroupingBtn.addEventListener("click", () => toggleGrouping("country"));
compactViewBtn.addEventListener("click", toggleCompactMode);
clearCartBtn.addEventListener("click", clearCart);
undoBtn.addEventListener("click", undoLastAction);
dismissStatusBtn.addEventListener("click", dismissStatus);
markPurchasedBtn.addEventListener("click", markSelectedPurchased);
cartTabBtn.addEventListener("click", () => setActiveTab("cart"));
purchasedTabBtn.addEventListener("click", () => setActiveTab("purchased"));
languageToggleBtn.addEventListener("click", async () => {
  await setLanguage(currentLanguage === "tr" ? "en" : "tr");
  applyStaticTranslations();
  await renderCart();
});

themeToggleBtn.addEventListener("click", async () => {
  await setTheme(currentTheme === "dark" ? "light" : "dark");
  applyTheme();
});

browser.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) return;

  if (message.type === "UPDATE_PRICES_PROGRESS") {
    setUpdateProgress(message.current, message.total);
    setStatus(translate("pricesUpdatingProgress", { current: message.current, total: message.total }));
  }

  if (message.type === "UPDATE_PRICES_ITEM") {
    setItemUpdatePhase(message.id, message.phase);
  }

  if (message.type === "UPDATE_PRICES_DONE") {
    finishBackgroundPriceUpdate();
    setStatus(
      translate(message.cancelled ? "pricesUpdateCancelled" : "pricesUpdateDone", {
        changed: message.changed,
        failed: message.failed,
      }),
    );
  }
});

// İzin isteği kullanıcı tıklamasına bağlı ve Firefox bu hakkı işleyicideki ilk
// `await`'te düşürüyor. Bu yüzden istek hiçbir şey beklemeden, doğrudan
// tıklamanın içinden çıkıyor; sonuç `then` ile işleniyor.
function requestPermissionFromClick(event) {
  const button = event.target.closest?.("[data-grant-permission]");
  const origins = (button?.dataset.grantPermission || "").split(" ").filter(Boolean);

  if (origins.length === 0) return false;

  browser.permissions
    .request({ origins })
    .then((granted) => (granted ? renderCart() : null))
    .catch(() => setStatus(translate("permissionRequestHint")));

  return true;
}

// Verilen izin popup kapanmadan da gelebilir; liste kendini tazelesin.
if (browser.permissions?.onAdded) {
  browser.permissions.onAdded.addListener(() => {
    renderCart();
  });
}

permissionNoticeEl.addEventListener("click", (event) => {
  requestPermissionFromClick(event);
});

// Kart düğmeleri işini data-* özniteliğiyle söylüyor (data-remove="<id>" gibi).
// Düğmelerin içinde simge var; tıklama çoğu zaman <svg>'ye düşüyor, bu yüzden
// en yakın düğmeye bakılıyor.
const CART_ITEM_ACTIONS = {
  toggleSelected,
  editPrice: editItemPrice,
  remove: removeItem,
  open: openItem,
  increase: increaseQuantity,
  decrease: decreaseQuantity,
  purchase: markItemPurchased,
};

const PURCHASE_ACTIONS = {
  restorePurchase,
  deletePurchase,
  openPurchase,
};

async function runItemAction(event, actions) {
  const target = event.target.closest?.("button, input");
  if (!target) return;

  const name = Object.keys(actions).find((action) => target.dataset[action]);
  if (name) await actions[name](target.dataset[name]);
}

cartItemsEl.addEventListener("click", (event) => {
  // İzin isteği tıklamanın içinden, hiçbir şey beklemeden gitmeli.
  if (event.target.closest?.("[data-grant-permission]")) {
    requestPermissionFromClick(event);
    return;
  }

  runItemAction(event, CART_ITEM_ACTIONS);
});

purchasedItemsEl.addEventListener("click", (event) => runItemAction(event, PURCHASE_ACTIONS));

// Açılır pencereler: "Diğer işlemler" ve sıralama. Dışarı tıklayınca ya da
// Escape ile kapanıyorlar; biri açılınca öbürü kapanıyor.
const POPOVERS = [
  { button: moreActionsBtn, panel: moreActionsMenuEl },
  { button: sortBtn, panel: sortMenuEl },
];

function setPopoverOpen(popover, isOpen) {
  popover.panel.hidden = !isOpen;
  popover.button.setAttribute("aria-expanded", String(isOpen));
}

function closePopovers(except = null) {
  for (const popover of POPOVERS) {
    if (popover !== except && !popover.panel.hidden) setPopoverOpen(popover, false);
  }
}

for (const popover of POPOVERS) {
  popover.button.addEventListener("click", () => {
    closePopovers(popover);
    setPopoverOpen(popover, popover.panel.hidden);
  });
}

// "Diğer işlemler"de bir işlem seçilince menü kapanıyor. Tema renkleri art
// arda denensin diye menüyü açık bırakıyor; "Sepeti Temizle" de ilk tıklamada
// onay istediği için yalnızca onaylanınca kapatıyor. (clearCart depoyu
// okuyana kadar onay sayacına dokunmuyor; burada tıklamadan önceki hâli var.)
moreActionsMenuEl.addEventListener("click", (event) => {
  const item = event.target.closest?.("button.menu-item");

  if (!item) return;
  if (item === clearCartBtn && !clearCartConfirmTimer) return;

  setPopoverOpen(POPOVERS[0], false);
});

document.addEventListener("click", (event) => {
  for (const popover of POPOVERS) {
    if (popover.panel.hidden) continue;
    if (popover.panel.parentElement.contains(event.target)) continue;

    setPopoverOpen(popover, false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  const open = POPOVERS.find((popover) => !popover.panel.hidden);
  if (!open) return;

  setPopoverOpen(open, false);
  open.button.focus();
});

sortOptionsEl.addEventListener("click", async (event) => {
  const option = event.target.closest?.("[data-sort]");
  if (!option) return;

  setPopoverOpen(POPOVERS[1], false);
  await setSortMode(option.dataset.sort);
  renderSortOptions();
  await renderCart();
});

// Renk seçilir seçilmez uygulanıyor.
accentSwatchesEl.addEventListener("click", async (event) => {
  const swatch = event.target.closest?.("[data-accent]");
  if (!swatch) return;

  await setAccent({ preset: swatch.dataset.accent });
  applyAccent();
});

accentHueInput.addEventListener("input", () => {
  currentAccent = { hue: Number(accentHueInput.value) };
  applyAccent();
});

accentHueInput.addEventListener("change", async () => {
  await setAccent({ hue: Number(accentHueInput.value) });
});

// Sepet başka yerden de değişiyor: sağ tık menüsünden eklenen ürün, sürmekte
// olan fiyat güncellemesinin her ürünü. Liste bunları beklemeden gösteriyor.
let storageRenderTimer = null;

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes[OrtakSepetCart.CART_STORAGE_KEY] && !changes[PURCHASED_KEY]) return;

  clearTimeout(storageRenderTimer);
  storageRenderTimer = setTimeout(() => {
    renderCart();
  }, 80);
});

// Para birimi seçilince toplamlar hemen kayıtlı kurla çiziliyor; kur eskiyse
// arka planda yenilenip bir kez daha çiziliyor ("Kur alınıyor…" yazısı da
// böylece kalkıyor).
async function refreshRatesAndRender() {
  await refreshRatesIfStale();
  await renderCart();
}

currencySwitchEl.addEventListener("click", async (event) => {
  const button = event.target.closest?.("[data-display-currency]");
  if (!button) return;

  // Seçili para birimine yeniden basınca her ürün kendi para birimine dönüyor.
  const currency = button.dataset.displayCurrency;
  await setDisplayCurrency(currency === currentDisplayCurrency ? "mixed" : currency);
  const request = refreshRatesAndRender();
  await renderCart();
  await request;
});

async function initPopup() {
  currentLanguage = await getLanguage();
  currentTheme = await getTheme();
  currentAccent = await getAccent();
  currentSort = await getSortMode();
  currentDisplayCurrency = await getDisplayCurrency();
  await loadStoredRates();
  applyStaticTranslations();
  await refreshUndoVisibility();
  await renderCart();
  await resumeRunningPriceUpdate();
  await refreshRatesAndRender();
}

initPopup();
