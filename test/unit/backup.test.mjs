// Yedek dosyasının okunması. Geri yükleme mevcut sepetin yerine geçtiği için
// hatalı bir dosyanın sessizce kabul edilmesi veri kaybı demek: kontroller
// burada kilitleniyor.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { check, checkEqual, summary } = createChecker();

const context = vm.createContext({ console, URL });
context.globalThis = context;

vm.runInContext(readFileSync(join(REPO_ROOT, "shared/backup.js"), "utf8"), context, {
  filename: "shared/backup.js",
});

const Backup = context.OrtakSepetBackup;

const items = [
  { id: "1", title: "Old Skool Shoes", price: "£70", url: "https://www.vans.com/en-gb/p/x" },
  { id: "2", title: "KNU SKOOL", price: "5.999,00 TL", url: "https://www.vans.com.tr/x" },
];
const purchased = [{ id: "3", title: "Alınan ürün", price: "100,00 TL" }];

// --- tur: yaz, oku ---
const text = JSON.stringify(Backup.createBackup(items, purchased, "1.13.0"));
const parsed = Backup.parseBackup(text);

check("geçerli yedek okundu", parsed.ok === true);
checkEqual("ürün sayısı", parsed.items.length, 2);
checkEqual("alınan sayısı", parsed.purchased.length, 1);
checkEqual("ürün alanları korundu", parsed.items[0].url, "https://www.vans.com/en-gb/p/x");
checkEqual("sürüm yazıldı", JSON.parse(text).extensionVersion, "1.13.0");
checkEqual("biçim damgası", JSON.parse(text).format, "ortak-sepet-yedek");

// --- reddedilenler ---
checkEqual("bozuk json", Backup.parseBackup("{bu json değil").reason, "json");
checkEqual("boş metin", Backup.parseBackup("").reason, "json");
checkEqual(
  "başka bir json dosyası",
  Backup.parseBackup(JSON.stringify({ items: [{ title: "x" }] })).reason,
  "format",
);
checkEqual(
  "CSV yerine yedek sanılan dosya",
  Backup.parseBackup(JSON.stringify({ format: "başka-şey", items: [] })).reason,
  "format",
);
checkEqual(
  "items dizi değil",
  Backup.parseBackup(JSON.stringify({ format: "ortak-sepet-yedek", items: "yok", purchased: [] }))
    .reason,
  "format",
);
checkEqual(
  "iki liste de boş",
  Backup.parseBackup(JSON.stringify(Backup.createBackup([], [], "1.13.0"))).reason,
  "empty",
);

// --- elle bozulmuş kayıtlar ---
const withJunk = Backup.parseBackup(
  JSON.stringify({
    format: "ortak-sepet-yedek",
    version: 1,
    items: [{ title: "Gerçek ürün" }, { title: "   " }, { price: "5 TL" }, null, "metin"],
    purchased: [],
  }),
);

check("adsız kayıtlar elendi", withJunk.ok === true);
checkEqual("yalnızca adı olan kaldı", withJunk.items.length, 1);
checkEqual("kalan kayıt doğru", withJunk.items[0].title, "Gerçek ürün");

// Sepet boş ama alınanlar doluysa yedek anlamlı: aylık harcama dökümü orada.
const onlyPurchased = Backup.parseBackup(JSON.stringify(Backup.createBackup([], purchased, "1.13.0")));
check("yalnızca alınanlar taşıyan yedek kabul edildi", onlyPurchased.ok === true);

summary();
