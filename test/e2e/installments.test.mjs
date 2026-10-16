// Taksit bilgisi okunamadığında "Bilinmiyor" yerine taksitsiz gibi mi görünüyor?
// Kartta taksit yalnızca varsa "Taksit var" rozetiyle yazıyor; yoksa da
// okunamadıysa da rozet yok.
import { launchExtension, createChecker, screenshotPath } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw, workerTarget, extensionId } = await launchExtension({
  windowSize: "1280,980",
});

const base = { price: "382,50 TL", currency: "TRY", currencySymbol: "TL", region: "TR", site: "Amazon TR", quantity: 1, selected: true };

await sw.evaluate(async (base) => {
  await browser.storage.local.set({
    ortakSepetViewMode: "normal",
    ortakSepetItems: [
      // Ekran görüntüsündeki durum: parser taksit bulamadı.
      { ...base, id: "bilinmiyor", title: "Nutraxin Vitals Omega-3 2000 mg", url: "https://www.amazon.com.tr/dp/B07HRY67XJ", installmentAvailable: null, installmentText: "Taksit bilgisi bulunamadı" },
      // Parser açıkça "taksit yok" dedi.
      { ...base, id: "yok", title: "Taksitsiz ürün", url: "https://www.amazon.com.tr/dp/YOK", installmentAvailable: false, installmentText: "Taksit yok" },
      // Taksit var.
      { ...base, id: "var", title: "Taksitli ürün", url: "https://www.amazon.com.tr/dp/VAR", installmentAvailable: true, installmentText: "12 taksit" },
    ],
  });
  await browser.storage.local.remove(["ortakSepetPurchased", "ortakSepetUndo"]);
}, base);

const popup = await browser.newPage();
await popup.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, 1500));

const read = () =>
  popup.evaluate(() =>
    [...document.querySelectorAll("#cartItems .cart-item")].map((el) => ({
      title: el.querySelector(".cart-title")?.textContent?.trim(),
      taksit: el.querySelector(".os-badge-installment")?.textContent?.trim() || null,
    })),
  );

const rows = await read();
console.log(rows);
check("bilgi okunamayan üründe taksit rozeti yok", rows[0]?.taksit === null, rows[0]?.taksit);
check("taksitsiz üründe taksit rozeti yok", rows[1]?.taksit === null, rows[1]?.taksit);
check("taksitli üründe 'Taksit var' yazıyor", rows[2]?.taksit === "Taksit var", rows[2]?.taksit);

const pageText = await popup.evaluate(() => document.body.innerText);
check("popup'ta hiç 'Bilinmiyor' geçmiyor", !pageText.includes("Bilinmiyor"), pageText.match(/.{0,30}Bilinmiyor.{0,30}/)?.[0] || "");

// Taksit gruplaması
await popup.click("#installmentProductsBtn");
await new Promise((r) => setTimeout(r, 1200));
const groups = await popup.evaluate(() =>
  [...document.querySelectorAll("#cartItems .category-title, #cartItems .group-title, #cartItems h3")].map((el) => el.textContent.trim()),
);
console.log(groups);
check("grup başlığında 'Bilinmiyor' yok", !groups.some((g) => g.includes("Bilinmiyor")), groups.join(" | "));

// İngilizce tarafı
await popup.click("#languageToggleBtn");
await popup.click('[data-language="en"]');
await new Promise((r) => setTimeout(r, 1200));
const enText = await popup.evaluate(() => document.body.innerText);
check("İngilizcede 'Unknown' geçmiyor", !enText.includes("Unknown"), enText.match(/.{0,30}Unknown.{0,30}/)?.[0] || "");

await popup.screenshot({ path: screenshotPath("taksit-yok.png") });
await browser.close();
summary();
