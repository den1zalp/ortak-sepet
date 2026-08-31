// Birkenstock ve Crocs parserlarını canlı ürün sayfalarında doğrula (TR + UK).
//
// Dört sitenin de sınadığı ayrı bir şey var:
//   Birkenstock TR — indirimli tutar, üstü çizili liste fiyatının yanında duruyor
//   Crocs TR       — iki tutarın sırası mobil/masaüstü düzeninde ters
//   Birkenstock UK — mağaza global alan adının /gb/ yolunda
//   Crocs UK       — sayfada seçili renge ait olmayan başka fiyat blokları var
//
// Not: crocs.co.uk taze bir tarayıcı profiline Cloudflare doğrulama sayfası
// gösterebiliyor. O durumda o site atlanıyor (aşağıda "ATLANDI" satırı);
// parser'ı elle doğrulamak için ürün sayfasını bir kez normal tarayıcıda açmak
// yetiyor.
import { launchExtension, createChecker, imageLoads, readProductFromTab, wait } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw } = await launchExtension({ windowSize: "1400,950" });

// Ürün adresleri sabit yazılmıyor; stoktan kalkan tek ürün bütün testi kırardı.
// Listeleme sayfasından ilk birkaç ürün linki toplanıyor.
const LISTINGS = [
  {
    name: "Birkenstock TR",
    listing: "https://www.birkenstock.com.tr/erkek/",
    // Ürün adresleri altı haneli ürün koduyla bitiyor; kategori adresleri
    // ("/erkek-plaj-terligi/") kod taşımıyor.
    pattern: /birkenstock\.com\.tr\/[a-z0-9-]+-\d{6,}(-\d+)?\/$/i,
    site: "Birkenstock",
    priceRe: /^[\d.]+(,\d{2})? TL$/,
    imageRe: /akinoncloud\.com\/products/,
    region: "TR",
  },
  {
    name: "Crocs TR",
    listing: "https://crocs.com.tr/uniseks/clog",
    // Ürün adresleri kök seviyede tek parça ("/classic-atmosphere"); kategori
    // adresleri en az bir bölü daha taşıyor.
    pattern: /crocs\.com\.tr\/[a-z0-9-]{6,}$/i,
    // "/platform" gibi kategori sayfaları da bu kalıba uyuyor ve onların da
    // görseli var. Ayıran şey fiyat: ürün kartında tutar yazıyor, kategori
    // kartında yazmıyor.
    priceInLink: /₺|\bTL\b/,
    site: "Crocs",
    priceRe: /^[\d.]+(,\d{2})? TL$/,
    imageRe: /cdn\.shopify\.com/,
    region: "TR",
  },
  {
    name: "Birkenstock UK",
    listing: "https://www.birkenstock.com/gb/men/sandals/two-strap-sandals/",
    pattern: /birkenstock\.com\/gb\/[a-z0-9-]+\/[a-z0-9-]+_\d+\.html$/i,
    site: "Birkenstock UK",
    priceRe: /^£[\d,]+(\.\d{2})?$/,
    imageRe: /birkenstock\.com\/(dw\/image|on\/demandware)/,
    region: "UK",
  },
  {
    name: "Crocs UK",
    listing: "https://www.crocs.co.uk/c/men/footwear/clogs",
    pattern: /crocs\.co\.uk\/p\/[a-z0-9-]+\/\d+\.html/i,
    // Izgaranın üstündeki tanıtım kartları ("Belt Bag", "Backpacks") da ürün
    // adresine gidiyor ama fiyat göstermiyor; ızgara kartları gösteriyor.
    // Crocs UK tutarı bağlantının içine, Crocs TR ise kartın içine basıyor;
    // ikisini de yakalamak için bağlantının bir üstüne kadar bakılıyor.
    priceInLink: /£/,
    site: "Crocs UK",
    priceRe: /^£[\d,]+(\.\d{2})?$/,
    imageRe: /media\.crocs\.com/,
    region: "UK",
  },
];


for (const listing of LISTINGS) {
  console.log(`\n===== ${listing.name} =====`);

  const listingPage = await browser.newPage();
  await listingPage.setViewport({ width: 1360, height: 900 });

  let productUrls = [];
  let botWall = false;

  try {
    await listingPage.goto(listing.listing, { waitUntil: "domcontentloaded", timeout: 60000 });
    await wait(5000);

    // crocs.co.uk yeni bir tarayıcı profiline Cloudflare doğrulama sayfası
    // gösteriyor. Bu eklentiyle ilgili bir sorun değil — kullanıcının kendi
    // tarayıcısında doğrulama zaten geçilmiş oluyor — ama testin elinde ürün
    // sayfası olmuyor. Aşmaya çalışmak yerine durumu ayırt edip atlıyoruz;
    // yoksa parser bozulmuş gibi kırmızı yanıyor.
    botWall = await listingPage.evaluate(() =>
      /just a moment|performing security verification|checking your browser/i.test(
        `${document.title} ${document.body?.innerText?.slice(0, 400) || ""}`,
      ),
    );

    // Crocs'un iki sitesi de ürün ızgarasını kaydırdıkça yüklüyor.
    await listingPage.evaluate(async () => {
      for (let y = 0; y < 3600; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      window.scrollTo(0, 0);
    });
    await wait(2000);

    productUrls = await listingPage.evaluate(
      (source, priceSource) => {
        const pattern = new RegExp(source, "i");
        const pricePattern = priceSource ? new RegExp(priceSource, "i") : null;

        const links = Array.from(document.querySelectorAll("a[href]"))
          .filter((anchor) => {
            if (!pricePattern) return true;

            const card = `${anchor.textContent || ""} ${anchor.parentElement?.textContent || ""}`;
            return pricePattern.test(card);
          })
          .map((anchor) => anchor.href.split("?")[0]);

        return Array.from(new Set(links.filter((href) => pattern.test(href)))).slice(0, 3);
      },
      listing.pattern.source,
      listing.priceInLink ? listing.priceInLink.source : null,
    );
  } catch (error) {
    check(`${listing.name} listeleme açıldı`, false, error.message.split("\n")[0]);
  }

  await listingPage.close();

  if (botWall) {
    console.log(`ATLANDI ${listing.name} — site bot doğrulaması gösterdi, ürün sayfasına ulaşılamadı`);
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
      await wait(4500);

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
            shipping: product.shippingText,
            image: (product.image || "").slice(0, 70),
          },
          null,
          2,
        ),
      );

      check(`${listing.name} site adı`, product.site === listing.site, product.site);
      check(`${listing.name} başlık`, Boolean(product.title), product.title);
      check(`${listing.name} bölge`, product.region === listing.region, product.region);
      check(`${listing.name} fiyat`, listing.priceRe.test(product.price || ""), product.price);
      check(`${listing.name} görsel`, listing.imageRe.test(product.image || ""), (product.image || "").slice(0, 70));
      check(...(await imageLoads(product.image, `${listing.name} görsel açılıyor`)));

      // Dört sitede de model adı tek başına rengi ayırt etmiyor; aynı modelin
      // iki rengi sepette birbirine karışmasın diye renk başlığa ekleniyor.
      check(
        `${listing.name} başlıkta renk var`,
        / - .+$/.test(product.title || ""),
        product.title,
      );
    } catch (error) {
      check(`${url} yüklendi`, false, error.message.split("\n")[0]);
    }

    await page.close();
  }
}

await browser.close();
summary();
