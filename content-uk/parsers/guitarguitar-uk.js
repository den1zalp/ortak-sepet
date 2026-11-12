// Ortak Sepet - guitarguitar UK parser.
//
// Ürünün JSON-LD'si (@graph içinde Product) ödenecek tutarı veriyor (£799);
// sayfada yanında "RRP £899.00" ve "Save £100.00" da yazıyor. og:title
// "Buy the ..." diye başladığı için başlık da JSON-LD'den alınıyor.

function parseGuitarguitarUk() {
  const structured = parseJsonLdProduct();
  const price =
    (structured?.currency === "GBP" ? structured.price : null) ||
    cleanPrice(getText("p.product-price"));

  return {
    site: "guitarguitar",
    title: structured?.title || cleanText(getText("h1")),
    price,
    currency: price ? "GBP" : null,
    stockAvailable: getStructuredStockAvailable(),
    image: structured?.image || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    preventPriceFallback: true,
  };
}

// Ürün sayfası mı: fiyat kutusu ya da Product JSON-LD'si var mı.
function isGuitarguitarUkProductPage() {
  return Boolean(document.querySelector("p.product-price")) || Boolean(parseJsonLdProduct());
}

// Ödeme seçenekleri sayfayla birlikte geliyor, sonradan çizilmiyor; ürüne göre
// iki blok var:
//   .finance-option            "Pay Monthly — From £14.78 a month" (kredi)
//   .klarna-and-clearpay-info  "Make up to 4 payments of £199.75"
// Ucuz ürünlerde (£49'luk amfi, £7.99'luk tel) ikisi de yok. Klarna ve
// Clearpay sayfanın altındaki bağlantılarda her üründe geçiyor; ürüne dair bir
// şey söylemiyor.
function findGuitarguitarUkFinanceInfo() {
  const monthly = Array.from(document.querySelectorAll(".finance-option"))
    .map((element) => cleanText(element.textContent))
    .map((text) => text.match(/from\s*£\s?[\d.,]+\s*a month/i)?.[0])
    .find(Boolean);

  if (monthly) {
    return {
      installmentAvailable: true,
      installmentText: `Pay monthly ${monthly}`,
    };
  }

  const split = cleanText(getText(".klarna-and-clearpay-info")).match(
    /up to\s*(\d+)\s*payments? of\s*£\s?[\d.,]+/i,
  );

  if (split && Number(split[1]) >= 2) {
    return {
      installmentAvailable: true,
      installmentText: `Klarna / Clearpay: ${split[0]}`,
    };
  }

  if (isGuitarguitarUkProductPage()) {
    return {
      installmentAvailable: false,
      installmentText: "No finance offered for this product",
    };
  }

  return {
    installmentAvailable: false,
    installmentText: "Finance information not found",
  };
}

// Ürüne özel teslimat satırı: "FREE Delivery Tomorrow" ya da "Delivery
// Tomorrow". Sayfanın üstündeki "Free Next Day Delivery" bandı her üründe var
// ve "on orders over £50" koşuluna bağlı. Ücretli kargonun tutarı ürün
// sayfasında yazmıyor.
function findGuitarguitarUkShippingInfo() {
  const message =
    cleanText(getText(".qa-product-page-delivery-message")) ||
    cleanText(getText(".sticky-delivery-info h6"));

  if (!message) return null;

  if (/\bfree\b/i.test(message)) {
    return {
      shippingAvailable: true,
      freeShipping: true,
      shippingText: /tomorrow|next day/i.test(message) ? "Free next day delivery" : "Free delivery",
      shippingSource: "product-page",
      shippingConfidence: "explicit",
    };
  }

  return {
    shippingAvailable: false,
    freeShipping: false,
    shippingText: "Delivery calculated at checkout",
    shippingSource: "checkout",
    shippingConfidence: "conditional",
  };
}
