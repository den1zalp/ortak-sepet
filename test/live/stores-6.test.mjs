// Mi (TR + UK), Mudo, Oysho (TR + UK), Pandora (TR + UK) ve Penti
// parserlarını canlı sayfalarda doğrula.
//
//   Mi       — tek alan adında iki mağaza; tutarlar ekran okuyucu öneki
//              taşıyor ("Current Price TL46999.00")
//   Mudo     — Akinon; ürün bloğunda puan ve taksit tutarları da var
//   Oysho    — Inditex Angular; sınıf adları değişken, data-testid kararlı
//   Pandora  — Chakra UI: JSON-LD yok, og:image yok, sınıf adları derleme
//              çıktısı; fiyat "product-view" içinde, "buy-box" içinde değil
//   Penti    — ürün fiyatı ".pdp-prices", öneri kartları ".pc-prc-last"
import { runStoreChecks } from "../helpers/live-store.mjs";

const TRY_PRICE = /^[\d.]+(,\d{2})? TL$/;
const GBP_PRICE = /^£[\d,]+(\.\d{2})?$/;

const text = (selector) => (page) =>
  page.evaluate((target) => {
    const node = document.querySelector(target);
    return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
  }, selector);

// Metni tam olarak bir tutardan ibaret olan, üstü çizili olmayan ögelerden en
// büyük puntolusu. Fiyatı iç içe düğümlere bölen sayfalarda da çalışıyor.
const exactPrice = (pattern) => (page) =>
  page.evaluate((source) => {
    const re = new RegExp(source);

    return (
      Array.from(document.querySelectorAll("span, p, div, ins, pz-price, h2, h3"))
        .map((element) => ({
          element,
          text: (element.textContent || "").replace(/\s+/g, " ").trim(),
        }))
        .filter((item) => re.test(item.text))
        .filter((item) => !getComputedStyle(item.element).textDecorationLine.includes("line-through"))
        .map((item) => ({
          text: item.text,
          size: Number.parseFloat(getComputedStyle(item.element).fontSize) || 0,
        }))
        .sort((a, b) => b.size - a.size)[0]?.text || null
    );
  }, pattern.source);

// Pandora'da fiyat, ürün kutusunda metni yalnızca tutardan ibaret olan ilk öge.
const pandoraPrice = (source) => (page) =>
  page.evaluate((pattern) => {
    const re = new RegExp(pattern);
    const scope =
      document.querySelector("[data-testid='product-view']") || document.body;

    const node = Array.from(scope.querySelectorAll("span, p, div")).find((element) => {
      if (element.closest("[data-testid='product-tile-price']")) return false;

      const own = Array.from(element.childNodes)
        .filter((child) => child.nodeType === 3)
        .map((child) => child.textContent)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      return re.test(own);
    });

    return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
  }, source.source);

await runStoreChecks([
  {
    name: "Mi TR",
    listing: "https://www.mi.com/tr/store/",
    pattern: /mi\.com\/tr\/product\/[a-z0-9-]+\/$/i,
    // Listeleme genel bakış sayfasına götürüyor; fiyat kutusu satın alma
    // sayfasında.
    toProductUrl: (href) => `${href}buy/`,
    readySelector: ".main-section__info-section__price-container",
    site: "Mi",
    priceRe: TRY_PRICE,
    imageRe: /appmifile\.com/,
    expectedPrice: text(".main-section__info-section__price-container .mi-price span"),
  },
  {
    name: "Mudo",
    listing: "https://www.mudo.com.tr/",
    pattern: /mudo\.com\.tr\/[a-z0-9]+(?:-[a-z0-9]+){6,}\/$/i,
    readySelector: ".product-info",
    site: "Mudo",
    priceRe: TRY_PRICE,
    imageRe: /mudo\.akinoncloudcdn\.com/,
    expectedPrice: exactPrice(/^[\d.]+(?:,\d{2})? TL$/),
    installment: "some",
  },
  {
    name: "Oysho TR",
    listing: "https://www.oysho.com/tr/yeni-urunler-n4952",
    pattern: /oysho\.com\/tr\/[^/?]+-l\d+/i,
    readySelector: "[data-testid='main-info-price']",
    site: "Oysho",
    priceRe: TRY_PRICE,
    imageRe: /static\.oysho\.net/,
    expectedPrice: text("[data-testid='main-info-price']"),
  },
  {
    name: "Oysho UK",
    listing: "https://www.oysho.com/gb/new-in-n4952",
    pattern: /oysho\.com\/gb\/[^/?]+-l\d+/i,
    readySelector: "[data-testid='main-info-price']",
    site: "Oysho UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /static\.oysho\.net/,
    expectedPrice: text("[data-testid='main-info-price']"),
  },
  {
    name: "Pandora TR",
    listing: "https://tr.pandora.net/tr/yuzukler/",
    pattern: /tr\.pandora\.net\/tr\/.+\/\w+\.html$/i,
    readySelector: "[data-testid='product-view']",
    site: "Pandora",
    priceRe: TRY_PRICE,
    imageRe: /tr\.pandora\.net\/dw\/image/,
    // Görsel CDN'i tarayıcı dışı isteklere 403 dönüyor.
    skipImageFetch: true,
    expectedPrice: pandoraPrice(/^₺?\s?[\d.]+(?:,\d{2})?\s?(?:TL)?$/),
  },
  {
    name: "Pandora UK",
    listing: "https://uk.pandora.net/en/rings/",
    pattern: /uk\.pandora\.net\/en\/.+\/\w+\.html$/i,
    readySelector: "[data-testid='product-view']",
    site: "Pandora UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /uk\.pandora\.net\/dw\/image/,
    skipImageFetch: true,
    expectedPrice: pandoraPrice(/^£\s?[\d,]+(?:\.\d{2})?$/),
  },
  {
    name: "Penti",
    listing: "https://www.penti.com/tr/c/kadin-pijama",
    pattern: /penti\.com\/tr\/.+\/p\/[A-Z0-9-]+$/i,
    readySelector: ".pdp-prices",
    site: "Penti",
    priceRe: TRY_PRICE,
    imageRe: /file-penti\.mncdn\.com/,
    expectedPrice: text(".pdp-prices .prc-last"),
    installment: "some",
  },
]);
