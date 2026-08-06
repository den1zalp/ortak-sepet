// IKEA TR ve UK ürün sayfalarında parser + sepete ekleme doğrulaması.
import { launchExtension } from "../helpers/extension.mjs";

const URLS = [
  "https://www.ikea.com.tr/urun/gullaberg-lonset-beyaz-160x200-cm-cift-kisilik-karyola-29614536",
  "https://www.ikea.com/gb/en/p/micke-corner-workstation-white-50250713/",
];

const { browser, sw, workerTarget, extensionId } = await launchExtension({
  windowSize: "1400,950",
});

for (const url of URLS) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 900 });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 5000));

  const currentUrl = page.url();

  // 1. Content script ne okuyor?
  const response = await sw.evaluate(async (targetUrl) => {
    const tabs = await browser.tabs.query({});
    const tab = tabs.find((c) => c.url === targetUrl);
    if (!tab) return { ok: false, error: "sekme yok" };
    try {
      return await browser.tabs.sendMessage(tab.id, { type: "GET_PRODUCT" });
    } catch (error) {
      return { ok: false, error: String(error && error.message) };
    }
  }, currentUrl);

  console.log(`\n=== ${currentUrl} ===`);

  if (!response?.ok) {
    console.log(`  FAIL: ${response?.error}`);
    await page.close();
    continue;
  }

  const p = response.product;
  console.log(`  site   : ${p.site}`);
  console.log(`  başlık : ${p.title}`);
  console.log(`  fiyat  : ${p.price}`);
  console.log(`  bölge  : ${p.region}`);
  console.log(`  görsel : ${(p.image || "").slice(0, 85)}`);
  console.log(`  taksit : ${p.installmentAvailable} / ${p.installmentText}`);
  console.log(`  kargo  : ${p.shippingText}`);

  // 2. Sepete gerçekten ekleniyor mu? (sağ tık menüsüyle aynı yol)
  const added = await sw.evaluate(async (product) => {
    await browser.storage.local.set({ ortakSepetItems: [] });
    const result = await OrtakSepetCart.addProduct(product);
    const stored = (await browser.storage.local.get("ortakSepetItems")).ortakSepetItems;
    return {
      status: result.status,
      count: stored.length,
      currency: stored[0]?.currency,
      symbol: stored[0]?.currencySymbol,
      region: stored[0]?.region,
    };
  }, p);

  console.log(`  sepet  : ${added.status}, ${added.count} kalem, ${added.currency}/${added.symbol}, bölge ${added.region}`);
  console.log(`  SONUÇ  : ${p.title && p.price ? "OK" : "EKSİK VERİ"}`);

  await page.close();
}

await browser.close();
