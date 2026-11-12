// Andertons ve guitarguitar parser'larını canlı ürün sayfalarında doğrula.
//
// İki mağazada da finance ürüne göre değişiyor; beklenti sayfadan okunuyor,
// parser'ın baktığı metne değil sayfanın gösterdiğine bakılarak:
//   Andertons    — fiyatın altındaki finance hesaplayıcısı uygun üründe
//                  görünüyor, uygun olmayanda gizli (0 yükseklik) kalıyor.
//   guitarguitar — ödeme seçenekleri bloğu görünüyorsa var.
// Ucuz ve pahalı ürünler birlikte sınansın diye listelemeler fiyat aralığı
// geniş kategorilerden seçildi.
import { runStoreChecks } from "../helpers/live-store.mjs";

const GBP_PRICE = /^£[\d,]+(\.\d{2})?$/;

const text = (selector) => (page) =>
  page.evaluate((target) => {
    const node = document.querySelector(target);
    return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
  }, selector);

function andertonsFinance(page) {
  return page.evaluate(() => {
    const frame = document.querySelector("#imm-placeholder iframe");
    if (!frame) return null;
    return frame.getBoundingClientRect().height > 0 ? "some" : "none";
  });
}

function guitarguitarFinance(page) {
  return page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll(".finance-option, .klarna-and-clearpay-info"));
    const shown = blocks.some((block) => block.getClientRects().length > 0 && /£/.test(block.textContent));
    return shown ? "some" : "none";
  });
}

await runStoreChecks([
  {
    name: "Andertons (pedallar)",
    listing: "https://www.andertons.co.uk/browse/guitar-pedals/",
    // Ürün adresi tek parçalı, en az üç kelimelik ve "/" ile bitiyor
    // ("/line-6-helix-floor-multi-effects-unit/"); menüdeki "/black-friday",
    // "/brands/" gibi sayfalar böylece elenir.
    pattern: /andertons\.co\.uk\/[a-z0-9]+(?:-[a-z0-9]+){2,}\/$/i,
    readySelector: "[data-testid='pdp-price']",
    site: "Andertons",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /cdn\d*\.bigcommerce\.com\/.+\/products\//,
    expectedPrice: text("[data-testid='pdp-price']"),
    rejectPrice: text("[data-testid='pdp-price'] ~ .line-through"),
    installment: andertonsFinance,
    maxProducts: 4,
  },
  {
    name: "guitarguitar (elektro gitarlar)",
    listing: "https://www.guitarguitar.co.uk/guitars/electric/",
    pattern: /guitarguitar\.co\.uk\/product\/[^/]+$/i,
    readySelector: "p.product-price",
    site: "guitarguitar",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /images\.guitarguitar\.co\.uk\/cdn\//,
    expectedPrice: text("p.product-price"),
    rejectPrice: text(".was-price"),
    installment: guitarguitarFinance,
    maxProducts: 3,
  },
  {
    name: "guitarguitar (teller)",
    listing: "https://www.guitarguitar.co.uk/accessories/strings/electric/",
    pattern: /guitarguitar\.co\.uk\/product\/[^/]+$/i,
    readySelector: "p.product-price",
    site: "guitarguitar",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /images\.guitarguitar\.co\.uk\/cdn\//,
    expectedPrice: text("p.product-price"),
    rejectPrice: text(".was-price"),
    installment: guitarguitarFinance,
    maxProducts: 2,
  },
]);
