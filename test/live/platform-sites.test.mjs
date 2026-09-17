// Ortak platform parser'ını kullanan mağazaların canlı doğrulaması.
//
// Adresler koda gömülü değil, `platform-urls.json` içinde: 54 mağazanın ürün
// adresi kampanya bitince ölüyor ve her ölen adres testi eklentiyle ilgisi
// olmayan bir sebeple kırmızıya çevirirdi. Dosyada adresi yazılı olmayan
// mağaza sınanmaz, "adres yok" diye atlanır — böylece elindeki adreslerle
// kısmi koşu yapabilirsin.
//
// Her mağazada sınanan şey:
//   1. Site adı tanınıyor mu — eşleşmezse getSiteName() alan adını döndürür ve
//      bu, registry ya da getSiteName kaydının eksik olduğunu gösterir (yol
//      desenine bağlı mağazalarda asıl risk bu).
//   2. Ürün adı ve fiyat okunuyor mu.
//   3. Fiyatın para birimi bölgeye uyuyor mu (TR → TL, UK → £). Yanlış bölgeyle
//      damgalanan ürün sepette yanlış toplama giriyor.
//   4. Okunan tutar sayfada gerçekten yazıyor mu ve üstü çizili liste fiyatı
//      değil mi — indirimli üründe yanlış tutarı sepete yazmak asıl risk.
//   5. Görsel adresi gerçekten resim döndürüyor mu.
//   6. Beden okunabiliyorsa listede kaç seçenek var (bilgi olarak yazılır,
//      beden her üründe olmadığı için başarısızlık sayılmaz).
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  launchExtension,
  createChecker,
  imageLoads,
  readProductFromTab,
  wait,
  REPO_ROOT,
} from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const urls = JSON.parse(
  readFileSync(join(REPO_ROOT, "test", "live", "platform-urls.json"), "utf8"),
);

const targets = Object.entries(urls).filter(
  ([id, url]) => !id.startsWith("_") && typeof url === "string" && url.trim(),
);

if (!targets.length) {
  console.log(
    "platform-urls.json boş: sınanacak adres yok.\n" +
      "Mağazalardan birer ürün adresi yazıp tekrar çalıştır.",
  );
  summary();
}

const { browser, sw } = await launchExtension({ windowSize: "1400,950" });

// Bölge damgası parser'dan geliyor; beklenen para birimi ondan türetiliyor.
// İngiltere tarafında euro da kabul: championstore.com gibi pan-Avrupa
// mağazalar ziyaretçinin ülkesine göre euro fiyat basıyor ve sepet zaten çok
// para birimli çalışıyor. Kabul edilmeyen şey, İngiltere mağazasında TL
// görmek — o, yanlış bölge damgası demek olurdu.
const CURRENCY_PATTERN = {
  TR: /₺|TL/i,
  UK: /£|€/,
};

function cleanSiteName(site) {
  return String(site || "").trim().toLowerCase();
}

for (const [id, url] of targets) {
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (error) {
    // Mağazaların bir kısmı otomasyonla sürülen tarayıcıyı reddediyor. Bu
    // eklentiyle ilgili bir sorun değil; kullanıcının kendi tarayıcısında
    // sayfa açılıyor.
    console.log(`ATLANDI  ${id}: sayfa açılmadı (${error.message.split("\n")[0]})`);
    await page.close();
    continue;
  }

  // Fiyatı JavaScript'le basan mağazalar için: parser'ın kendi yoklaması
  // ~2.2 sn, sayfanın ilk render'ı için bunun üstüne biraz daha bekliyoruz.
  await wait(3000);

  const currentUrl = page.url();
  const response = await readProductFromTab(sw, currentUrl);

  if (!response?.ok) {
    check(`${id}: ürün okundu`, false, response?.error || "content script yanıt vermedi");
    await page.close();
    continue;
  }

  const product = response.product;
  const region = product.region === "UK" ? "UK" : "TR";

  // Content script'in global'lerine sayfadan bakılamaz (izole dünya), o yüzden
  // parser'a düşülüp düşülmediği çıktıdan anlaşılıyor: getSiteName() eşleşmezse
  // site adı yerine host dönüyor. Karşılaştırma host'un kendisiyle yapılıyor,
  // "nokta içeriyorsa host'tur" demekle değil: Supplementler.com'un site adı
  // gerçekten nokta taşıyor ve öyle bir kural onu haksız yere kırmızı yapardı.
  const host = new URL(currentUrl).hostname.replace(/^www\d*\./, "");
  const siteIsHost = cleanSiteName(product.site) === host.toLowerCase();

  check(`${id}: site adı tanındı`, Boolean(product.site) && !siteIsHost, product.site || "yok");
  check(`${id}: ürün adı`, Boolean(product.title), product.title || "");
  check(`${id}: fiyat okundu`, Boolean(product.price), product.price || "yok");

  if (product.price) {
    check(
      `${id}: para birimi ${region}`,
      CURRENCY_PATTERN[region].test(product.price),
      product.price,
    );
  }

  // Fiyatın doğru olup olmadığını anlamanın tek yolu sayfayla karşılaştırmak.
  // İki şey sınanıyor: tutar sayfada gerçekten yazıyor mu, ve yazdığı yer üstü
  // çizili liste fiyatı mı. Bu parserlarda asıl risk ikincisi — indirimli üründe
  // sayfada iki tutar duruyor ve yanlış olanı sepete yazmak bu depoda defalarca
  // yaşandı.
  if (product.price) {
    const readPriceCheck = () =>
      page.evaluate((price) => {
      // Karşılaştırma metin değil sayı üzerinden: parser fiyatı yapılandırılmış
      // veriden aldığında kendi biçimlendiriyor ("9.150,00 TL") ama sayfa
      // "9.150 TL" yazıyor olabiliyor. Ayraç düzeni de siteye göre değişiyor,
      // o yüzden son ayraç ondalık kabul ediliyor (shared/cart.js ile aynı kural).
      const toNumber = (raw) => {
        let cleaned = String(raw || "").replace(/[^\d.,]/g, "");

        if (!cleaned) return null;

        const comma = cleaned.lastIndexOf(",");
        const dot = cleaned.lastIndexOf(".");

        if (comma !== -1 && dot !== -1) {
          cleaned =
            comma > dot
              ? cleaned.replace(/\./g, "").replace(",", ".")
              : cleaned.replace(/,/g, "");
        } else if (comma !== -1) {
          const parts = cleaned.split(",");
          cleaned =
            parts.length > 1 && parts.slice(1).every((part) => part.length === 3)
              ? cleaned.replace(/,/g, "")
              : cleaned.replace(",", ".");
        } else if (dot !== -1) {
          const parts = cleaned.split(".");
          if (parts.length > 1 && parts.slice(1).every((part) => part.length === 3)) {
            cleaned = cleaned.replace(/\./g, "");
          }
        }

        const value = Number.parseFloat(cleaned);
        return Number.isFinite(value) ? value : null;
      };

      const target = toNumber(price);

      if (target === null) return { visible: false, struck: false };

      const numbersIn = (text) =>
        Array.from(String(text || "").matchAll(/\d[\d.,]*/g))
          .map((match) => toNumber(match[0]))
          .filter((value) => value !== null);

      const matches = (value) => Math.abs(value - target) < 0.01;

      // Eklentinin kuralıyla aynı: arama ürün alanıyla sınırlı ve karar sınıf
      // adına değil hesaplanmış stile bakarak veriliyor. Sayfanın altındaki
      // öneri kartlarında da üstü çizili tutarlar var ve sınıf adına güvenmek
      // indirimsiz ürünü (Champion) indirimli sanıyordu.
      const heading = document.querySelector("h1");
      let area = heading || document.body;

      for (let depth = 0; depth < 4 && area.parentElement; depth += 1) {
        area = area.parentElement;
      }

      const struckNodes = Array.from(area.querySelectorAll("*")).filter((node) => {
        if (node.children.length > 2) return false;

        const tag = node.tagName.toLowerCase();

        if (tag === "del" || tag === "s" || tag === "strike") return true;

        try {
          const style = window.getComputedStyle(node);
          return (style.textDecorationLine || style.textDecoration || "").includes("line-through");
        } catch {
          return false;
        }
      });

      // Sayfada karşılaştırılacak tutar var mı? Kampanya bantları sayılmıyor:
      // SuperStep fiyatı metin olarak hiç basmıyor ve sayfadaki tek tutar
      // "8.000 TL ve üzeri alışverişe 1.000 TL bonus" bandı — o bant varken
      // sayfa fiyat gösteriyor sanılıp ürün yanlış fiyatlı gibi raporlanıyordu.
      const pagePrices = String(document.body?.innerText || "")
        .split(/\r?\n/)
        .filter((line) => !/üzeri|bonus|kargo|kupon|taksit|hediye/i.test(line))
        .filter((line) => /(\d[\d.,]*)\s*(?:TL|₺)|[£$€]\s*(\d[\d.,]*)/i.test(line)).length;

      return {
        comparable: pagePrices > 0,
        visible: numbersIn(document.body?.innerText).some(matches),
        struck: struckNodes.some((node) => numbersIn(node.textContent).some(matches)),
      };
      }, product.price);

    let priceCheck = await readPriceCheck();

    // Bu mağazaların bir kısmı fiyatı JavaScript'le sonradan basıyor (SuperStep,
    // Under Armour TR). İlk bakışta bulunamayan tutar için bir kez daha
    // bekleniyor; yoksa geç render "yanlış fiyat" gibi raporlanırdı.
    if (priceCheck.comparable && !priceCheck.visible) {
      await wait(5000);
      priceCheck = await readPriceCheck();
    }

    if (priceCheck.comparable) {
      check(`${id}: fiyat sayfada görünüyor`, priceCheck.visible, product.price);
      check(`${id}: üstü çizili tutar değil`, !priceCheck.struck, product.price);
    } else {
      console.log(`     ${id}: sayfada görünür fiyat yok, karşılaştırılamadı`);
    }
  }

  check(...(await imageLoads(product.image, `${id}: görsel yüklendi`)));

  const sizeCount = Array.isArray(product.sizes) ? product.sizes.length : 0;
  console.log(
    `     ${id}: ${sizeCount ? `${sizeCount} beden (${product.sizes.slice(0, 6).join(", ")})` : "beden okunmadı"}`,
  );

  await page.close();
}

await browser.close();
summary();
