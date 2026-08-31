// Vans (TR + UK) ve Boyner parserlarını canlı ürün sayfalarında doğrula.
//
// Üç sitenin de sınadığı ayrı bir şey var:
//   Vans TR — indirimli üründe ".newprice"/".oldprice", indirimsizde ".oneprice"
//   Vans UK — fiyatın sınıfı yok; başlığın kutusundan bulunuyor
//   Boyner  — sınıf adları dağıtımla değişen karma taşıyor, fiyat sayfada üç kez basılı
//
// Not: vans.com/en-gb otomasyonla sürülen Chrome'a "Access Denied" dönüyor.
// Kullanıcının kendi tarayıcısında sayfa açılıyor, yani eklentiyle ilgili bir
// sorun değil, ama testin elinde ürün sayfası olmuyor. O durumda site
// atlanıyor (aşağıda "ATLANDI" satırı); parser Firefox'ta doğrulandı.
//
// Sayfadan okunan tutarı parser'ın döndürdüğüyle ayrıca karşılaştırıyoruz:
// site geç render etmeye başlarsa parser sessizce jenerik yedeğe düşüp testi
// yanlış sebeple yeşil yakabiliyor.
import {
  launchExtension,
  createChecker,
  imageLoads,
  readProductFromTab,
  wait,
} from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw } = await launchExtension({ windowSize: "1400,950" });

// Ürün adresleri sabit yazılmıyor; stoktan kalkan tek ürün bütün testi kırardı.
const LISTINGS = [
  {
    name: "Vans TR",
    listing: "https://www.vans.com.tr/erkek/ayakkabilar",
    // Ürün adresleri "<slug>_<ürün no>" ile bitiyor.
    pattern: /_\d{5,}$/,
    // Listelemedeki bağlantıların bir kısmı göreli yazılmış ve tarayıcı bunları
    // "/erkek/<slug>_<id>" diye çözüyor; o adres ana sayfaya yönleniyor.
    // Ürünün gerçek adresi her zaman kök seviyede.
    toProductUrl: (href) => `https://www.vans.com.tr/${href.split("/").pop()}`,
    readySelector: ".p-price",
    site: "Vans",
    priceRe: /^[\d.]+(,\d{2})? TL$/,
    imageRe: /st-vans\.mncdn\.com/,
    expectTitleColor: true,
    // Sayfadaki ödenecek tutar: indirimliyse ".newprice", değilse ".oneprice".
    expectedPrice: (page) =>
      page.evaluate(() => {
        const box = document.querySelector(".p-price");
        const node = box?.querySelector(".newprice") || box?.querySelector(".oneprice");
        return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
      }),
  },
  {
    // Aynı parser'ın indirimli yolu: outlet ürünlerinde ".p-price" hem üstü
    // çizili ".oldprice" hem ödenecek ".newprice" taşıyor. İndirimsiz
    // listelemeyle sınanan ".oneprice" yolu buraya hiç uğramıyor.
    name: "Vans TR outlet",
    listing: "https://www.vans.com.tr/tum-outlet",
    pattern: /_\d{5,}$/,
    toProductUrl: (href) => `https://www.vans.com.tr/${href.split("/").pop()}`,
    readySelector: ".p-price",
    site: "Vans",
    priceRe: /^[\d.]+(,\d{2})? TL$/,
    imageRe: /st-vans\.mncdn\.com/,
    expectTitleColor: true,
    expectedPrice: (page) =>
      page.evaluate(() => {
        const box = document.querySelector(".p-price");
        const node = box?.querySelector(".newprice") || box?.querySelector(".oneprice");
        return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
      }),
    // Üstü çizili liste fiyatını okumadığımızı ayrıca doğruluyoruz.
    rejectPrice: (page) =>
      page.evaluate(
        () =>
          document.querySelector(".p-price .oldprice")?.textContent.replace(/\s+/g, " ").trim() ||
          null,
      ),
  },
  {
    name: "Vans UK",
    listing: "https://www.vans.com/en-gb/c/back-to-uni-3153725",
    pattern: /vans\.com\/en-gb\/p\//i,
    readySelector: "h1",
    site: "Vans UK",
    region: "UK",
    priceRe: /^£[\d,]+(\.\d{2})?$/,
    imageRe: /assets\.vans\.eu\/images\//,
    expectTitleColor: true,
    expectedPrice: (page) =>
      page.evaluate(() => {
        const heading = document.querySelector("h1");
        let box = heading?.parentElement;

        for (let step = 0; box && step < 4; step += 1) {
          if (/£/.test(box.textContent || "")) break;
          box = box.parentElement;
        }

        const node = Array.from(box?.querySelectorAll("*") || []).find((element) => {
          const text = (element.textContent || "").replace(/\s+/g, " ").trim();
          if (!/£/.test(text) || text.length > 90) return false;
          if (Array.from(element.children).some((child) => /£/.test(child.textContent || ""))) {
            return false;
          }
          return !getComputedStyle(element).textDecorationLine.includes("line-through");
        });

        return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
      }),
  },
  {
    name: "Boyner",
    listing: "https://www.boyner.com.tr/spor-ayakkabi-x-c1091",
    pattern: /boyner\.com\.tr\/[a-z0-9-]+-p-\d+/i,
    readySelector: "[class*='productInfoSectionPrice']",
    site: "Boyner",
    priceRe: /^[\d.]+(,\d{2})? TL$/,
    imageRe: /statics-mp\.boyner\.com\.tr/,
    expectTitleColor: false,
    expectedPrice: (page) =>
      page.evaluate(() => {
        const node = document.querySelector(
          "[class*='productInfoSectionPrice'] [class*='price_priceMain__']",
        );
        return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
      }),
  },
];

// "Sepette11.058,99 TL" ya da "Discounted price: £81.25 (-35%)" gibi ön/son
// ekli metinden tutarı ayıklar; parser'ın döndürdüğü biçime indirger.
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
    await wait(5000);

    // vans.com otomasyonlu tarayıcıya kenar sunucusundan "Access Denied"
    // dönüyor. Bunu parser hatası gibi kırmızı yakmak yerine ayırt ediyoruz.
    blocked = await listingPage.evaluate(() =>
      /access (to this page has been )?denied/i.test(
        `${document.title} ${document.body?.innerText?.slice(0, 300) || ""}`,
      ),
    );

    await listingPage.evaluate(async () => {
      for (let y = 0; y < 3000; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      window.scrollTo(0, 0);
    });
    await wait(2000);

    productUrls = await listingPage.evaluate((source) => {
      const pattern = new RegExp(source, "i");

      return Array.from(
        new Set(
          Array.from(document.querySelectorAll("a[href]"))
            .map((anchor) => anchor.href.split("?")[0])
            .filter((href) => pattern.test(href)),
        ),
      ).slice(0, 3);
    }, listing.pattern.source);

    if (listing.toProductUrl) {
      productUrls = Array.from(new Set(productUrls.map(listing.toProductUrl)));
    }
  } catch (error) {
    check(`${listing.name} listeleme açıldı`, false, error.message.split("\n")[0]);
  }

  await listingPage.close();

  if (blocked) {
    console.log(
      `ATLANDI ${listing.name} — site otomasyonlu tarayıcıyı reddetti, ürün sayfasına ulaşılamadı`,
    );
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

      // vans.com kategori sayfasını verip ürün sayfasını reddedebiliyor;
      // kontrol iki yerde de gerekli.
      const denied = await page.evaluate(() =>
        /access (to this page has been )?denied/i.test(
          `${document.title} ${document.body?.innerText?.slice(0, 300) || ""}`,
        ),
      );

      if (denied) {
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
            title: (product.title || "").slice(0, 60),
            price: product.price,
            region: product.region,
            shipping: product.shippingText,
            image: (product.image || "").slice(0, 70),
          },
          null,
          2,
        ),
      );

      check(`${listing.name} site adı`, product.site === listing.site, product.site);
      check(`${listing.name} başlık`, Boolean(product.title), product.title);
      check(
        `${listing.name} bölge`,
        product.region === (listing.region || "TR"),
        product.region,
      );
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

      // Outlet listelemesinde indirimsiz ürün de çıkabiliyor; kontrol yalnızca
      // sayfada gerçekten üstü çizili bir tutar varsa anlamlı.
      if (listing.rejectPrice) {
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
      }

      // Vans'te model adı tek başına rengi ayırt etmiyor; aynı ayakkabının iki
      // rengi sepette birbirine karışmasın diye renk başlığa ekleniyor.
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
