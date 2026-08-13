// dist/chrome paketini Chrome'a yükleyip gerçekten çalışıyor mu diye bakar:
// mağazaya giden manifest kaynaktakinden farklı (Chrome'da background.scripts
// ve browser_specific_settings silinir), o yüzden paket ayrıca sınanıyor.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { REPO_ROOT, launchExtension, createChecker, screenshotPath } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

// Sürüm kaynaktan okunuyor; testin içine yazılırsa her sürüm yükseltmesinde
// alakasız bir kırmızı veriyor.
const expectedVersion = JSON.parse(
  readFileSync(join(REPO_ROOT, "manifest.json"), "utf8"),
).version;

// Test kendi paketini üretiyor; elle build etmeyi unutmak sessizce eski paketi
// sınamak demek olurdu.
execFileSync(process.execPath, [join(REPO_ROOT, "tools", "build.mjs"), "chrome"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
});

const { browser, sw, workerTarget, extensionId } = await launchExtension({
  extensionPath: join(REPO_ROOT, "dist", "chrome"),
  windowSize: "1280,980",
  profilePrefix: "ortak-sepet-pkg-",
});

check("service worker kaydoldu", Boolean(workerTarget));

const swState = await sw.evaluate(() => ({
  cart: typeof OrtakSepetCart,
  category: typeof CATEGORY_RULES,
  polyfill: typeof browser?.storage?.local?.get,
  version: chrome.runtime.getManifest().version,
  hasScriptsKey: Boolean(chrome.runtime.getManifest().background?.scripts),
  hasGecko: Boolean(chrome.runtime.getManifest().browser_specific_settings),
  contextMenus: typeof chrome.contextMenus,
}));
check("importScripts ile shared/cart yüklendi", swState.cart === "object", swState.cart);
check("shared/category yüklendi", swState.category !== "undefined", swState.category);
check("polyfill çalışıyor", swState.polyfill === "function", swState.polyfill);
check(
  `sürüm ${expectedVersion}`,
  swState.version === expectedVersion,
  swState.version,
);
check("chrome manifest'inde background.scripts yok", swState.hasScriptsKey === false);
check("chrome manifest'inde gecko anahtarı yok", swState.hasGecko === false);
check("contextMenus API erişilebilir", swState.contextMenus === "object");

// Sepete ekleme yolu paketten de çalışıyor mu?
const addResult = await sw.evaluate(async () => {
  await browser.storage.local.remove(["ortakSepetItems", "ortakSepetPurchased", "ortakSepetUndo"]);
  await OrtakSepetCart.addProduct({
    title: "Paket testi ürünü",
    price: "1.299,90 TL",
    url: "https://www.ikea.com.tr/urun/paket-testi",
    site: "IKEA",
  });
  const items = await OrtakSepetCart.getItems();
  return { count: items.length, title: items[0]?.title, price: items[0]?.price };
});
check("paketten sepete ekleme çalışıyor", addResult.count === 1 && addResult.price === "1.299,90 TL", JSON.stringify(addResult));

const popup = await browser.newPage();
const popupErrors = [];
popup.on("pageerror", (error) => popupErrors.push(String(error)));
popup.on("console", (msg) => {
  if (msg.type() === "error") popupErrors.push(msg.text());
});
await popup.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, 2500));

const popupState = await popup.evaluate(() => ({
  items: document.querySelectorAll("#cartItems .cart-item").length,
  tabs: document.querySelectorAll(".cart-tab").length,
  copyBtn: Boolean(document.getElementById("copyCartBtn")),
  title: document.querySelector("#cartItems .cart-title")?.textContent,
}));
check("popup açıldı ve ürünü gösterdi", popupState.items === 1, JSON.stringify(popupState));
check("sekmeler yerinde", popupState.tabs === 2, String(popupState.tabs));
check("konsol hatası yok", popupErrors.length === 0, popupErrors.join(" | "));

await popup.screenshot({ path: screenshotPath("paket-popup.png") });

await browser.close();
summary();
