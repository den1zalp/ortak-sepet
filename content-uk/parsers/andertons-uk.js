// Ortak Sepet - Andertons UK parser.
//
// andertons.co.uk bir BigCommerce mağazası. Ürünün JSON-LD'sindeki fiyat
// ödenecek tutar (£899); sayfada yanında üstü çizili liste fiyatı (£1,099) ve
// "Save £200.00!" de yazıyor, meta'daki og:price:standard_amount da liste
// fiyatı. Fiyat JSON-LD'den, o yoksa yalnızca [data-testid='pdp-price']
// öğesinden okunuyor; genel taramaya düşülmüyor.

function parseAndertonsUk() {
  const structured = parseJsonLdProduct();
  const price =
    (structured?.currency === "GBP" ? structured.price : null) ||
    cleanPrice(getText("[data-testid='pdp-price']"));

  return {
    site: "Andertons",
    title: structured?.title || cleanText(getText("h1")),
    price,
    currency: price ? "GBP" : null,
    stockAvailable: getStructuredStockAvailable(),
    image: structured?.image || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    preventPriceFallback: true,
  };
}

// Kargo fiyatın altındaki kutuda, ürüne göre: "FREE UK Delivery" ya da
// "UK Delivery - From £5.99" (Andertons £149 ve üstünü ücretsiz gönderiyor).
function findAndertonsUkShippingInfo() {
  const heading = Array.from(document.querySelectorAll("main h4, h4"))
    .map((element) => cleanText(element.textContent))
    .find((text) => /^(free\s+)?uk delivery\b/i.test(text));

  if (!heading) return null;

  if (/^free\b/i.test(heading)) {
    return {
      shippingAvailable: true,
      freeShipping: true,
      shippingText: "Free delivery",
      shippingSource: "product-page",
      shippingConfidence: "explicit",
    };
  }

  const fee = cleanPrice(heading.match(/£\s?[\d.,]+/)?.[0]);

  if (fee) {
    return {
      shippingAvailable: true,
      freeShipping: false,
      shippingText: /\bfrom\b/i.test(heading) ? `Delivery from ${fee}` : `Delivery ${fee}`,
      shippingSource: "product-page",
      shippingConfidence: "explicit",
    };
  }

  return null;
}

// Finance teklifini fiyatın altındaki Imega hesaplayıcısı gösteriyor: sayfadaki
// fiyatı kendi sunucusuna soruyor ve sonucu #imm-placeholder içine eklediği
// src'siz (sayfayla aynı kökenli, okunabilen) bir iframe'e yazıyor. Uygun
// üründe "Finance from £13.27 per month" yazıyor ve görünüyor; uygun olmayanda
// tutarsız şablon ("Finance from per") kalıyor ve gizli. Iframe tek seferde
// nihai içeriğiyle ekleniyor, yani iframe varsa karar verilmiş demek.
//
// Site genelindeki SVG ikon kütüphanesinde bir Klarna logosu var; ürüne dair
// bir şey söylemiyor (bkz. core.js → getPaymentRelatedText).
function getAndertonsUkFinanceFrameText() {
  const frame = document.querySelector("#imm-placeholder iframe");
  if (!frame) return null;

  try {
    return cleanText(frame.contentDocument?.body?.textContent || "");
  } catch (_) {
    return null;
  }
}

function findAndertonsUkFinanceInfo() {
  const text = getAndertonsUkFinanceFrameText();

  if (text === null || text === "") {
    return {
      installmentAvailable: false,
      installmentText: "Finance information not found",
    };
  }

  const monthly = text.match(/£\s?[\d.,]+\s*per month/i)?.[0];

  if (monthly) {
    return {
      installmentAvailable: true,
      installmentText: `Finance from ${monthly.replace(/\s+/g, " ")}`,
    };
  }

  return {
    installmentAvailable: false,
    installmentText: "No finance offered for this product",
  };
}

// Iframe sayfa açıldıktan yarım saniye kadar sonra geliyor; yer (#imm-placeholder)
// sayfadaysa ve iframe henüz dolmadıysa en fazla maxWaitMs bekleniyor. Iframe'in
// içi ayrı bir belge, oraya yazılan metin sayfadaki MutationObserver'a
// görünmüyor; o yüzden kısa aralıklarla da bakılıyor.
function waitForAndertonsUkFinanceFrame(maxWaitMs = 4000) {
  const ready = () => Boolean(getAndertonsUkFinanceFrameText());

  if (ready() || !document.querySelector("#imm-placeholder")) return Promise.resolve();

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (ready() || Date.now() - startedAt >= maxWaitMs) {
        clearInterval(timer);
        resolve();
      }
    }, 200);
  });
}
