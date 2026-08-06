import { launchExtension, createChecker, screenshotPath } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw, workerTarget, extensionId } = await launchExtension({
  windowSize: "1280,950",
});

const seed = [
  { id: "a", title: "Ürün A", price: "100,00 TL", currency: "TRY", currencySymbol: "TL", region: "TR", url: "https://example.com/a", quantity: 1, selected: true },
  { id: "b", title: "Ürün B", price: "200,00 TL", currency: "TRY", currencySymbol: "TL", region: "TR", url: "https://example.com/b", quantity: 2, selected: true },
  { id: "c", title: "Product C", price: "£30.00", currency: "GBP", currencySymbol: "£", region: "UK", url: "https://example.com/c", quantity: 1, selected: true },
];

await sw.evaluate(async (items) => {
  await browser.storage.local.set({ ortakSepetItems: items });
  await browser.storage.local.remove("ortakSepetUndo");
}, seed);

const popup = await browser.newPage();
const errors = [];
popup.on("pageerror", (e) => errors.push(String(e)));
popup.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await popup.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, 700));

// --- 1. Yeni butonlar ve etiketler ---
const labels = await popup.evaluate(() => ({
  jsonButtons:
    document.getElementById("exportJsonBtn") ||
    document.getElementById("importJsonBtn") ||
    document.getElementById("importJsonInput"),
  csv: document.querySelector("#exportCsvBtn .action-label")?.textContent,
  undo: document.getElementById("undoBtn")?.textContent,
  undoHidden: document.getElementById("undoBtn")?.hidden,
  total: document.getElementById("totalPrice")?.textContent,
  itemCount: document.getElementById("itemCount")?.textContent,
}));
check("JSON arayüzü tamamen kaldırıldı", labels.jsonButtons === null);
check("CSV butonu duruyor", labels.csv === "CSV / Excel", labels.csv);
check("geri al butonu başta gizli", labels.undoHidden === true);
check("çok para birimli toplam", labels.total.includes("TL") && labels.total.includes("£"), labels.total);
check("adet toplamı", labels.itemCount === "4", labels.itemCount);

// --- 2. Sepeti temizle: iki adımlı onay ---
await popup.click("#clearCartBtn");
await new Promise((r) => setTimeout(r, 300));

const afterFirstClick = await popup.evaluate(async () => ({
  buttonText: document.getElementById("clearCartBtn").textContent,
  status: document.getElementById("status").textContent,
  count: (await browser.storage.local.get("ortakSepetItems")).ortakSepetItems.length,
}));
check("ilk tık sepeti silmiyor", afterFirstClick.count === 3, `kalem: ${afterFirstClick.count}`);
check("buton onay soruyor", afterFirstClick.buttonText === "Emin misin?", afterFirstClick.buttonText);

await popup.click("#clearCartBtn");
await new Promise((r) => setTimeout(r, 400));

const afterSecondClick = await popup.evaluate(async () => ({
  count: (await browser.storage.local.get("ortakSepetItems")).ortakSepetItems.length,
  undoHidden: document.getElementById("undoBtn").hidden,
  status: document.getElementById("status").textContent,
}));
check("ikinci tık sepeti sildi", afterSecondClick.count === 0);
check("geri al butonu göründü", afterSecondClick.undoHidden === false);

// --- 3. Geri alma ---
await popup.click("#undoBtn");
await new Promise((r) => setTimeout(r, 400));

const afterUndo = await popup.evaluate(async () => {
  const items = (await browser.storage.local.get("ortakSepetItems")).ortakSepetItems;
  return {
    count: items.length,
    quantities: items.map((i) => i.quantity),
    undoHidden: document.getElementById("undoBtn").hidden,
    status: document.getElementById("status").textContent,
  };
});
check("geri alma sepeti geri getirdi", afterUndo.count === 3, `kalem: ${afterUndo.count}`);
check("adetler korundu", JSON.stringify(afterUndo.quantities) === "[1,2,1]", JSON.stringify(afterUndo.quantities));
check("geri al butonu tekrar gizlendi", afterUndo.undoHidden === true);

// --- 4. Onay zaman aşımı ---
await popup.click("#clearCartBtn");
await new Promise((r) => setTimeout(r, 5400));
const afterTimeout = await popup.evaluate(() => document.getElementById("clearCartBtn").textContent);
check("onay 5 sn sonra düşüyor", afterTimeout === "Sepeti Temizle", afterTimeout);

// --- 5. Tek ürün silme de geri alınabiliyor ---
const removeUndo = await popup.evaluate(async () => {
  await removeItem("b");
  const afterRemove = await getCartItems();
  const undoVisible = !document.getElementById("undoBtn").hidden;

  await undoLastAction();
  const afterUndo = await getCartItems();

  return {
    afterRemoveCount: afterRemove.length,
    undoVisible,
    afterUndoCount: afterUndo.length,
    hasB: afterUndo.some((i) => i.id === "b"),
  };
});
check("ürün silindi", removeUndo.afterRemoveCount === 2);
check("silmede geri al göründü", removeUndo.undoVisible === true);
check("silme geri alındı", removeUndo.afterUndoCount === 3 && removeUndo.hasB);

// --- 6. Fiyat güncellemesini durdurma ---
await popup.evaluate(() => {
  window.__updatePromise = updateAllPrices();
});
await new Promise((r) => setTimeout(r, 1500));

const midUpdate = await popup.evaluate(() => ({
  label: document.querySelector("#updateAllPricesBtn .action-label")?.textContent,
  addDisabled: document.getElementById("addCurrentProductBtn").disabled,
  updateDisabled: document.getElementById("updateAllPricesBtn").disabled,
}));
check("güncelleme sürerken buton durdurmaya döndü", midUpdate.label === "Güncellemeyi Durdur", midUpdate.label);
check("güncelleme butonu tıklanabilir kaldı", midUpdate.updateDisabled === false);
check("diğer butonlar kilitli", midUpdate.addDisabled === true);

const tabCount = browser.targets().filter((t) => t.type() === "page").length;
check("paralel sekme açıldı", tabCount >= 3, `açık sayfa: ${tabCount}`);

await popup.click("#updateAllPricesBtn");
const finished = await popup.evaluate(async () => {
  await window.__updatePromise;
  return {
    label: document.querySelector("#updateAllPricesBtn .action-label")?.textContent,
    status: document.getElementById("status").textContent,
    addDisabled: document.getElementById("addCurrentProductBtn").disabled,
  };
});
check("durdurma sonrası buton normale döndü", finished.label === "Fiyatları Güncelle", finished.label);
check("durduruldu mesajı", finished.status.includes("durduruldu"), finished.status);
check("butonlar açıldı", finished.addDisabled === false);

check("popup konsolunda hata yok", errors.length === 0, errors.join(" | "));

await popup.screenshot({ path: screenshotPath("popup-ozellikler.png") });

await browser.close();
summary();
