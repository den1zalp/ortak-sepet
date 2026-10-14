// Ortak Sepet popup module: render.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

// İzin isteme kullanıcı tıklamasından çağrılmak zorunda ve tıklama işleyicisi
// ilk `await`'te bu hakkı kaybediyor. Bu yüzden eksik izinler render sırasında
// bir kez hesaplanıp burada tutuluyor; işleyici hiçbir şey beklemeden okuyor.
let missingPermissionOrigins = [];

// Kartlardaki simgeler. Yol verisi sabit; innerHTML yerine createElementNS ile
// çiziliyor.
const ICON_PATHS = {
  purchase: ["M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z", "M3 6h18", "m9 13 2 2 4-4"],
  open: ["M15 3h6v6", "M10 14 21 3", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"],
  edit: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"],
  remove: ["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"],
  restore: ["M3 7v6h6", "M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"],
  minus: ["M5 12h14"],
  plus: ["M12 5v14", "M5 12h14"],
  check: ["m5 12 5 5 9-10"],
  key: ["M15 7a4 4 0 1 1-3.9 4.9L3 20v-3h3v-3h3l2.1-2.1A4 4 0 0 1 15 7Z"],
};

function createIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "button-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");

  for (const d of ICON_PATHS[name] || []) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }

  return svg;
}

// Kart düğmeleri: simge + metin. Metin sepet kartında görsel olarak gizli,
// ekran okuyucu ve testler için yerinde duruyor (bkz. popup.css).
function createItemButton({ icon, text, accessibleLabel, data, variant = "" }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `small-button ${variant}`.trim();
  button.title = text;
  button.setAttribute("aria-label", accessibleLabel);

  for (const [key, value] of Object.entries(data)) {
    button.dataset[key] = value;
  }

  const label = document.createElement("span");
  label.className = "button-text";
  label.textContent = text;

  button.appendChild(createIcon(icon));
  button.appendChild(label);

  return button;
}

function itemNeedsPermission(item) {
  if (missingPermissionOrigins.length === 0) return false;

  const origin = OrtakSepetCart.getDeclaredOriginForItem(item);

  return Boolean(origin) && missingPermissionOrigins.includes(origin);
}

function createGrantPermissionButton(origins, text, accessibleLabel) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "small-button grant-permission-button";
  button.textContent = text;
  // İşleyici bu listeyi senkron okuyabilsin diye origin'ler düğmenin üstünde.
  button.dataset.grantPermission = origins.join(" ");
  button.setAttribute("aria-label", accessibleLabel);

  return button;
}

function renderPermissionNotice() {
  permissionNoticeEl.textContent = "";
  permissionNoticeEl.hidden = missingPermissionOrigins.length === 0;

  if (missingPermissionOrigins.length === 0) return;

  const message = document.createElement("p");
  message.className = "permission-notice-text";
  message.textContent = translate("permissionNotice", {
    count: missingPermissionOrigins.length,
  });

  const hint = document.createElement("p");
  hint.className = "permission-notice-hint";
  hint.textContent = translate("permissionRequestHint");

  permissionNoticeEl.appendChild(message);
  permissionNoticeEl.appendChild(hint);
  permissionNoticeEl.appendChild(
    createGrantPermissionButton(
      missingPermissionOrigins,
      translate("permissionNoticeAll"),
      translate("permissionNoticeAllLabel"),
    ),
  );
}

// Açık sekmenin sitesine izin verilmemişse uyarıyı sepetten bağımsız göster.
// İzin isteği yine kullanıcının uyarıdaki düğmeye basmasıyla gidiyor: buraya
// gelene kadar birkaç `await` geçildiği için tıklama hakkı çoktan düşmüş olur.
async function showPermissionNoticeForTab(tab) {
  const missing = await OrtakSepetCart.findMissingOrigins([{ url: tab?.url }]);

  if (missing.length === 0) return false;

  missingPermissionOrigins = missing;
  renderPermissionNotice();
  setStatus(translate("permissionNotice", { count: missing.length }));

  return true;
}

function truncateProductTitle(titleText, maxLength = 60) {
  const cleanedTitle = String(titleText || "").replace(/\s+/g, " ").trim();

  if (cleanedTitle.length <= maxLength) {
    return cleanedTitle;
  }

  return `${cleanedTitle.slice(0, maxLength).trim()}…`;
}

function createDetailRow(labelText, valueText, shouldBoldValue = false, tone = "") {
  const row = document.createElement("span");
  row.className = tone ? `detail-row detail-row-${tone}` : "detail-row";

  const label = document.createElement("span");
  label.className = "detail-label";
  label.textContent = `${labelText}:`;

  const value = document.createElement("span");
  value.className = shouldBoldValue
    ? "detail-value detail-value-strong"
    : "detail-value";
  value.textContent = valueText;

  row.appendChild(label);
  row.appendChild(value);

  return row;
}

// Görsel mağazadan sıcak bağlantıyla çekiliyor; engellenirse arka plan onu
// indirip data URL olarak veriyor. Sepet ve alınanlar aynı yedeği kullansın
// diye tek yerde üretiliyor.
function createProductImage(imageUrl) {
  const image = document.createElement("img");
  image.className = "cart-image";
  image.alt = "";
  image.referrerPolicy = "no-referrer";

  if (!imageUrl) return image;

  let imageFallbackAttempted = false;

  image.addEventListener("error", async () => {
    if (imageFallbackAttempted) return;
    imageFallbackAttempted = true;

    try {
      const response = await browser.runtime.sendMessage({
        type: "FETCH_IMAGE_AS_DATA_URL",
        url: imageUrl,
      });

      if (response?.ok && response.dataUrl) {
        image.src = response.dataUrl;
      }
    } catch {
      // Görsel kullanılamıyorsa boş görsel alanı korunur.
    }
  });

  image.src = imageUrl;
  return image;
}

// Kategori adları shared/category.js'teki Türkçe adlar; taksit ve ülke
// grupları dilden bağımsız anahtar kullanıyor.
const GROUP_COLORS = {
  "Anne & Bebek": "#f9a8d4",
  "İçecek": "#38bdf8",
  "Elektronik": "#60a5fa",
  "Telefon & Aksesuar": "#818cf8",
  "Bilgisayar": "#fb923c",
  "Ev & Yaşam": "#34d399",
  "Kişisel Bakım": "#c084fc",
  "Giyim": "#f472b6",
  "Kitap & Kırtasiye": "#a78bfa",
  "Market": "#22c55e",
  "Oyuncak": "#facc15",
  "Otomotiv": "#94a3b8",
  "installment-yes": "#22c55e",
  "installment-no": "#94a3b8",
  TR: "#ef4444",
  UK: "#2563eb",
};

const DEFAULT_GROUP_COLOR = "#d1d5db";

function applyCategoryAccent(element, groupKey) {
  element.style.setProperty("--category-color", GROUP_COLORS[groupKey] || DEFAULT_GROUP_COLOR);
}

// Ürün adı, altında site ve kategori. Sepet ve alınanlar aynı başlığı kullanıyor.
function createTitleBlock(record, fullTitle) {
  const titleContainer = document.createElement("div");
  titleContainer.className = "title-container";

  const title = document.createElement("div");
  title.className = "cart-title";
  title.textContent = truncateProductTitle(fullTitle, 90);
  title.title = fullTitle;
  titleContainer.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "item-meta";

  const site = document.createElement("span");
  site.className = "item-site";
  site.textContent = record.site || translate("unknownSite");
  meta.appendChild(site);

  if (record.category) {
    const categoryBadge = document.createElement("span");
    categoryBadge.className = "category-badge";
    categoryBadge.textContent = translateCategory(record.category);
    applyCategoryAccent(categoryBadge, record.category);
    meta.appendChild(categoryBadge);
  }

  titleContainer.appendChild(meta);
  return titleContainer;
}

// Fiyat büyük yazılıyor; son güncellemede değiştiyse altında ne kadar değiştiği
// ve üstü çizili eski fiyat.
function createPriceRow(item) {
  const row = document.createElement("div");
  row.className = "price-row";

  const price = document.createElement("span");
  price.className = item.price ? "item-price" : "item-price item-price-missing";
  price.textContent = getPriceDisplayText(item);
  row.appendChild(price);

  const convertedText = getConvertedPriceText(item);
  if (convertedText) {
    const converted = document.createElement("span");
    converted.className = "price-converted";
    converted.title = translate("convertedPriceTitle");
    converted.textContent = convertedText;
    row.appendChild(converted);
  }

  if (!item.previousPrice || item.previousPrice === item.price) return row;

  const change = document.createElement("span");
  change.className = "price-change";
  row.appendChild(change);

  const current = extractNumberFromPrice(item.price);
  const previous = extractNumberFromPrice(item.previousPrice);
  const sameCurrency =
    detectCurrencyFromPrice(item.previousPrice) === detectCurrencyFromPrice(item.price || "");

  if (current !== null && previous !== null && sameCurrency && current !== previous) {
    const dropped = current < previous;
    const delta = document.createElement("span");
    delta.className = `price-delta ${dropped ? "price-delta-down" : "price-delta-up"}`;
    delta.textContent = `${dropped ? "↓" : "↑"} ${formatPriceByCurrency(
      Math.abs(current - previous),
      getItemCurrency(item),
    )}`;
    change.appendChild(delta);
  }

  const previousPrice = document.createElement("span");
  previousPrice.className = "previous-price";
  previousPrice.title = translate("previous");
  previousPrice.setAttribute("aria-label", `${translate("previous")}: ${item.previousPrice}`);
  previousPrice.textContent = item.previousPrice;
  change.appendChild(previousPrice);

  return row;
}

function createSelectCheckbox(item, fullTitle) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "select-checkbox";
  checkbox.checked = isSelected(item);
  checkbox.dataset.toggleSelected = item.id;
  checkbox.title = translate("selectedTotalTitle");
  // Sepette çok sayıda aynı görünen denetim var; ekran okuyucunun hangi ürüne
  // ait olduğunu söyleyebilmesi için her biri ürün adıyla adlandırılıyor.
  checkbox.setAttribute("aria-label", translate("selectItemLabel", { title: fullTitle }));

  return checkbox;
}

// Taksit, kargo ve durum küçük etiketler; olağan dışı olanlar renkli.
function createItemDetails(item) {
  const details = document.createElement("div");
  details.className = "product-details";

  const installmentDisplay = getInstallmentDisplay(item);
  const shippingDisplay = getShippingDisplay(item);

  details.appendChild(
    createDetailRow(
      getPaymentLabel(item),
      installmentDisplay.text,
      installmentDisplay.bold,
      item.installmentAvailable === true ? "positive" : "",
    ),
  );

  details.appendChild(
    createDetailRow(
      translate("delivery"),
      shippingDisplay.text,
      shippingDisplay.bold,
      item.freeShipping === true ? "positive" : "",
    ),
  );

  const stockDisplayText = getStockDisplayText(item);
  if (stockDisplayText) {
    details.appendChild(createDetailRow(translate("stockStatus"), stockDisplayText, false, "warning"));
  }

  if (item.manualPrice === true) {
    details.appendChild(createDetailRow(translate("source"), translate("manual"), true));
  }

  // Başarılı kontrol her üründe aynı; yalnızca dikkat isteyen sonuç gösteriliyor.
  const lastUpdateText = getLastUpdateText(item);

  if (lastUpdateText && item.lastUpdateStatus !== "success") {
    details.appendChild(
      createDetailRow(translate("check"), lastUpdateText, true, getUpdateStatusTone(item.lastUpdateStatus)),
    );
  }

  return details;
}

function getUpdateStatusTone(status) {
  if (status === "failed") return "danger";
  if (status === "permission" || status === "unavailable") return "warning";
  return "";
}

function createQuantityButton(direction, item, fullTitle) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quantity-button";
  button.dataset[direction] = item.id;
  button.setAttribute(
    "aria-label",
    translate(direction === "increase" ? "increaseQuantityLabel" : "decreaseQuantityLabel", { title: fullTitle }),
  );
  button.appendChild(createIcon(direction === "increase" ? "plus" : "minus"));

  return button;
}

function createItemFooter(item, fullTitle) {
  const footer = document.createElement("div");
  footer.className = "item-footer";

  const quantityRow = document.createElement("div");
  quantityRow.className = "quantity-row";

  const quantityText = document.createElement("span");
  quantityText.className = "quantity-text";
  quantityText.textContent = String(getQuantity(item));
  quantityText.title = translate("quantity", { quantity: getQuantity(item) });

  quantityRow.appendChild(createQuantityButton("decrease", item, fullTitle));
  quantityRow.appendChild(quantityText);
  quantityRow.appendChild(createQuantityButton("increase", item, fullTitle));
  footer.appendChild(quantityRow);

  return footer;
}

// Ara toplam fiyatın yanında. Tek adette fiyatın aynısı olduğundan yalnızca
// bir şey anlattığında yazılıyor: birden fazla adet ya da toplama girmeyen ürün.
function createCartPriceRow(item) {
  const row = createPriceRow(item);

  if (getQuantity(item) > 1 || hasUnavailableMainPrice(item)) {
    row.appendChild(createLineTotal(getItemLineTotal(item)));
  }

  return row;
}

function createLineTotal(text) {
  const lineTotal = document.createElement("div");
  lineTotal.className = "line-total";
  lineTotal.textContent = text;

  return lineTotal;
}

function createCartItemActions(item, fullTitle) {
  const actions = document.createElement("div");
  actions.className = "cart-actions";

  actions.appendChild(
    createItemButton({
      icon: "purchase",
      text: translate("markPurchased"),
      accessibleLabel: translate("markPurchasedLabel", { title: fullTitle }),
      data: { purchase: item.id },
      variant: "small-button-success",
    }),
  );
  actions.appendChild(
    createItemButton({
      icon: "open",
      text: translate("goToLink"),
      accessibleLabel: translate("openLinkLabel", { title: fullTitle }),
      data: { open: item.id },
    }),
  );
  actions.appendChild(
    createItemButton({
      icon: "edit",
      text: translate("manualPrice"),
      accessibleLabel: translate("manualPriceLabel", { title: fullTitle }),
      data: { editPrice: item.id },
      variant: "icon-only",
    }),
  );

  if (itemNeedsPermission(item)) {
    actions.appendChild(
      createGrantPermissionButton(
        [OrtakSepetCart.getDeclaredOriginForItem(item)],
        translate("grantPermission"),
        translate("grantPermissionLabel", { title: fullTitle }),
      ),
    );
  }

  actions.appendChild(
    createItemButton({
      icon: "remove",
      text: translate("remove"),
      accessibleLabel: translate("removeLabel", { title: fullTitle }),
      data: { remove: item.id },
      variant: "small-button-danger icon-only",
    }),
  );

  return actions;
}

// Sepet ve alınanlar kartının ortak iskeleti: görsel ve içerik parçaları.
// Parçaların kartta nereye oturacağına CSS karar veriyor (grid alanları).
function createItemCard(record, mediaExtras, infoParts) {
  const card = document.createElement("article");
  card.className = "cart-item";

  if (record.category) {
    applyCategoryAccent(card, record.category);
    card.classList.add("cart-item-with-category");
  }

  const media = document.createElement("div");
  media.className = "item-media";
  media.appendChild(createProductImage(record.image));
  mediaExtras.forEach((element) => media.appendChild(element));

  const info = document.createElement("div");
  info.className = "cart-info";
  infoParts.forEach((element) => info.appendChild(element));

  card.appendChild(media);
  card.appendChild(info);

  return card;
}

function createCartItemElement(item) {
  const fullTitle = item.title || translate("noProductTitle");

  const card = createItemCard(item, [createSelectCheckbox(item, fullTitle)], [
    createTitleBlock(item, fullTitle),
    createCartPriceRow(item),
    createItemDetails(item),
    createItemFooter(item, fullTitle),
    createCartItemActions(item, fullTitle),
  ]);

  card.dataset.itemId = item.id;
  card.classList.toggle("cart-item-unselected", !isSelected(item));
  card.classList.toggle("cart-item-update-failed", item.lastUpdateStatus === "failed");
  card.classList.toggle("cart-item-needs-permission", itemNeedsPermission(item));

  return card;
}

// Gruplar { key, label, items } biçiminde: key rengi, label başlığı veriyor.
function groupBy(items, getKey) {
  const grouped = new Map();

  for (const item of items) {
    const key = getKey(item);

    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }

  return Array.from(grouped, ([key, groupItems]) => ({ key, items: groupItems }));
}

function groupItemsByInstallment(items) {
  const order = ["installment-yes", "installment-no"];

  return groupBy(items, (item) => (item.installmentAvailable === true ? order[0] : order[1]))
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    .map((group) => ({
      ...group,
      label: translate(group.key === order[0] ? "installmentAvailableGroup" : "installmentUnavailableGroup"),
    }));
}

function groupItemsByCategory(items) {
  const OTHER = "Diğer";

  return groupBy(items, (item) => item.category || OTHER)
    .sort((a, b) => {
      if (a.key === OTHER) return 1;
      if (b.key === OTHER) return -1;
      return a.key.localeCompare(b.key, "tr-TR");
    })
    .map((group) => ({ ...group, label: translateCategory(group.key) }));
}

function groupItemsByCountry(items) {
  const order = ["TR", "UK"];

  return groupBy(items, getItemRegion)
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    .map((group) => ({ ...group, label: getRegionLabel(group.key) }));
}

function createGroupElement({ key, label, items }, createItem) {
  const group = document.createElement("section");
  group.className = "category-group";
  if (key) applyCategoryAccent(group, key);

  const header = document.createElement("div");
  header.className = "category-header";

  const title = document.createElement("h3");
  title.className = "category-title";
  title.textContent = label;

  const meta = document.createElement("span");
  meta.className = "category-meta";
  meta.textContent = translate("productMeta", {
    products: items.length,
    quantity: calculateTotalItemCount(items),
    total: calculateCategoryTotal(items),
  });

  header.appendChild(title);
  header.appendChild(meta);
  group.appendChild(header);

  for (const item of items) {
    group.appendChild(createItem(item));
  }

  return group;
}

function getCartGroups(items, viewMode) {
  if (viewMode === "installment") return groupItemsByInstallment(items);
  if (viewMode === "country") return groupItemsByCountry(items);
  if (viewMode === "category" && items.some((item) => Boolean(item.category))) {
    return groupItemsByCategory(items);
  }

  return null;
}

function getPurchaseMonthKey(record) {
  const date = new Date(record.purchasedAt);

  if (Number.isNaN(date.getTime())) return "0000-00";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);

  if (!year || !month) return monthKey;

  return new Date(year, month - 1, 1).toLocaleDateString(
    currentLanguage === "en" ? "en-GB" : "tr-TR",
    { year: "numeric", month: "long" },
  );
}

function formatPurchaseDate(record) {
  const date = new Date(record.purchasedAt);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(
    currentLanguage === "en" ? "en-GB" : "tr-TR",
    { day: "2-digit", month: "2-digit", year: "numeric" },
  );
}

function groupPurchasesByMonth(records) {
  // En yeni ay üstte, ay içinde de en son alınan üstte.
  return groupBy(records, getPurchaseMonthKey)
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((group) => ({
      key: null,
      label: formatMonthLabel(group.key),
      items: group.items.sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt)),
    }));
}

function createPurchaseActions(record, fullTitle) {
  const actions = document.createElement("div");
  actions.className = "cart-actions";

  actions.appendChild(
    createItemButton({
      icon: "restore",
      text: translate("restoreToCart"),
      accessibleLabel: translate("restoreToCartLabel", { title: fullTitle }),
      data: { restorePurchase: record.id },
    }),
  );
  actions.appendChild(
    createItemButton({
      icon: "open",
      text: translate("goToLink"),
      accessibleLabel: translate("openLinkLabel", { title: fullTitle }),
      data: { openPurchase: record.id },
    }),
  );
  actions.appendChild(
    createItemButton({
      icon: "remove",
      text: translate("deletePurchase"),
      accessibleLabel: translate("deletePurchaseLabel", { title: fullTitle }),
      data: { deletePurchase: record.id },
      variant: "small-button-danger",
    }),
  );

  return actions;
}

function createPurchaseFooter(record) {
  const footer = document.createElement("div");
  footer.className = "item-footer";

  const purchaseDate = document.createElement("div");
  purchaseDate.className = "purchase-date";
  purchaseDate.textContent = `${translate("purchasedOn")}: ${formatPurchaseDate(record)}`;
  footer.appendChild(purchaseDate);

  return footer;
}

function createPurchasePriceRow(record) {
  const row = createPriceRow({ ...record, previousPrice: null });

  if (getQuantity(record) > 1) {
    row.appendChild(
      createLineTotal(`${translate("quantity", { quantity: getQuantity(record) })} · ${getItemLineTotal(record)}`),
    );
  }

  return row;
}

function createPurchaseElement(record) {
  const fullTitle = record.title || translate("noProductTitle");

  const card = createItemCard(record, [], [
    createTitleBlock(record, fullTitle),
    createPurchasePriceRow(record),
    createPurchaseFooter(record),
    createPurchaseActions(record, fullTitle),
  ]);

  card.classList.add("cart-item-purchase");
  return card;
}

function renderPurchasedSummary(records) {
  purchasedSummaryEl.innerHTML = "";

  if (records.length === 0) return;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthRecords = records.filter(
    (record) => getPurchaseMonthKey(record) === currentMonthKey,
  );

  const entries = [
    [translate("purchasedThisMonth"), calculateCategoryTotal(thisMonthRecords)],
    [translate("purchasedAllTime"), calculateCategoryTotal(records)],
  ];

  for (const [label, total] of entries) {
    const entry = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = total;
    entry.append(`${label}: `, strong);
    purchasedSummaryEl.appendChild(entry);
  }
}

async function renderPurchased() {
  const records = await getPurchasedItems();

  renderPurchasedSummary(records);
  purchasedItemsEl.innerHTML = "";

  if (records.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = translate("emptyPurchased");
    purchasedItemsEl.appendChild(empty);
    return;
  }

  for (const group of groupPurchasesByMonth(records)) {
    purchasedItemsEl.appendChild(createGroupElement(group, createPurchaseElement));
  }
}

async function refreshTabs() {
  const [items, records] = await Promise.all([
    getCartItems(),
    getPurchasedItems(),
  ]);

  cartTabBtn.textContent = `${translate("cart")} (${items.length})`;
  purchasedTabBtn.textContent = `${translate("tabPurchased")} (${records.length})`;

  applyActiveTab();

  if (isPurchasedTabActive()) {
    await renderPurchased();
  }
}

async function setActiveTab(tab) {
  activeTab = tab === "purchased" ? "purchased" : "cart";
  await refreshTabs();
}

// Liste her değişiklikte baştan çiziliyor; hangi kartın yeni geldiğini ya da
// fiyatının az önce değiştiğini bilmek için bir önceki çizimde ne olduğu
// burada tutuluyor. İlk çizimde hiçbir kart vurgulanmıyor.
let renderedPrices = null;

function highlightChangedItems(items) {
  const nextPrices = new Map(items.map((item) => [item.id, item.price || ""]));

  if (renderedPrices) {
    for (const element of cartItemsEl.querySelectorAll("[data-item-id]")) {
      const id = element.dataset.itemId;

      if (!renderedPrices.has(id)) {
        element.classList.add("is-new");
      } else if (renderedPrices.get(id) !== nextPrices.get(id)) {
        element.classList.add("is-updated");
      }
    }
  }

  renderedPrices = nextPrices;
}

// Fiyat güncellemesi sırasında o an güncellenen ürünlerin kartı aşama aşama
// doluyor (sekme açılıyor → sayfa yükleniyor → okunuyor → bitti). Aşamalar
// arka plandan UPDATE_PRICES_ITEM ile geliyor; liste yeniden çizilince
// buradan kartlara tekrar uygulanıyor.
const itemUpdatePhases = new Map();

function applyItemUpdatePhases() {
  for (const element of cartItemsEl.querySelectorAll("[data-item-id]")) {
    const phase = itemUpdatePhases.get(element.dataset.itemId);

    if (phase) element.dataset.updatePhase = phase;
    else delete element.dataset.updatePhase;
  }
}

function setItemUpdatePhase(id, phase) {
  itemUpdatePhases.set(id, phase);
  applyItemUpdatePhases();

  // "Bitti" bir an dolu kalıyor, sonra dolgu kayboluyor.
  if (phase === "done") {
    setTimeout(() => {
      if (itemUpdatePhases.get(id) !== "done") return;

      itemUpdatePhases.delete(id);
      applyItemUpdatePhases();
    }, 900);
  }
}

function clearItemUpdatePhases() {
  itemUpdatePhases.clear();
  applyItemUpdatePhases();
}

function setGroupingChip(button, isActive, label) {
  button.classList.toggle("is-active", isActive);
  button.setAttribute("aria-pressed", String(isActive));
  button.title = label;
}

function renderSortOptions() {
  sortOptionsEl.textContent = "";

  for (const mode of SORT_OPTIONS) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "menu-item sort-option";
    option.setAttribute("role", "menuitemradio");
    option.setAttribute("aria-checked", String(mode === currentSort));
    option.dataset.sort = mode;
    option.appendChild(createIcon("check"));

    const label = document.createElement("span");
    label.textContent = translate(`sort_${mode}`);
    option.appendChild(label);

    sortOptionsEl.appendChild(option);
  }

  const label = `${translate("sortBy")}: ${translate(`sort_${currentSort}`)}`;
  sortBtn.title = label;
  sortBtn.setAttribute("aria-label", label);
  sortBtn.classList.toggle("is-active", currentSort !== "added");
  sortMenuTitleEl.textContent = translate("sortBy");
}

function renderCurrencySwitch(items) {
  for (const button of currencySwitchEl.querySelectorAll("[data-display-currency]")) {
    const currency = button.dataset.displayCurrency;
    const isSelected = currency === currentDisplayCurrency;
    button.textContent = translate(`currency_${currency}`);
    button.title = isSelected
      ? translate("showOwnCurrencies")
      : translate("showInCurrency", { currency: translate(`currency_${currency}`) });
    button.setAttribute("aria-pressed", String(isSelected));
  }

  currencySwitchEl.setAttribute("aria-label", translate("displayCurrency"));

  const rateInfo = getRateInfoText(items);
  rateInfoEl.textContent = rateInfo;
  rateInfoEl.hidden = !rateInfo;
}

async function renderCart() {
  const items = await getCartItems();
  const viewMode = await getViewMode();
  const compactMode = await getCompactMode();

  applyCompactMode(compactMode);
  await refreshTabs();

  missingPermissionOrigins = await OrtakSepetCart.findMissingOrigins(items);
  renderPermissionNotice();

  cartItemsEl.innerHTML = "";
  itemCountEl.textContent = String(calculateTotalItemCount(items));
  totalPriceEl.textContent = calculateTotal(items);
  selectedTotalPriceEl.textContent = calculateSelectedTotal(items);
  renderCurrencySwitch(items);
  markPurchasedBtn.hidden = items.length === 0;

  setGroupingChip(
    categorizeProductsBtn,
    viewMode === "category",
    viewMode === "category" ? translate("removeCategories") : translate("categorizeProducts"),
  );
  setGroupingChip(
    installmentProductsBtn,
    viewMode === "installment",
    viewMode === "installment"
      ? translate("removeInstallmentGrouping")
      : translate("installmentProducts"),
  );
  setGroupingChip(
    countryGroupingBtn,
    viewMode === "country",
    viewMode === "country" ? translate("removeCountryGrouping") : translate("countryGrouping"),
  );

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = translate("emptyCart");
    cartItemsEl.appendChild(empty);
    renderedPrices = new Map();
    return;
  }

  const sortedItems = sortItems(items, currentSort);
  const groups = getCartGroups(sortedItems, viewMode);

  if (groups) {
    groups.forEach((group) => cartItemsEl.appendChild(createGroupElement(group, createCartItemElement)));
  } else {
    sortedItems.forEach((item) => cartItemsEl.appendChild(createCartItemElement(item)));
  }

  highlightChangedItems(items);
  applyItemUpdatePhases();
}
