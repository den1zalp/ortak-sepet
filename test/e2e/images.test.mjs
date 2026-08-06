// Ürün görseli yüklenemediğinde arka plan yedeği devreye giriyor mu?
import { launchExtension, createChecker, screenshotPath } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

// Canlı testlerden gelen gerçek ürün görselleri.
const IKEA_TR_IMAGE = "https://image-ikea.mncdn.com/urunler/2000_2000/PE1003369.jpg";
const IKEA_UK_IMAGE = "https://image-ikea.mncdn.com/urunler/2000_2000/PE1003369.jpg";
// Kasten geçersiz: yüklenemeyen görselde arka plan yedeğinin devreye girip
// girmediğini ölçmek için.
const BROKEN_IMAGE = "https://www.ikea.com/gb/en/images/products/bulunmayan-gorsel__0000000.jpg";

const { browser, sw, workerTarget, extensionId } = await launchExtension({
  windowSize: "1280,980",
});

await sw.evaluate(
  async ([cartImage, purchasedImage]) => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 12).toISOString();

    await browser.storage.local.set({
      ortakSepetItems: [
        {
          id: "a",
          title: "GULLABERG/LÖNSET çift kişilik karyola, beyaz, 160x200 cm",
          price: "19.599 TL",
          currency: "TRY",
          currencySymbol: "TL",
          region: "TR",
          site: "IKEA",
          url: "https://www.ikea.com.tr/urun/gullaberg-lonset-29614536",
          image: cartImage,
          quantity: 1,
          selected: true,
          installmentAvailable: true,
          installmentText: "Taksit var",
          shippingText: "Sepette hesaplanır",
        },
      ],
      ortakSepetPurchased: [
        {
          id: "p1",
          title: "MICKE white, Corner workstation, 100x142 cm",
          price: "£149.00",
          currency: "GBP",
          currencySymbol: "£",
          region: "UK",
          site: "IKEA UK",
          url: "https://www.ikea.com/gb/en/p/micke-50250713/",
          image: purchasedImage,
          quantity: 1,
          purchasedAt: lastMonth,
        },
      ],
    });
    await browser.storage.local.remove("ortakSepetUndo");
  },
  [IKEA_TR_IMAGE, IKEA_UK_IMAGE],
);

const popup = await browser.newPage();
await popup.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, 3000));

const cartImage = await popup.evaluate(() => {
  const img = document.querySelector("#cartItems .cart-image");
  return { src: img?.src, width: img?.naturalWidth, complete: img?.complete };
});
check("sepette görsel yüklendi", cartImage.width > 0, `${cartImage.width}px — ${cartImage.src?.slice(0, 60)}`);
await popup.screenshot({ path: screenshotPath("gorsel-sepet.png") });

await popup.click("#purchasedTabBtn");
await new Promise((r) => setTimeout(r, 3000));

const purchasedImage = await popup.evaluate(() => {
  const img = document.querySelector("#purchasedItems .cart-image");
  return { src: img?.src, width: img?.naturalWidth };
});
check("alınanlarda görsel yüklendi", purchasedImage.width > 0, `${purchasedImage.width}px — ${purchasedImage.src?.slice(0, 60)}`);
await popup.screenshot({ path: screenshotPath("gorsel-aldiklarim.png") });

// Görselsiz kayıtta boşuna istek yapılmamalı.
const noImage = await popup.evaluate(async () => {
  await savePurchasedItems([
    { id: "p2", title: "Görselsiz kayıt", price: "10,00 TL", currency: "TRY", region: "TR", quantity: 1, purchasedAt: new Date().toISOString() },
  ]);
  await renderPurchased();
  const img = document.querySelector("#purchasedItems .cart-image");
  return { src: img?.getAttribute("src") };
});
check("görselsiz kayıtta boş istek yok", noImage.src === null, `src=${noImage.src}`);

// Yüklenemeyen görselde arka plan yedeği devreye giriyor mu?
const fallback = await popup.evaluate(async (brokenImage) => {
  const calls = [];
  const original = browser.runtime.sendMessage;
  browser.runtime.sendMessage = (message) => {
    calls.push(message?.type);
    return original(message);
  };

  await savePurchasedItems([
    { id: "p3", title: "Kırık görsel", price: "10,00 TL", currency: "TRY", region: "TR", image: brokenImage, quantity: 1, purchasedAt: new Date().toISOString() },
  ]);
  await renderPurchased();

  await new Promise((resolve) => setTimeout(resolve, 2500));
  browser.runtime.sendMessage = original;

  return calls;
}, BROKEN_IMAGE);
check(
  "alınanlarda görsel yedeği tetiklendi",
  fallback.includes("FETCH_IMAGE_AS_DATA_URL"),
  fallback.join(",") || "hiç çağrı yok",
);

await browser.close();
summary();
