// Fiyat metninin sayıya çevrilmesi.
//
// Aynı kural iki yerde duruyor: shared/cart.js sepette tutarları toplamak için,
// shared/structured-data.js ise sayfadaki tutarla yapılandırılmış veriden geleni
// karşılaştırmak için. İkisi ayrışırsa "bu tutar sayfada üstü çizili mi"
// sorusunun cevabı sessizce yanlış çıkar — Supplementler'de sepete ödenecek
// tutar yerine liste fiyatı yazılmasının sebebi buna benzer bir uyuşmazlıktı
// (parser "5.499,00 TL" derken sayfa "5499 TL" yazıyordu).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { checkEqual: check, summary } = createChecker();

function loadStructuredData() {
  const context = vm.createContext({
    console,
    document: { querySelectorAll: () => [], querySelector: () => null, title: "" },
    window: { location: { href: "https://example.com/p", hostname: "example.com" } },
  });

  vm.runInContext(
    "function cleanText(t){ return t ? String(t).replace(/\\s+/g,' ').trim() : ''; }" +
      "function getSiteName(){ return 'Test'; }" +
      "function cleanPrice(v){ return v || null; }" +
      "function formatStructuredPrice(){ return null; }",
    context,
  );

  vm.runInContext(
    readFileSync(join(REPO_ROOT, "shared/structured-data.js"), "utf8"),
    context,
    { filename: "shared/structured-data.js" },
  );

  return context;
}

function loadCart() {
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

  return context.OrtakSepetCart;
}

const structured = loadStructuredData();
const Cart = loadCart();

const toNumber = structured.priceTextToNumber;

check("TL biçimi", toNumber("1.299,90 TL"), 1299.9);
check("ondalıksız TL", toNumber("5499 TL"), 5499);
check("sterlin", toNumber("£1,299.00"), 1299);
check("euro", toNumber("€18,00"), 18);
check("binlik ayraçsız", toNumber("4299"), 4299);
check("tutar yoksa null", toNumber("Beden seçiniz"), null);
check("boş", toNumber(""), null);

// İki modül aynı metni aynı sayıya çevirmeli.
for (const text of [
  "1.299,90 TL",
  "5499 TL",
  "£1,299.00",
  "€18,00",
  "74.999,00 TL",
  "9.150 TL",
  "£7.00",
  "1899,90",
]) {
  check(
    `cart ile aynı: ${text}`,
    toNumber(text),
    Cart.extractNumberFromPrice(text),
  );
}

// Sayfadaki tutarla yapılandırılmış veriden gelen tutar biçim olarak farklı
// yazılsa da aynı sayıya düşmeli; karşılaştırma buna dayanıyor.
check(
  "biçim farkı eşleşiyor",
  structured.textContainsPrice("Fiyat: 5499 TL", toNumber("5.499,00 TL")),
  true,
);

check(
  "farklı tutar eşleşmiyor",
  structured.textContainsPrice("4299 TL", toNumber("5.499,00 TL")),
  false,
);

// --- TR çekirdeğinin fiyat okuması ---
//
// cleanPrice() sayfadaki metinden ödenecek tutarı çıkarıyor. Nokta ondalığı
// DeFacto'da gerçek bir hataya yol açtı: "1699.99 TL" hiçbir kalıba uymadığı
// için yalnızca sondaki "99 TL" eşleşiyor ve sepete 99 TL yazılıyordu.
function loadTrCore() {
  const context = vm.createContext({
    console,
    window: {
      location: { hostname: "defacto.com.tr", href: "https://www.defacto.com.tr/x" },
      innerWidth: 1280,
      innerHeight: 900,
    },
    document: { querySelector: () => null, querySelectorAll: () => [], title: "" },
  });

  for (const file of ["shared/structured-data.js", "content/shared/core.js"]) {
    vm.runInContext(readFileSync(join(REPO_ROOT, file), "utf8"), context, { filename: file });
  }

  return context;
}

const trCore = loadTrCore();

check("nokta ondalık", trCore.cleanPrice("1699.99 TL"), "1699.99 TL");
check("nokta ondalık, boşluksuz", trCore.cleanPrice("1699.99TL"), "1699.99 TL");
check("virgül ondalık", trCore.cleanPrice("1.699,99 TL"), "1.699,99 TL");
check("binlik nokta", trCore.cleanPrice("1.299 TL"), "1.299 TL");
check("sembol önde", trCore.cleanPrice("₺1.299"), "1.299 TL");
check("sepette indirim", trCore.cleanPrice("Sepette 11.058,99 TL"), "11.058,99 TL");
check("tam sayı", trCore.cleanPrice("99 TL"), "99 TL");
// Para birimi olmayan ondalık fiyat değil; yıldız puanı sepete yazılmamalı.
check("puan fiyat değil", trCore.cleanPrice("4.5 yıldız"), null);

summary();
