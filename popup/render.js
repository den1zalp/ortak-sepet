// Ortak Sepet popup module: render.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

// İzin isteme kullanıcı tıklamasından çağrılmak zorunda ve tıklama işleyicisi
// ilk `await`'te bu hakkı kaybediyor. Bu yüzden eksik izinler render sırasında
// bir kez hesaplanıp burada tutuluyor; işleyici hiçbir şey beklemeden okuyor.
let missingPermissionOrigins = [];

// Kart düğmelerindeki simgeler popup.html'deki <template id="iconTemplates">
// içinde; innerHTML kullanmamak için oradan kopyalanıyor. Kartların kendisi de
// birer <template>.
const iconTemplatesEl = document.getElementById("iconTemplates");
const cartItemTemplate = document.getElementById("cartItemTemplate");
const purchaseItemTemplate = document.getElementById("purchaseItemTemplate");

function createIcon(name) {
  const icon = iconTemplatesEl.content.querySelector(`[data-icon="${name}"]`);
  return icon ? icon.cloneNode(true) : document.createElementNS("http://www.w3.org/2000/svg", "svg");
}

function cloneTemplate(template) {
  return template.content.firstElementChild.cloneNode(true);
}

// Kart düğmeleri yalnızca simge; ne yaptığı ipucunda (data-tooltip) yazıyor.
// Metin ekran okuyucu ve testler için görünmez bir <span>'de duruyor.
function createItemButton({ icon, text, accessibleLabel, data, variant = "", align = "" }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `btn ${variant}`.trim();
  button.dataset.variant = "ghost";
  button.dataset.size = "icon-sm";
  button.dataset.tooltip = text;
  if (align) button.dataset.align = align;
  button.setAttribute("aria-label", accessibleLabel);

  for (const [key, value] of Object.entries(data)) {
    button.dataset[key] = value;
  }

  const label = document.createElement("span");
  label.className = "os-sr-only";
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
  button.className = "btn grant-permission-button";
  button.dataset.size = "xs";
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

// Görsel mağazadan sıcak bağlantıyla çekiliyor; engellenirse arka plan onu
// indirip data URL olarak veriyor. Sepet ve alınanlar aynı yedeği kullansın
// diye tek yerde üretiliyor. Görsel yoksa kartta simgeli yer tutucu kalıyor
// (theme.css: görünür <img>'den sonraki yer tutucu gizli).
function createProductImage(imageUrl) {
  const image = document.createElement("img");
  image.className = "cart-image";
  image.alt = "";
  image.referrerPolicy = "no-referrer";

  if (!imageUrl) {
    image.hidden = true;
    return image;
  }

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
        return;
      }
    } catch {
      // Görsel kullanılamıyorsa yer tutucu görünür.
    }

    image.hidden = true;
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

// Görsel, ad ve site: sepet ve alınanlar kartında ortak. Ürün adı ürün
// sayfasına bağlantı: kompakt görünümde işlem düğmeleri gizli olduğu için
// sayfaya gitmenin tek yolu bu. Tıklamayı init.js karşılıyor (linkAction ile
// adı verilen işlem); href orta tık ve klavye için duruyor.
function fillItemBasics(card, record, fullTitle, linkAction) {
  card.querySelector(".os-item-media").prepend(createProductImage(record.image));

  const title = card.querySelector(".cart-title");
  title.title = fullTitle;

  if (record.url) {
    const link = document.createElement("a");
    link.className = "os-item-link";
    link.href = record.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset[linkAction] = record.id;
    link.textContent = fullTitle;
    title.appendChild(link);
  } else {
    title.textContent = fullTitle;
  }

  card.querySelector(".os-item-store").textContent = record.site || translate("unknownSite");

  if (record.category) {
    applyCategoryAccent(card, record.category);
    card.classList.add("cart-item-with-category");
  }
}

function createBadge(text, { variant = "outline", tone = "", dot = false, icon = "", className = "", label = "" } = {}) {
  const badge = document.createElement("span");
  badge.className = `badge ${className}`.trim();
  badge.dataset.variant = variant;
  if (tone) badge.dataset.tone = tone;
  if (label) badge.title = label;

  if (dot) {
    const dotEl = document.createElement("span");
    dotEl.className = "os-dot";
    dotEl.setAttribute("aria-hidden", "true");
    badge.appendChild(dotEl);
  }

  if (icon) badge.appendChild(createIcon(icon));
  badge.append(text);

  return badge;
}

// İngiliz mağazalarında taksit yerine "finance" deniyor (bkz. getPaymentLabel).
function getInstallmentBadgeText(item) {
  return getPaymentLabel(item) === translate("finance")
    ? translate("financeBadge")
    : translate("installmentBadge");
}

// Kategori, taksit, kargo ve durum küçük rozetler; olağan dışı olanlar
// renkli. Taksit yoksa rozet de yok: "yok" ile "okunamadı" ayrımı yalnızca
// depoda tutuluyor.
function createItemBadges(item) {
  const badges = [];

  if (item.category) {
    const category = createBadge(translateCategory(item.category), { dot: true, className: "os-badge-category" });
    applyCategoryAccent(category, item.category);
    badges.push(category);
  }

  if (item.installmentAvailable === true) {
    badges.push(
      createBadge(getInstallmentBadgeText(item), { dot: true, tone: "success", className: "os-badge-installment" }),
    );
  }

  const shippingDisplay = getShippingDisplay(item);
  badges.push(
    createBadge(shippingDisplay.text, {
      variant: "secondary",
      icon: "truck",
      tone: item.freeShipping === true ? "success" : "",
      className: "os-badge-shipping",
      label: translate("deliveryBadgeLabel", { text: shippingDisplay.text }),
    }),
  );

  const stockDisplayText = getStockDisplayText(item);
  if (stockDisplayText) {
    badges.push(createBadge(stockDisplayText, { tone: "warning", className: "os-badge-stock" }));
  }

  if (item.manualPrice === true) {
    badges.push(createBadge(`${translate("source")}: ${translate("manual")}`, { className: "os-badge-manual" }));
  }

  // Başarılı kontrol her üründe aynı; yalnızca dikkat isteyen sonuç gösteriliyor.
  const lastUpdateText = getLastUpdateText(item);

  if (lastUpdateText && item.lastUpdateStatus !== "success") {
    badges.push(
      createBadge(`${translate("check")}: ${lastUpdateText}`, {
        tone: getUpdateStatusTone(item.lastUpdateStatus),
        className: "os-badge-check",
      }),
    );
  }

  return badges;
}

function getUpdateStatusTone(status) {
  if (status === "failed") return "danger";
  if (status === "permission" || status === "unavailable") return "warning";
  return "";
}

// Büyük yazılan tutar satırın tutarı (fiyat × adet); birden fazla adette
// altında birim fiyat. Kurla çevrilen görünümde yaklaşık karşılığı, son
// güncellemede fiyat değiştiyse ne kadar değiştiği ve üstü çizili eski fiyat.
function fillItemAmount(card, item, { showChange = true } = {}) {
  const quantity = getQuantity(item);
  const lineTotal = calculateItemTotal(item);
  const price = card.querySelector(".os-item-price");
  const unit = card.querySelector(".os-item-unit");

  price.classList.toggle("os-item-price-missing", !item.price);

  if (quantity > 1 && lineTotal !== null) {
    price.textContent = formatPriceByCurrency(lineTotal, getItemCurrency(item));
    unit.textContent = `${quantity} × ${item.price}`;
    unit.hidden = false;
  } else {
    price.textContent = getPriceDisplayText(item);
  }

  // Fiyatı olmayan ürün toplama girmiyor; bunu tutarın altında söylüyoruz.
  if (hasUnavailableMainPrice(item)) {
    unit.textContent = translate("subtotalNotIncluded");
    unit.hidden = false;
  }

  const converted = card.querySelector(".os-item-converted");
  const convertedText = getConvertedPriceText(item);
  if (converted && convertedText) {
    converted.textContent = convertedText;
    converted.title = translate("convertedPriceTitle");
    converted.hidden = false;
  }

  const change = card.querySelector(".os-item-change");
  if (!change || !showChange || !item.previousPrice || item.previousPrice === item.price) return;

  change.hidden = false;

  const current = extractNumberFromPrice(item.price);
  const previous = extractNumberFromPrice(item.previousPrice);
  const sameCurrency =
    detectCurrencyFromPrice(item.previousPrice) === detectCurrencyFromPrice(item.price || "");
  const delta = change.querySelector(".os-price-delta");

  if (current !== null && previous !== null && sameCurrency && current !== previous) {
    const dropped = current < previous;
    delta.dataset.direction = dropped ? "down" : "up";
    delta.textContent = `${dropped ? "↓" : "↑"} ${formatPriceByCurrency(
      Math.abs(current - previous),
      getItemCurrency(item),
    )}`;
  } else {
    delta.remove();
  }

  const previousPrice = change.querySelector(".os-previous-price");
  previousPrice.title = translate("previous");
  previousPrice.setAttribute("aria-label", `${translate("previous")}: ${item.previousPrice}`);
  previousPrice.textContent = item.previousPrice;
}

// Şablondaki adet düğmeleri data-qty ile işaretli; işleyici (init.js) ürünü
// data-increase / data-decrease="<id>"'den buluyor.
function fillQuantity(card, item, fullTitle) {
  const quantity = getQuantity(item);
  card.querySelector(".os-qty").setAttribute("aria-label", translate("quantityGroup"));

  const value = card.querySelector(".os-qty-value");
  value.value = String(quantity);
  value.title = translate("quantity", { quantity });

  for (const button of card.querySelectorAll("[data-qty]")) {
    const direction = button.dataset.qty;
    delete button.dataset.qty;
    button.dataset[direction] = item.id;
    button.setAttribute(
      "aria-label",
      translate(direction === "increase" ? "increaseQuantityLabel" : "decreaseQuantityLabel", { title: fullTitle }),
    );
  }
}

function fillCartItemActions(actions, item, fullTitle) {
  actions.appendChild(
    createItemButton({
      icon: "purchase",
      text: translate("markPurchased"),
      accessibleLabel: translate("markPurchasedLabel", { title: fullTitle }),
      data: { purchase: item.id },
      variant: "os-action-purchase",
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
      icon: "edit",
      text: translate("manualPrice"),
      accessibleLabel: translate("manualPriceLabel", { title: fullTitle }),
      data: { editPrice: item.id },
      align: "end",
    }),
  );
  actions.appendChild(
    createItemButton({
      icon: "remove",
      text: translate("remove"),
      accessibleLabel: translate("removeLabel", { title: fullTitle }),
      data: { remove: item.id },
      variant: "os-action-remove",
      align: "end",
    }),
  );
}

function createCartItemElement(item) {
  const fullTitle = item.title || translate("noProductTitle");
  const card = cloneTemplate(cartItemTemplate);

  const checkbox = card.querySelector(".select-checkbox");
  checkbox.checked = isSelected(item);
  checkbox.dataset.toggleSelected = item.id;
  // Sepette çok sayıda aynı görünen denetim var; ekran okuyucunun hangi ürüne
  // ait olduğunu söyleyebilmesi için her biri ürün adıyla adlandırılıyor.
  checkbox.setAttribute("aria-label", translate("selectItemLabel", { title: fullTitle }));

  fillItemBasics(card, item, fullTitle, "openLink");
  fillItemAmount(card, item);
  card.querySelector(".os-item-badges").append(...createItemBadges(item));
  fillQuantity(card, item, fullTitle);
  fillCartItemActions(card.querySelector(".cart-actions"), item, fullTitle);

  card.dataset.itemId = item.id;
  card.classList.toggle("cart-item-unselected", !isSelected(item));
  card.classList.toggle("cart-item-update-failed", item.lastUpdateStatus === "failed");
  card.classList.toggle("cart-item-needs-permission", itemNeedsPermission(item));

  return card;
}

// Boş liste: simge, başlık ve ne yapılacağını anlatan bir cümle.
function createEmptyState(icon, titleText, descriptionText) {
  const empty = document.createElement("div");
  empty.className = "empty os-empty";

  const header = document.createElement("header");
  const figure = document.createElement("figure");
  figure.appendChild(createIcon(icon));

  const title = document.createElement("h3");
  title.textContent = titleText;

  const description = document.createElement("p");
  description.textContent = descriptionText;

  header.append(figure, title, description);
  empty.appendChild(header);

  return empty;
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
  if (key) {
    applyCategoryAccent(group, key);
    group.classList.add("category-group-colored");
  }

  const header = document.createElement("header");
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

function fillPurchaseActions(actions, record, fullTitle) {
  actions.appendChild(
    createItemButton({
      icon: "restore",
      text: translate("restoreToCart"),
      accessibleLabel: translate("restoreToCartLabel", { title: fullTitle }),
      data: { restorePurchase: record.id },
      align: "end",
    }),
  );
  actions.appendChild(
    createItemButton({
      icon: "open",
      text: translate("goToLink"),
      accessibleLabel: translate("openLinkLabel", { title: fullTitle }),
      data: { openPurchase: record.id },
      align: "end",
    }),
  );
  actions.appendChild(
    createItemButton({
      icon: "remove",
      text: translate("deletePurchase"),
      accessibleLabel: translate("deletePurchaseLabel", { title: fullTitle }),
      data: { deletePurchase: record.id },
      variant: "os-action-remove",
      align: "end",
    }),
  );
}

function createPurchaseElement(record) {
  const fullTitle = record.title || translate("noProductTitle");
  const card = cloneTemplate(purchaseItemTemplate);

  fillItemBasics(card, record, fullTitle, "openPurchaseLink");
  fillItemAmount(card, record, { showChange: false });
  card.querySelector(".purchase-date").textContent = `${translate("purchasedOn")}: ${formatPurchaseDate(record)}`;
  fillPurchaseActions(card.querySelector(".cart-actions"), record, fullTitle);

  return card;
}

function renderPurchasedSummary(records) {
  purchasedSummaryEl.textContent = "";

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
    const entry = document.createElement("div");
    const name = document.createElement("span");
    const strong = document.createElement("strong");
    name.textContent = `${label}: `;
    strong.textContent = total;
    entry.append(name, strong);
    purchasedSummaryEl.appendChild(entry);
  }
}

async function renderPurchased() {
  const records = await getPurchasedItems();

  renderPurchasedSummary(records);
  purchasedItemsEl.textContent = "";

  if (records.length === 0) {
    purchasedItemsEl.appendChild(
      createEmptyState("purchase", translate("emptyPurchasedTitle"), translate("emptyPurchased")),
    );
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

  cartCountEl.textContent = String(items.length);
  purchasedCountEl.textContent = String(records.length);

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
  button.setAttribute("aria-pressed", String(isActive));
  button.title = label;
}

function renderSortOptions() {
  sortOptionsEl.textContent = "";

  for (const mode of SORT_OPTIONS) {
    const option = document.createElement("div");
    option.setAttribute("role", "menuitemradio");
    option.setAttribute("aria-checked", String(mode === currentSort));
    option.dataset.sort = mode;
    option.append(translate(`sort_${mode}`));

    // Basecoat seçili seçenekte [data-indicator]'ı gösteriyor.
    const indicator = createIcon("check");
    indicator.dataset.indicator = "";
    option.appendChild(indicator);

    sortOptionsEl.appendChild(option);
  }

  const label = `${translate("sortBy")}: ${translate(`sort_${currentSort}`)}`;
  sortBtn.setAttribute("aria-label", label);
  sortBtn.dataset.tooltip = label;
  sortBtn.dataset.side = "bottom";
  sortBtn.dataset.align = "end";
  sortBtn.dataset.active = String(currentSort !== "added");
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

// Büyük toplam birden çok para biriminde olabiliyor ("81.238,00 TL + £170.95").
// Her parça ayrı <span>: satır yalnızca parçaların arasından kırılıyor.
function setSelectedTotal(text) {
  selectedTotalPriceEl.textContent = "";

  text.split(" + ").forEach((part, index) => {
    if (index > 0) selectedTotalPriceEl.append(" ");

    const span = document.createElement("span");
    span.textContent = index > 0 ? `+ ${part}` : part;
    selectedTotalPriceEl.appendChild(span);
  });
}

async function renderCart() {
  const items = await getCartItems();
  const viewMode = await getViewMode();
  const compactMode = await getCompactMode();

  applyCompactMode(compactMode);
  await refreshTabs();

  missingPermissionOrigins = await OrtakSepetCart.findMissingOrigins(items);
  renderPermissionNotice();

  cartItemsEl.textContent = "";
  itemCountEl.textContent = String(calculateTotalItemCount(items));
  totalPriceEl.textContent = calculateTotal(items);
  setSelectedTotal(calculateSelectedTotal(items));
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
    cartItemsEl.appendChild(createEmptyState("cart", translate("emptyCartTitle"), translate("emptyCart")));
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
