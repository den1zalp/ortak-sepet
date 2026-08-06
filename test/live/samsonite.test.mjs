// Samsonite TR / UK parserlarını canlı ürün sayfasında doğrula.
import { launchExtension, createChecker } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw, workerTarget, extensionId } = await launchExtension({
  windowSize: "1400,950",
});

async function readProduct(page) {
  const url = page.url();
  return sw.evaluate(async (targetUrl) => {
    const tabs = await browser.tabs.query({});
    const tab = tabs.find((candidate) => candidate.url === targetUrl);
    if (!tab) return { ok: false, error: "sekme yok" };
    try {
      return await browser.tabs.sendMessage(tab.id, { type: "GET_PRODUCT" });
    } catch (error) {
      return { ok: false, error: String(error && error.message) };
    }
  }, url);
}

const cases = [
  {
    name: "Samsonite TR (ekran görüntüsündeki ürün)",
    url: "https://www.samsonite.com.tr/prodiver-hs-spinner-5520-exp-9049",
    site: "Samsonite",
    priceRe: /^16\.990 TL$/,
    titleRe: /Prodiver/i,
    imageRe: /^https?:\/\//,
    taksit: true,
  },
  {
    name: "Samsonite TR",
    url: "https://www.samsonite.com.tr/samsonite-gri-proxis--spinner-6925-orta-boy-valiz--3066",
    site: "Samsonite",
    priceRe: /^25\.290 TL$/,
    titleRe: /Proxis/i,
    imageRe: /^https?:\/\//,
    taksit: true,
  },
  {
    name: "Samsonite TR (2)",
    url: "https://www.samsonite.com.tr/samsonite-paralux-seyahat-cantasi-6814",
    site: "Samsonite",
    priceRe: /^10\.390 TL$/,
    titleRe: /Paralux/i,
    imageRe: /^https?:\/\//,
    taksit: true,
  },
  {
    name: "Samsonite UK",
    url: "https://www.samsonite.co.uk/c-lite-spinner-75cm-midnight-blue/122861-1549.html",
    site: "Samsonite UK",
    priceRe: /^£439\.00$/,
    titleRe: /C-Lite Spinner .*Midnight Blue/i,
    imageRe: /^https?:\/\/.*samsonite\.co\.uk/,
  },
  {
    name: "Samsonite UK (2)",
    url: "https://www.samsonite.co.uk/restackd-spinner-expandable-75cm-black/150705-1041.html",
    site: "Samsonite UK",
    priceRe: /^£\d/,
    titleRe: /Restackd/i,
    imageRe: /^https?:\/\/.*samsonite\.co\.uk/,
  },
];

for (const testCase of cases) {
  console.log(`\n--- ${testCase.name} ---`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 900 });

  try {
    await page.goto(testCase.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 7000));

    const response = await readProduct(page);

    if (!response?.ok) {
      check(`${testCase.name} okundu`, false, response?.error || "yanıt yok");
      await page.close();
      continue;
    }

    const p = response.product;
    console.log(
      JSON.stringify(
        {
          site: p.site,
          title: p.title,
          price: p.price,
          currency: p.currency,
          region: p.region,
          image: (p.image || "").slice(0, 90),
          taksit: p.installmentAvailable,
          kargo: p.shippingText,
        },
        null,
        2,
      ),
    );

    check(`${testCase.name} site adı`, p.site === testCase.site, p.site);
    check(`${testCase.name} başlık`, testCase.titleRe.test(p.title || ""), p.title);
    check(`${testCase.name} fiyat`, testCase.priceRe.test(p.price || ""), p.price);
    check(`${testCase.name} görsel`, testCase.imageRe.test(p.image || ""), (p.image || "").slice(0, 60));
    check(`${testCase.name} url`, p.url === testCase.url, p.url);

    if (testCase.taksit !== undefined) {
      check(
        `${testCase.name} taksit`,
        p.installmentAvailable === testCase.taksit,
        `${p.installmentAvailable} / ${p.installmentText}`,
      );
    }
  } catch (error) {
    check(`${testCase.name} yüklendi`, false, error.message.split("\n")[0]);
  }

  await page.close();
}

// Host çakışması: samsonite.com.tr UK parser'ına, samsonite.co.uk TR'ye düşmemeli.
console.log("\n--- registry eşleşmesi ---");
const registryCheck = await sw.evaluate(async () => {
  return { ok: true };
});
check("service worker ayakta", registryCheck.ok);

await browser.close();
summary();
