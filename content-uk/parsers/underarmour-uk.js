// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// underarmour.co.uk Salesforce Commerce üzerinde. Kenar sunucusu otomasyonlu
// tarayıcıya "Client Challenge" döndüğü için bu parser geliştirme ortamından
// canlı koşulamadı; sayfanın yapısı kullanıcının tarayıcısından alınan dökümle
// çıkarıldı.
//
// Paylaşılan JSON-LD okuması burada **yanlış varyantı** veriyor: sayfa bir
// ProductGroup basıyor, asıl ürünler "hasVariant" içinde renk/beden başına
// duruyor ve findProductInJsonLd ilk Product'ı alıyor. Dökümdeki üründe o ilk
// varyant siyah/XS ve stokta değildi (£21.97) — sayfada seçili olan pembe ise
// £17.97. Bu yüzden grubun kendi teklifi okunuyor: ProductGroup'un
// "offers.price" alanı seçili rengin fiyatını veriyor.
//
// Görünür fiyat ise iki data-testid'de: "price-display-sales-price" ödenecek
// tutar, "price-display-list-price" üstü çizili liste fiyatı. Aynı testid'ler
// alttaki öneri kartlarında da var (orada "£15.97 - £32" gibi aralık yazıyor),
// bu yüzden arama ürünün fiyat kutusuyla sınırlı.
function readUnderArmourUkGroup() {
  for (const script of document.querySelectorAll("script[type='application/ld+json']")) {
    let data = null;

    try {
      data = JSON.parse(script.textContent);
    } catch {
      continue;
    }

    const nodes = Array.isArray(data) ? data : [data];
    const group = nodes.find((node) => node?.["@type"] === "ProductGroup");

    if (group) return group;
  }

  return null;
}

// Renk adresteki "dwvar_<ürün>_color" parametresinde; aynı değer varyantın
// @id'sinde de geçiyor. Aynı modelin her rengi ayrı sayfa olduğu için renksiz
// başlıkla sepetteki satırlar ayırt edilemiyor.
function findUnderArmourUkColor(group) {
  const params = new URLSearchParams(window.location.search);
  const colorKey = Array.from(params.keys()).find((key) => /_color$/i.test(key));
  const colorId = colorKey ? params.get(colorKey) : "";

  if (!colorId || !Array.isArray(group?.hasVariant)) return "";

  const variant = group.hasVariant.find((item) =>
    String(item?.["@id"] || "").includes(`color=${colorId}`),
  );

  return cleanText(variant?.color);
}

function findUnderArmourUkPriceText() {
  const box = document.querySelector("#product-price");
  if (!box) return "";

  const node =
    box.querySelector("[data-testid='price-display-sales-price']") ||
    box.querySelector("[data-testid='price-display-list-price']");

  return cleanText(node?.textContent);
}

function parseUnderArmourUk() {
  const group = readUnderArmourUkGroup();
  const color = findUnderArmourUkColor(group);

  // h1 iki satırı boşluksuz birleştiriyor ("UA Tech™ Vent VHS JacquardMen's
  // Short Sleeve - Fast-Drying"); og:title aynı adı düzgün yazıyor.
  const name =
    cleanText(getAttr("meta[property='og:title']", "content")).replace(
      /\s*\|\s*Under Armour.*$/i,
      "",
    ) ||
    cleanText(group?.alternateName) ||
    cleanText(group?.name) ||
    cleanText(getText("h1"));

  const offer = Array.isArray(group?.offers) ? group.offers[0] : group?.offers;

  return {
    site: "Under Armour UK",
    title:
      color && !name.toLowerCase().includes(color.toLowerCase())
        ? `${name} - ${color}`
        : name,
    price:
      cleanPrice(findUnderArmourUkPriceText()) ||
      formatStructuredPrice(offer?.price, offer?.priceCurrency || "GBP"),
    currency: "GBP",
    // og:image 400x500 sepet küçük görseli; sayfadaki galeri 800x1000 veriyor.
    image:
      findImageBySelectors([
        "img[src*='underarmour.scene7.com']",
        "main picture img",
      ]) || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    // Öneri kartlarındaki fiyat aralıklarına düşmemeli.
    preventPriceFallback: true,
  };
}
