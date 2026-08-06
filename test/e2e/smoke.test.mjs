// Eklenti hiç yüklenmiyorsa diğer testlerin çıktısını okumaya gerek yok: bu
// dosya yalnızca "ayakta mı" sorusuna bakıyor — service worker kaydoluyor mu,
// ortak modüller oraya yükleniyor mu, popup hatasız açılıyor mu.
import { launchExtension, createChecker, screenshotPath, wait } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw, extensionId } = await launchExtension({
  windowSize: "1280,900",
});

check("service worker kaydoldu", Boolean(extensionId), `eklenti id: ${extensionId}`);

// Ortak modüller service worker içine yüklendi mi? (Chrome tarafında
// importScripts, Firefox tarafında background.scripts ile geliyorlar.)
const swState = await sw.evaluate(() => ({
  cartModule: typeof OrtakSepetCart,
  categorize: typeof categorizeProduct,
  cartKey: typeof OrtakSepetCart !== "undefined" ? OrtakSepetCart.CART_STORAGE_KEY : null,
  sampleCategory:
    typeof categorizeProduct === "function"
      ? categorizeProduct({ title: "BILLY Kitaplık, beyaz", site: "IKEA" })
      : null,
}));

check("background: OrtakSepetCart yüklendi", swState.cartModule === "object", swState.cartModule);
check("background: categorizeProduct yüklendi", swState.categorize === "function", swState.categorize);
check("background: depo anahtarı", swState.cartKey === "ortakSepetItems", String(swState.cartKey));
check(
  "background: kategori kuralları çalışıyor",
  swState.sampleCategory === "Ev & Yaşam",
  String(swState.sampleCategory),
);

const popup = await browser.newPage();
const popupErrors = [];
popup.on("pageerror", (error) => popupErrors.push(String(error)));
popup.on("console", (message) => {
  if (message.type() === "error") popupErrors.push(message.text());
});

await popup.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "load" });
await wait(800);

const popupState = await popup.evaluate(() => ({
  subtitle: document.getElementById("appSubtitle")?.textContent,
  addLabel: document.querySelector("#addCurrentProductBtn .action-label")?.textContent,
  emptyText: document.querySelector(".empty")?.textContent,
  total: document.getElementById("totalPrice")?.textContent,
  ariaLabel: document.getElementById("actionGrid")?.getAttribute("aria-label"),
  hasCartModule: typeof OrtakSepetCart,
  hasCategorize: typeof categorizeProduct,
}));

check("popup açıldı", Boolean(popupState.subtitle), popupState.subtitle);
check("ekle butonu etiketli", Boolean(popupState.addLabel), popupState.addLabel);
check("boş sepet metni var", Boolean(popupState.emptyText), popupState.emptyText);
check("toplam gösteriliyor", Boolean(popupState.total), popupState.total);
check("işlem alanı aria-label taşıyor", Boolean(popupState.ariaLabel), popupState.ariaLabel);
check("popup: OrtakSepetCart yüklendi", popupState.hasCartModule === "object", popupState.hasCartModule);
check("popup: categorizeProduct yüklendi", popupState.hasCategorize === "function", popupState.hasCategorize);
check("popup konsolunda hata yok", popupErrors.length === 0, popupErrors.join(" | "));

await popup.screenshot({ path: screenshotPath("popup-bos.png") });

await browser.close();
summary();
