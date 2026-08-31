// Kargo tespiti: ücretsiz kargo ifadesi bir sepet eşiğine bağlıysa ürünün
// kargosu ücretsiz sayılmamalı. Her iki bölge de sınanıyor — İngilizcede eşik
// ifadenin ardından ("on orders over £70"), Türkçede önünde ("2000 TL ve üzeri
// alışverişlerde") duruyor. Ağ gerekmiyor; core dosyaları node:vm içinde sahte
// bir document ile yükleniyor.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const context = vm.createContext({
  window: { location: { hostname: "example.co.uk", href: "" }, innerWidth: 1280, innerHeight: 900 },
  document: { querySelector: () => null, querySelectorAll: () => [], title: "" },
  console,
  URL,
});
context.globalThis = context;

vm.runInContext(
  readFileSync(join(REPO_ROOT, "content-uk/shared/core.js"), "utf8"),
  context,
  { filename: "content-uk/shared/core.js" },
);

const { analyzeFreeShippingClaim, normalizeForSearch } = context;

check("analyzeFreeShippingClaim tanımlı", typeof analyzeFreeShippingClaim === "function");

function claimFor(text) {
  return analyzeFreeShippingClaim(normalizeForSearch(text));
}

// Gerçek sayfalardan alınan ifadeler (2026-08 itibarıyla).
const CONDITIONAL = [
  ["Zippo UK", "FREE SHIPPING ON ORDERS OVER £70 LIGHTERS INSERTS HAND WARMERS"],
  ["Samsonite UK", "FAST FREE STANDARD DELIVERY STARTING FROM £100 Samsonite uses only the best courier"],
  ["Gymshark", "free standard shipping on orders over $75 students get an extra 12 off"],
  ["Gymshark teslimat", "free standard delivery for orders over $75 express delivery available"],
  ["harcama eşiği", "Free delivery when you spend £40 or more"],
  ["minimum sipariş", "Free delivery, minimum order £25"],
];

for (const [name, text] of CONDITIONAL) {
  check(`koşullu: ${name}`, claimFor(text) === "conditional", claimFor(text));
}

const UNCONDITIONAL = [
  ["düz ifade", "Free delivery on this item"],
  ["kargo bedava", "Free shipping. Returns within 30 days."],
  ["ertesi gün", "Free next day delivery"],
  ["ters sıra", "Delivery free for all orders"],
  // Eşik sözcüğü var ama kargoyla ilgisiz: "over 500 reviews" ifadeyi
  // koşullu yapmamalı, o yüzden sipariş sözcüğü yoksa £ tutarı zorunlu.
  ["yakındaki alakasız sayı", "Free delivery. Rated 4.8 from over 500 reviews"],
];

for (const [name, text] of UNCONDITIONAL) {
  check(`koşulsuz: ${name}`, claimFor(text) === "unconditional", claimFor(text));
}

const NONE = [
  ["ifade yok", "Delivery options available at checkout"],
  ["boş", ""],
];

for (const [name, text] of NONE) {
  check(`ifade yok: ${name}`, claimFor(text) === null, String(claimFor(text)));
}

// Sayfada hem koşullu üst bant hem ürüne ait koşulsuz rozet olabiliyor;
// bir tanesi bile koşulsuzsa ürün ücretsiz kargolu sayılır.
check(
  "koşulsuz ifade koşullunun önüne geçiyor",
  claimFor("Free shipping on orders over £70. This item ships with free delivery.") ===
    "unconditional",
);

// --- TR ---
//
// Türkçede eşik ifadenin önüne geçtiği için kontrol iki yana da bakıyor.
const trContext = vm.createContext({
  window: { location: { hostname: "example.com.tr", href: "" }, innerWidth: 1280, innerHeight: 900 },
  document: { querySelector: () => null, querySelectorAll: () => [], title: "" },
  console,
  URL,
});
trContext.globalThis = trContext;

vm.runInContext(
  readFileSync(join(REPO_ROOT, "content/shared/core.js"), "utf8"),
  trContext,
  { filename: "content/shared/core.js" },
);

const { analyzeTryFreeShippingClaim, normalizeTurkishText } = trContext;

check("analyzeTryFreeShippingClaim tanımlı", typeof analyzeTryFreeShippingClaim === "function");

function trClaimFor(text) {
  return analyzeTryFreeShippingClaim(normalizeTurkishText(text));
}

// Gerçek sayfalardan alınan ifadeler (2026-08 itibarıyla).
const TR_CONDITIONAL = [
  ["Birkenstock TR", "2000 TL ve üzeri alışverişlerde Ücretsiz Kargo."],
  ["Crocs TR", "1900 TL ve Üzeri Siparişlerde ÜCRETSİZ KARGO."],
  ["üstü", "500 TL üstü siparişlerde kargo bedava"],
  ["eşik sonra geliyor", "Ücretsiz kargo — 750 TL ve üzeri alışverişlerde geçerlidir"],
  ["minimum", "Ücretsiz kargo için minimum 250 TL sepet tutarı"],
];

for (const [name, text] of TR_CONDITIONAL) {
  check(`TR koşullu: ${name}`, trClaimFor(text) === "conditional", String(trClaimFor(text)));
}

const TR_UNCONDITIONAL = [
  ["düz ifade", "Bu üründe ücretsiz kargo"],
  ["kargo bedava", "Kargo bedava, 14 gün içinde iade"],
  ["ters sıra", "Bu üründe kargo ücretsiz"],
  // Ürünün kendi fiyatı ifadenin yanında duruyor; tutar tek başına eşik değil,
  // o yüzden "üzeri/üstü" gibi bir sözcük aranıyor.
  ["yanındaki ürün fiyatı", "2.309,30 TL Ücretsiz kargo"],
];

for (const [name, text] of TR_UNCONDITIONAL) {
  check(`TR koşulsuz: ${name}`, trClaimFor(text) === "unconditional", String(trClaimFor(text)));
}

const TR_NONE = [
  ["ifade yok", "Kargo bilgisi sepette hesaplanır"],
  ["boş", ""],
];

for (const [name, text] of TR_NONE) {
  check(`TR ifade yok: ${name}`, trClaimFor(text) === null, String(trClaimFor(text)));
}

summary();
