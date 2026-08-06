import { launchExtension, createChecker, screenshotPath } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw, workerTarget, extensionId } = await launchExtension({
  windowSize: "1280,950",
});

await sw.evaluate(async () => {
  await browser.storage.local.set({
    ortakSepetItems: [
      { id: "a", title: "Philips Airfryer XXL", price: "3.499,00 TL", currency: "TRY", currencySymbol: "TL", region: "TR", site: "Hepsiburada", url: "https://www.hepsiburada.com/urun-p-1", quantity: 2, selected: true },
      { id: "b", title: "MICKE white, Corner workstation", price: "£149.00", currency: "GBP", currencySymbol: "£", region: "UK", site: "IKEA UK", url: "https://www.ikea.com/gb/en/p/micke-50250713/", quantity: 1, selected: true },
    ],
  });
  await browser.storage.local.remove("ortakSepetUndo");
});

const origin = `chrome-extension://${extensionId}`;
await browser.defaultBrowserContext().overridePermissions(origin, [
  "clipboard-read",
  "clipboard-write",
]);

const popup = await browser.newPage();
const errors = [];
popup.on("pageerror", (e) => errors.push(String(e)));
popup.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await popup.goto(`${origin}/popup.html`, { waitUntil: "load" });
await popup.bringToFront();
await new Promise((r) => setTimeout(r, 700));

// --- 1. Kopyala butonu ---
const buttonState = await popup.evaluate(() => ({
  label: document.getElementById("copyCartBtn")?.textContent,
  clearLabel: document.getElementById("clearCartBtn")?.textContent,
  sameRow:
    document.getElementById("copyCartBtn")?.parentElement ===
    document.getElementById("clearCartBtn")?.parentElement,
}));
check("kopyala butonu var", buttonState.label === "Sepeti Kopyala", buttonState.label);
check("temizle butonu yanında", buttonState.sameRow === true);

// --- 2. Üretilen metin ---
const text = await popup.evaluate(async () => buildCartText(await getCartItems()));
console.log("\n--- panoya gidecek metin ---\n" + text + "\n---------------------------\n");

check("başlık satırı", text.startsWith("Ortak Sepet — 3 ürün"), text.split("\n")[0]);
check("ürün satırı adet ve site içeriyor", text.includes("• Philips Airfryer XXL — 3.499,00 TL x 2 (Hepsiburada)"));
check("tek adetlik üründe çarpan yok", text.includes("• MICKE white, Corner workstation — £149.00 (IKEA UK)"));
check("ürün linkleri var", text.includes("https://www.hepsiburada.com/urun-p-1") && text.includes("https://www.ikea.com/gb/en/p/micke-50250713/"));
check("toplam satırı iki para birimi", text.includes("Toplam: 6.998,00 TL + £149.00"), text.split("\n").pop());

// --- 3. Gerçekten panoya yazıyor mu ---
await popup.click("#copyCartBtn");
await new Promise((r) => setTimeout(r, 500));

const copyResult = await popup.evaluate(async () => ({
  status: document.getElementById("status").textContent,
  clipboard: await navigator.clipboard.readText(),
}));
check("kopyalandı mesajı", copyResult.status === "Sepet panoya kopyalandı.", copyResult.status);
check("pano içeriği doğru", copyResult.clipboard.includes("Philips Airfryer XXL") && copyResult.clipboard.includes("Toplam:"));

// --- 4. Boş sepette uyarı ---
const emptyCase = await popup.evaluate(async () => {
  await saveCartItems([]);
  await copyCartToClipboard();
  const status = document.getElementById("status").textContent;
  return status;
});
check("boş sepette uyarı", emptyCase.includes("Dışa aktarılacak ürün yok"), emptyCase);

// --- 5. Erişilebilirlik ---
await popup.reload({ waitUntil: "load" });
await sw.evaluate(async () => {
  await browser.storage.local.set({
    ortakSepetItems: [
      { id: "a", title: "Philips Airfryer XXL", price: "3.499,00 TL", currency: "TRY", region: "TR", site: "Hepsiburada", url: "https://www.hepsiburada.com/urun-p-1", quantity: 2, selected: true },
    ],
  });
});
await popup.reload({ waitUntil: "load" });
await new Promise((r) => setTimeout(r, 600));

const a11y = await popup.evaluate(() => {
  const status = document.getElementById("status");
  const checkbox = document.querySelector(".select-checkbox");
  const decrease = document.querySelector("[data-decrease]");
  const increase = document.querySelector("[data-increase]");
  const remove = document.querySelector("[data-remove]");
  const open = document.querySelector("[data-open]");
  const edit = document.querySelector("[data-edit-price]");

  return {
    statusRole: status?.getAttribute("role"),
    statusLive: status?.getAttribute("aria-live"),
    checkbox: checkbox?.getAttribute("aria-label"),
    decrease: decrease?.getAttribute("aria-label"),
    increase: increase?.getAttribute("aria-label"),
    remove: remove?.getAttribute("aria-label"),
    open: open?.getAttribute("aria-label"),
    edit: edit?.getAttribute("aria-label"),
    actionGrid: document.getElementById("actionGrid")?.getAttribute("aria-label"),
  };
});

check("durum satırı canlı bölge", a11y.statusRole === "status" && a11y.statusLive === "polite", `${a11y.statusRole}/${a11y.statusLive}`);
check("seçim kutusu ürün adıyla adlandırıldı", a11y.checkbox === "Seçili toplama dahil et: Philips Airfryer XXL", a11y.checkbox);
check("adet azalt etiketli", a11y.decrease === "Adet azalt: Philips Airfryer XXL", a11y.decrease);
check("adet artır etiketli", a11y.increase === "Adet artır: Philips Airfryer XXL", a11y.increase);
check("sil etiketli", a11y.remove === "Ürünü sil: Philips Airfryer XXL", a11y.remove);
check("linke git etiketli", a11y.open === "Ürün sayfasını aç: Philips Airfryer XXL", a11y.open);
check("manuel fiyat etiketli", a11y.edit === "Manuel fiyat gir: Philips Airfryer XXL", a11y.edit);
check("işlem alanı etiketli", a11y.actionGrid === "Sepet işlemleri", a11y.actionGrid);

// --- 6. İngilizce tarafta da etiketler ---
const english = await popup.evaluate(async () => {
  await setLanguage("en");
  applyStaticTranslations();
  await renderCart();
  return {
    copy: document.getElementById("copyCartBtn").textContent,
    checkbox: document.querySelector(".select-checkbox")?.getAttribute("aria-label"),
    header: buildCartText(await getCartItems()).split("\n")[0],
  };
});
check("EN kopyala butonu", english.copy === "Copy Basket", english.copy);
check("EN erişilebilirlik etiketi", english.checkbox === "Include in selected total: Philips Airfryer XXL", english.checkbox);
check("EN metin başlığı", english.header === "Ortak Sepet — 2 products", english.header);

check("popup konsolunda hata yok", errors.length === 0, errors.join(" | "));

await popup.screenshot({ path: screenshotPath("popup-kopyala.png") });

await browser.close();
summary();
