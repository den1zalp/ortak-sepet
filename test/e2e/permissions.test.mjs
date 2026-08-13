// Eksik site izni uyarısı. Chrome manifest'teki host izinlerini kurulumda
// veriyor ve API ile geri alınamıyor, o yüzden "izin eksik" hâli gerçek
// tarayıcıda üretilemiyor; eksik izin listesi yerine konularak render yolu
// sınanıyor. İzinlerin gerçekten verili olduğu normal hâlde uyarının
// çıkmaması da burada garanti altına alınıyor.
import { launchExtension, createChecker, screenshotPath } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw, extensionId } = await launchExtension({ windowSize: "1280,950" });

await sw.evaluate(async () => {
  await browser.storage.local.set({
    ortakSepetItems: [
      {
        id: "a",
        title: "Katlanır Kamp Sandalye",
        price: "1.150 TL",
        currency: "TRY",
        region: "TR",
        site: "Decathlon",
        url: "https://www.decathlon.com.tr/p/katlanir-kamp-sandalye/_/R-p-13372",
        quantity: 1,
        selected: true,
      },
      {
        id: "b",
        title: "Philips Airfryer XXL",
        price: "3.499,00 TL",
        currency: "TRY",
        region: "TR",
        site: "Hepsiburada",
        url: "https://www.hepsiburada.com/urun-p-1",
        quantity: 1,
        selected: true,
      },
    ],
  });
  await browser.storage.local.remove("ortakSepetUndo");
});

const origin = `chrome-extension://${extensionId}`;
const popup = await browser.newPage();
const errors = [];
popup.on("pageerror", (error) => errors.push(String(error)));
popup.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

await popup.goto(`${origin}/popup.html`, { waitUntil: "load" });
await popup.bringToFront();
await new Promise((resolve) => setTimeout(resolve, 700));

// --- 1. İzinler verilmişken uyarı çıkmamalı ---
const clean = await popup.evaluate(() => ({
  hidden: document.getElementById("permissionNotice").hidden,
  buttons: document.querySelectorAll(".grant-permission-button").length,
  highlighted: document.querySelectorAll(".cart-item-needs-permission").length,
}));

check("izinler tamken uyarı gizli", clean.hidden === true, clean.hidden);
check("izin düğmesi yok", clean.buttons === 0, clean.buttons);
check("ürün vurgulanmıyor", clean.highlighted === 0, clean.highlighted);

// --- 2. Eksik izin varmış gibi render ---
const missing = await popup.evaluate(async () => {
  OrtakSepetCart.findMissingOrigins = async () => ["*://*.decathlon.com.tr/*"];
  await renderCart();

  const notice = document.getElementById("permissionNotice");
  const noticeButton = notice.querySelector(".grant-permission-button");
  const itemButtons = Array.from(
    document.querySelectorAll("#cartItems .grant-permission-button"),
  );

  return {
    hidden: notice.hidden,
    text: notice.querySelector(".permission-notice-text")?.textContent,
    hint: notice.querySelector(".permission-notice-hint")?.textContent,
    noticeOrigins: noticeButton?.dataset.grantPermission,
    noticeLabel: noticeButton?.getAttribute("aria-label"),
    itemButtonCount: itemButtons.length,
    itemOrigins: itemButtons[0]?.dataset.grantPermission,
    itemLabel: itemButtons[0]?.getAttribute("aria-label"),
    highlighted: document.querySelectorAll(".cart-item-needs-permission").length,
    // innerHTML ile içerik basılmadığının kontrolü: metin düğüm olarak duruyor.
    usesTextNodes: notice.querySelector(".permission-notice-text")?.children.length === 0,
  };
});

check("uyarı göründü", missing.hidden === false, missing.hidden);
check("uyarı metni site sayısını veriyor", missing.text === "1 sitenin erişim izni verilmemiş; o sitelerdeki ürünler güncellenemiyor.", missing.text);
check("popup kapanma uyarısı var", Boolean(missing.hint), missing.hint);
check("toplu düğme origin taşıyor", missing.noticeOrigins === "*://*.decathlon.com.tr/*", missing.noticeOrigins);
check("toplu düğme etiketli", missing.noticeLabel === "Eksik site izinlerinin tümünü ver", missing.noticeLabel);

// Yalnızca o sitenin ürününde düğme çıkmalı; Hepsiburada ürünü etkilenmemeli.
check("sadece ilgili üründe düğme", missing.itemButtonCount === 1, missing.itemButtonCount);
check("ürün düğmesi origin taşıyor", missing.itemOrigins === "*://*.decathlon.com.tr/*", missing.itemOrigins);
check("ürün düğmesi ürün adıyla etiketli", missing.itemLabel === "Katlanır Kamp Sandalye için site iznini ver", missing.itemLabel);
check("sadece ilgili ürün vurgulu", missing.highlighted === 1, missing.highlighted);
check("içerik textContent ile basılmış", missing.usesTextNodes === true);

// --- 3. Durum satırı: güncellemede izin eksikse ayrı sayılıyor ---
const summaryShape = await sw.evaluate(async () => {
  const result = await updateAllPrices();
  return Object.keys(result).sort().join(",");
});

check(
  "güncelleme özeti needsPermission içeriyor",
  summaryShape.includes("needsPermission"),
  summaryShape,
);

// --- 4. Sepet boşken bile açık sekmenin izni sorulabilmeli ---
// (izin yoksa ürün eklenemiyor, dolayısıyla uyarıyı gösterecek bir sepet
// satırı da olmuyor — kısır döngü buradan kırılıyor.)
const fromTab = await popup.evaluate(async () => {
  OrtakSepetCart.findMissingOrigins = async (items) =>
    items.some((item) => String(item.url || "").includes("decathlon.com.tr"))
      ? ["*://*.decathlon.com.tr/*"]
      : [];

  const shown = await showPermissionNoticeForTab({
    url: "https://www.decathlon.com.tr/p/x/_/R-p-1",
  });
  const ignored = await showPermissionNoticeForTab({ url: "https://www.hepsiburada.com/x" });
  const noUrl = await showPermissionNoticeForTab({});

  return {
    shown,
    ignored,
    noUrl,
    visible: document.getElementById("permissionNotice").hidden === false,
    status: document.getElementById("status").textContent,
  };
});

check("izinsiz sitede uyarı gösterildi", fromTab.shown === true, fromTab.shown);
check("izinli sitede araya girmiyor", fromTab.ignored === false, fromTab.ignored);
check("adressiz sekmede araya girmiyor", fromTab.noUrl === false, fromTab.noUrl);
check("uyarı satırı görünür", fromTab.visible === true);
check("durum satırı sebebi söylüyor", fromTab.status?.includes("erişim izni verilmemiş"), fromTab.status);

// --- 5. İngilizce ---
const english = await popup.evaluate(async () => {
  await setLanguage("en");
  applyStaticTranslations();
  await renderCart();
  return {
    text: document.querySelector(".permission-notice-text")?.textContent,
    button: document.querySelector(".grant-permission-button")?.textContent,
  };
});

check("ingilizce uyarı", english.text === "Access to 1 site(s) has not been granted, so those products cannot be refreshed.", english.text);
check("ingilizce düğme", english.button === "Grant Access", english.button);

await popup.screenshot({ path: screenshotPath("izin-uyarisi.png") });

check("konsol hatası yok", errors.length === 0, errors.join(" | "));

await browser.close();
summary();
