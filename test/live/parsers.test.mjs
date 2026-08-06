// Kendi parser'ı olan TR/UK sitelerinde canlı ürün sayfası doğrulaması.
import { launchExtension, screenshotPath } from "../helpers/extension.mjs";

// Ürün URL'lerini tahmin etmek yerine ana sayfadan ilk ürün linkini buluyoruz.
const SITES = [
  { name: "IKEA TR", home: "https://www.ikea.com.tr/", linkPattern: /\/urun\// },
  { name: "IKEA UK", home: "https://www.ikea.com/gb/en/", linkPattern: /\/p\/[a-z0-9-]+-\d{8}/ },
  { name: "Çiçeksepeti", home: "https://www.ciceksepeti.com/", linkPattern: /-p-\d+|\/p\// },
  { name: "D&R", home: "https://www.dr.com.tr/", linkPattern: /\/kitap\/|\/urun\/|-p\d+/ },
  { name: "Pazarama", home: "https://www.pazarama.com/", linkPattern: /-p-[a-z0-9]/i },
];

const { browser, sw, workerTarget, extensionId } = await launchExtension({
  windowSize: "1400,950",
});

async function readProduct(page) {
  const url = page.url();

  return sw.evaluate(async (targetUrl) => {
    const tabs = await browser.tabs.query({});
    const tab = tabs.find((candidate) => candidate.url === targetUrl);

    if (!tab) return { ok: false, error: "sekme bulunamadı" };

    try {
      return await browser.tabs.sendMessage(tab.id, { type: "GET_PRODUCT" });
    } catch (error) {
      return { ok: false, error: String(error && error.message) };
    }
  }, url);
}

for (const site of SITES) {
  console.log(`\n=== ${site.name} ===`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 900 });

  try {
    await page.goto(site.home, { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const productUrl = await page.evaluate((patternSource) => {
      const pattern = new RegExp(patternSource, "i");
      const links = Array.from(document.querySelectorAll("a[href]"))
        .map((a) => a.href)
        .filter((href) => pattern.test(href));
      return links[0] || "";
    }, site.linkPattern.source);

    if (!productUrl) {
      console.log("  ATLANDI: ana sayfada ürün linki bulunamadı (bot koruması olabilir)");
      await page.close();
      continue;
    }

    console.log(`  ürün: ${productUrl}`);
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const response = await readProduct(page);

    if (!response?.ok) {
      console.log(`  FAIL okunamadı: ${response?.error}`);
    } else {
      const p = response.product;
      console.log(`  site       : ${p.site}`);
      console.log(`  başlık     : ${p.title}`);
      console.log(`  fiyat      : ${p.price}`);
      console.log(`  bölge      : ${p.region}`);
      console.log(`  görsel     : ${(p.image || "").slice(0, 90)}`);
      console.log(`  taksit     : ${p.installmentAvailable} / ${p.installmentText}`);
      console.log(`  kargo      : ${p.shippingText} (${p.shippingConfidence})`);
      console.log(`  SONUÇ      : ${p.title && p.price ? "OK" : "EKSİK VERİ"}`);
    }

    await page.screenshot({ path: screenshotPath(`urun-${site.name.replace(/[^a-z0-9]/gi, "-")}.png`) });
  } catch (error) {
    console.log(`  HATA: ${error.message.split("\n")[0]}`);
  }

  await page.close();
}

await browser.close();
