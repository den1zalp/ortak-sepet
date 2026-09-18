// Pull & Bear (TR + UK), Stradivarius (TR + UK), Swatch (TR + UK), SuperStep,
// Saat & Saat, Zuhal Müzik ve Under Armour TR parserlarını canlı sayfalarda
// doğrula.
//
//   Pull & Bear / Stradivarius — Inditex; ürün ızgarası otomasyonlu tarayıcıya
//                render edilmiyor, adresler mağazanın sitemap'inden alınıyor.
//                Pull&Bear'da ürün sayfasında h1 hiç basılmıyor.
//   Swatch     — tek alan adında iki mağaza; tutar "TL 15.550,00" biçiminde,
//                para birimi başta
//   SuperStep  — Akinon, [data-testid='price']
//   Saat&Saat  — Magento; ödenecek tutar ".final-price", liste ayrı kutuda
//   Zuhal      — "#content-price" ödenecek, "#content-last-price" üstü çizili
//   Under Armour TR — fiyat <pz-price> ile sonradan yazılıyor
//
// Under Armour UK ve Sports Direct burada yok: ikisi de otomasyonlu tarayıcıya
// kapalı (Akamai "Client Challenge" / PerimeterX) ve parserları kullanıcının
// tarayıcısından alınan sayfa dökümüne göre yazıldı.
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
    name: "Pull & Bear TR",
    sitemap: "https://www.pullandbear.com/2/info/sitemaps/sitemap-products-pb-tr-0.xml.gz",
    pattern: /pullandbear\.com\/tr\/[^/]+-l\d+$/i,
    // Sayfa çerez duvarı yüzünden otomasyonlu tarayıcıda render edilmiyor;
    // ilk HTML'de gelen JSON-LD hazır olma işareti.
    readySelector: "script[type='application/ld+json']",
    site: "Pull & Bear",
    priceRe: TRY_PRICE,
    imageRe: /static\.pullandbear\.net/,
  },
  {
    name: "Pull & Bear UK",
    sitemap: "https://www.pullandbear.com/2/info/sitemaps/sitemap-products-pb-gb-0.xml.gz",
    pattern: /pullandbear\.com\/gb\/[^/]+-l\d+$/i,
    // Sayfa çerez duvarı yüzünden otomasyonlu tarayıcıda render edilmiyor;
    // ilk HTML'de gelen JSON-LD hazır olma işareti.
    readySelector: "script[type='application/ld+json']",
    site: "Pull & Bear UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /static\.pullandbear\.net/,
  },
  {
    name: "Stradivarius TR",
    sitemap: "https://www.stradivarius.com/5/info/sitemaps/sitemap-products-st-tr-0.xml.gz",
    pattern: /stradivarius\.com\/tr\/[^/?]+-l\d+/i,
    // Sayfa çerez duvarı yüzünden otomasyonlu tarayıcıda render edilmiyor;
    // ilk HTML'de gelen JSON-LD hazır olma işareti.
    readySelector: "script[type='application/ld+json']",
    site: "Stradivarius",
    priceRe: TRY_PRICE,
    imageRe: /stradivarius/,
  },
  {
    name: "Stradivarius UK",
    sitemap: "https://www.stradivarius.com/5/info/sitemaps/sitemap-products-st-gb-0.xml.gz",
    pattern: /stradivarius\.com\/gb\/.*[^/?]+-l\d+/i,
    // Sayfa çerez duvarı yüzünden otomasyonlu tarayıcıda render edilmiyor;
    // ilk HTML'de gelen JSON-LD hazır olma işareti.
    readySelector: "script[type='application/ld+json']",
    site: "Stradivarius UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /stradivarius/,
  },
  {
    name: "Swatch TR",
    listing: "https://www.swatch.com/tr-tr/bioceramic-moonswatch/",
    pattern: /swatch\.com\/tr-tr\/.+\/[A-Z0-9]+\.html$/,
    readySelector: ".price .sales .value",
    site: "Swatch",
    priceRe: TRY_PRICE,
    imageRe: /static\.swatch\.com/,
    expectedPrice: text(".price .sales .value"),
  },
  {
    name: "Swatch UK",
    listing: "https://www.swatch.com/en-gb/bioceramic-moonswatch/",
    pattern: /swatch\.com\/en-gb\/.+\/[A-Z0-9]+\.html$/,
    readySelector: ".price .sales .value",
    site: "Swatch UK",
    region: "UK",
    priceRe: GBP_PRICE,
    imageRe: /static\.swatch\.com/,
    expectedPrice: text(".price .sales .value"),
  },
  {
    name: "SuperStep",
    listing: "https://www.superstep.com.tr/",
    pattern: /superstep\.com\.tr\/urun\/[a-z0-9-]+\/[\d-]+\/$/i,
    readySelector: "[data-testid='price']",
    site: "SuperStep",
    priceRe: TRY_PRICE,
    imageRe: /akinoncloudcdn\.com/,
    expectedPrice: text("[data-testid='price']"),
  },
  {
    name: "Saat & Saat",
    // Ana sayfada ürün kartı yok; kategori sayfalarında var.
    listing: "https://www.saatvesaat.com.tr/kadin-saat",
    pattern: /saatvesaat\.com\.tr\/[a-z0-9-]+-p-[a-z0-9]+$/i,
    readySelector: ".final-price .price",
    site: "Saat & Saat",
    priceRe: TRY_PRICE,
    imageRe: /saatvesaat\.com\.tr/,
    expectedPrice: text(".final-price .price"),
    installment: "some",
  },
  {
    name: "Zuhal Müzik",
    listing: "https://www.zuhalmuzik.com/",
    pattern: /zuhalmuzik\.com\/[a-z0-9-]{12,}$/i,
    readySelector: "#content-price",
    site: "Zuhal Müzik",
    priceRe: TRY_PRICE,
    imageRe: /zuhalmuzik\.com|img-zuhalmuzik\.mncdn\.com/,
    expectedPrice: text("#content-price"),
    // Üstü çizili liste fiyatı ayrı kutuda; onu almadığımızı doğruluyoruz.
    rejectPrice: text("#content-last-price"),
  },
  {
    name: "Under Armour TR",
    sitemap: "https://www.underarmour.com.tr/sitemaps/sitemap-products-1.xml.gz",
    pattern: /underarmour\.com\.tr\/[a-z0-9-]+\/$/i,
    readySelector: ".product-info",
    site: "Under Armour",
    priceRe: TRY_PRICE,
    imageRe: /img-underarmour\.mncdn\.com/,
    // Sayfa otomasyonlu tarayıcıda hiç fiyat göstermiyor (<pz-price>
    // bileşeni sonradan yazıyor); parser og etiketinden okuyor, bu yüzden
    // karşılaştıracak görünür tutar yok.
    installment: "some",
  },
]);
