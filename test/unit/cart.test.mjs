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

// --- seçilen seçenekler ürün kimliğinin parçası ---
const jeanUrl = "https://www.mavi.com/marcus-jean/p/123";

const sizeAxis = (selected) => ({
  key: "size",
  label: "Beden",
  values: ["29/32", "30/32", "31/32"],
  selected,
});

const colourAxis = (selected) => ({
  key: "colour",
  label: "Renk",
  values: ["Siyah", "Mavi"],
  selected,
});

const jean = {
  title: "Mavi Marcus Jean",
  price: "1.299,90 TL",
  url: jeanUrl,
  site: "Mavi",
  region: "TR",
};

const jeanSmall = await Cart.addProduct({ ...jean, options: [sizeAxis("30/32")] });
check("seçenekli ürün eklendi", jeanSmall.status, "added");
check("seçim kaydedildi", jeanSmall.item.options[0].selected, "30/32");
check("değer listesi kaydedildi", jeanSmall.item.options[0].values.length, 3);

const jeanLarge = await Cart.addProduct({ ...jean, options: [sizeAxis("31/32")] });
check("farklı beden ayrı satır", jeanLarge.status, "added");

const jeanAgain = await Cart.addProduct({ ...jean, options: [sizeAxis("30/32")] });
check("aynı beden adet artırdı", jeanAgain.status, "increased");
check("aynı bedende adet 2", jeanAgain.item.quantity, 2);

// Beden aynı ama renk farklıysa ayrı satır: seçimlerin tamamı kimliğin parçası.
const jeanBlack = await Cart.addProduct({
  ...jean,
  options: [sizeAxis("30/32"), colourAxis("Siyah")],
});
check("renk farkı ayrı satır", jeanBlack.status, "added");

const jeanBlackAgain = await Cart.addProduct({
  ...jean,
  options: [sizeAxis("30/32"), colourAxis("Siyah")],
});
check("aynı beden+renk adet artırdı", jeanBlackAgain.status, "increased");

// Eksenlerin sırası kimliği değiştirmemeli.
const reversed = await Cart.addProduct({
  ...jean,
  options: [colourAxis("Siyah"), sizeAxis("30/32")],
});
check("eksen sırası kimliği değiştirmiyor", reversed.status, "increased");

// Büyük/küçük harf ve boşluk farkı aynı seçim sayılmalı.
const spaced = await Cart.addProduct({ ...jean, options: [sizeAxis(" 30/32 ")] });
check("boşluklu seçim aynı satır", spaced.status, "increased");

// Seçimsiz eklenen ürün kendi satırı.
const jeanNoChoice = await Cart.addProduct({ ...jean, options: [sizeAxis("")] });
check("seçimsiz ürün ayrı satır", jeanNoChoice.status, "added");

const jeanLines = store.ortakSepetItems.filter((item) => item.site === "Mavi");
check("dört ayrı satır", jeanLines.length, 4);

// Parser eski biçimde beden verdiğinde de çalışmalı.
const legacyProduct = await Cart.addProduct({
  ...jean,
  url: "https://www.mavi.com/legacy/p/1",
  sizes: ["S", "M"],
  size: "M",
});
check("eski biçim seçeneğe çevrildi", legacyProduct.item.options[0].key, "size");
check("eski biçim seçimi korundu", legacyProduct.item.options[0].selected, "M");

// Depoda "Beden: OS" diye kaydedilmiş satırlar var; okurken düşmeliler, yoksa
// tazeleme bile onları silmiyor (mergeOptions kullanıcının eksenini korur).
for (const marker of ["OS", "UNI", "Tek Ebat"]) {
  check(
    "depodaki tek beden işareti okunmuyor: " + marker,
    Cart.readOptions({ options: [{ key: "size", label: "Beden", values: [marker], selected: marker }] }).length,
    0,
  );
}

// Elle yazılan beden değer listesi taşımaz; ona dokunulmamalı.
check(
  "elle yazılan beden korunuyor",
  Cart.readOptions({ options: [{ key: "size", label: "Beden", values: [], selected: "OS" }] })[0]?.selected,
  "OS",
);

// Depoda eski biçimde duran kayıt da tek eksenli listeye çevrilmeli.
const legacyStored = Cart.readOptions({ size: "L", sizes: ["S", "M", "L"] });
check("eski kayıt okunuyor", legacyStored[0].selected, "L");
check("eski kaydın değerleri", legacyStored[0].values.length, 3);

// Fiyat güncellemesi kullanıcının seçimini değiştirmemeli: sayfa o an başka bir
// beden seçili gösterse bile satır kullanıcının seçtiğine ait.
const chosen = store.ortakSepetItems.find(
  (item) => Cart.readOptions(item)[0]?.selected === "30/32" && Cart.readOptions(item).length === 1,
);

await Cart.saveRefreshedItem({
  ...chosen,
  options: [sizeAxis("31/32")],
  price: "1.199,90 TL",
});

const afterRefresh = store.ortakSepetItems.find((item) => item.id === chosen.id);
check("seçim güncellemede korundu", Cart.readOptions(afterRefresh)[0].selected, "30/32");
check("fiyat güncellemede yazıldı", afterRefresh.price, "1.199,90 TL");

// Tazelemede sayfadan gelen yeni değerler listeye yansımalı.
await Cart.saveRefreshedItem({
  ...chosen,
  options: [{ key: "size", label: "Beden", values: ["30/32", "32/34"], selected: "" }],
});

const afterValues = store.ortakSepetItems.find((item) => item.id === chosen.id);
check("değer listesi tazelendi", Cart.readOptions(afterValues)[0].values.join(","), "30/32,32/34");
check("seçim yine korundu", Cart.readOptions(afterValues)[0].selected, "30/32");

check(
  "isSameCartLine: aynı seçim",
  Cart.isSameCartLine({ url: jeanUrl, options: [sizeAxis("M")] }, Cart.normalizeUrl(jeanUrl), [
    sizeAxis("m"),
  ]),
  true,
);

check(
  "isSameCartLine: farklı seçim",
  Cart.isSameCartLine({ url: jeanUrl, options: [sizeAxis("M")] }, Cart.normalizeUrl(jeanUrl), [
    sizeAxis("L"),
  ]),
  false,
);

// --- kategori kuralları ---
check("kategori: iPhone kılıf şarj kablosu", categorize({ title: "iPhone kılıf şarj kablosu", site: "Trendyol" }), "Telefon & Aksesuar");
check("kategori: Samsung çamaşır makinesi", categorize({ title: "Samsung çamaşır makinesi", site: "Teknosa" }), "Diğer");
check("kategori: RTX 4070", categorize({ title: "MSI RTX 4070 ekran kartı", site: "İtopya" }), "Bilgisayar");
check("kategori: IKEA BILLY bookcase", categorize({ title: "BILLY Bookcase white", site: "IKEA UK" }), "Ev & Yaşam");
check("kategori: IKEA kitaplık", categorize({ title: "BILLY Kitaplık, beyaz", site: "IKEA" }), "Ev & Yaşam");
check("kategori: Gymshark hoodie", categorize({ title: "Gymshark Crest Hoodie", site: "Gymshark" }), "Giyim");
check("kategori: bilinmeyen", categorize({ title: "Zzz qqq", site: "n11" }), "Diğer");

summary();
