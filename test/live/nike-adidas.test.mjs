// Nike ve Adidas parserlarını canlı ürün sayfalarında doğrula (TR + UK).
//
// Dördü de indirim listelemesinden geziliyor: bu iki sitede asıl risk üstü
// çizili liste fiyatını sepete yazmak. Her üründe parser'ın döndürdüğü tutar
// hem sayfadaki ödenecek tutarla karşılaştırılıyor hem de üstü çizili tutardan
// farklı olduğu doğrulanıyor.
//
// Not: iki site de otomasyonla sürülen tarayıcıyı reddedebiliyor. O durumda
// ilgili site atlanıyor (aşağıda "ATLANDI" satırı) — eklentiyle ilgili bir
// sorun değil, kullanıcının kendi tarayıcısında sayfa açılıyor.
import {
  launchExtension,
  createChecker,
  imageLoads,
  readProductFromTab,
  wait,
} from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw } = await launchExtension({ windowSize: "1400,950" });

const NIKE_READY = "#price-container [data-testid='currentPrice-container']";
const ADIDAS_READY =
  "[data-testid='price-component'][class*='_pdp_'] [data-testid='main-price']";

const nikePrice = (page) =>
  page.evaluate(
    (selector) =>
      document.querySelector(selector)?.textContent.replace(/\s+/g, " ").trim() || null,
    NIKE_READY,
  );

const nikeStruck = (page) =>
  page.evaluate(
    () =>
      document
        .querySelector("#price-container [data-testid='initialPrice-container']")
        ?.textContent.replace(/\s+/g, " ")
        .trim() || null,
  );

const adidasPrice = (page) =>
  page.evaluate(
    (selector) =>
      document.querySelector(selector)?.textContent.replace(/\s+/g, " ").trim() || null,
    ADIDAS_READY,
  );

const adidasStruck = (page) =>
  page.evaluate(
    () =>
      document
        .querySelector("[data-testid='price-component'][class*='_pdp_'] [data-testid='original-price']")
        ?.textContent.replace(/\s+/g, " ")
        .trim() || null,
  );

const LISTINGS = [
  {
    name: "Nike TR",
    listing: "https://www.nike.com/tr/w/erkek-indirim-3yaepznik1",
    pattern: /nike\.com\/tr\/t\//i,
    readySelector: NIKE_READY,
    site: "Nike",
    region: "TR",
    priceRe: /^[\d.]+(,\d{2})? TL$/,
    imageRe: /static\.nike\.com/,
    expectTitleColor: true,
    expectedPrice: nikePrice,
    rejectPrice: nikeStruck,
  },
  {
    name: "Nike UK",
    listing: "https://www.nike.com/gb/w/mens-sale-3yaepznik1",
    pattern: /nike\.com\/gb\/t\//i,
    readySelector: NIKE_READY,
    site: "Nike UK",
    region: "UK",
    priceRe: /^£[\d,]+(\.\d{2})?$/,
    imageRe: /static\.nike\.com/,
    expectTitleColor: true,
    expectedPrice: nikePrice,
    rejectPrice: nikeStruck,
  },
  {
    name: "Adidas TR",
    listing: "https://www.adidas.com.tr/tr/indirim",
    // Ürün adresleri ürün koduyla bitiyor ("/galaxy-7-kosu-ayakkabisi/JP6594.html").
    pattern: /adidas\.com\.tr\/(?:tr\/)?[a-z0-9_-]+\/[A-Z0-9]{4,}\.html/,
    readySelector: ADIDAS_READY,
    site: "Adidas",
    region: "TR",
    priceRe: /^[\d.]+(,\d{2})? TL$/,
    imageRe: /assets\.adidas\.com/,
    expectTitleColor: false,
    expectedPrice: adidasPrice,
    rejectPrice: adidasStruck,
  },
  {
    name: "Adidas UK",
    listing: "https://www.adidas.co.uk/sale",
    pattern: /adidas\.co\.uk\/[a-z0-9_-]+\/[A-Z0-9]{4,}\.html/,
    readySelector: ADIDAS_READY,
    site: "Adidas UK",
    region: "UK",
    priceRe: /^£[\d,]+(\.\d{2})?$/,
    imageRe: /assets\.adidas\.com/,
    expectTitleColor: false,
    expectedPrice: adidasPrice,
    rejectPrice: adidasStruck,
  },
];

// "Fiyat10.199 TL", "1.999₺", "Sale price£30" gibi ön/son ekli metinden tutarı
// ayıklar; parser'ın döndürdüğü biçime indirger.
function normalizePrice(text) {
  if (!text) return null;

  const raw = String(text);

  if (raw.includes("£")) {
    const gbp = raw.match(/£\s*[\d,]+(?:\.\d{1,2})?/);
    return gbp ? gbp[0].replace(/\s+/g, "") : null;
  }

  const match = raw.match(/\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?/);

  return match ? `${match[0]} TL` : null;
}

// Adidas kendi engel sayfasını basıyor ("UNFORTUNATELY WE ARE UNABLE TO GIVE
// YOU ACCESS..."), Nike ve Vans kenar sunucusunun "Access Denied" sayfasını.
function looksBlocked(page) {
  return page.evaluate(() =>
    /access (to this page has been )?denied|unable to give you access|a security issue was automatically identified|just a moment|performing security verification/i.test(
      `${document.title} ${document.body?.innerText?.slice(0, 400) || ""}`,
    ),
  );
}

for (const listing of LISTINGS) {
  console.log(`\n===== ${listing.name} =====`);

  const listingPage = await browser.newPage();
  await listingPage.setViewport({ width: 1360, height: 900 });

  let productUrls = [];
  let blocked = false;

  try {
    await listingPage.goto(listing.listing, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await wait(6000);

    blocked = await looksBlocked(listingPage);

    // İki sitenin de ürün ızgarası kaydırdıkça yükleniyor.
    await listingPage.evaluate(async () => {
      for (let y = 0; y < 4000; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
      window.scrollTo(0, 0);
    });
    await wait(2500);

    productUrls = await listingPage.evaluate((source) => {
      const pattern = new RegExp(source);

      return Array.from(
        new Set(
          Array.from(document.querySelectorAll("a[href]"))
            .map((anchor) => anchor.href.split("?")[0])
            .filter((href) => pattern.test(href)),
        ),
      ).slice(0, 3);
    }, listing.pattern.source);
  } catch (error) {
    check(`${listing.name} listeleme açıldı`, false, error.message.split("\n")[0]);
  }

  await listingPage.close();

  if (blocked) {
    console.log(`ATLANDI ${listing.name} — site otomasyonlu tarayıcıyı reddetti`);
    continue;
  }

  if (productUrls.length === 0) {
    check(`${listing.name} ürün linki bulundu`, false, "listeleme sayfasında link yok");
    continue;
  }

  for (const url of productUrls) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1360, height: 900 });

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      if (await looksBlocked(page)) {
        console.log(`ATLANDI ${listing.name} — ${url} otomasyonlu tarayıcıya kapalı`);
        await page.close();
        continue;
      }

      // Fiyat kutusu gelmeden okursak parser kendi seçicilerini değil
      // yedeklerini çalıştırır ve test yanlış yere yeşil yanar.
      await page.waitForSelector(listing.readySelector, { timeout: 45000 });
      await wait(1500);

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
            title: (product.title || "").slice(0, 62),
            price: product.price,
            region: product.region,
            image: (product.image || "").slice(0, 62),
          },
          null,
          2,
        ),
      );

      check(`${listing.name} site adı`, product.site === listing.site, product.site);
      check(`${listing.name} başlık`, Boolean(product.title), product.title);
      check(`${listing.name} bölge`, product.region === listing.region, product.region);
      check(`${listing.name} fiyat`, listing.priceRe.test(product.price || ""), product.price);
      check(
        `${listing.name} görsel`,
        listing.imageRe.test(product.image || ""),
        (product.image || "").slice(0, 70),
      );
      check(...(await imageLoads(product.image, `${listing.name} görsel açılıyor`)));

      const onPage = normalizePrice(await listing.expectedPrice(page));
      check(
        `${listing.name} sayfadaki tutarla aynı`,
        Boolean(onPage) && product.price === onPage,
        `sayfa ${onPage} / okunan ${product.price}`,
      );

      // İndirim listelemesinde de indirimsiz ürün çıkabiliyor; kontrol
      // yalnızca sayfada gerçekten üstü çizili bir tutar varsa anlamlı.
      const struck = normalizePrice(await listing.rejectPrice(page));

      if (struck) {
        check(
          `${listing.name} üstü çizili tutarı almadı`,
          product.price !== struck,
          `üstü çizili ${struck} / okunan ${product.price}`,
        );
      } else {
        console.log(`—    ${listing.name} indirimsiz ürün, üstü çizili tutar yok`);
      }

      // Nike'ta model adı rengi taşımıyor; aynı ayakkabının iki rengi sepette
      // birbirine karışmasın diye renk başlığa ekleniyor.
      if (listing.expectTitleColor) {
        check(`${listing.name} başlıkta renk var`, / - .+$/.test(product.title || ""), product.title);
      }
    } catch (error) {
      check(`${url} yüklendi`, false, error.message.split("\n")[0]);
    }

    await page.close();
  }
}

await browser.close();
summary();
