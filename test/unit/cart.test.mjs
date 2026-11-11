// shared/cart.js + shared/category.js birim testleri. DOM gerekmiyor: iki modül
// node:vm içinde sahte bir browser.storage ile çalıştırılıyor.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { checkEqual: check, summary } = createChecker();

const store = {};
const browser = {
  storage: {
    local: {
      async get(key) {
        return key in store ? { [key]: store[key] } : {};
      },
      async set(patch) {
        Object.assign(store, patch);
      },
    },
  },
};

const context = vm.createContext({ browser, crypto, console, URL, URLSearchParams });
for (const file of ["shared/category.js", "shared/cart.js"]) {
  vm.runInContext(readFileSync(join(REPO_ROOT, file), "utf8"), context, { filename: file });
}

const Cart = context.OrtakSepetCart;
const categorize = context.categorizeProduct;

// --- para birimi / sayı ---
check("extract EUR", Cart.extractNumberFromPrice("€1.234,56"), 1234.56);
check("extract GBP", Cart.extractNumberFromPrice("£1,234.56"), 1234.56);
check("extract TRY", Cart.extractNumberFromPrice("1.299,90 TL"), 1299.9);
check("arePricesEqual EUR", Cart.arePricesEqual("€1.234,56", "€1.234,57"), true);
check("arePricesEqual EUR diff", Cart.arePricesEqual("€1.234,56", "€1.334,56"), false);

// --- unknown finance tespiti ---
check("UK unknown", Cart.isUnknownInstallmentInfo({ installmentAvailable: false, installmentText: "Finance information not found" }), true);
check("UK negatif bilinen", Cart.isUnknownInstallmentInfo({ installmentAvailable: false, installmentText: "Finance not available" }), false);
check("UK pozitif", Cart.isUnknownInstallmentInfo({ installmentAvailable: true, installmentText: "Finance / pay later available" }), false);
check("TR unknown", Cart.isUnknownInstallmentInfo({ installmentAvailable: false, installmentText: "Taksit bilgisi bulunamadı" }), true);
check("TR negatif bilinen", Cart.isUnknownInstallmentInfo({ installmentAvailable: false, installmentText: "Taksit yok" }), false);
check("Thomann 'pay in 30 days' bilinen", Cart.isUnknownInstallmentInfo({ installmentAvailable: false, installmentText: "No instalments, pay in 30 days with PayPal" }), false);

// --- sonra öde birleştirme ---
const payLaterItem = { installmentAvailable: false, installmentText: "No instalments, pay in 30 days with PayPal", payLaterAvailable: true, payLaterText: "Pay in 30 days with PayPal" };
const unknownRead = { installmentAvailable: false, installmentText: "Finance information not found", payLaterAvailable: null };
const payIn3Read = { installmentAvailable: true, installmentText: "Pay in 3 with PayPal", payLaterAvailable: false, payLaterText: "" };
check("okunamayan teklif sonra öde'yi silmiyor", Cart.mergePayLaterAvailable(unknownRead, payLaterItem), true);
check("okunamayan teklif metni koruyor", Cart.mergePayLaterText(unknownRead, payLaterItem), "Pay in 30 days with PayPal");
check("taksite dönen üründe sonra öde kalkıyor", Cart.mergePayLaterAvailable(payIn3Read, payLaterItem), false);
check("sonra öde yeni okunuyor", Cart.mergePayLaterAvailable(payLaterItem, { installmentAvailable: true }), true);
check("alanı olmayan eski kayıt bilinmiyor kalıyor", Cart.mergePayLaterAvailable(unknownRead, {}), null);
check("sonra öde söylemeyen mağaza false yazıyor", Cart.mergePayLaterAvailable({ installmentAvailable: false, installmentText: "Taksit yok" }, {}), false);

// --- ekleme ---
const trProduct = {
  title: "Philips Airfryer",
  price: "3.499,00 TL",
  url: "https://www.hepsiburada.com/urun-p-1?utm_source=x#tab",
  site: "Hepsiburada",
  region: "TR",
  installmentAvailable: true,
  installmentText: "Taksit var",
};

const first = await Cart.addProduct(trProduct);
check("yeni ürün eklendi", first.status, "added");
check("bölge TR", first.item.region, "TR");
check("sembol TL", first.item.currencySymbol, "TL");
check("kategori atanmadı (normal mod)", first.item.category, null);

const second = await Cart.addProduct({ ...trProduct, url: "https://www.hepsiburada.com/urun-p-1?gclid=abc" });
check("aynı URL adet artırdı", second.status, "increased");
check("adet 2", second.item.quantity, 2);
check("sepette tek kalem", store.ortakSepetItems.length, 1);

// bilinmeyen taksit bilgisi eskisini ezmemeli
await Cart.addProduct({ ...trProduct, installmentAvailable: false, installmentText: "Taksit bilgisi bulunamadı" });
check("taksit bilgisi korundu", store.ortakSepetItems[0].installmentAvailable, true);

// --- EUR ürün UK bölgesinde kalmalı ---
const euro = await Cart.addProduct({
  title: "AliExpress kulaklık",
  price: "€24,90",
  url: "https://www.aliexpress.com/item/1.html",
  site: "AliExpress",
  region: "UK",
});
check("EUR ürün UK", euro.item.region, "UK");
check("EUR sembol", euro.item.currencySymbol, "€");
check("EUR para birimi", euro.item.currency, "EUR");

// --- kategori modu ---
store.ortakSepetViewMode = "category";
const categorized = await Cart.addProduct({
  title: "iPhone 15 silikon kılıf",
  price: "499,00 TL",
  url: "https://www.trendyol.com/p-2",
  site: "Trendyol",
  region: "TR",
});
check("kategori modunda kategori atandı", categorized.item.category, "Telefon & Aksesuar");
store.ortakSepetViewMode = "normal";

// --- saveRefreshedItem ---
const target = store.ortakSepetItems[0];
const refreshed = { ...target, price: "3.299,00 TL", quantity: 99, selected: false, category: "Elektronik" };
check("güncelleme yazıldı", await Cart.saveRefreshedItem(refreshed), true);
check("fiyat güncellendi", store.ortakSepetItems[0].price, "3.299,00 TL");
// Ürün üç kez eklendi (2 mükerrer + taksit testi), yani depodaki adet 3.
check("adet kullanıcıdan korundu", store.ortakSepetItems[0].quantity, 3);
check("seçim kullanıcıdan korundu", store.ortakSepetItems[0].selected, true);

const removed = { ...target, id: "silinmis-id" };
check("silinmiş ürün geri yazılmadı", await Cart.saveRefreshedItem(removed), false);
check("kalem sayısı değişmedi", store.ortakSepetItems.length, 3);

// --- fiyat geçmişi ---
// Eklenen ürün ilk noktayla başlıyor; aynı gün yeniden eklenince yeni nokta
// açılmıyor (ilk ürün yukarıda aynı gün üç kez eklendi).
const firstHistory = store.ortakSepetItems.find((item) => item.title === "Philips Airfryer").priceHistory;
check("eklenen ürünün geçmişi tek nokta", firstHistory.length, 1);
check("ilk nokta eklenen fiyat", firstHistory[0].price, "3.499,00 TL");

// Saatler öğlen: hangi saat diliminde çalışırsa çalışsın aynı yerel gün.
const tracked = { priceHistory: [{ at: "2026-10-01T12:00:00.000Z", price: "£100.00" }] };
const nextDay = Cart.recordPriceHistory(tracked, "£100.00", "2026-10-02T12:00:00.000Z");
check("fiyat aynı olsa da her gün bir nokta", nextDay.map((point) => point.price).join(" > "), "£100.00 > £100.00");
const sameDay = Cart.recordPriceHistory({ priceHistory: nextDay }, "£89.99", "2026-10-02T13:00:00.000Z");
check("aynı gün ikinci okuma o günün noktasını değiştiriyor", sameDay.map((point) => point.price).join(" > "), "£100.00 > £89.99");
check("günün noktası son okunma anında", sameDay[1].at, "2026-10-02T13:00:00.000Z");
check("eski geçmiş değişmedi", tracked.priceHistory.length, 1);
check("fiyatsız okuma nokta eklemiyor", Cart.recordPriceHistory(tracked, null).length, 1);

// Bu özellikten önce eklenmiş ürün: bilinen fiyat son kontrol anıyla başlangıç.
const legacy = { price: "26.290 TL", lastCheckedAt: "2026-10-20T12:00:00.000Z", addedAt: "2026-09-01T12:00:00.000Z" };
check("eski ürünün başlangıcı son kontrol", Cart.getPriceHistory(legacy)[0].at, "2026-10-20T12:00:00.000Z");
check("eski ürün ertesi gün iki nokta", Cart.recordPriceHistory(legacy, "26.290 TL", "2026-10-21T12:00:00.000Z").length, 2);
// Elle girilen fiyat geçmişe girmiyor: başlangıç mağazanın okuduğu fiyat.
check(
  "elle fiyatlı eski ürün mağaza fiyatıyla başlıyor",
  Cart.getPriceHistory({ ...legacy, manualPrice: true, price: "20.000 TL", detectedPrice: "26.290 TL" })[0].price,
  "26.290 TL",
);

// Bir yıldan eski noktalar düşüyor.
let daily = { priceHistory: [] };
const dayMs = 24 * 60 * 60 * 1000;
for (let day = 0; day < 400; day++) {
  const at = new Date(Date.UTC(2026, 0, 1, 12) + day * dayMs).toISOString();
  daily = { priceHistory: Cart.recordPriceHistory(daily, `£${100 + (day % 7)}.00`, at) };
}
check("son 365 günün noktaları kalıyor", daily.priceHistory.length, 366);
check("en eski nokta tam bir yıl önce", daily.priceHistory[0].at, new Date(Date.UTC(2026, 0, 1, 12) + 34 * dayMs).toISOString());

// Bir yıldır güncellenmemiş ürünün son fiyatı düşmüyor.
const stale = Cart.recordPriceHistory({ priceHistory: [{ at: "2025-01-01T12:00:00.000Z", price: "£50.00" }] }, null);
check("güncellenmemiş ürünün tek noktası kalıyor", stale.length, 1);
const afterYear = Cart.recordPriceHistory({ priceHistory: [{ at: "2025-01-01T12:00:00.000Z", price: "£50.00" }] }, "£45.00", "2026-06-01T12:00:00.000Z");
check("bir yıl sonraki okuma eskiyi düşürüyor", afterYear.map((point) => point.price).join(" > "), "£45.00");

// --- kategori kuralları ---
check("kategori: iPhone kılıf şarj kablosu", categorize({ title: "iPhone kılıf şarj kablosu", site: "Trendyol" }), "Telefon & Aksesuar");
check("kategori: Samsung çamaşır makinesi", categorize({ title: "Samsung çamaşır makinesi", site: "Teknosa" }), "Diğer");
check("kategori: RTX 4070", categorize({ title: "MSI RTX 4070 ekran kartı", site: "İtopya" }), "Bilgisayar");
check("kategori: IKEA BILLY bookcase", categorize({ title: "BILLY Bookcase white", site: "IKEA UK" }), "Ev & Yaşam");
check("kategori: IKEA kitaplık", categorize({ title: "BILLY Kitaplık, beyaz", site: "IKEA" }), "Ev & Yaşam");
check("kategori: Gymshark hoodie", categorize({ title: "Gymshark Crest Hoodie", site: "Gymshark" }), "Giyim");
check("kategori: bilinmeyen", categorize({ title: "Zzz qqq", site: "n11" }), "Diğer");

summary();
