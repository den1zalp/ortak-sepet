import { launchExtension, createChecker, screenshotPath } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw, workerTarget, extensionId } = await launchExtension({
  windowSize: "1280,980",
});

await sw.evaluate(async () => {
  await browser.storage.local.set({
    ortakSepetItems: [
      { id: "a", title: "Philips Airfryer XXL", price: "3.499,00 TL", currency: "TRY", currencySymbol: "TL", region: "TR", site: "Hepsiburada", url: "https://www.hepsiburada.com/p-1", quantity: 2, selected: true, category: "Ev & Yaşam" },
      { id: "b", title: "MICKE Corner workstation", price: "£149.00", currency: "GBP", currencySymbol: "£", region: "UK", site: "IKEA UK", url: "https://www.ikea.com/gb/en/p/micke/", quantity: 1, selected: false },
    ],
    ortakSepetPurchased: [],
  });
  await browser.storage.local.remove("ortakSepetUndo");
});

const popup = await browser.newPage();
const errors = [];
popup.on("pageerror", (e) => errors.push(String(e)));
popup.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await popup.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, 700));

// --- 1. Sekmeler ---
const tabs = await popup.evaluate(() => ({
  cart: document.getElementById("cartTabBtn").textContent,
  purchased: document.getElementById("purchasedTabBtn").textContent,
  purchasedHidden: document.getElementById("purchasedPanel").hidden,
  bulkLabel: document.getElementById("markPurchasedBtn").textContent,
}));
check("sepet sekmesi sayılı", tabs.cart === "Sepet (2)", tabs.cart);
check("aldıklarım sekmesi sayılı", tabs.purchased === "Aldıklarım (0)", tabs.purchased);
check("alınanlar paneli gizli", tabs.purchasedHidden === true);
check("toplu işaretleme butonu", tabs.bulkLabel === "Seçilenleri Alındı İşaretle", tabs.bulkLabel);

// --- 2. Tek ürünü alındı işaretle ---
await popup.evaluate(() => markItemPurchased("a"));
await new Promise((r) => setTimeout(r, 400));

const afterPurchase = await popup.evaluate(async () => {
  const cart = await getCartItems();
  const purchased = await getPurchasedItems();
  return {
    cartCount: cart.length,
    purchasedCount: purchased.length,
    record: purchased[0],
    status: document.getElementById("status").textContent,
    cartTab: document.getElementById("cartTabBtn").textContent,
    purchasedTab: document.getElementById("purchasedTabBtn").textContent,
    undoHidden: document.getElementById("undoBtn").hidden,
  };
});
check("ürün sepetten çıktı", afterPurchase.cartCount === 1);
check("alınanlara eklendi", afterPurchase.purchasedCount === 1);
check("fiyat donduruldu", afterPurchase.record.price === "3.499,00 TL", afterPurchase.record.price);
check("adet donduruldu", afterPurchase.record.quantity === 2, String(afterPurchase.record.quantity));
check("para birimi donduruldu", afterPurchase.record.currency === "TRY");
check("alınma tarihi yazıldı", Boolean(Date.parse(afterPurchase.record.purchasedAt)));
check("kategori korundu", afterPurchase.record.category === "Ev & Yaşam");
check("sekme sayıları güncellendi", afterPurchase.cartTab === "Sepet (1)" && afterPurchase.purchasedTab === "Aldıklarım (1)");
check("geri al göründü", afterPurchase.undoHidden === false);

// --- 3. Rozet yalnızca sepeti sayıyor ---
await new Promise((r) => setTimeout(r, 400));
const badge = await sw.evaluate(() => browser.action.getBadgeText({}));
check("rozet alınanları saymıyor", badge === "1", `rozet: "${badge}"`);

// --- 4. Fiyat güncellemesi geçmişi bozmuyor ---
const refreshCheck = await sw.evaluate(async () => {
  const before = (await browser.storage.local.get("ortakSepetPurchased")).ortakSepetPurchased;
  const result = await updateAllPrices();
  const after = (await browser.storage.local.get("ortakSepetPurchased")).ortakSepetPurchased;
  return {
    total: result.total,
    priceBefore: before[0].price,
    priceAfter: after[0].price,
    countAfter: after.length,
  };
});
check("güncelleme yalnızca sepeti tarıyor", refreshCheck.total === 1, `taranan: ${refreshCheck.total}`);
check("alınan ürünün fiyatı değişmedi", refreshCheck.priceBefore === refreshCheck.priceAfter, refreshCheck.priceAfter);
check("alınan kayıt silinmedi", refreshCheck.countAfter === 1);

// --- 5. Aylık gruplama ---
await sw.evaluate(async () => {
  const purchased = (await browser.storage.local.get("ortakSepetPurchased")).ortakSepetPurchased;
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 3).toISOString();

  await browser.storage.local.set({
    ortakSepetPurchased: [
      ...purchased,
      { id: "p2", title: "Geçen ay alınan", price: "500,00 TL", currency: "TRY", region: "TR", site: "Trendyol", url: "https://x/1", quantity: 1, purchasedAt: lastMonth },
      { id: "p3", title: "Önceki ay alınan", price: "£20.00", currency: "GBP", region: "UK", site: "Argos", url: "https://x/2", quantity: 3, purchasedAt: twoMonthsAgo },
    ],
  });
});

await popup.reload({ waitUntil: "load" });
await new Promise((r) => setTimeout(r, 500));
await popup.click("#purchasedTabBtn");
await new Promise((r) => setTimeout(r, 500));

const purchasedView = await popup.evaluate(() => {
  const groups = Array.from(document.querySelectorAll("#purchasedItems .category-group"));
  return {
    cartPanelHidden: document.getElementById("cartPanel").hidden,
    actionGridHidden: document.getElementById("actionGrid").hidden,
    summaryHidden: document.getElementById("summarySection").hidden,
    footerHidden: document.getElementById("footerActions").hidden,
    groupCount: groups.length,
    titles: groups.map((g) => g.querySelector(".category-title").textContent),
    metas: groups.map((g) => g.querySelector(".category-meta").textContent),
    summary: document.getElementById("purchasedSummary").textContent,
    firstDate: document.querySelector("#purchasedItems .purchase-date")?.textContent,
    buttons: Array.from(document.querySelectorAll("#purchasedItems .cart-actions button")).slice(0, 3).map((b) => b.textContent),
  };
});

console.log("\n  aylar   :", purchasedView.titles.join(" | "));
console.log("  meta    :", purchasedView.metas.join(" | "));
console.log("  özet    :", purchasedView.summary);
console.log("  tarih   :", purchasedView.firstDate, "\n");

check("sepet paneli gizlendi", purchasedView.cartPanelHidden === true);
check("sepete özel alanlar gizlendi", purchasedView.actionGridHidden && purchasedView.summaryHidden && purchasedView.footerHidden);
check("üç ay grubu", purchasedView.groupCount === 3, String(purchasedView.groupCount));
check("aylar en yeniden eskiye", purchasedView.titles[0].includes("2026"), purchasedView.titles[0]);
check("bu ayın toplamı doğru", purchasedView.metas[0].includes("6.998,00 TL"), purchasedView.metas[0]);
check("GBP ayı ayrı para biriminde", purchasedView.metas[2].includes("£60.00"), purchasedView.metas[2]);
check("özet bu ay + tümü", purchasedView.summary.includes("Bu ay:") && purchasedView.summary.includes("Tümü:"), purchasedView.summary);
check("özet toplamı iki para birimi", purchasedView.summary.includes("7.498,00 TL + £60.00"), purchasedView.summary);
check("alınma tarihi gösteriliyor", /Alınma: \d{2}\.\d{2}\.\d{4}/.test(purchasedView.firstDate || ""), purchasedView.firstDate);
check("kayıt butonları", purchasedView.buttons.join(",") === "Sepete Geri Al,Linke Git,Kaydı Sil", purchasedView.buttons.join(","));

// --- 6. Sepete geri alma ---
await popup.evaluate(async () => {
  const purchased = await getPurchasedItems();
  await restorePurchase(purchased.find((p) => p.title === "Geçen ay alınan").id);
});
await new Promise((r) => setTimeout(r, 400));

const afterRestore = await popup.evaluate(async () => {
  const cart = await getCartItems();
  const purchased = await getPurchasedItems();
  return {
    cartCount: cart.length,
    purchasedCount: purchased.length,
    restored: cart.find((i) => i.title === "Geçen ay alınan"),
    status: document.getElementById("status").textContent,
  };
});
check("kayıt sepete döndü", afterRestore.cartCount === 2 && afterRestore.purchasedCount === 2);
check("geri alınan fiyatıyla döndü", afterRestore.restored?.price === "500,00 TL", afterRestore.restored?.price);
check("geri alma mesajı", afterRestore.status === "Ürün sepete geri alındı.", afterRestore.status);

// --- 7. Kaydı silme ve geri alma ---
const deleteFlow = await popup.evaluate(async () => {
  const purchased = await getPurchasedItems();
  const targetId = purchased[0].id;
  await deletePurchase(targetId);
  const afterDelete = await getPurchasedItems();

  await undoLastAction();
  const afterUndo = await getPurchasedItems();

  return {
    afterDeleteCount: afterDelete.length,
    afterUndoCount: afterUndo.length,
    restoredBack: afterUndo.some((p) => p.id === targetId),
  };
});
check("kayıt silindi", deleteFlow.afterDeleteCount === 1, String(deleteFlow.afterDeleteCount));
check("silme geri alındı", deleteFlow.afterUndoCount === 2 && deleteFlow.restoredBack);

// --- 8. Toplu işaretleme ---
const bulk = await popup.evaluate(async () => {
  await saveCartItems([
    { id: "x", title: "Seçili 1", price: "10,00 TL", currency: "TRY", region: "TR", url: "https://x/10", quantity: 1, selected: true },
    { id: "y", title: "Seçili 2", price: "20,00 TL", currency: "TRY", region: "TR", url: "https://x/20", quantity: 1, selected: true },
    { id: "z", title: "Seçili değil", price: "30,00 TL", currency: "TRY", region: "TR", url: "https://x/30", quantity: 1, selected: false },
  ]);
  await savePurchasedItems([]);
  await renderCart();

  await markSelectedPurchased();

  const cart = await getCartItems();
  const purchased = await getPurchasedItems();

  return {
    status: document.getElementById("status").textContent,
    cartTitles: cart.map((i) => i.title),
    purchasedTitles: purchased.map((p) => p.title),
  };
});
check("toplu işaretleme mesajı", bulk.status === "2 ürün alınanlara taşındı.", bulk.status);
check("seçili olmayan sepette kaldı", JSON.stringify(bulk.cartTitles) === '["Seçili değil"]', JSON.stringify(bulk.cartTitles));
check("seçililer alınanlara geçti", bulk.purchasedTitles.length === 2);

const noSelection = await popup.evaluate(async () => {
  await markSelectedPurchased();
  return document.getElementById("status").textContent;
});
check("seçim yoksa uyarı", noSelection === "Seçili ürün yok.", noSelection);

// --- 9. İngilizce ---
const english = await popup.evaluate(async () => {
  await setLanguage("en");
  applyStaticTranslations();
  await renderCart();
  return {
    tab: document.getElementById("purchasedTabBtn").textContent,
    bulk: document.getElementById("markPurchasedBtn").textContent,
    buy: document.querySelector("[data-purchase]")?.textContent,
  };
});
check("EN sekme", english.tab.startsWith("Purchased"), english.tab);
check("EN toplu buton", english.bulk === "Mark Selected as Bought", english.bulk);
check("EN alındı butonu", english.buy === "Bought", english.buy);

check("popup konsolunda hata yok", errors.length === 0, errors.join(" | "));

await popup.evaluate(async () => {
  await setLanguage("tr");
  applyStaticTranslations();
  await setActiveTab("purchased");
});
await new Promise((r) => setTimeout(r, 400));
await popup.screenshot({ path: screenshotPath("popup-aldiklarim.png") });

await browser.close();
summary();
