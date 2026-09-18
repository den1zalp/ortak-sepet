// Under Armour UK ve Sports Direct parserları: doğru varyantı seçiyorlar mı?
//
// Bu iki mağaza bot korumasının arkasında ve canlı testlerden dışlanmış
// (Akamai "Client Challenge" / PerimeterX), yani başka hiçbir test onlara
// dokunmuyor. İkisinin de en kırılgan yanı aynı: JSON-LD tek bir ProductGroup
// basıyor, renkler "hasVariant" içinde ayrı Product'lar ve fiyatları farklı.
// Yanlış varyant seçmek sepete başka rengin fiyatını yazar.
//
// Sayfa yapıları kullanıcının tarayıcısından alınan gerçek dökümlerden
// alındı; buradaki JSON-LD parçaları o dökümlerin kısaltılmış hâli.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "manifest.json"), "utf8"));

// Seçiciye göre yanıt veren küçük bir sahte DOM. Parserlar yalnızca
// querySelector/querySelectorAll, textContent ve getAttribute kullanıyor.
function createElement({ text = "", attributes = {}, children = {} } = {}) {
  return {
    textContent: text,
    getAttribute: (name) => attributes[name] ?? null,
    classList: { contains: () => false },
    closest: () => null,
    childNodes: [],
    querySelector: (selector) => children[selector] || null,
    querySelectorAll: (selector) => (children[selector] ? [children[selector]] : []),
  };
}

function createDocument({ jsonLd = "", nodes = {} } = {}) {
  const scripts = jsonLd ? [{ textContent: jsonLd }] : [];

  return {
    title: "",
    querySelector: (selector) => nodes[selector] || null,
    querySelectorAll: (selector) =>
      selector === "script[type='application/ld+json']" ? scripts : nodes[selector] ? [nodes[selector]] : [],
  };
}

function loadUkParsers({ documentStub, href, hash = "", search = "" }) {
  const files = manifest.content_scripts[1].js.filter((file) => file !== "content-uk.js");

  const windowStub = {
    location: { href, hash, search, hostname: new URL(href).hostname },
    innerWidth: 1280,
    innerHeight: 900,
    getComputedStyle: () => ({ display: "block", visibility: "visible", textDecorationLine: "none" }),
  };

  const context = vm.createContext({
    window: windowStub,
    document: documentStub,
    console,
    URL,
    URLSearchParams,
    chrome: { runtime: { onMessage: { addListener() {} } } },
  });
  context.globalThis = context;

  for (const file of files) {
    vm.runInContext(readFileSync(join(REPO_ROOT, file), "utf8"), context, { filename: file });
  }

  return context;
}

// --- Under Armour UK ---------------------------------------------------
//
// Seçili renk adresin sorgu parçasında ("dwvar_6009732_color=600" = Pembe).
// hasVariant'ın ilk ögesi siyah ve £21.97; ProductGroup'un kendi teklifi ise
// seçili rengin fiyatını (£17.97) veriyor.
{
  const jsonLd = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      name: "UA Tech Vent VHS Jacquard",
      offers: { "@type": "Offer", price: 17.97, priceCurrency: "GBP" },
      hasVariant: [
        {
          "@type": "Product",
          "@id": "https://www.underarmour.co.uk/en-gb/p/x/6009732.html?dwvar_6009732_color=001&dwvar_6009732_size=XS",
          color: "Black",
          offers: { "@type": "Offer", price: 21.97, priceCurrency: "GBP" },
        },
        {
          "@type": "Product",
          "@id": "https://www.underarmour.co.uk/en-gb/p/x/6009732.html?dwvar_6009732_color=600&dwvar_6009732_size=SM",
          color: "Pink",
          offers: { "@type": "Offer", price: 17.97, priceCurrency: "GBP" },
        },
      ],
    },
  ]);

  const priceBox = createElement({
    children: {
      "[data-testid='price-display-sales-price']": createElement({ text: "£17.97" }),
      "[data-testid='price-display-list-price']": createElement({ text: "£36" }),
    },
  });

  const context = loadUkParsers({
    href: "https://www.underarmour.co.uk/en-gb/p/x/6009732.html?dwvar_6009732_color=600",
    search: "?dwvar_6009732_color=600",
    documentStub: createDocument({
      jsonLd,
      nodes: {
        "#product-price": priceBox,
        "meta[property='og:title']": createElement({
          attributes: { content: "UA Tech Vent VHS Jacquard Men's Short Sleeve | Under Armour UK" },
        }),
      },
    }),
  });

  const product = context.parseUnderArmourUk();

  check("UA UK: ödenecek tutar", product.price === "£17.97", product.price);
  check("UA UK: üstü çizili tutarı almadı", product.price !== "£36", product.price);
  check("UA UK: seçili rengin adı başlıkta", /- Pink$/.test(product.title), product.title);
  check("UA UK: para birimi", product.currency === "GBP", product.currency);
}

// Fiyat kutusu henüz render edilmediyse ProductGroup'un teklifine düşüyor;
// ilk varyantın (£21.97) fiyatına değil.
{
  const jsonLd = JSON.stringify([
    {
      "@type": "ProductGroup",
      name: "UA Tech Vent VHS Jacquard",
      offers: { "@type": "Offer", price: 17.97, priceCurrency: "GBP" },
      hasVariant: [
        {
          "@type": "Product",
          "@id": "https://x/6009732.html?dwvar_6009732_color=001",
          color: "Black",
          offers: { price: 21.97, priceCurrency: "GBP" },
        },
      ],
    },
  ]);

  const context = loadUkParsers({
    href: "https://www.underarmour.co.uk/en-gb/p/x/6009732.html?dwvar_6009732_color=600",
    search: "?dwvar_6009732_color=600",
    documentStub: createDocument({ jsonLd, nodes: {} }),
  });

  const product = context.parseUnderArmourUk();

  check("UA UK: fiyat kutusu yokken grup teklifi", product.price === "£17.97", product.price);
}

// --- Sports Direct -----------------------------------------------------
//
// Seçili renk adresin çapasında ("#colcode=47804603"); aynı üründe renkler
// £15, £17 ve £18.99. Sayfada ayrıca üstü çizili £22.99 ve yalnızca üyelere
// geçerli "Frasers Plus" £11.50 tutarı var.
{
  const jsonLd = JSON.stringify([
    {
      "@type": "ProductGroup",
      name: "Nike Pro Shorts Junior Girls",
      hasVariant: [
        {
          "@type": "Product",
          sku: "47804615",
          color: "Arctic Green",
          offers: { price: 17, priceCurrency: "GBP" },
        },
        {
          "@type": "Product",
          sku: "47804603",
          color: "Black/White",
          offers: { price: 17, priceCurrency: "GBP" },
        },
        {
          "@type": "Product",
          sku: "47804602",
          color: "Grey Heather",
          offers: { price: 18.99, priceCurrency: "GBP" },
        },
      ],
    },
  ]);

  const priceBox = createElement({
    children: {
      "[class*='Price_isDiscounted']": createElement({ text: "£17.00" }),
    },
  });

  const context = loadUkParsers({
    href: "https://www.sportsdirect.com/nike-pro-shorts-junior-girls-478046#colcode=47804603",
    hash: "#colcode=47804603",
    documentStub: createDocument({
      jsonLd,
      nodes: {
        "[data-testid='price']": priceBox,
        h1: createElement({ text: "Nike Pro Shorts Junior Girls" }),
      },
    }),
  });

  const product = context.parseSportsDirect();

  check("Sports Direct: ödenecek tutar", product.price === "£17.00", product.price);
  check(
    "Sports Direct: çapadaki rengi seçti",
    /- Black\/White$/.test(product.title),
    product.title,
  );
}

// Fiyat kutusu yoksa çapadaki renge ait varyantın teklifi kullanılıyor —
// listedeki ilk varyantın değil.
{
  const jsonLd = JSON.stringify([
    {
      "@type": "ProductGroup",
      name: "Nike Pro Shorts Junior Girls",
      hasVariant: [
        { "@type": "Product", sku: "47804615", color: "Arctic Green", offers: { price: 17, priceCurrency: "GBP" } },
        { "@type": "Product", sku: "47804602", color: "Grey Heather", offers: { price: 18.99, priceCurrency: "GBP" } },
      ],
    },
  ]);

  const context = loadUkParsers({
    href: "https://www.sportsdirect.com/nike-pro-shorts-junior-girls-478046#colcode=47804602",
    hash: "#colcode=47804602",
    documentStub: createDocument({ jsonLd, nodes: {} }),
  });

  const product = context.parseSportsDirect();

  check("Sports Direct: fiyat kutusu yokken varyant teklifi", product.price === "£18.99", product.price);
  check(
    "Sports Direct: fiyat kutusu yokken renk",
    /- Grey Heather$/.test(product.title),
    product.title,
  );
}

summary();
