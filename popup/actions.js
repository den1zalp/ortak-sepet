// Ortak Sepet popup module: actions.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

async function addCurrentProduct() {
  setStatus(translate("readingProduct"));

  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  const activeTab = tabs[0];

  if (!activeTab || !activeTab.id) {
    setStatus(translate("activeTabMissing"));
    return;
  }

  try {
    const response = await browser.tabs.sendMessage(activeTab.id, {
      type: "GET_PRODUCT",
    });

    if (!response || !response.ok) {
      setStatus(response?.error || translate("productReadFailed"));
      return;
    }

    const capturedImage = await captureProductImage(activeTab, response.product);
    if (capturedImage) {
      response.product.image = capturedImage;
    }
    delete response.product.imageCaptureRect;

    const items = await getCartItems();
    const viewMode = await getViewMode();
    const categoryModeActive = viewMode === "category";

    const currentProductUrl = normalizeUrl(response.product.url);

    const existingItem = items.find((item) => {
      return normalizeUrl(item.url) === currentProductUrl;
    });

    if (existingItem) {
      existingItem.quantity = getQuantity(existingItem) + 1;
      existingItem.selected = true;
      existingItem.title = response.product.title || existingItem.title;

      if (existingItem.manualPrice === true) {
        existingItem.detectedPrice =
          response.product.price || existingItem.detectedPrice;
      } else if (response.product.price) {
        existingItem.price = response.product.price;
      } else if (response.product.priceReadStatus === "unavailable") {
        existingItem.previousPrice = existingItem.price || existingItem.previousPrice;
        existingItem.price = null;
      }

      existingItem.priceReadStatus = response.product.priceReadStatus || existingItem.priceReadStatus || null;
      existingItem.priceUnavailableReason = response.product.priceUnavailableReason || existingItem.priceUnavailableReason || null;
      existingItem.stockAvailable = response.product.stockAvailable ?? existingItem.stockAvailable ?? null;
      existingItem.stockText = response.product.stockText || existingItem.stockText || "";

      existingItem.image = response.product.image || existingItem.image;
      existingItem.currency = response.product.currency || detectCurrencyFromPrice(existingItem.price);
      existingItem.currencySymbol = response.product.currencySymbol || (existingItem.currency === "GBP" ? "£" : "TL");
      existingItem.region = response.product.region || existingItem.region || (existingItem.currency === "GBP" ? "UK" : "TR");

      existingItem.installmentAvailable = response.product.installmentAvailable;
      existingItem.installmentText = response.product.installmentText;

      existingItem.shippingAvailable = response.product.shippingAvailable;
      existingItem.freeShipping = response.product.freeShipping;
      existingItem.shippingText = response.product.shippingText;
      existingItem.shippingSource = response.product.shippingSource;
      existingItem.shippingConfidence = response.product.shippingConfidence;

      if (categoryModeActive) {
        existingItem.category = categorizeProduct(existingItem);
      }

      existingItem.updatedAt = new Date().toISOString();

      await saveCartItems(items);

      setStatus(
        response.product.price
          ? translate("duplicateAdded")
          : translate("productAddedWithoutPrice"),
      );
      await renderCart();
      return;
    }

    const productCurrency = response.product.currency || detectCurrencyFromPrice(response.product.price);

    const newItem = {
      id: createId(),
      ...response.product,
      currency: productCurrency,
      currencySymbol: response.product.currencySymbol || (productCurrency === "GBP" ? "£" : "TL"),
      region: response.product.region || (productCurrency === "GBP" ? "UK" : "TR"),
      quantity: 1,
      selected: true,
      category: categoryModeActive ? categorizeProduct(response.product) : null,
      addedAt: new Date().toISOString(),
    };

    items.push(newItem);
    await saveCartItems(items);

    setStatus(
      response.product.price
        ? translate("productAdded")
        : translate("productAddedWithoutPrice"),
    );
    await renderCart();
  } catch (error) {
    setStatus(translate("unsupportedPage"));
  }
}

async function categorizeProducts() {
  const items = await getCartItems();

  if (items.length === 0) {
    setStatus(translate("noItemsToCategorize"));
    return;
  }

  const viewMode = await getViewMode();

  if (viewMode === "category") {
    await setViewMode("normal");

    const updatedItems = items.map((item) => {
      return {
        ...item,
        category: null,
        updatedAt: new Date().toISOString(),
      };
    });

    await saveCartItems(updatedItems);
    setStatus(translate("categoriesRemoved"));
    await renderCart();
    return;
  }

  const updatedItems = items.map((item) => {
    return {
      ...item,
      category: categorizeProduct(item),
      updatedAt: new Date().toISOString(),
    };
  });

  await saveCartItems(updatedItems);
  await setViewMode("category");

  setStatus(translate("categoriesApplied"));
  await renderCart();
}

async function toggleInstallmentGrouping() {
  const items = await getCartItems();

  if (items.length === 0) {
    setStatus(translate("noItemsToGroup"));
    return;
  }

  const viewMode = await getViewMode();

  if (viewMode === "installment") {
    await setViewMode("normal");
    setStatus(translate("groupingRemoved"));
    await renderCart();
    return;
  }

  await setViewMode("installment");
  setStatus(translate("groupedByPayment"));
  await renderCart();
}

async function toggleCountryGrouping() {
  const items = await getCartItems();

  if (items.length === 0) {
    setStatus(translate("noItemsToGroup"));
    return;
  }

  const viewMode = await getViewMode();

  if (viewMode === "country") {
    await setViewMode("normal");
    setStatus(translate("countryGroupingRemoved"));
    await renderCart();
    return;
  }

  await setViewMode("country");
  setStatus(translate("groupedByCountry"));
  await renderCart();
}

async function toggleCompactMode() {
  const isCompact = await getCompactMode();
  await setCompactMode(!isCompact);
  applyCompactMode(!isCompact);
}

async function updateAllPrices() {
  const items = await getCartItems();

  if (items.length === 0) {
    setStatus(translate("noItemsToUpdate"));
    return;
  }

  updateAllPricesBtn.disabled = true;
  addCurrentProductBtn.disabled = true;
  categorizeProductsBtn.disabled = true;
  installmentProductsBtn.disabled = true;
  clearCartBtn.disabled = true;
  exportCsvBtn.disabled = true;
  countryGroupingBtn.disabled = true;
  compactViewBtn.disabled = true;

  setActionButtonLabel(updateAllPricesBtn, translate("updating"));
  setStatus(translate("pricesUpdating"));

  try {
    const result = await browser.runtime.sendMessage({
      type: "UPDATE_ALL_PRICES",
    });

    await renderCart();

    if (!result || !result.ok) {
      setStatus(translate("pricesUpdateFailed"));
      return;
    }

    setStatus(translate("pricesUpdateDone", { changed: result.changed, failed: result.failed }));
  } catch (error) {
    setStatus(translate("pricesUpdateError"));
  } finally {
    updateAllPricesBtn.disabled = false;
    addCurrentProductBtn.disabled = false;
    categorizeProductsBtn.disabled = false;
    installmentProductsBtn.disabled = false;
    clearCartBtn.disabled = false;
    exportCsvBtn.disabled = false;
    countryGroupingBtn.disabled = false;
    compactViewBtn.disabled = false;

    setActionButtonLabel(updateAllPricesBtn, translate("updateAllPrices"));
    await renderCart();
  }
}

async function editItemPrice(id) {
  const items = await getCartItems();
  const item = items.find((cartItem) => cartItem.id === id);

  if (!item) return;

  const currentPrice = item.price || "";
  const input = window.prompt(translate("promptNewPrice"), currentPrice);

  if (input === null) {
    return;
  }

  const newPrice = normalizeManualPriceInput(input, item);

  if (!newPrice) {
    setStatus(translate("invalidPrice"));
    return;
  }

  if (item.price && item.price !== newPrice) {
    item.previousPrice = item.price;
  }

  item.price = newPrice;
  item.manualPrice = true;
  item.lastUpdateStatus = "manual";
  item.lastCheckedAt = new Date().toISOString();
  item.updatedAt = new Date().toISOString();

  await saveCartItems(items);

  setStatus(translate("manualPriceUpdated"));
  await renderCart();
}

async function removeItem(id) {
  const items = await getCartItems();
  const updatedItems = items.filter((item) => item.id !== id);

  await saveCartItems(updatedItems);
  setStatus(translate("productRemoved"));
  await renderCart();
}

async function toggleSelected(id) {
  const items = await getCartItems();

  const item = items.find((cartItem) => cartItem.id === id);

  if (!item) return;

  item.selected = !isSelected(item);
  item.updatedAt = new Date().toISOString();

  await saveCartItems(items);
  await renderCart();
}

async function increaseQuantity(id) {
  const items = await getCartItems();

  const item = items.find((cartItem) => cartItem.id === id);

  if (!item) return;

  item.quantity = getQuantity(item) + 1;
  item.updatedAt = new Date().toISOString();

  await saveCartItems(items);
  await renderCart();
}

async function decreaseQuantity(id) {
  const items = await getCartItems();

  const item = items.find((cartItem) => cartItem.id === id);

  if (!item) return;

  const currentQuantity = getQuantity(item);

  if (currentQuantity <= 1) {
    const updatedItems = items.filter((cartItem) => cartItem.id !== id);
    await saveCartItems(updatedItems);
    setStatus(translate("quantityZeroRemoved"));
    await renderCart();
    return;
  }

  item.quantity = currentQuantity - 1;
  item.updatedAt = new Date().toISOString();

  await saveCartItems(items);
  await renderCart();
}

async function openItem(id) {
  const items = await getCartItems();
  const item = items.find((cartItem) => cartItem.id === id);

  if (!item || !item.url) return;

  await browser.tabs.create({
    url: item.url,
  });
}
