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

// Koyu tema Basecoat'un kuralı: <html class="dark">. basecoat.theme.set()
// kullanılmıyor, o localStorage'a yazıyor; tercih browser.storage.local'da.
function applyTheme() {
  const isDark = currentTheme === "dark";
  const label = isDark ? translate("enableLightMode") : translate("enableDarkMode");

  document.documentElement.classList.toggle("dark", isDark);
  themeToggleBtn.setAttribute("aria-checked", String(isDark));
  themeToggleBtn.setAttribute("aria-label", label);
  themeToggleBtn.dataset.tooltip = label;
}

async function getAccent() {
  const result = await browser.storage.local.get(ACCENT_KEY);
  const accent = result[ACCENT_KEY];

  if (accent && Number.isFinite(accent.hue)) return { hue: accent.hue };
  if (accent && ACCENT_PRESETS.includes(accent.preset)) {
    return { preset: accent.preset };
  }

  return { preset: DEFAULT_ACCENT };
}

async function setAccent(accent) {
  currentAccent = accent;
  await browser.storage.local.set({ [ACCENT_KEY]: accent });
}

// Hazır renkler theme.css'te html[data-accent] ile seçiliyor. Kaydırıcıyla
// seçilen tonda gradyanın üç durağı ve seçili kur düğmesinin yazı rengi
// buradan veriliyor; beyaz yazı okunsun diye tonlar koyu tutuluyor.
function applyAccent() {
  const root = document.documentElement;
  const isCustom = Number.isFinite(currentAccent.hue);

  if (isCustom) {
    const hue = Math.round(currentAccent.hue) % 360;
    delete root.dataset.accent;
    root.style.setProperty("--os-g1", `hsl(${hue} 70% 28%)`);
    root.style.setProperty("--os-g2", `hsl(${(hue + 15) % 360} 70% 36%)`);
    root.style.setProperty("--os-g3", `hsl(${(hue + 30) % 360} 68% 42%)`);
    root.style.setProperty("--os-ink", `hsl(${hue} 70% 30%)`);
    accentHueInput.value = String(currentAccent.hue);
  } else {
    root.dataset.accent = currentAccent.preset;
    for (const name of ["--os-g1", "--os-g2", "--os-g3", "--os-ink"]) {
      root.style.removeProperty(name);
    }
  }

  for (const swatch of accentSwatchesEl.querySelectorAll("[data-accent]")) {
    swatch.setAttribute("aria-checked", String(swatch.dataset.accent === currentAccent.preset));
  }

  accentHueInput.classList.toggle("is-active", isCustom);
}

function renderAccentSwatches() {
  accentSwatchesEl.textContent = "";

  for (const preset of ACCENT_PRESETS) {
    const swatch = document.createElement("div");
    const name = translate(`accent_${preset}`);

    swatch.className = "os-swatch";
    swatch.setAttribute("role", "menuitemradio");
    swatch.dataset.accent = preset;
    swatch.dataset.tooltip = name;
    swatch.setAttribute("aria-label", name);
    accentSwatchesEl.appendChild(swatch);
  }

  accentMenuTitleEl.textContent = translate("accentColor");
  accentCustomLabelEl.textContent = translate("accentCustom");
  accentHueInput.setAttribute("aria-label", translate("accentCustom"));
  applyAccent();
}

function applyLanguageToggle() {
  languageCurrentEl.textContent = currentLanguage.toUpperCase();
  languageToggleBtn.setAttribute("aria-label", `${translate("language")}: ${currentLanguage.toUpperCase()}`);

  for (const option of languageMenuEl.querySelectorAll("[data-language]")) {
    option.setAttribute("aria-checked", String(option.dataset.language === currentLanguage));
  }
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
  setActionButtonLabel(cartTabBtn, translate("cart"));
  setActionButtonLabel(purchasedTabBtn, translate("tabPurchased"));
  groupByLabelEl.textContent = translate("groupBy");
  moreActionsBtn.setAttribute("aria-label", translate("moreActions"));
  setActionButtonLabel(copyCartBtn, translate("copyCart"));
  disarmClearCartConfirm();
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
