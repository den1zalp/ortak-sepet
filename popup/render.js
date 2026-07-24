// Ortak Sepet popup module: render.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

function truncateProductTitle(titleText, maxLength = 60) {
  const cleanedTitle = String(titleText || "").replace(/\s+/g, " ").trim();

  if (cleanedTitle.length <= maxLength) {
    return cleanedTitle;
  }

  return `${cleanedTitle.slice(0, maxLength).trim()}…`;
}

function createDetailRow(labelText, valueText, shouldBoldValue = false) {
  const row = document.createElement("div");
  row.className = "detail-row";

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

function getCategoryColor(categoryName) {
  const colors = {
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
    "Taksit Var": "#22c55e",
    "Taksit / Finance Var": "#22c55e",
    "Instalments / Finance Available": "#22c55e",
    "Taksit Yok / Bilinmiyor": "#94a3b8",
    "Taksit / Finance Yok / Bilinmiyor": "#94a3b8",
    "No Instalments / Finance / Unknown": "#94a3b8",
    "Türkiye": "#ef4444",
    "İngiltere": "#2563eb",
    "United Kingdom": "#2563eb",
    "Diğer": "#d1d5db",
  };

  return colors[categoryName] || "#d1d5db";
}

function applyCategoryAccent(element, categoryName) {
  element.style.setProperty("--category-color", getCategoryColor(categoryName));
}

function createCartItemElement(item) {
  const wrapper = document.createElement("div");
  wrapper.className = isSelected(item)
    ? "cart-item"
    : "cart-item cart-item-unselected";

  if (item.lastUpdateStatus === "failed") {
    wrapper.classList.add("cart-item-update-failed");
  }

  if (item.category) {
    applyCategoryAccent(wrapper, item.category);
    wrapper.classList.add("cart-item-with-category");
  }

  const image = document.createElement("img");
  image.className = "cart-image";
  image.alt = "";
  image.referrerPolicy = "no-referrer";

  let imageFallbackAttempted = false;
  image.addEventListener("error", async () => {
    if (imageFallbackAttempted || !item.image) return;
    imageFallbackAttempted = true;

    try {
      const response = await browser.runtime.sendMessage({
        type: "FETCH_IMAGE_AS_DATA_URL",
        url: item.image,
      });

      if (response?.ok && response.dataUrl) {
        image.src = response.dataUrl;
      }
    } catch {
      // Görsel kullanılamıyorsa boş görsel alanı korunur.
    }
  });

  image.src = item.image || "";

  const info = document.createElement("div");
  info.className = "cart-info";

  const titleRow = document.createElement("div");
  titleRow.className = "title-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "select-checkbox";
  checkbox.checked = isSelected(item);
  checkbox.dataset.toggleSelected = item.id;
  checkbox.title = translate("selectedTotalTitle");

  const titleContainer = document.createElement("div");
  titleContainer.className = "title-container";

  const title = document.createElement("div");
  title.className = "cart-title";
  const fullTitle = item.title || translate("noProductTitle");
  title.textContent = truncateProductTitle(fullTitle, 60);
  title.title = fullTitle;

  titleContainer.appendChild(title);

  if (item.category) {
    const categoryBadge = document.createElement("span");
    categoryBadge.className = "category-badge";
    categoryBadge.textContent = translateCategory(item.category);
    applyCategoryAccent(categoryBadge, item.category);
    titleContainer.appendChild(categoryBadge);
  }

  titleRow.appendChild(checkbox);
  titleRow.appendChild(titleContainer);

  const details = document.createElement("div");
  details.className = "product-details";

  const installmentDisplay = getInstallmentDisplay(item);
  const shippingDisplay = getShippingDisplay(item);

  details.appendChild(
    createDetailRow(translate("site"), item.site || translate("unknownSite"), true),
  );

  details.appendChild(
    createDetailRow(translate("price"), getPriceDisplayText(item), Boolean(item.price)),
  );

  const stockDisplayText = getStockDisplayText(item);
  if (stockDisplayText) {
    details.appendChild(createDetailRow(translate("stockStatus"), stockDisplayText, false));
  }

  if (item.manualPrice === true) {
    details.appendChild(createDetailRow(translate("source"), translate("manual"), true));
  }

  if (item.previousPrice && item.previousPrice !== item.price) {
    details.appendChild(createDetailRow(translate("previous"), item.previousPrice, false));
  }

  details.appendChild(
    createDetailRow(getPaymentLabel(item), installmentDisplay.text, installmentDisplay.bold),
  );

  details.appendChild(
    createDetailRow(translate("delivery"), shippingDisplay.text, shippingDisplay.bold),
  );

  const lastUpdateText = getLastUpdateText(item);

  if (lastUpdateText) {
    details.appendChild(
      createDetailRow(
        translate("check"),
        lastUpdateText,
        item.lastUpdateStatus === "success" ||
          item.lastUpdateStatus === "manual" ||
          item.lastUpdateStatus === "manual-kept",
      ),
    );
  }

  const lineTotal = document.createElement("div");
  lineTotal.className = "line-total";
  lineTotal.textContent = getItemLineTotal(item);

  const quantityRow = document.createElement("div");
  quantityRow.className = "quantity-row";

  const decreaseButton = document.createElement("button");
  decreaseButton.className = "small-button quantity-button";
  decreaseButton.textContent = "-";
  decreaseButton.dataset.decrease = item.id;

  const quantityText = document.createElement("span");
  quantityText.className = "quantity-text";
  quantityText.textContent = translate("quantity", { quantity: getQuantity(item) });

  const increaseButton = document.createElement("button");
  increaseButton.className = "small-button quantity-button";
  increaseButton.textContent = "+";
  increaseButton.dataset.increase = item.id;

  quantityRow.appendChild(decreaseButton);
  quantityRow.appendChild(quantityText);
  quantityRow.appendChild(increaseButton);

  const actions = document.createElement("div");
  actions.className = "cart-actions";

  const openButton = document.createElement("button");
  openButton.className = "small-button";
  openButton.textContent = translate("goToLink");
  openButton.dataset.open = item.id;

  const editPriceButton = document.createElement("button");
  editPriceButton.className = "small-button";
  editPriceButton.textContent = translate("manualPrice");
  editPriceButton.dataset.editPrice = item.id;

  const removeButton = document.createElement("button");
  removeButton.className = "small-button";
  removeButton.textContent = translate("remove");
  removeButton.dataset.remove = item.id;

  actions.appendChild(openButton);
  actions.appendChild(editPriceButton);
  actions.appendChild(removeButton);

  info.appendChild(titleRow);
  info.appendChild(details);
  info.appendChild(lineTotal);
  info.appendChild(quantityRow);
  info.appendChild(actions);

  wrapper.appendChild(image);
  wrapper.appendChild(info);

  return wrapper;
}

function groupItemsByInstallment(items) {
  const withInstallment = [];
  const withoutInstallment = [];

  for (const item of items) {
    if (item.installmentAvailable === true) {
      withInstallment.push(item);
    } else {
      withoutInstallment.push(item);
    }
  }

  const groups = [];

  if (withInstallment.length > 0) {
    groups.push([translate("installmentAvailableGroup"), withInstallment]);
  }

  if (withoutInstallment.length > 0) {
    groups.push([translate("installmentUnavailableGroup"), withoutInstallment]);
  }

  return groups;
}

function groupItemsByCategory(items) {
  const grouped = new Map();

  for (const item of items) {
    const category = item.category || "Diğer";

    if (!grouped.has(category)) {
      grouped.set(category, []);
    }

    grouped.get(category).push(item);
  }

  return Array.from(grouped.entries()).sort(([categoryA], [categoryB]) => {
    if (categoryA === "Diğer") return 1;
    if (categoryB === "Diğer") return -1;

    return categoryA.localeCompare(categoryB, "tr-TR");
  });
}

function groupItemsByCountry(items) {
  const grouped = new Map();

  for (const item of items) {
    const region = getItemRegion(item);

    if (!grouped.has(region)) {
      grouped.set(region, []);
    }

    grouped.get(region).push(item);
  }

  const order = ["TR", "UK"];
  return Array.from(grouped.entries()).sort(([regionA], [regionB]) => {
    return order.indexOf(regionA) - order.indexOf(regionB);
  });
}

function createCategoryGroupElement(categoryName, items) {
  const group = document.createElement("section");
  group.className = "category-group";
  applyCategoryAccent(group, categoryName);

  const header = document.createElement("div");
  header.className = "category-header";

  const title = document.createElement("h3");
  title.className = "category-title";
  title.textContent = translateCategory(categoryName);

  const meta = document.createElement("span");
  meta.className = "category-meta";

  const productCount = items.length;
  const quantityCount = calculateTotalItemCount(items);
  const categoryTotal = calculateCategoryTotal(items);

  meta.textContent = translate("productMeta", { products: productCount, quantity: quantityCount, total: categoryTotal });

  header.appendChild(title);
  header.appendChild(meta);

  group.appendChild(header);

  for (const item of items) {
    const itemElement = createCartItemElement(item);
    group.appendChild(itemElement);
  }

  return group;
}

function shouldRenderCategorized(items) {
  return items.some((item) => Boolean(item.category));
}

function renderFlatCart(items) {
  for (const item of items) {
    const element = createCartItemElement(item);
    cartItemsEl.appendChild(element);
  }
}

function renderCategorizedCart(items) {
  const groupedItems = groupItemsByCategory(items);

  for (const [categoryName, categoryItems] of groupedItems) {
    const groupElement = createCategoryGroupElement(
      categoryName,
      categoryItems,
    );
    cartItemsEl.appendChild(groupElement);
  }
}

function renderInstallmentGroupedCart(items) {
  const groupedItems = groupItemsByInstallment(items);

  for (const [groupName, groupItems] of groupedItems) {
    const groupElement = createCategoryGroupElement(groupName, groupItems);
    cartItemsEl.appendChild(groupElement);
  }
}

function renderCountryGroupedCart(items) {
  const groupedItems = groupItemsByCountry(items);

  for (const [region, groupItems] of groupedItems) {
    const groupElement = createCategoryGroupElement(getRegionLabel(region), groupItems);
    cartItemsEl.appendChild(groupElement);
  }
}

async function renderCart() {
  const items = await getCartItems();
  const viewMode = await getViewMode();
  const compactMode = await getCompactMode();

  applyCompactMode(compactMode);

  cartItemsEl.innerHTML = "";
  itemCountEl.textContent = String(calculateTotalItemCount(items));
  totalPriceEl.textContent = calculateTotal(items);
  selectedTotalPriceEl.textContent = calculateSelectedTotal(items);

  setActionButtonLabel(
    categorizeProductsBtn,
    viewMode === "category" ? translate("removeCategories") : translate("categorizeProducts"),
  );

  setActionButtonLabel(
    installmentProductsBtn,
    viewMode === "installment"
      ? translate("removeInstallmentGrouping")
      : translate("installmentProducts"),
  );

  const countryGroupingLabel =
    viewMode === "country"
      ? translate("removeCountryGrouping")
      : translate("countryGrouping");
  countryGroupingBtn.setAttribute("aria-label", countryGroupingLabel);
  countryGroupingBtn.title = countryGroupingLabel;

  countryGroupingBtn.classList.toggle("is-active", viewMode === "country");
  categorizeProductsBtn.classList.toggle("is-active", viewMode === "category");
  installmentProductsBtn.classList.toggle("is-active", viewMode === "installment");

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = translate("emptyCart");
    cartItemsEl.appendChild(empty);
    return;
  }

  if (viewMode === "installment") {
    renderInstallmentGroupedCart(items);
    return;
  }

  if (viewMode === "country") {
    renderCountryGroupedCart(items);
    return;
  }

  if (viewMode === "category" && shouldRenderCategorized(items)) {
    renderCategorizedCart(items);
    return;
  }

  renderFlatCart(items);
}
