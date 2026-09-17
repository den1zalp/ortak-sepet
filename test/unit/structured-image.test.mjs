// shared/structured-data.js içindeki JSON-LD görsel seçimi.
//
// schema.org görseli dört ayrı biçimde geliyor ve sepetteki ürün görselinin
// doğru çıkması buna bağlı. İç içe dizi biçimi LTB'de gerçek bir kırık görsele
// yol açtı: image[0] yine bir dizi olduğu için adres alanına bütün galeri
// virgülle birleşmiş tek metin olarak yazılıyor ve o adres 404 veriyordu.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { checkEqual: check, summary } = createChecker();

function readProduct(product) {
  const context = vm.createContext({
    console,
    document: {
      querySelectorAll: (selector) =>
        selector.includes("ld+json")
          ? [{ textContent: JSON.stringify(product) }]
          : [],
      querySelector: () => null,
      title: "",
    },
    window: { location: { href: "https://example.com/p", hostname: "example.com" } },
  });

  vm.runInContext(
    "function cleanText(t){ return t ? String(t).replace(/\\s+/g,' ').trim() : ''; }" +
      "function getSiteName(){ return 'Test'; }" +
      "function cleanPrice(v){ return v || null; }" +
      "function formatStructuredPrice(v){ return v ? String(v) : null; }",
    context,
  );

  vm.runInContext(
    readFileSync(join(REPO_ROOT, "shared/structured-data.js"), "utf8"),
    context,
    { filename: "shared/structured-data.js" },
  );

  return context.parseJsonLdProduct();
}

const base = { "@type": "Product", name: "Ceket", offers: { price: "2999.99", priceCurrency: "TRY" } };

check(
  "düz adres",
  readProduct({ ...base, image: "https://cdn.example.com/1.jpg" }).image,
  "https://cdn.example.com/1.jpg",
);

check(
  "adres dizisi",
  readProduct({ ...base, image: ["https://cdn.example.com/1.jpg", "https://cdn.example.com/2.jpg"] }).image,
  "https://cdn.example.com/1.jpg",
);

check(
  "iç içe dizi (LTB)",
  readProduct({ ...base, image: [["https://cdn.example.com/1.jpg", "https://cdn.example.com/2.jpg"]] }).image,
  "https://cdn.example.com/1.jpg",
);

check(
  "url taşıyan nesne",
  readProduct({ ...base, image: { url: "https://cdn.example.com/1.jpg" } }).image,
  "https://cdn.example.com/1.jpg",
);

check(
  "nesne dizisi",
  readProduct({ ...base, image: [{ url: "https://cdn.example.com/1.jpg" }] }).image,
  "https://cdn.example.com/1.jpg",
);

// Champion'ın JSON-LD'si şemalı ama host'suz bir adres basıyor; o adres hiçbir
// yere çıkmıyor ve kullanılırsa sepette kırık görsel oluyor.
check(
  "bozuk adres kullanılmıyor",
  readProduct({ ...base, image: "https:files/CHPEU_806020_KK001_Full.jpg" }).image,
  "",
);

check(
  "bozuk adresten sonra geçerlisi",
  readProduct({ ...base, image: ["https:files/a.jpg", "https://cdn.example.com/1.jpg"] }).image,
  "https://cdn.example.com/1.jpg",
);

check(
  "protokolsüz adres kabul",
  readProduct({ ...base, image: "//cdn.example.com/1.jpg" }).image,
  "//cdn.example.com/1.jpg",
);

check("görsel yoksa boş", readProduct(base).image, "");
check("boş dizi", readProduct({ ...base, image: [] }).image, "");

summary();
