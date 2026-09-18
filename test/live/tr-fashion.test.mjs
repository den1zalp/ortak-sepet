// Mavi, LTB, Koton, Levi's TR ve LC Waikiki parserlarını canlı sayfalarda
// doğrula. Beşinin de sınadığı ayrı bir şey var:
//
//   Mavi       — JSON-LD yok; fiyat <product-price> ögesinde, indirimde üstü
//                çizili tutar ayrı sınıfta (".old-price")
//   LTB        — sınıf adları emotion karması; her şey JSON-LD'den, görsel
//                alanı iç içe dizi olarak basılıyor
//   Koton      — ana fiyatın altında onlarca öneri kartı fiyatı var; renk
//                başlıkta değil, ayrı satırda
//   Levi's TR  — Vans TR ile aynı T-Soft teması (".p-price")
//   LC Waikiki — sepette indirimde ödenecek tutar ".price-in-cart" rozetinde,
//                üstteki ".current-price" sepet öncesini gösteriyor
import { runStoreChecks } from "../helpers/live-store.mjs";

const TRY_PRICE = /^[\d.]+(,\d{2})? TL$/;

const text = (selector) => (page) =>
  page.evaluate((target) => {
    const node = document.querySelector(target);
    return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
  }, selector);

await runStoreChecks([
  {
    name: "Mavi",
    listing: "https://www.mavi.com/kadin/jean/c/1",
    pattern: /mavi\.com\/[a-z0-9-]+\/p\/[a-z0-9-]+$/i,
    readySelector: "product-price .price",
    site: "Mavi",
    priceRe: TRY_PRICE,
    imageRe: /sky-static\.mavi\.com/,
    expectedPrice: text("product-price .product-price-wrapper.pdp .price"),
    rejectPrice: text("product-price .product-price-wrapper.pdp .old-price"),
    installment: "none",
  },
  {
    name: "LTB",
    // Ana sayfadaki vitrin kartları her zaman render edilmiyor; ürün
    // adresleri mağazanın kendi sitemap'inden alınıyor.
    sitemap: "https://www.ltbjeans.com/sitemap_products_tr_1.xml",
    // Sitemap adresleri dil önekli ("/tr-TR/anna-…-p-508460"), sitedeki
    // bağlantılar ise kök seviyede; ikisini de kabul ediyoruz.
    pattern: /ltbjeans\.com\/(?:[a-z-]+\/)?[a-z0-9-]+-p-\d+$/i,
    readySelector: "h1",
    site: "LTB",
    priceRe: TRY_PRICE,
    imageRe: /ltbimg\.mncdn\.com/,
    // Ödenecek tutar üstü çizili olmayan ilk fiyat; sınıf adları kararsız
    // olduğu için stile bakıyoruz.
    expectedPrice: (page) =>
      page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll("span, p, div"));
        const node = nodes.find((element) => {
          const own = Array.from(element.childNodes)
            .filter((child) => child.nodeType === 3)
            .map((child) => child.textContent)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          if (!/^[\d.,]+\s*TL$/i.test(own)) return false;
          return !getComputedStyle(element).textDecorationLine.includes("line-through");
        });

        return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
      }),
    installment: "none",
  },
  {
    name: "Koton",
    listing: "https://www.koton.com/erkek-koton-jeans/",
    pattern: /koton\.com\/[a-z0-9-]+-\d{6,}\/$/i,
    readySelector: ".price__price",
    site: "Koton",
    priceRe: TRY_PRICE,
    imageRe: /ktnimg2\.mncdn\.com/,
    expectedPrice: text(".price__price"),
    rejectPrice: text(".price__retail"),
    installment: "none",
  },
  {
    name: "Levi's TR",
    listing: "https://www.levis.com.tr/kadin-jean",
    pattern: /levis\.com\.tr\/[a-z0-9-]+_\d{4,}$/i,
    readySelector: ".p-price",
    site: "Levi's",
    priceRe: TRY_PRICE,
    imageRe: /st-levis\.mncdn\.com/,
    expectedPrice: (page) =>
      page.evaluate(() => {
        const box = document.querySelector(".p-price");
        const node =
          box?.querySelector(".new-price") ||
          box?.querySelector(".one-price") ||
          box;
        return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
      }),
    rejectPrice: text(".p-price .old-price"),
    installment: "none",
  },
  {
    name: "LC Waikiki",
    listing: "https://www.lcw.com/arama?q=elbise",
    pattern: /lcw\.com\/[a-z0-9-]+-o-\d+$/i,
    readySelector: ".product-detail__price .current-price",
    site: "LC Waikiki",
    priceRe: TRY_PRICE,
    imageRe: /img-lcwaikiki\.mncdn\.com/,
    expectedPrice: (page) =>
      page.evaluate(() => {
        const box = document.querySelector(".product-detail__price");
        const node =
          box?.querySelector(".price-in-cart") || box?.querySelector(".current-price");
        return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
      }),
    installment: "none",
  },
]);
