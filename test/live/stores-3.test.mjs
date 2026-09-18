// Watsons, Rossmann, Atasun Optik ve Apple (TR + UK) parserlarını canlı
// sayfalarda doğrula.
//
//   Watsons   — og etiketi yok; ad, fiyat ve görsel yalnızca JSON-LD'de
//   Rossmann  — tutar üç ayrı düğüme bölünmüş ("169," + "00" + "TL"),
//               sayfadan okumak kırılgan, JSON-LD kullanılıyor
//   Atasun    — T-Soft teması; taksit bilgisi ürün adının altında yazılı
//   Apple     — tek alan adında iki mağaza, ayrım manifest'teki yol kalıbında;
//               UK altbilgisindeki Barclays metni finansman sanılmamalı
import { runStoreChecks } from "../helpers/live-store.mjs";

const TRY_PRICE = /^[\d.]+(,\d{2})? TL$/;
const GBP_PRICE = /^£[\d,]+(\.\d{2})?$/;

const text = (selector) => (page) =>
  page.evaluate((target) => {
    const node = document.querySelector(target);
    return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
  }, selector);

await runStoreChecks([
  {
    name: "Watsons",
    listing: "https://www.watsons.com.tr/",
    pattern: /watsons\.com\.tr\/[^/]+\/p\/[A-Z0-9_]+$/i,
    readySelector: ".product-add-to-cart__price-details",
    site: "Watsons",
    priceRe: TRY_PRICE,
    imageRe: /media\.watsons\.com\.tr/,
    expectedPrice: text(".product-add-to-cart__price-details .price__default-value"),
    installment: "none",
  },
  {
    name: "Rossmann",
    listing: "https://www.rossmann.com.tr/",
    pattern: /rossmann\.com\.tr\/[a-z0-9-]+-p-[a-z0-9]+$/i,
    readySelector: ".price-final_price",
    site: "Rossmann",
    priceRe: TRY_PRICE,
    imageRe: /cdn\.rossmann\.com\.tr/,
    // Tutar parçalara bölünmüş; boşlukları atıp kutudaki son tutarı alıyoruz
    // (indirimli ürün "Sol: base / Sağ: indirimli" diye iki tutar yazıyor ve
    // ödenecek olan ikincisi).
    expectedPrice: (page) =>
      page.evaluate(() => {
        const box = document.querySelector(".price-final_price");
        if (!box) return null;

        const compact = (box.innerText || "").replace(/\s+/g, "");
        const matches = compact.match(/\d[\d.]*,\d{2}TL/g);

        return matches ? matches[matches.length - 1] : null;
      }),
    installment: "none",
  },
  {
    name: "Atasun Optik",
    listing: "https://www.atasunoptik.com.tr/",
    pattern: /atasunoptik\.com\.tr\/[a-z0-9_-]+_\d+$/i,
    readySelector: ".p-price",
    site: "Atasun Optik",
    priceRe: TRY_PRICE,
    imageRe: /stn-atasun\.mncdn\.com/,
    expectedPrice: (page) =>
      page.evaluate(() => {
        const box = document.querySelector(".p-price");
        const node =
          box?.querySelector(".new-price") || box?.querySelector(".one-price") || box;
        return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
      }),
    rejectPrice: text(".p-price .old-price"),
    installment: "some",
  },
  {
    name: "Apple TR",
    listing: "https://www.apple.com/tr/shop/accessories/all",
    pattern: /apple\.com\/tr\/shop\/product\//i,
    readySelector: ".rc-prices-fullprice",
    site: "Apple",
    priceRe: TRY_PRICE,
    imageRe: /store\.storeimages\.cdn-apple\.com/,
    expectedPrice: text(".rc-prices-currentprice .rc-prices-fullprice"),
    installment: "some",
  },
  {
    name: "Apple UK",
    listing: "https://www.apple.com/uk/shop/accessories/all",
    pattern: /apple\.com\/uk\/shop\/product\//i,
    readySelector: ".rc-prices-fullprice",
    site: "Apple UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /store\.storeimages\.cdn-apple\.com/,
    expectedPrice: text(".rc-prices-currentprice .rc-prices-fullprice"),
  },
]);
