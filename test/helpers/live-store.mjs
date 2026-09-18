// Canlı mağaza testleri için ortak sürücü.
//
// Her mağaza için yapılan iş aynı: birkaç ürün adresi bul, ürün sayfasını
// eklentiyle oku ve okunanı sayfanın kendi yazdığı tutarla karşılaştır. Ürün
// adresi koda gömülmüyor — stoktan kalkan tek ürün bütün testi kırardı.
//
// Adresler iki yoldan geliyor:
//   listing — listeleme sayfası açılıp ürün bağlantıları toplanıyor
//   sitemap — ürün ızgarasını otomasyonlu tarayıcıya render etmeyen
//             mağazalarda (Inditex, Under Armour) mağazanın kendi sitemap'i
//
// Karşılaştırma testin özü: parser sessizce jenerik yedeğe düşerse alan dolu
// kalır ve test yanlış sebeple yeşil yanar. Sayfadaki tutarla eşitlik bunu
// yakalıyor. İndirimli üründe ayrıca üstü çizili tutarı **almadığımızı**
// doğruluyoruz; bu depoda defalarca yaşanmış hata bu.
import {
  launchExtension,
  createChecker,
  imageLoads,
  readProductFromTab,
  wait,
} from "./extension.mjs";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

// "Sepette11.058,99 TL" ya da "Discounted price: £81.25 (-35%)" gibi ön/son
// ekli metinden tutarı ayıklayıp parser'ın döndürdüğü biçime indirger.
export function normalizePrice(text) {
  if (!text) return null;

  const raw = String(text);

  if (raw.includes("£")) {
    const gbp = raw.match(/£\s*([\d,]+(?:\.\d{1,2})?)/);
    if (!gbp) return null;

    // Mağazalar kuruşsuz da yazıyor ("£75"); parser her zaman iki haneli
    // yazdığı için karşılaştırmadan önce aynı biçime getiriyoruz.
    const value = Number(gbp[1].replace(/,/g, ""));

    return Number.isFinite(value)
      ? `£${value.toLocaleString("en-GB", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : null;
  }

  const match = raw.match(/\d[\d.,]*/);
  if (!match) return null;

  // TR mağazaları tutarı iki biçimde yazıyor: "1.649,99" ve "1649.99". İkisini
  // de sayıya çevirip parser'ın döndürdüğü biçimde yazıyoruz, yoksa aynı tutar
  // biçim farkı yüzünden eşitsiz görünüyor.
  const token = match[0].replace(/[.,]$/, "");
  const lastSeparator = Math.max(token.lastIndexOf(","), token.lastIndexOf("."));
  const decimals = lastSeparator === -1 ? "" : token.slice(lastSeparator + 1);
  const hasDecimalPart = decimals.length > 0 && decimals.length <= 2;

  const whole = (hasDecimalPart ? token.slice(0, lastSeparator) : token).replace(/[.,]/g, "");
  const value = Number(hasDecimalPart ? `${whole}.${decimals}` : whole);

  if (!Number.isFinite(value)) return null;

  return `${value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}

// Kenar sunucuları otomasyonu iki biçimde kesiyor: Akamai doğrudan "Access
// Denied" veriyor, Cloudflare peş peşe isteklerden sonra "Attention Required"
// sayfasına düşürüyor. İkisi de eklentiyle ilgili değil; testi kırmızı yakmak
// yerine o mağazayı atlıyoruz.
function looksBlocked(page) {
  return page.evaluate(() =>
    /access (to this page has been )?denied|are you a robot|verify you are human|attention required|you have been blocked|just a moment/i.test(
      `${document.title} ${document.body?.innerText?.slice(0, 300) || ""}`,
    ),
  );
}

async function collectProductUrls(page, listing) {
  await page.evaluate(async () => {
    for (let y = 0; y < 3000; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    window.scrollTo(0, 0);
  });
  await wait(1500);

  const urls = await page.evaluate((source) => {
    const pattern = new RegExp(source, "i");

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll("a[href]"))
          // Sorgu ve çapa parçaları listelemeden geliyor ("#ins_sr=…"), ürün
          // adresinin parçası değil.
          .map((anchor) => anchor.href.split("?")[0].split("#")[0])
          .filter((href) => pattern.test(href)),
      ),
    ).slice(0, 8);
  }, listing.pattern.source);

  const mapped = listing.toProductUrl ? urls.map(listing.toProductUrl) : urls;

  // Adaydan fazlasını topluyoruz: bazı listelerde kampanya ve kategori
  // sayfaları da aynı adres biçiminde, ürün çıkana kadar ilerlemek gerekiyor.
  return Array.from(new Set(mapped)).slice(0, 6);
}

// Ürün ızgarasını otomasyonlu tarayıcıya vermeyen mağazalarda adresleri
// mağazanın kendi sitemap'inden alıyoruz; koda gömmüş olmuyoruz.
async function urlsFromSitemap(sitemapUrl, pattern, limit) {
  const response = await fetch(sitemapUrl, {
    headers: { "User-Agent": BROWSER_USER_AGENT },
  });

  if (!response.ok) return [];

  const buffer = Buffer.from(await response.arrayBuffer());
  let text = buffer.toString("utf8");

  if (sitemapUrl.endsWith(".gz")) {
    const { gunzipSync } = await import("node:zlib");

    try {
      text = gunzipSync(buffer).toString("utf8");
    } catch {
      // Sunucu sıkıştırmayı kendisi açtıysa ham metin zaten doğru.
    }
  }

  return [...text.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url) => pattern.test(url))
    .slice(0, limit);
}

// Bulunan adresleri tek tek açıp kontrolleri yürütür. Listeleme ve sitemap
// yolları aynı kontrollerden geçsin diye ayrı fonksiyon.
async function runProductChecks({ listing, productUrls, browser, sw, check }) {
  if (productUrls.length === 0) {
    check(`${listing.name} ürün linki bulundu`, false, "eşleşen ürün adresi yok");
    return;
  }

  // Bazı mağazalarda ürün ve kategori adresleri aynı biçimde
  // ("desa.com.tr/kadin-…"); gelen adres ürün sayfası değilse kırmızı yakmak
  // yerine sıradakine geçiyoruz. Hiçbiri ürün çıkmazsa sonda tek hata veriliyor.
  let checkedProducts = 0;
  let blockedProducts = 0;
  const wantedProducts = listing.maxProducts || 2;

  for (const url of productUrls) {
    if (checkedProducts >= wantedProducts) break;

    const page = await browser.newPage();
    await page.setViewport({ width: 1360, height: 900 });

    // Peş peşe açılan sayfalar bazı sitelerde bot korumasını tetikliyor.
    await wait(2500);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      if (await looksBlocked(page)) {
        blockedProducts += 1;
        console.log(`ATLANDI ${listing.name} — ${url} otomasyonlu tarayıcıya kapalı`);
        await page.close();
        continue;
      }

      // Fiyat kutusu gelmeden okursak parser kendi seçicilerini değil
      // yedeklerini çalıştırır.
      try {
        await page.waitForSelector(listing.readySelector, { timeout: 25000 });
      } catch {
        console.log(`—    ${listing.name} — ${url} ürün sayfası değil, atlandı`);
        await page.close();
        continue;
      }

      checkedProducts += 1;
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
            taksit: product.installmentText,
            kargo: product.shippingText,
            image: (product.image || "").slice(0, 70),
          },
          null,
          2,
        ),
      );

      check(`${listing.name} site adı`, product.site === listing.site, product.site);
      check(`${listing.name} başlık`, Boolean(product.title), product.title);

      if (listing.titleRe) {
        check(
          `${listing.name} başlık biçimi`,
          listing.titleRe.test(product.title || ""),
          product.title,
        );
      }

      check(`${listing.name} bölge`, product.region === (listing.region || "TR"), product.region);
      check(`${listing.name} fiyat`, listing.priceRe.test(product.price || ""), product.price);

      if (listing.imageRe) {
        check(
          `${listing.name} görsel adresi`,
          listing.imageRe.test(product.image || ""),
          (product.image || "").slice(0, 70),
        );
      }

      // Bazı CDN'ler (Pandora) tarayıcı dışı isteklere 403 dönüyor; adresin
      // doğruluğunu görebiliyoruz ama indirmeyi sınayamıyoruz.
      if (listing.skipImageFetch) {
        console.log(`—    ${listing.name} görsel indirme sınaması atlandı (CDN dışarıya kapalı)`);
      } else {
        check(...(await imageLoads(product.image, `${listing.name} görsel açılıyor`)));
      }

      // Bazı mağazalar (Inditex) çerez duvarını geçmeyen otomasyonlu
      // tarayıcıya sayfayı hiç render etmiyor; parser ilk HTML'deki JSON-LD'yi
      // okuyor ve karşılaştıracak görünür tutar olmuyor.
      let onPage = null;

      if (listing.expectedPrice) {
        onPage = normalizePrice(await listing.expectedPrice(page));
        check(
          `${listing.name} sayfadaki tutarla aynı`,
          Boolean(onPage) && product.price === onPage,
          `sayfa ${onPage} / okunan ${product.price}`,
        );
      } else {
        console.log(
          `—    ${listing.name} sayfada görünür tutar yok, karşılaştırma atlandı`,
        );
      }

      if (listing.rejectPrice) {
        const struck = normalizePrice(await listing.rejectPrice(page));

        if (struck && struck !== onPage) {
          check(
            `${listing.name} üstü çizili tutarı almadı`,
            product.price !== struck,
            `üstü çizili ${struck} / okunan ${product.price}`,
          );
        } else {
          console.log(`—    ${listing.name} indirimsiz ürün, üstü çizili tutar yok`);
        }
      }

      // Taksit: sitenin taksit yazdığı yerde "var", hiç yazmadığı yerde "yok"
      // bekleniyor. Yanlış pozitif de yanlış negatif kadar kötü — sepetteki
      // taksit grubu ve toplamı buna bakıyor.
      if (listing.installment === "some") {
        check(
          `${listing.name} taksit okundu`,
          product.installmentAvailable === true,
          product.installmentText,
        );
      } else if (listing.installment === "none") {
        check(
          `${listing.name} taksit uydurmadı`,
          product.installmentAvailable === false,
          product.installmentText,
        );
      }
    } catch (error) {
      check(`${url} yüklendi`, false, error.message.split("\n")[0]);
    }

    await page.close();
  }

  if (checkedProducts === 0) {
    if (blockedProducts > 0) {
      // Ürün sayfalarının hepsi bot korumasına takıldı; eklentiyle ilgili
      // değil, mağazayı atlıyoruz.
      console.log(
        `ATLANDI ${listing.name} — ürün sayfalarının tamamı otomasyonlu tarayıcıya kapalı`,
      );
    } else {
      check(
        `${listing.name} ürün sayfası açıldı`,
        false,
        "gelen adreslerin hiçbiri ürün sayfası değildi",
      );
    }
  }
}

// listings: { name, listing | sitemap, pattern, toProductUrl?, readySelector,
//             site, region?, priceRe, imageRe?, expectedPrice, rejectPrice?,
//             installment?: "none" | "some", titleRe?, maxProducts?,
//             skipImageFetch? }
export async function runStoreChecks(listings, options = {}) {
  const { check, summary } = createChecker();
  const { browser, sw } = await launchExtension({ windowSize: "1400,950", ...options });

  for (const listing of listings) {
    console.log(`\n===== ${listing.name} =====`);

    let productUrls = [];

    if (listing.sitemap) {
      try {
        productUrls = await urlsFromSitemap(listing.sitemap, listing.pattern, 6);
      } catch (error) {
        check(`${listing.name} sitemap okundu`, false, error.message.split("\n")[0]);
      }
    } else {
      const listingPage = await browser.newPage();
      await listingPage.setViewport({ width: 1360, height: 900 });

      let blocked = false;

      try {
        await listingPage.goto(listing.listing, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        await wait(5000);

        blocked = await looksBlocked(listingPage);

        if (!blocked) {
          productUrls = await collectProductUrls(listingPage, listing);
        }
      } catch (error) {
        check(`${listing.name} listeleme açıldı`, false, error.message.split("\n")[0]);
      }

      await listingPage.close();

      if (blocked) {
        console.log(
          `ATLANDI ${listing.name} — listeleme otomasyonlu tarayıcıya kapalı, ürün sayfasına ulaşılamadı`,
        );
        continue;
      }
    }

    await runProductChecks({ listing, productUrls, browser, sw, check });
  }

  await browser.close();
  summary();
}
