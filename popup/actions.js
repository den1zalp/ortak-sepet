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

    // Ekleme mantığı sağ tık menüsüyle ortak: shared/cart.js.
    const result = await OrtakSepetCart.addProduct(response.product);

    if (!response.product.price) {
      setStatus(translate("productAddedWithoutPrice"));
    } else if (result.status === "increased") {
      setStatus(translate("duplicateAdded"));
    } else {
      setStatus(translate("productAdded"));
    }

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

let isUpdatingPrices = false;

function setUpdateInProgress(inProgress) {
  isUpdatingPrices = inProgress;

  // Güncelleme butonu kapatılmıyor: sürerken "durdur" görevi görüyor.
  addCurrentProductBtn.disabled = inProgress;
  categorizeProductsBtn.disabled = inProgress;
  installmentProductsBtn.disabled = inProgress;
  clearCartBtn.disabled = inProgress;
  exportCsvBtn.disabled = inProgress;
  copyCartBtn.disabled = inProgress;
  markPurchasedBtn.disabled = inProgress;
  countryGroupingBtn.disabled = inProgress;
  compactViewBtn.disabled = inProgress;

  setActionButtonLabel(
    updateAllPricesBtn,
    inProgress ? translate("cancelUpdate") : translate("updateAllPrices"),
  );
}

// Buton güncelleme sürerken iptal düğmesine dönüşüyor.
async function onUpdatePricesClick() {
  if (isUpdatingPrices) {
    await cancelPriceUpdate();
    return;
  }

  await updateAllPrices();
}

async function cancelPriceUpdate() {
  updateAllPricesBtn.disabled = true;

  try {
    await browser.runtime.sendMessage({ type: "CANCEL_UPDATE_ALL_PRICES" });
  } catch {
    // Arka plan yanıt vermiyorsa güncelleme zaten bitmiş olabilir.
  } finally {
    updateAllPricesBtn.disabled = false;
  }
}

async function updateAllPrices() {
  const items = await getCartItems();

  if (items.length === 0) {
    setStatus(translate("noItemsToUpdate"));
    return;
  }

  setUpdateInProgress(true);
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

    setStatus(
      translate(result.cancelled ? "pricesUpdateCancelled" : "pricesUpdateDone", {
        changed: result.changed,
        failed: result.failed,
      }),
    );
  } catch (error) {
    setStatus(translate("pricesUpdateError"));
  } finally {
    setUpdateInProgress(false);
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

  if (updatedItems.length === items.length) return;

  await saveUndoSnapshot();
  await saveCartItems(updatedItems);

  setStatus(translate("productRemoved"));
  setUndoVisible(true);
  await renderCart();
}

// Alınan ürünün fiyatı, adedi ve para birimi bu anda dondurulur. Sonraki
// "Fiyatları Güncelle" çalıştırmaları geçmiş ayın harcamasını değiştirmemeli.
function createPurchaseRecord(item) {
  return {
    id: OrtakSepetCart.createId(),
    title: item.title || "",
    site: item.site || "",
    url: item.url || "",
    image: item.image || "",
    category: item.category || null,
    price: item.price || null,
    quantity: getQuantity(item),
    currency: getItemCurrency(item),
    currencySymbol: item.currencySymbol || null,
    region: getItemRegion(item),
    purchasedAt: new Date().toISOString(),
  };
}

async function movePurchasedItems(itemsToMove) {
  if (itemsToMove.length === 0) {
    setStatus(translate("noSelectedItems"));
    return;
  }

  await saveUndoSnapshot();

  const [items, purchased] = await Promise.all([
    getCartItems(),
    getPurchasedItems(),
  ]);

  const movedIds = new Set(itemsToMove.map((item) => item.id));
  const records = itemsToMove.map(createPurchaseRecord);

  await savePurchasedItems([...purchased, ...records]);
  await saveCartItems(items.filter((item) => !movedIds.has(item.id)));

  setStatus(translate("purchasedMoved", { count: records.length }));
  setUndoVisible(true);
  await renderCart();
}

async function markItemPurchased(id) {
  const items = await getCartItems();
  const item = items.find((cartItem) => cartItem.id === id);

  if (!item) return;

  await movePurchasedItems([item]);
}

async function markSelectedPurchased() {
  const items = await getCartItems();
  await movePurchasedItems(items.filter((item) => isSelected(item)));
}

async function restorePurchase(id) {
  const purchased = await getPurchasedItems();
  const record = purchased.find((entry) => entry.id === id);

  if (!record) return;

  await saveUndoSnapshot();

  const items = await getCartItems();

  items.push({
    id: OrtakSepetCart.createId(),
    title: record.title,
    site: record.site,
    url: record.url,
    image: record.image,
    category: record.category || null,
    price: record.price,
    currency: record.currency,
    currencySymbol: record.currencySymbol,
    region: record.region,
    quantity: getQuantity(record),
    selected: true,
    addedAt: new Date().toISOString(),
  });

  await saveCartItems(items);
  await savePurchasedItems(purchased.filter((entry) => entry.id !== id));

  setStatus(translate("purchaseRestored"));
  setUndoVisible(true);
  await renderCart();
}

async function deletePurchase(id) {
  const purchased = await getPurchasedItems();

  if (!purchased.some((entry) => entry.id === id)) return;

  await saveUndoSnapshot();
  await savePurchasedItems(purchased.filter((entry) => entry.id !== id));

  setStatus(translate("purchaseDeleted"));
  setUndoVisible(true);
  await renderPurchased();
  await refreshTabs();
}

async function openPurchase(id) {
  const purchased = await getPurchasedItems();
  const record = purchased.find((entry) => entry.id === id);

  if (!record || !record.url) return;

  await browser.tabs.create({ url: record.url });
}

let clearCartConfirmTimer = null;

function disarmClearCartConfirm() {
  if (clearCartConfirmTimer) {
    clearTimeout(clearCartConfirmTimer);
    clearCartConfirmTimer = null;
  }

  clearCartBtn.textContent = translate("clearCart");
}

// Tek tıkla tüm sepeti silmemek için iki adımlı onay; ayrıca geri alma
// anlık görüntüsü kaydediliyor.
async function clearCart() {
  const items = await getCartItems();

  if (items.length === 0) {
    setStatus(translate("cartCleared"));
    return;
  }

  if (!clearCartConfirmTimer) {
    clearCartBtn.textContent = translate("clearCartConfirmButton");
    setStatus(translate("clearCartConfirm"));
    clearCartConfirmTimer = setTimeout(disarmClearCartConfirm, 5000);
    return;
  }

  disarmClearCartConfirm();

  await saveUndoSnapshot();
  await saveCartItems([]);
  await setViewMode("normal");

  setStatus(translate("cartCleared"));
  setUndoVisible(true);
  await renderCart();
}

async function undoLastAction() {
  const snapshot = await getUndoSnapshot();

  if (!snapshot) {
    setUndoVisible(false);
    setStatus(translate("undoUnavailable"));
    return;
  }

  await saveCartItems(snapshot.items);

  if (Array.isArray(snapshot.purchased)) {
    await savePurchasedItems(snapshot.purchased);
  }

  await clearUndoSnapshot();

  setUndoVisible(false);
  setStatus(translate("undoDone"));
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
