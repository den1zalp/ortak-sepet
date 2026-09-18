// Beymen, Calvin Klein (TR + UK), Champion (TR + UK) ve Desa parserlarını
// canlı sayfalarda doğrula.
//
//   Beymen        — dört tutar yan yana: liste, ara indirim, ödenecek ve
//                   "2 ve üzeri" çoklu alım kampanyası
//   Calvin Klein  — TR tarafı T-Soft teması, UK tarafı Next.js; UK'de sınıf
//                   adları karma taşıyor, data-testid kararlı
//   Champion      — TR'de MUI karma sınıfları (JSON-LD kullanılıyor), UK'de
//                   JSON-LD para birimini EUR yazıyor ama sayfa £ gösteriyor
//   Desa          — Ticimax; "2. ürüne %50" kampanya tutarı ana fiyat değil
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

// Sınıf adı kararsız olan sayfalarda ödenecek tutar en büyük puntoyla yazılan
// tutardır; öneri kartları hep daha küçük.
const biggestPrice = (pattern) => (page) =>
  page.evaluate((source) => {
    const re = new RegExp(source);

    return (
      Array.from(document.querySelectorAll("span, p, h1, h2, h3, div, ins"))
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
    name: "Beymen",
    // Ana sayfada ürün kartı yok, kategori adresleri "/tr/<slug>-<id>".
    listing: "https://www.beymen.com/tr/kadin-ayakkabi-10018",
    pattern: /beymen\.com\/tr\/p_[a-z0-9-]+_\d+$/i,
    readySelector: ".m-price",
    site: "Beymen",
    priceRe: TRY_PRICE,
    imageRe: /cdn\.beymen\.com/,
    expectedPrice: firstText([".m-price__lastPrice", ".m-price__new", ".m-price__old"]),
    // "2 ve üzeri" kampanyası tek ürün alana geçerli değil; onu almadığımızı
    // doğruluyoruz.
    rejectPrice: text(".m-price__campaignPrice"),
  },
  {
    name: "Calvin Klein TR",
    listing: "https://tr.calvinklein.com/erkek/giyim",
    pattern: /tr\.calvinklein\.com\/[a-z0-9-]+-p_\d+$/i,
    readySelector: ".p-price",
    site: "Calvin Klein",
    priceRe: TRY_PRICE,
    imageRe: /st-calvinkleinecom\.mncdn\.com/,
    expectedPrice: firstText([".p-price .new-price", ".p-price .one-price"]),
    rejectPrice: text(".p-price .old-price"),
  },
  {
    name: "Champion TR",
    listing: "https://www.championturkiye.com/",
    pattern: /championturkiye\.com\/[a-z0-9-]+-p-\d+$/i,
    readySelector: "h1",
    site: "Champion",
    priceRe: TRY_PRICE,
    imageRe: /img-champion\.mncdn\.com/,
    expectedPrice: biggestPrice(/^[\d.]+,\d{2} TL$/),
  },
  {
    name: "Desa",
    // Ürün adresleri kategori adresleriyle aynı biçimde ("/kadin-...");
    // ürün sluglarında en az altı kelime var, kategorilerde iki üç.
    listing: "https://www.desa.com.tr/kadin-ayakkabi",
    pattern: /desa\.com\.tr\/[a-z0-9]+(?:-[a-z0-9]+){5,}$/i,
    readySelector: ".PriceList",
    site: "Desa",
    priceRe: TRY_PRICE,
    imageRe: /static\.ticimax\.cloud/,
    expectedPrice: firstText([
      "#indirimliFiyat .spanFiyat",
      "#fiyat2 .spanFiyat",
      "#fiyat .spanFiyat",
    ]),
    // "2. ürüne %50 indirim" tutarı ana fiyat değil.
    rejectPrice: text(".sPric .sptPrice"),
  },
  {
    name: "Calvin Klein UK",
    listing: "https://www.calvinklein.co.uk/mens-jeans",
    // Ürün adresleri stil koduyla bitiyor ("...-lv04rh700g7ib"); kategori
    // adresleri de uzun ama rakam içermiyor ("/womens-bestsellers").
    pattern: /calvinklein\.co\.uk\/[a-z0-9-]+-(?=[a-z0-9]*\d)[a-z0-9]{8,}$/i,
    readySelector: "[data-testid='ProductHeader-component']",
    site: "Calvin Klein UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /calvinklein-eu\.scene7\.com/,
    expectedPrice: text(
      "[data-testid='ProductHeader-component'] [data-testid='ProductHeaderPrice-PriceText']",
    ),
  },
  {
    name: "Champion UK",
    listing: "https://www.championstore.com/collections/men-hoodies",
    pattern: /championstore\.com\/products\//i,
    readySelector: ".product__prices",
    site: "Champion UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /championstore\.com\/cdn/,
    expectedPrice: text(".product__prices .current"),
  },
]);
