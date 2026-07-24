// Ortak Sepet popup module: i18n.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

function translate(key, values = {}) {
  const dictionary = I18N[currentLanguage] || I18N.tr;
  let text = dictionary[key] || I18N.tr[key] || key;
  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

function translateCategory(categoryName) {
  return CATEGORY_LABELS[currentLanguage]?.[categoryName] || categoryName;
}

function getPaymentLabel(item) {
  if (currentLanguage === "tr") {
    return translate("installment");
  }

  return item.region === "UK" || getItemCurrency(item) === "GBP"
    ? translate("finance")
    : translate("installment");
}

function normalizeDeliveryText(text) {
  const normalized = normalizeForCategory(text);

  if (
    normalized.includes("ucretsiz kargo") ||
    normalized.includes("kargo bedava") ||
    normalized.includes("bedava kargo") ||
    normalized.includes("ucretsiz teslimat") ||
    normalized.includes("ucretsiz teslim") ||
    normalized.includes("free delivery") ||
    normalized.includes("free shipping")
  ) {
    return translate("freeDelivery");
  }

  if (
    normalized.includes("stoktan kargo") ||
    normalized.includes("ships from stock")
  ) {
    return currentLanguage === "en" ? "Ships from stock" : "Stoktan kargo";
  }

  if (
    normalized.includes("hizli gonderi") ||
    normalized.includes("fast delivery")
  ) {
    return currentLanguage === "en" ? "Fast delivery" : "Hızlı gönderi";
  }

  if (
    normalized.includes("ayni gun kargo") ||
    normalized.includes("same day dispatch") ||
    normalized.includes("same-day dispatch")
  ) {
    return currentLanguage === "en" ? "Same-day dispatch" : "Aynı gün kargo";
  }

  if (
    normalized.includes("sepette hesaplan") ||
    normalized.includes("calculated at checkout")
  ) {
    return translate("calculatedAtCheckout");
  }

  if (normalized.includes("free next day delivery")) {
    return currentLanguage === "en"
      ? "Free next day delivery"
      : "Ücretsiz ertesi gün teslimat";
  }

  if (
    normalized.includes("click & collect") ||
    normalized.includes("click and collect") ||
    normalized.includes("collect in store") ||
    normalized.includes("collection available")
  ) {
    return currentLanguage === "en"
      ? "Click & Collect available"
      : "Mağazadan teslim (Click & Collect)";
  }

  if (
    normalized.includes("depends on address") ||
    normalized.includes("calculated by vinted") ||
    normalized.includes("buyer protection")
  ) {
    return translate("calculatedAtCheckout");
  }

  if (
    normalized.includes("delivery options available") ||
    normalized.includes("delivery information available") ||
    normalized.includes("delivery available") ||
    normalized.includes("shipping available")
  ) {
    return translate("deliveryInfoAvailable");
  }

  return text;
}

async function getLanguage() {
  const result = await browser.storage.local.get(LANGUAGE_KEY);
  return result[LANGUAGE_KEY] || "tr";
}

async function setLanguage(language) {
  currentLanguage = language === "en" ? "en" : "tr";
  await browser.storage.local.set({ [LANGUAGE_KEY]: currentLanguage });
}

async function getTheme() {
  const result = await browser.storage.local.get(THEME_KEY);
  return result[THEME_KEY] === "dark" ? "dark" : "light";
}

async function setTheme(theme) {
  currentTheme = theme === "dark" ? "dark" : "light";
  await browser.storage.local.set({ [THEME_KEY]: currentTheme });
}

function applyTheme() {
  const isDark = currentTheme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  themeToggleBtn.classList.toggle("is-dark", isDark);
  themeToggleBtn.setAttribute(
    "aria-label",
    isDark ? translate("enableLightMode") : translate("enableDarkMode"),
  );
  themeToggleBtn.title = isDark
    ? translate("enableLightMode")
    : translate("enableDarkMode");
}

function applyLanguageToggle() {
  const isEnglish = currentLanguage === "en";
  const label = isEnglish
    ? translate("switchToTurkish")
    : translate("switchToEnglish");

  languageToggleBtn.classList.toggle("is-english", isEnglish);
  languageControlEl.classList.toggle("is-english", isEnglish);
  languageToggleBtn.setAttribute("aria-label", label);
  languageToggleBtn.setAttribute("aria-pressed", String(isEnglish));
  languageToggleBtn.title = label;
}

function setActionButtonLabel(button, label) {
  const labelElement = button.querySelector(".action-label");

  if (labelElement) {
    labelElement.textContent = label;
  } else {
    button.textContent = label;
  }
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;
  appSubtitleEl.textContent = translate("appSubtitle");
  setActionButtonLabel(addCurrentProductBtn, translate("addCurrentProduct"));
  setActionButtonLabel(updateAllPricesBtn, translate("updateAllPrices"));
  setActionButtonLabel(exportCsvBtn, translate("exportCsv"));
  clearCartBtn.textContent = translate("clearCart");
  itemCountLabelEl.textContent = translate("itemCount");
  totalPriceLabelEl.textContent = translate("total");
  selectedTotalPriceLabelEl.textContent = translate("selectedTotal");
  cartTitleEl.textContent = translate("cart");
  applyLanguageToggle();
  applyTheme();
}
