// iFixit UK parserını canlı ürün sayfalarında doğrula.
//
// İki listeleme kullanılıyor: mağazanın kendisi ve indirim sayfası. İndirimli
// ürünlerde asıl sınanan şey, sepete üstü çizili liste fiyatının değil
// ödenecek tutarın girmesi — sayfa ikisini aynı fiyat bloğunda basıyor.
import { launchExtension, createChecker, imageLoads, readProductFromTab, wait } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw } = await launchExtension({ windowSize: "1400,950" });

// Ürün adresleri sabit yazılmıyor; stoktan kalkan tek ürün bütün testi kırardı.
const LISTINGS = [
  { name: "iFixit UK mağaza", url: "https://www.ifixit.com/en-gb/Store" },
  { name: "iFixit UK indirim", url: "https://www.ifixit.com/en-gb/Shop/Sale" },
];

const PRODUCT_LINK = /ifixit\.com\/en-gb\/products\/[a-z0-9-]+$/i;


for (const listing of LISTINGS) {
  console.log(`\n===== ${listing.name} =====`);

  const listingPage = await browser.newPage();
  await listingPage.setViewport({ width: 1360, height: 900 });

  let productUrls = [];

  try {
    await listingPage.goto(listing.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await wait(5000);

    productUrls = await listingPage.evaluate((source) => {
      const pattern = new RegExp(source, "i");
      const links = Array.from(document.querySelectorAll("a[href]")).map((a) => a.href.split("?")[0]);
      return Array.from(new Set(links.filter((href) => pattern.test(href)))).slice(0, 3);
    }, PRODUCT_LINK.source);
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
      await wait(4000);

      // Sayfanın kendi gösterdiği üstü çizili liste fiyatı; indirim yoksa boş.
      const comparePrice = await page.evaluate(() => {
        const node = document.querySelector(
          "[data-testid='product-price-section'] [data-slot='compare-price']",
        );
        return node ? node.textContent.replace(/\s+/g, " ").trim() : "";
      });

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
            title: (product.title || "").slice(0, 50),
            price: product.price,
            comparePrice: comparePrice || "(indirim yok)",
            image: (product.image || "").slice(0, 70),
          },
          null,
          2,
        ),
      );

      check(`${listing.name} site adı`, product.site === "iFixit UK", product.site);
      check(`${listing.name} başlık`, Boolean(product.title), product.title);
      check(`${listing.name} bölge`, product.region === "UK", product.region);
      check(`${listing.name} fiyat`, /^£[\d,]+(\.\d{2})?$/.test(product.price || ""), product.price);
      check(
        `${listing.name} görsel`,
        /cdn\.shopify\.com/.test(product.image || ""),
        (product.image || "").slice(0, 70),
      );
      check(...(await imageLoads(product.image, `${listing.name} görsel açılıyor`)));

      // Asıl mesele: indirimli üründe sepete liste fiyatı girmemeli. Üstü
      // çizili tutar aynı fiyat bloğunun içinde durduğu için bloğun tamamını
      // okumak burayı kırardı.
      if (comparePrice) {
        const listAmount = comparePrice.match(/£[\d,]+(\.\d{2})?/)?.[0];

        check(
          `${listing.name} indirimli fiyat okundu`,
          Boolean(listAmount) && product.price !== listAmount,
          `${product.price} vs liste ${listAmount}`,
        );
      }
    } catch (error) {
      check(`${url} yüklendi`, false, error.message.split("\n")[0]);
    }

    await page.close();
  }
}

await browser.close();
summary();
