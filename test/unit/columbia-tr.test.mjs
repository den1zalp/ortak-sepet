// content/parsers/columbia-tr.js — ürün verisi __NEXT_DATA__'dan okunuyor.
//
// Bu mağazanın sayfasında h1, JSON-LD ve og: etiketi yok, sınıf adları da
// derlemede üretiliyor; tek sağlam kaynak Next.js'in gömdüğü JSON. Tarayıcı
// gerekmiyor: modül node:vm içinde, script etiketini döndüren küçük bir
// document taklidiyle çalıştırılıyor.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { checkEqual: check, summary } = createChecker();

function parseWith(nextData) {
  const context = vm.createContext({
    console,
    JSON,
    document: {
      getElementById: (id) =>
        id === "__NEXT_DATA__" && nextData
          ? { textContent: JSON.stringify(nextData) }
          : null,
      querySelector: () => null,
      querySelectorAll: () => [],
      title: "Columbia Türkiye Online Shop",
    },
    window: {
      location: {
        href: "https://www.columbia.com.tr/hazar-mavisi-hikebound-ii-insulated-erkek-mont-p-60350",
        hostname: "www.columbia.com.tr",
      },
      innerWidth: 1280,
      innerHeight: 900,
    },
  });

  for (const file of [
    "shared/structured-data.js",
    "content/shared/core.js",
    "content/parsers/columbia-tr.js",
  ]) {
    vm.runInContext(readFileSync(join(REPO_ROOT, file), "utf8"), context, { filename: file });
  }

  return context.parseColumbiaTr();
}

const product = {
  productName: "Hikebound II Insulated Erkek Mont",
  price: {
    oldPrice: 24999.9,
    newPrice: 24999.9,
    currencySymbol: "TL",
    currencyCode: "TRY",
  },
  pictures: [
    {
      cdnDomainName: "https://img-phantomcolumbia.mncdn.com/",
      filePath: "img/assets/base/originals/mont.jpg",
    },
  ],
  variants: [
    { specName: "size", specValueName: "S", quantity: 26 },
    { specName: "size", specValueName: "M", quantity: 40 },
    // Aynı beden başka renk varyantında tekrar ediyor.
    { specName: "size", specValueName: "M", quantity: 12 },
    // Stoğu biten beden listeye girmemeli.
    { specName: "size", specValueName: "L", quantity: 0 },
    // Renk varyantı beden değil.
    { specName: "color", specValueName: "Hazar Mavisi", quantity: 5 },
  ],
  size: "S",
};

const read = parseWith({ props: { pageProps: { product } } });

check("site", read.site, "Columbia");
check("ürün adı", read.title, "Hikebound II Insulated Erkek Mont");
check("fiyat TL biçiminde", read.price, "24.999,90 TL");
check("para birimi", read.currency, "TRY");
check(
  "görsel adresi birleşti",
  read.image,
  "https://img-phantomcolumbia.mncdn.com/img/assets/base/originals/mont.jpg",
);
check("bedenler tekil ve stoklu", read.sizes.join(","), "S,M");

// Kullanıcının seçtiği beden değil, varyantın varsayılanı; sepete önceden
// seçilmiş gibi yazılmamalı.
check("beden önceden seçilmiyor", read.size, undefined);

// İndirimli üründe ödenecek tutar newPrice.
const discounted = parseWith({
  props: {
    pageProps: {
      product: {
        ...product,
        price: { oldPrice: 24999.9, newPrice: 8999.96, currencyCode: "TRY" },
      },
    },
  },
});

check("indirimli tutar", discounted.price, "8.999,96 TL");

// Veri yoksa alanlar boş bırakılıyor ve jenerik okumaya düşülüyor; yanlış tutar
// yazmaktansa eksik yazmak doğru.
const empty = parseWith(null);

check("veri yokken yalnızca site", empty.site, "Columbia");
check("veri yokken fiyat yok", empty.price, undefined);

// Kategori sayfasında __NEXT_DATA__ var ama ürün yok.
const category = parseWith({ props: { pageProps: {} } });

check("ürün yokken fiyat yok", category.price, undefined);

summary();
