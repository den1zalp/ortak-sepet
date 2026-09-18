// Colin's, Tudors, DeFacto, Jack & Jones (TR + UK) ve Gratis parserlarını
// canlı sayfalarda doğrula. Her birinin ayrı bir tuzağı var:
//
//   Colin's      — aynı tutar taksit tablosunda onlarca kez geçiyor; taksit
//                  tablosu ürün adının çok altında, jenerik tarama görmüyor
//   Tudors       — üç tutar yan yana: liste, indirimli ve üyeye özel "Sepette"
//   DeFacto      — JSON-LD **liste fiyatını** yayımlıyor, ödenecek tutar yalnız
//                  DOM'da; üstelik kuruş nokta ile yazılıyor ("699.99 TL")
//   Jack & Jones — ".product-price__list-price" sınıfı ödenecek tutarı taşıyor,
//                  indirimde ".product-price__sale-price" ekleniyor
//   Gratis       — "Gratis Kart Fiyatı" normal fiyattan düşük; kart fiyatı
//                  herkes için geçerli değil, alınmamalı
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

await runStoreChecks([
  {
    name: "Colin's",
    // Kategori adresleri "/c/<slug>-<id>" biçiminde; "/kadin-jean" gibi
    // uydurulmuş yollar ana sayfaya yönleniyor ve orada ürün kartı yok.
    listing: "https://www.colins.com.tr/c/tum-jean-modelleri-385",
    pattern: /colins\.com\.tr\/p\/[a-z0-9-]+$/i,
    readySelector: ".product-detail-price",
    site: "Colin's",
    priceRe: TRY_PRICE,
    imageRe: /img-colinstr\.mncdn\.com/,
    expectedPrice: text(".product-detail-price"),
    installment: "some",
  },
  {
    name: "Tudors",
    listing: "https://www.tudors.com/gomlek",
    // Kategori adresleri de "/<slug>-<id>" biçiminde ama kısa numaralı
    // ("/dik-yaka-1661"); ürünlerin numarası beş haneden uzun.
    pattern: /tudors\.com\/[a-z0-9-]+-\d{5,}$/i,
    readySelector: ".PriceList",
    site: "Tudors",
    priceRe: TRY_PRICE,
    imageRe: /static\.ticimax\.cloud/,
    expectedPrice: firstText(["#indirimliFiyat .spanFiyat", "#fiyat .spanFiyat"]),
    // İndirimli üründe "#fiyat" liste fiyatını gösteriyor; onu almadığımızı
    // ayrıca doğruluyoruz.
    rejectPrice: text("#fiyat .spanFiyat"),
    installment: "none",
  },
  {
    name: "DeFacto",
    listing: "https://www.defacto.com.tr/kadin-jean",
    pattern: /defacto\.com\.tr\/[a-z0-9%-]+-\d{6,}$/i,
    readySelector: ".product-detail__price",
    site: "DeFacto",
    priceRe: TRY_PRICE,
    imageRe: /dfcdn\.defacto\.com\.tr/,
    expectedPrice: text(".product-detail__price .first-line .base-price"),
    rejectPrice: text(".product-detail__price .lined-base-price"),
    installment: "some",
  },
  {
    name: "Jack & Jones TR",
    listing: "https://www.jackjones.com.tr/tr-tr",
    pattern: /jackjones\.com\.tr\/tr-tr\/product\/[\w_]+\/[a-z0-9-]+$/i,
    readySelector: ".product-detail__price-section",
    site: "Jack & Jones",
    priceRe: TRY_PRICE,
    imageRe: /images\.jackjones\.com\.tr/,
    expectedPrice: firstText([
      ".product-detail__price-section .product-price__sale-price",
      ".product-detail__price-section .product-price__list-price",
    ]),
    installment: "none",
  },
  {
    name: "Jack & Jones UK",
    // Ana sayfada yalnızca menü bağlantıları var, ürün kartları kategoride.
    listing: "https://www.jackjones.com/en-gb/jeans",
    pattern: /jackjones\.com\/en-gb\/product\//i,
    readySelector: ".product-detail__price-section",
    site: "Jack & Jones UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /images\.jackjones\.com/,
    expectedPrice: firstText([
      ".product-detail__price-section .product-price__sale-price",
      ".product-detail__price-section .product-price__list-price",
    ]),
  },
  {
    name: "Gratis",
    listing: "https://www.gratis.com/",
    pattern: /gratis\.com\/[a-z0-9-]+\/[a-z0-9-]+-p-\d+$/i,
    readySelector: "h1",
    site: "Gratis",
    priceRe: TRY_PRICE,
    imageRe: /gratis\.retter\.io|gratis\.com/,
    // Sayfadaki normal fiyat: kart fiyatı ayrı bir kutuda ve ondan küçük,
    // en büyük yazılan tutar normal fiyat.
    expectedPrice: (page) =>
      page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll("p, span, h2"))
          .filter((element) => /^[\d.]+,\d{2} TL$/.test((element.textContent || "").trim()))
          .map((element) => ({
            text: element.textContent.trim(),
            size: Number.parseFloat(getComputedStyle(element).fontSize) || 0,
          }))
          .sort((a, b) => b.size - a.size);

        return candidates[0]?.text || null;
      }),
    installment: "none",
  },
]);
