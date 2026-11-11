// Thomann UK parser'ını canlı ürün sayfalarında doğrula.
//
// Fiyat sayfadaki tutarla karşılaştırılıyor; fiyat kutusundaki "30-days best
// price" tutarının alınmadığı da kontrol ediliyor. Taksit teklifi ürüne göre
// değiştiği için beklenti PayPal kutusunun kendi metninden okunuyor: eklenti
// o iframe'e erişemiyor, test erişebiliyor. Ucuz ve pahalı ürünler bir arada
// sınansın diye iki listeleme var (kablolar "Pay in 30 days", kulaklıkların
// çoğu "Pay in 3").
import { runStoreChecks } from "../helpers/live-store.mjs";
import { wait } from "../helpers/extension.mjs";

const GBP_PRICE = /^£[\d,]+(\.\d{2})?$/;

const text = (selector) => (page) =>
  page.evaluate((target) => {
    const node = document.querySelector(target);
    return node ? node.textContent.replace(/\s+/g, " ").trim() : null;
  }, selector);

// PayPal kutusunun yazdığı teklif: "installments", "payLater" ya da null.
async function paypalOffer(page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    for (const frame of page.frames()) {
      if (!/paypal\.com/i.test(frame.url())) continue;

      const message = await frame.evaluate(() => document.body?.innerText || "").catch(() => "");

      if (/pay in \d+ interest-free payments/i.test(message)) return "installments";
      if (/pay in 30 days/i.test(message)) return "payLater";
    }

    await wait(500);
  }

  console.log("—    PayPal kutusu okunamadı, taksit kontrolü atlandı");
  return null;
}

async function paypalInstallment(page) {
  const offer = await paypalOffer(page);
  return offer === null ? null : offer === "installments" ? "some" : "none";
}

async function paypalPayLater(page) {
  const offer = await paypalOffer(page);
  return offer === null ? null : offer === "payLater";
}

const thomann = {
  pattern: /thomann\.co\.uk\/[a-z0-9_.-]+\.htm$/i,
  readySelector: "[itemprop='offers'] [itemprop='price']",
  site: "Thomann UK",
  region: "UK",
  priceRe: GBP_PRICE,
  imageRe: /thumbs\.static-thomann\.de\/thumb\/.+\/pics\/bdb\//,
  // İndirimli üründe tutar .price__primary'de, indirimsizde doğrudan .price'ta.
  expectedPrice: async (page) =>
    (await text("[itemprop='offers'] .price__primary")(page)) ||
    text("[itemprop='offers'] .price-wrapper .price")(page),
  rejectPrice: text("[itemprop='offers'] .strike-price-saving-text"),
  installment: paypalInstallment,
  payLater: paypalPayLater,
  maxProducts: 3,
};

await runStoreChecks([
  { ...thomann, name: "Thomann UK (kablolar)", listing: "https://www.thomann.co.uk/guitar_cables.html" },
  { ...thomann, name: "Thomann UK (kulaklıklar)", listing: "https://www.thomann.co.uk/studio_headphones.html" },
]);
