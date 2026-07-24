// Ortak Sepet popup module: init.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

async function clearCart() {
  await saveCartItems([]);
  await setViewMode("normal");
  setStatus(translate("cartCleared"));
  await renderCart();
}

addCurrentProductBtn.addEventListener("click", addCurrentProduct);
categorizeProductsBtn.addEventListener("click", categorizeProducts);
installmentProductsBtn.addEventListener("click", toggleInstallmentGrouping);
updateAllPricesBtn.addEventListener("click", updateAllPrices);
exportCsvBtn.addEventListener("click", exportCartAsCsv);
countryGroupingBtn.addEventListener("click", toggleCountryGrouping);
compactViewBtn.addEventListener("click", toggleCompactMode);
clearCartBtn.addEventListener("click", clearCart);
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
    setStatus(translate("pricesUpdatingProgress", { current: message.current, total: message.total }));
  }

  if (message.type === "UPDATE_PRICES_DONE") {
    setStatus(translate("pricesUpdateDone", { changed: message.changed, failed: message.failed }));
  }
});

cartItemsEl.addEventListener("click", async (event) => {
  const target = event.target;

  if (!target || !target.dataset) return;

  if (target.dataset.toggleSelected) {
    await toggleSelected(target.dataset.toggleSelected);
  }

  if (target.dataset.editPrice) {
    await editItemPrice(target.dataset.editPrice);
  }

  if (target.dataset.remove) {
    await removeItem(target.dataset.remove);
  }

  if (target.dataset.open) {
    await openItem(target.dataset.open);
  }

  if (target.dataset.increase) {
    await increaseQuantity(target.dataset.increase);
  }

  if (target.dataset.decrease) {
    await decreaseQuantity(target.dataset.decrease);
  }
});

async function initPopup() {
  currentLanguage = await getLanguage();
  currentTheme = await getTheme();
  applyStaticTranslations();
  await renderCart();
}

initPopup();
