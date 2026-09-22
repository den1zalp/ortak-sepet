// Yedekten geri yükleme, eklenti yüklü Chrome'da uçtan uca.
//
// Geri yükleme mevcut sepetin yerine geçiyor, yani sessizce yanlış çalışması
// veri kaybı demek. Burada dosya gerçekten seçiliyor, sayfa gerçekten
// tıklanıyor ve sonuç eklentinin kendi deposundan okunuyor.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { launchExtension, createChecker, wait } from "../helpers/extension.mjs";

const { check, checkEqual, summary } = createChecker();

const { browser, sw, extensionId } = await launchExtension();

const ESKI_SEPET = [
  { id: "eski-1", title: "Silinecek ürün", price: "10,00 TL", quantity: 1, selected: true },
];

const YEDEK = {
  format: "ortak-sepet-yedek",
  version: 1,
  exportedAt: "2026-09-20T10:00:00.000Z",
  extensionVersion: "1.13.0",
  items: [
    {
      id: "yedek-1",
      title: "Old Skool Shoes - Black",
      price: "£70",
      currency: "GBP",
      region: "UK",
      url: "https://www.vans.com/en-gb/p/old-skool-shoes-VN000D3HY28",
      quantity: 2,
      selected: true,
      category: "Giyim & Ayakkabı",
    },
    {
      id: "yedek-2",
      title: "KNU SKOOL AYAKKABI",
      price: "5.999,00 TL",
      url: "https://www.vans.com.tr/knu-skool_1",
      quantity: 1,
      selected: false,
    },
  ],
  // Alınan kayıt, satın alma anındaki fiyatı ve tarihi donduruyor; aylık
  // harcama dökümü bu iki alandan çıkıyor. Yedek onları taşımazsa geçmiş
  // kaybolur, o yüzden kayıt burada gerçek biçimiyle duruyor.
  purchased: [
    {
      id: "yedek-3",
      title: "Samsonite Kabin Boy Valiz",
      site: "Samsonite",
      url: "https://www.samsonite.com.tr/valiz-1",
      image: "https://www.samsonite.com.tr/valiz-1.jpg",
      category: "Ev & Yaşam",
      price: "8.499,00 TL",
      quantity: 2,
      currency: "TRY",
      currencySymbol: "TL",
      region: "TR",
      purchasedAt: "2026-08-14T09:30:00.000Z",
    },
  ],
};

const backupPath = join(mkdtempSync(join(tmpdir(), "ortak-sepet-yedek-")), "yedek.json");
writeFileSync(backupPath, JSON.stringify(YEDEK, null, 2), "utf8");

// Geri yüklemenin üzerine yazacağı bir sepet bırakıyoruz.
await sw.evaluate(async (items) => {
  await browser.storage.local.set({ ortakSepetItems: items, ortakSepetPurchased: [] });
}, ESKI_SEPET);

const page = await browser.newPage();
const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(String(error.message)));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await page.goto(`chrome-extension://${extensionId}/popup/restore.html`);
await wait(500);

checkEqual(
  "sayfa başlığı yazıldı",
  await page.$eval("#restoreTitle", (el) => el.textContent),
  "Yedekten Geri Yükle",
);
checkEqual(
  "onay butonu önce kapalı",
  await page.$eval("#restoreConfirmBtn", (el) => el.disabled),
  true,
);

// --- once bozuk bir dosya: kabul edilmemeli ---
const bozukPath = join(mkdtempSync(join(tmpdir(), "ortak-sepet-bozuk-")), "bozuk.json");
writeFileSync(bozukPath, "{bu json değil", "utf8");

await (await page.$("#backupFile")).uploadFile(bozukPath);
await wait(400);

checkEqual(
  "bozuk dosya reddedildi",
  await page.$eval("#restoreStatus", (el) => el.textContent),
  "Bu dosya bozuk görünüyor; JSON olarak okunamadı.",
);
checkEqual(
  "bozuk dosyada onay kapalı kaldı",
  await page.$eval("#restoreConfirmBtn", (el) => el.disabled),
  true,
);
checkEqual(
  "bozuk dosya sepete dokunmadı",
  await sw.evaluate(async () => (await browser.storage.local.get("ortakSepetItems")).ortakSepetItems.length),
  1,
);

// --- gecerli yedek ---
await (await page.$("#backupFile")).uploadFile(backupPath);
await wait(400);

const ozet = await page.$eval("#restoreSummary", (el) => el.textContent);
check("özet ürün sayısını yazdı", ozet.includes("2 ürün"), ozet);
check("özet alınanları yazdı", ozet.includes("1 alınan"), ozet);
checkEqual(
  "onay butonu açıldı",
  await page.$eval("#restoreConfirmBtn", (el) => el.disabled),
  false,
);

await page.click("#restoreConfirmBtn");
await wait(600);

const sonuc = await sw.evaluate(async () => {
  const stored = await browser.storage.local.get([
    "ortakSepetItems",
    "ortakSepetPurchased",
    "ortakSepetUndo",
  ]);

  return {
    items: stored.ortakSepetItems || [],
    purchased: stored.ortakSepetPurchased || [],
    undo: stored.ortakSepetUndo || null,
  };
});

checkEqual("sepet geri yüklendi", sonuc.items.length, 2);
checkEqual("ürün adı korundu", sonuc.items[0].title, "Old Skool Shoes - Black");
checkEqual("adet korundu", sonuc.items[0].quantity, 2);
checkEqual("para birimi korundu", sonuc.items[0].currency, "GBP");
checkEqual("seçim durumu korundu", sonuc.items[1].selected, false);
checkEqual("alınanlar geri yüklendi", sonuc.purchased.length, 1);
checkEqual("alınan ürünün fiyatı korundu", sonuc.purchased[0].price, "8.499,00 TL");
checkEqual("alınma tarihi korundu", sonuc.purchased[0].purchasedAt, "2026-08-14T09:30:00.000Z");
checkEqual("alınan adedi korundu", sonuc.purchased[0].quantity, 2);
checkEqual("alınan para birimi korundu", sonuc.purchased[0].currency, "TRY");
checkEqual("alınan kategorisi korundu", sonuc.purchased[0].category, "Ev & Yaşam");
checkEqual(
  "alınan görseli korundu",
  sonuc.purchased[0].image,
  "https://www.samsonite.com.tr/valiz-1.jpg",
);

check("geri alma anlık görüntüsü yazıldı", Boolean(sonuc.undo), JSON.stringify(sonuc.undo?.items));
checkEqual("anlık görüntü eski sepeti taşıyor", sonuc.undo?.items?.[0]?.title, "Silinecek ürün");

checkEqual(
  "geri yükleme sonrası durum mesajı",
  (await page.$eval("#restoreStatus", (el) => el.textContent)).startsWith("2 ürün ve 1 alınan ürün"),
  true,
);

// --- popup yeni butonlarla hatasiz aciliyor mu ---
const popup = await browser.newPage();
const popupErrors = [];
popup.on("pageerror", (error) => popupErrors.push(String(error.message)));
popup.on("console", (message) => {
  // Yedekteki görsel adresleri uydurma; popup onları indirmeye çalışıp 404
  // alıyor. Burada aranan betik hatası, ağdan dönen kayıp görsel değil —
  // görselin yedekten doğru geldiği zaten kaydın alanlarıyla sınanıyor.
  if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
    popupErrors.push(message.text());
  }
});

await popup.goto(`chrome-extension://${extensionId}/popup.html`);
await wait(700);

checkEqual(
  "yedekle butonu etiketli",
  await popup.$eval("#backupCartBtn .action-label", (el) => el.textContent),
  "Yedekle",
);
checkEqual(
  "geri yükle butonu etiketli",
  await popup.$eval("#restoreCartBtn .action-label", (el) => el.textContent),
  "Geri Yükle",
);
// Özet satırı ürün sayısını değil toplam adedi yazıyor: 2 + 1.
checkEqual(
  "popup geri yüklenen sepeti gösteriyor",
  await popup.$eval("#itemCount", (el) => el.textContent),
  "3",
);
// Aldıklarım sekmesi: geri yüklenen kayıt gerçekten listeleniyor ve aylık
// döküm donmuş fiyat ile tarihten hesaplanıyor.
await popup.click("#purchasedTabBtn");
await wait(400);

const alinanlarMetni = await popup.$eval("#purchasedItems", (el) => el.textContent);
check("alınan ürün listeleniyor", alinanlarMetni.includes("Samsonite Kabin Boy Valiz"), alinanlarMetni.slice(0, 80));
check("donmuş fiyat gösteriliyor", alinanlarMetni.includes("8.499,00 TL"), alinanlarMetni.slice(0, 120));

const aySatiri = await popup.$eval("#purchasedItems", (el) => el.textContent);
check("alındığı ay başlıkta", /Ağustos\s*2026/.test(aySatiri), aySatiri.slice(0, 120));

const alinanlarOzeti = await popup.$eval("#purchasedSummary", (el) => el.textContent);
check("aylık harcama özeti çıktı", alinanlarOzeti.trim().length > 0, alinanlarOzeti.slice(0, 120));

check("popup konsolunda hata yok", popupErrors.length === 0, popupErrors.join(" | "));
check("geri yükleme sayfasında hata yok", consoleErrors.length === 0, consoleErrors.join(" | "));

await browser.close();
summary();
