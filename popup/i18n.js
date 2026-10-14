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
    // TR content script'in genel ifadesi; İngilizce arayüzde de çevrilsin.
    normalized.includes("teslimat bilgisi var") ||
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

async function getAccent() {
  const result = await browser.storage.local.get(ACCENT_KEY);
  const accent = result[ACCENT_KEY];

  if (accent && Number.isFinite(accent.hue)) return { hue: accent.hue };
  if (accent && ACCENT_PRESETS.some((preset) => preset.id === accent.preset)) {
    return { preset: accent.preset };
  }

  return { preset: ACCENT_PRESETS[0].id };
}

async function setAccent(accent) {
  currentAccent = accent;
  await browser.storage.local.set({ [ACCENT_KEY]: accent });
}

// Kaydırıcının tonundan iki renk: ikincisi biraz kaydırılmış ton, böylece
// toplam kartındaki geçiş hazır renklerdeki gibi duruyor.
function getAccentColors(accent) {
  if (Number.isFinite(accent.hue)) {
    const hue = Math.round(accent.hue) % 360;
    return [`hsl(${hue} 72% 50%)`, `hsl(${(hue + 35) % 360} 72% 48%)`];
  }

  return (ACCENT_PRESETS.find((preset) => preset.id === accent.preset) || ACCENT_PRESETS[0]).colors;
}

// Renkten türeyen tonlar (açık zemin, karanlık temada aydınlatılmış hâli)
// popup.css'te color-mix ile üretiliyor; burada yalnızca iki ana renk
// veriliyor.
function applyAccent() {
  const [first, second] = getAccentColors(currentAccent);

  document.body.style.setProperty("--accent-1", first);
  document.body.style.setProperty("--accent-2-base", second);

  for (const swatch of accentSwatchesEl.querySelectorAll("[data-accent]")) {
    swatch.setAttribute("aria-pressed", String(swatch.dataset.accent === currentAccent.preset));
  }

  accentHueInput.classList.toggle("is-active", Number.isFinite(currentAccent.hue));
  if (Number.isFinite(currentAccent.hue)) accentHueInput.value = String(currentAccent.hue);
}

function renderAccentSwatches() {
  accentSwatchesEl.textContent = "";

  for (const preset of ACCENT_PRESETS) {
    const swatch = document.createElement("button");
    const name = translate(`accent_${preset.id}`);

    swatch.type = "button";
    swatch.className = "accent-swatch";
    swatch.dataset.accent = preset.id;
    swatch.title = name;
    swatch.setAttribute("aria-label", name);
    swatch.style.setProperty("--swatch-1", preset.colors[0]);
    swatch.style.setProperty("--swatch-2", preset.colors[1]);
    accentSwatchesEl.appendChild(swatch);
  }

  accentMenuTitleEl.textContent = translate("accentColor");
  accentCustomLabelEl.textContent = translate("accentCustom");
  accentHueInput.setAttribute("aria-label", translate("accentCustom"));
  applyAccent();
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
  dismissStatusBtn.setAttribute("aria-label", translate("dismissStatus"));
  dismissStatusBtn.title = translate("dismissStatus");
  appSubtitleEl.textContent = translate("appSubtitle");
  actionGridEl.setAttribute("aria-label", translate("cartActions"));
  setActionButtonLabel(addCurrentProductBtn, translate("addCurrentProduct"));
  setActionButtonLabel(updateAllPricesBtn, translate("updateAllPrices"));
  setActionButtonLabel(exportCsvBtn, translate("exportCsv"));
  setActionButtonLabel(backupCartBtn, translate("backupCart"));
  setActionButtonLabel(restoreCartBtn, translate("restoreCart"));
  setActionButtonLabel(categorizeProductsBtn, translate("chipCategory"));
  setActionButtonLabel(installmentProductsBtn, translate("chipInstallment"));
  setActionButtonLabel(countryGroupingBtn, translate("chipCountry"));
  setActionButtonLabel(compactViewBtn, translate("chipCompact"));
  groupByLabelEl.textContent = translate("groupBy");
  moreActionsBtn.setAttribute("aria-label", translate("moreActions"));
  moreActionsBtn.title = translate("moreActions");
  copyCartBtn.textContent = translate("copyCart");
  clearCartBtn.textContent = translate("clearCart");
  markPurchasedBtn.textContent = translate("markSelectedPurchased");
  undoBtn.textContent = translate("undo");
  itemCountLabelEl.textContent = translate("itemCount");
  totalPriceLabelEl.textContent = translate("total");
  selectedTotalPriceLabelEl.textContent = translate("selectedTotal");
  applyLanguageToggle();
  applyTheme();
  renderAccentSwatches();
  renderSortOptions();
}
