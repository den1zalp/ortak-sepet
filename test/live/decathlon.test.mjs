// Decathlon TR / UK parserlarını canlı ürün sayfasında doğrula.
import { launchExtension, createChecker, readProductFromTab, wait } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw } = await launchExtension({ windowSize: "1400,950" });

// Ürün adresleri sabit yazılmıyor; stoktan kalkan tek ürün bütün testi kırardı.
// Listeleme sayfasından ilk birkaç ürün linki toplanıyor.
const LISTINGS = [
  {
    name: "Decathlon TR",
    home: "https://www.decathlon.com.tr/",
    pattern: /decathlon\.com\.tr\/p\//i,
    site: "Decathlon",
    priceRe: /^[\d.]+(,\d{2})? TL$/,
    imageRe: /mediadecathlon\.com/,
  },
  {
    name: "Decathlon UK",
    home: "https://www.decathlon.co.uk/",
    pattern: /decathlon\.co\.uk\/p\//i,
    site: "Decathlon UK",
    priceRe: /^£[\d,]+(\.\d{2})?$/,
    imageRe: /mediadecathlon\.com/,
  },
];

for (const listing of LISTINGS) {
  console.log(`\n===== ${listing.name} =====`);

  const listingPage = await browser.newPage();
  await listingPage.setViewport({ width: 1360, height: 900 });

  let productUrls = [];

  try {
    await listingPage.goto(listing.home, { waitUntil: "domcontentloaded", timeout: 60000 });
    await wait(6000);

    productUrls = await listingPage.evaluate((source) => {
      const pattern = new RegExp(source, "i");
      const links = Array.from(document.querySelectorAll("a[href]")).map((a) => a.href.split("?")[0]);
      return Array.from(new Set(links.filter((href) => pattern.test(href)))).slice(0, 3);
    }, listing.pattern.source);
  } catch (error) {
    check(`${listing.name} listeleme açıldı`, false, error.message.split("\n")[0]);
  }

  await listingPage.close();

  if (productUrls.length === 0) {
    check(`${listing.name} ürün linki bulundu`, false, "listeleme sayfasında link yok");
    continue;
  }

  for (const url of productUrls) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1360, height: 900 });

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await wait(7000);

      const response = await readProductFromTab(sw, page.url());

      if (!response?.ok) {
        check(`${url} okundu`, false, response?.error || "yanıt yok");
        await page.close();
        continue;
      }

      const product = response.product;

      console.log(
        JSON.stringify(
          {
            site: product.site,
            title: (product.title || "").slice(0, 60),
            price: product.price,
            currency: product.currency,
            region: product.region,
            image: (product.image || "").slice(0, 70),
            taksit: product.installmentAvailable,
          },
          null,
          2,
        ),
      );

      check(`${listing.name} site adı`, product.site === listing.site, product.site);
      check(`${listing.name} başlık`, Boolean(product.title), product.title);
      check(`${listing.name} fiyat`, listing.priceRe.test(product.price || ""), product.price);
      check(`${listing.name} görsel`, listing.imageRe.test(product.image || ""), (product.image || "").slice(0, 70));
    } catch (error) {
      check(`${url} yüklendi`, false, error.message.split("\n")[0]);
    }

    await page.close();
  }
}

await browser.close();
summary();
