// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.

// Gymshark (Shopify) sayfası yapısal veriyi ProductGroup olarak basar; asıl
// ürünler hasVariant içinde beden beden durur. Paylaşılan findProductInJsonLd()
// ilk Product'ı döndürdüğü için bedeni tükenmiş ilk varyanta denk gelebilir,
// bu yüzden grup burada ayrıca okunur.
function readGymsharkProductGroup() {
  const scripts = document.querySelectorAll("script[type='application/ld+json']");

  for (const script of scripts) {
    let data = null;

    try {
      data = JSON.parse(script.textContent);
    } catch {
      continue;
    }

    if (!data) continue;

    const group =
      data["@type"] === "ProductGroup"
        ? data
        : Array.isArray(data)
          ? data.find((item) => item?.["@type"] === "ProductGroup")
          : null;

    if (group) return group;
  }

  return null;
}

function getGymsharkVariantOffer(variant) {
  return Array.isArray(variant?.offers) ? variant.offers[0] : variant?.offers;
}

// Grup görseli dizi olarak gelir. JSON-LD tercih edilir çünkü og:image bu sitede
// http:// ile yazılıyor.
function getGymsharkGroupImage(group) {
  const image = group?.image;

  if (Array.isArray(image)) return image[0] || "";
  if (typeof image === "string") return image;

  return image?.url || "";
}

function parseGymsharkUk() {
  const group = readGymsharkProductGroup();
  const variants = Array.isArray(group?.hasVariant) ? group.hasVariant : [];

  const prices = variants
    .map((variant) => Number(getGymsharkVariantOffer(variant)?.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  // Bedenler aynı fiyatta olur; farklı olursa sepette en düşüğü göstermek
  // yanıltmaz, çünkü o fiyata alınabilen bir varyant gerçekten vardır.
  const groupPrice = prices.length > 0 ? Math.min(...prices) : null;

  // Bir beden bile stoktaysa ürün alınabilir. İlk varyanta bakmak yanlış olur:
  // sık sık XS tükenmiş olur ve ürün satışta sayılmaz.
  const stockAvailable =
    variants.length > 0
      ? variants.some(
          (variant) =>
            /InStock/i.test(getGymsharkVariantOffer(variant)?.availability || ""),
        )
      : null;

  const image =
    getGymsharkGroupImage(group) ||
    findImageBySelectors([
      "[data-testid*='product-image']",
      "[data-testid*='gallery']",
      "[class*='ProductGallery']",
      "main picture",
      "main img",
      "img[src*='cdn.shopify.com']",
    ]) ||
    getAttr("meta[property='og:image']", "content");

  return {
    site: "Gymshark",
    // og:title renk bilgisini de taşır ("... - Sets Red"); h1 yalnızca model adını
    // verdiği için aynı ürünün iki rengi sepette ayırt edilemez hale gelir.
    title:
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(group?.name) ||
      cleanText(getText("h1")),
    price:
      formatGbpCurrencyFromNumber(groupPrice) ||
      // Sayfadaki görünür fiyat client-side render edilir, bu yüzden ikinci sırada.
      cleanPrice(getText("[data-testid='pdp-totalValue-read']")),
    image,
    stockAvailable,
    // Jenerik fiyat taraması bu sayfada "Bunları da beğenebilirsin" kartlarındaki
    // product-current-price değerlerini veya £4.99 kargo ücretini yakalayabiliyor;
    // yanlış fiyat, fiyatsız üründen kötüdür.
    preventPriceFallback: true,
    url: window.location.href,
  };
}
