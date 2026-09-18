// Karaca, Konyalı Saat, Lacoste (TR + UK) ve Marks & Spencer (TR + UK)
// parserlarını canlı sayfalarda doğrula.
//
//   Karaca        — meta liste fiyatını (1999), JSON-LD ödenecek tutarı (1799)
//                   yazıyor; sayfadaki görünür tutarların hepsi taksit tablosunda
//   Konyalı Saat  — h1 ürün tipini yazmıyor, ad JSON-LD'den tamamlanıyor
//   Lacoste       — TR Akinon ([data-testid='price']), UK Salesforce Commerce
//   M&S           — iki tarafta da fiyat JSON-LD'de "priceSpecification"
//                   içinde; offers.price hiç yok
import { runStoreChecks } from "../helpers/live-store.mjs";

const TRY_PRICE = /^[\d.]+(,\d{2})? TL$/;
const GBP_PRICE = /^£[\d,]+(\.\d{2})?$/;

const text = (selector) => (page) =>
  page.evaluate((target) => {
    const node = document.querySelector(target);
    return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
  }, selector);

const firstText = (selectors) => (page) =>
  page.evaluate((targets) => {
    for (const target of targets) {
      const node = document.querySelector(target);
      if (node) return node.textContent.replace(/\s+/g, " ").trim();
    }
    return null;
  }, selectors);

// Sınıf adı kararsız sayfalarda ödenecek tutar en büyük puntolu, üstü çizili
// olmayan tutardır.
const biggestPrice = (pattern) => (page) =>
  page.evaluate((source) => {
    const re = new RegExp(source);

    return (
      Array.from(document.querySelectorAll("span, p, h1, h2, h3, div, ins, pz-price"))
        .filter((element) => {
          const own = Array.from(element.childNodes)
            .filter((node) => node.nodeType === 3)
            .map((node) => node.textContent)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          return re.test(own);
        })
        .map((element) => ({
          text: element.textContent.replace(/\s+/g, " ").trim(),
          size: Number.parseFloat(getComputedStyle(element).fontSize) || 0,
          struck: getComputedStyle(element).textDecorationLine.includes("line-through"),
        }))
        .filter((item) => !item.struck)
        .sort((a, b) => b.size - a.size)[0]?.text || null
    );
  }, pattern.source);

await runStoreChecks([
  {
    name: "Karaca",
    listing: "https://www.karaca.com/",
    pattern: /karaca\.com\/urun\/[a-z0-9-]+$/i,
    readySelector: ".installment-box .total-price",
    site: "Karaca",
    priceRe: TRY_PRICE,
    imageRe: /cdn\.karaca\.com/,
    // "Sepette %15" indirimi olan üründe ödenecek tutar ".pdp-new-price";
    // taksit tablosunun "Tek Çekim" satırı indirimsiz tutarı gösteriyor
    // (499,99 TL yazarken sepete 424,99 TL giriyor).
    expectedPrice: firstText([".prices .pdp-new-price", ".installment-box .total-price"]),
    installment: "some",
  },
  {
    name: "Konyalı Saat",
    listing: "https://www.konyalisaat.com.tr/",
    pattern: /konyalisaat\.com\.tr\/[a-z0-9-]+-kol-saati$/i,
    readySelector: ".teso-product-info__price",
    site: "Konyalı Saat",
    priceRe: TRY_PRICE,
    imageRe: /contents\.konyalisaat\.com\.tr/,
    expectedPrice: text(".teso-product-info__price"),
    installment: "some",
  },
  {
    name: "Lacoste TR",
    // Ana sayfada ürün kartı yok; kategori adresleri "/<slug>-<id>/".
    listing: "https://www.lacoste.com.tr/cocuk-gomlek-1/",
    pattern: /lacoste\.com\.tr\/urun\/[a-z0-9-]+\/$/i,
    readySelector: "[data-testid='price']",
    site: "Lacoste",
    priceRe: TRY_PRICE,
    imageRe: /lacostetr\.akinoncloudcdn\.com/,
    expectedPrice: text("[data-testid='price']"),
  },
  {
    name: "Marks & Spencer TR",
    listing: "https://www.marksandspencer.com.tr/",
    pattern: /marksandspencer\.com\.tr\/product\/\d+\/$/i,
    readySelector: "h1",
    site: "Marks & Spencer",
    priceRe: TRY_PRICE,
    imageRe: /akinoncloud\.com/,
    expectedPrice: biggestPrice(/^[\d.]+,\d{2} TL$/),
    installment: "some",
  },
  {
    name: "Lacoste UK",
    listing: "https://www.lacoste.com/gb/lacoste/men/clothing/polo-shirts/",
    // Ürün adresleri stil koduyla bitiyor: ".../PH9851-00.html".
    pattern: /lacoste\.com\/gb\/.*\/[A-Z0-9]{4,}-\d{2}\.html/,
    readySelector: ".js-pdp-price",
    site: "Lacoste UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /image1\.lacoste\.com/,
    expectedPrice: text(".js-pdp-price"),
  },
  {
    name: "Marks & Spencer UK",
    listing: "https://www.marksandspencer.com/l/women/nightwear",
    pattern: /marksandspencer\.com\/[a-z0-9-]+\/p\/[a-z0-9]+$/i,
    readySelector: "[class*='product-intro_price']",
    site: "Marks & Spencer UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /marksandspencer\.app|marksandspencer\.com/,
    // Sınıf adı karma taşıyor ama "price_root" öneki kalıcı.
    expectedPrice: text("[class*='price_root']"),
  },
]);
