// Ortak Sepet - Moko Art Design (mokoartdesign.com)
//
// Shopify Dawn teması. Ürünlerin yüzlerce varyantı var (maden, ölçü, taş) ve
// fiyat seçili varyanta göre değişiyor. Sayfa TL tutarını İngilizce biçimde
// yazıyor ("4,550 TL"): virgül binlik ayracı. Türkçe okumada bu 4,55 TL
// olurdu. İndirimli üründe üstü çizili eski fiyat da aynı blokta duruyor.
//
// Bunların hiçbirine takılmamak için seçili varyantın kendi verisi okunuyor:
// tema onu <script data-selected-variant> içinde JSON olarak veriyor ve
// kullanıcı başka varyant seçince güncelliyor. Fiyat orada kuruş cinsinden
// düz sayı (455000 = 4.550,00 TL).
function findMokoSelectedVariant() {
  try {
    const script = document.querySelector("script[data-selected-variant]");
    return script ? JSON.parse(script.textContent || "null") : null;
  } catch {
    return null;
  }
}

// Varyant verisi yoksa ekranda görünen fiyat; binlik ayracı virgül olan
// biçim ("4,550 TL", "168,000.00 TL") burada sayıya çevriliyor.
function findMokoVisiblePrice() {
  const priceItems = Array.from(
    document.querySelectorAll("[id^='ProductInfo'] .price-item, .product__info-container .price-item"),
  ).filter((element) => element.offsetParent !== null && !element.closest("s"));

  for (const element of priceItems) {
    const digits = cleanText(element.textContent).replace(/[^\d.,]/g, "");

    if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(digits)) return digits.replace(/,/g, "");
    if (/^\d+(\.\d{1,2})?$/.test(digits)) return digits;
  }

  return null;
}

function findMokoImageUrl() {
  const image = document.querySelector(".product__media img");
  const url =
    image?.currentSrc ||
    image?.getAttribute("src") ||
    getAttr('meta[property="og:image"]', "content") ||
    "";

  // og:image http ile başlıyor; Shopify'ın genişlik eki de gereksiz.
  return url ? new URL(url, window.location.href).href.replace(/^http:/, "https:").replace(/&width=\d+/, "") : "";
}

function parseMokoArtDesign() {
  const variant = findMokoSelectedVariant();
  const variantPrice = Number.isFinite(variant?.price) ? (variant.price / 100).toFixed(2) : null;
  const rawPrice = variantPrice || findMokoVisiblePrice();
  const soldOut = variant?.available === false;
  // Mağaza TL satıyor; Shopify yurt dışı ziyaretçiye başka para biriminde
  // gösterirse sayfa bunu og:price:currency'de söylüyor.
  const currency = (getAttr('meta[property="og:price:currency"]', "content") || "TRY").toUpperCase();

  return {
    site: "Moko Art Design",
    // Sayfada ikinci bir h1 var ("%10 İNDİRİM" bandı); ürün adı ürün bloğunda.
    title:
      cleanText(getText(".product__title h1")) ||
      cleanText(document.title).replace(/\s*[–-]\s*Moko Art Design\s*$/i, ""),
    price: rawPrice ? formatStructuredPrice(rawPrice, currency) : null,
    currency,
    image: findMokoImageUrl(),
    url: window.location.href,
    priceReadStatus: soldOut ? "unavailable" : null,
    priceUnavailableReason: soldOut ? "noActiveOffer" : null,
    stockAvailable: soldOut ? false : null,
    // Sayfadaki diğer tutarlar (üstü çizili fiyat, öneri kartları) yanlış
    // fiyat olur; okunamazsa fiyatsız kalınıyor.
    preventPriceFallback: true,
  };
}
