// Ortak Sepet - Thomann UK parser.
//
// thomann.co.uk ürün sayfasında JSON-LD yok, fiyat schema.org microdata'da:
// [itemprop='offers'] içinde price ("118", "4.9") ve priceCurrency ("GBP").
// Fiyat kutusunda ödenecek tutarın yanında "30-days best price: £125" ve
// "B-Stock available from £109" de yazıyor; genel tarama bunlara takılmasın
// diye fiyat yalnızca teklifin kendisinden okunuyor.
//
// og:title başında kategori emojisi var ("🎧 beyerdynamic DT-770 Pro 80 Ohm"),
// başlık h1'den alınıyor. Genel görsel taraması bazı ürünlerde ürün videosunun
// YouTube kapağını seçiyordu; görsel galerinin ilk resminden alınıyor.

const THOMANN_UK_OFFER = "[itemprop='offers']";

function parseThomannUk() {
  const amount = getAttr(`${THOMANN_UK_OFFER} [itemprop='price']`, "content");
  const currency = String(
    getAttr(`${THOMANN_UK_OFFER} [itemprop='priceCurrency']`, "content") || "",
  ).toUpperCase();
  const availability = getAttr(`${THOMANN_UK_OFFER} [itemprop='availability']`, "href") || "";

  // Görünen tutar indirimli üründe .price__primary'de; indirimsizde doğrudan
  // .price içinde. İndirimli üründe .price "30-days best price" tutarını da
  // içerdiği için ona yalnızca .price__primary yoksa bakılıyor.
  const price =
    (currency === "GBP" ? formatGbpCurrencyFromNumber(amount) : null) ||
    cleanPrice(getText(`${THOMANN_UK_OFFER} .price__primary`)) ||
    (document.querySelector(`${THOMANN_UK_OFFER} .price__primary`)
      ? null
      : cleanPrice(getText(`${THOMANN_UK_OFFER} .price-wrapper .price`)));

  return {
    site: "Thomann UK",
    title: cleanText(getText("h1")),
    price,
    currency: price ? "GBP" : null,
    stockAvailable: /InStock|LimitedAvailability/i.test(availability)
      ? true
      : /OutOfStock|SoldOut|Discontinued/i.test(availability)
        ? false
        : null,
    image:
      toAbsoluteUrl(getAttr(".spotlight__item-image img[src*='/pics/bdb/']", "src")) ||
      toAbsoluteUrl(getAttr("img.spotlight__item-image[src*='/pics/bdb/']", "src")) ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    preventPriceFallback: true,
  };
}

// Kargo fiyat kutusunun altında yazıyor: "Standard delivery £8.90" ya da
// "Standard delivery Free" (Thomann £149 üstünü ücretsiz gönderiyor). Kutu
// sayfa script'iyle çiziliyor; çizilmeden okunursa aynı bilgi sayfadaki
// prod.deliveryNotice verisinden alınıyor.
function findThomannUkShippingInfo() {
  const boxText = cleanText(getText("#product_page_shipping_box"));
  let fee = boxText.match(/standard delivery\s+(free|£\s?[\d.,]+)/i)?.[1] || "";

  if (!fee) {
    const script = Array.from(document.querySelectorAll("script")).find((element) =>
      (element.textContent || "").includes("prod.deliveryNotice"),
    );
    const formatted = (script?.textContent || "").match(
      /"type"\s*:\s*"REGULAR"[^{}]*"prices"\s*:\s*\{\s*"primaryFormatted"\s*:\s*"([^"]+)"/,
    )?.[1];

    if (formatted) fee = formatted.replace(/\\u00a3/gi, "£");
  }

  if (/^free$/i.test(fee)) {
    return {
      shippingAvailable: true,
      freeShipping: true,
      shippingText: "Free delivery",
      shippingSource: "product-page",
      shippingConfidence: "explicit",
    };
  }

  const paidFee = cleanPrice(fee);

  if (paidFee) {
    return {
      shippingAvailable: true,
      freeShipping: false,
      shippingText: `Delivery ${paidFee}`,
      shippingSource: "product-page",
      shippingConfidence: "explicit",
    };
  }

  return null;
}

// Taksit (finance) teklifini sayfadaki PayPal kutusu gösteriyor ve teklif
// ürüne göre değişiyor: £75'lik üründe "Pay in 3 interest-free payments of
// £25.00", £55'likte yalnızca "Pay in 30 days". Kutunun metni PayPal'ın kendi
// iframe'inde, oraya erişilemiyor. Kutu çizildiğinde ise iframe ana sayfaya
// postMessage ile kararını bildiriyor ("offerType":"PAY_LATER_SHORT_TERM",
// "offerTerm":"3"); UK content script'leri document_start'ta yüklendiği için
// bu mesajlar baştan dinlenebiliyor. Eşiği fiyattan tahmin etmek yerine
// PayPal'ın o ürün için verdiği karar okunuyor.
//
// Klarna "Pay in 3" de var ama yalnızca sayfanın altındaki genel ödeme
// yöntemleri yazısında; ürüne dair bir şey söylemiyor.
let thomannUkPaypalOffer = null;
const thomannUkPaypalOfferWaiters = [];

function readThomannUkPaypalOffer(data) {
  let text = "";

  try {
    text = typeof data === "string" ? data : JSON.stringify(data);
  } catch (_) {
    return null;
  }

  // Türlerde rakam da var: "PAY_LATER_PAY_IN_1".
  const type = text?.match(/"offerType"\s*:\s*"([A-Z0-9_]+)"/)?.[1];
  if (!type) return null;

  const term = Number(text.match(/"offerTerm"\s*:\s*"?(\d+)/)?.[1]) || null;
  return { type, term };
}

if (/(^|\.)thomann\.co\.uk$/i.test(window.location.hostname)) {
  window.addEventListener("message", (event) => {
    if (!/^https:\/\/([a-z0-9-]+\.)*paypal\.com$/i.test(event.origin)) return;

    const offer = readThomannUkPaypalOffer(event.data);
    if (!offer) return;

    thomannUkPaypalOffer = offer;
    thomannUkPaypalOfferWaiters.splice(0).forEach((resolve) => resolve(offer));
  });
}

function findThomannUkFinanceInfo() {
  const offer = thomannUkPaypalOffer;

  if (!offer) {
    return {
      installmentAvailable: false,
      installmentText: "Finance information not found",
    };
  }

  if (/SHORT_TERM|LONG_TERM|INSTALLMENT/.test(offer.type) && (offer.term || 0) !== 1) {
    return {
      installmentAvailable: true,
      installmentText: offer.term
        ? `Pay in ${offer.term} with PayPal`
        : "PayPal instalments available",
      payLaterAvailable: false,
      payLaterText: "",
    };
  }

  // "Pay in 30 days" (PAY_LATER_PAY_IN_1): ödeme erteleniyor ama bölünmüyor.
  // Taksit sayılmıyor; sepette ayrı "Sonra öde" rozetiyle gösteriliyor.
  if (offer.type === "PAY_LATER_PAY_IN_1") {
    return {
      installmentAvailable: false,
      installmentText: "No instalments, pay in 30 days with PayPal",
      payLaterAvailable: true,
      payLaterText: "Pay in 30 days with PayPal",
    };
  }

  // Tanımadığımız bir teklif türü: bilinmiyor say, bilinen değeri ezmesin.
  return {
    installmentAvailable: false,
    installmentText: "Finance information not found",
  };
}

// PayPal kutusu sayfa açıldıktan birkaç saniye sonra çiziliyor. Kutunun yeri
// (.js-paypal-banner) sunucudan gelen HTML'de var; PayPal'ın kendi öğeleri
// ([data-pp-message], iframe) sonradan ekleniyor. Yer sayfadaysa ve karar
// henüz gelmediyse en fazla maxWaitMs bekleniyor; yoksa beklenecek bir şey yok.
function waitForThomannUkPaypalOffer(maxWaitMs = 4000) {
  if (thomannUkPaypalOffer || !document.querySelector(".js-paypal-banner, [data-pp-message]")) {
    return Promise.resolve(thomannUkPaypalOffer);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(thomannUkPaypalOffer), maxWaitMs);

    thomannUkPaypalOfferWaiters.push((offer) => {
      clearTimeout(timer);
      resolve(offer);
    });
  });
}
