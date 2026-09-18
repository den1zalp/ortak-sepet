// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// sportsdirect.com bot korumasının arkasında (otomasyonlu tarayıcıya ürün
// ızgarasını vermiyor), bu yüzden canlı test edilemiyor; sayfa yapısı
// kullanıcının tarayıcısından alınan dökümle çıkarıldı.
//
// Üç ayrı tuzağı var:
//
// 1. JSON-LD bir ProductGroup basıyor ve renkler "hasVariant" içinde ayrı
//    Product'lar. Paylaşılan okuma ilk varyantı alıyor; oysa seçili renk
//    adresin çapasında yazılı ("…-478046#colcode=47804603") ve varyantların
//    fiyatı renkten renge değişiyor (aynı üründe 15 / 17 / 18,99 £).
// 2. Ödenecek tutarın yanında üstü çizili liste fiyatı var
//    ([data-testid='ticket-price'], £22.99) — alınmamalı.
// 3. Onların da altında "Frasers Plus" üyelik tutarı duruyor (£11.50); bu
//    yalnızca üyelik/kredi hesabı olanların ödediği fiyat, sepete o yazılmaz.
//    Fiyat kutusuyla sınırlı arama üçünü de ayırıyor.
function readSportsDirectGroup() {
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

// Seçili renk adresin çapasında: "#colcode=47804603" ve aynı değer varyantın
// sku'su. Eşleşme bulunamazsa ilk varyant yedek.
function findSportsDirectVariant(group) {
  const variants = Array.isArray(group?.hasVariant) ? group.hasVariant : [];
  if (variants.length === 0) return null;

  const colorCode = (window.location.hash.match(/colcode=(\w+)/i) || [])[1];

  return (
    variants.find((variant) => String(variant?.sku || "") === colorCode) || variants[0]
  );
}

function findSportsDirectPriceText() {
  const box = document.querySelector("[data-testid='price']");
  if (!box) return "";

  // İndirimli üründe ödenecek tutar kendi sınıfında; sınıf adı karma taşıyor
  // ("Price_isDiscounted__lHTCZ"), önek eşleşmesi kalıcı.
  const discounted = box.querySelector("[class*='Price_isDiscounted']");
  if (discounted) return cleanText(discounted.textContent);

  // İndirim yoksa tutar kutunun kendi metninde; içindeki üstü çizili
  // "ticket price" alt ögede kaldığı için metne karışmıyor.
  const ownText = cleanText(
    Array.from(box.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join(" "),
  );

  return ownText || cleanText(box.textContent);
}

function parseSportsDirect() {
  const group = readSportsDirectGroup();
  const variant = findSportsDirectVariant(group);
  const offer = Array.isArray(variant?.offers) ? variant.offers[0] : variant?.offers;

  const name =
    cleanText(getText("h1")) ||
    cleanText(group?.name) ||
    cleanText(getAttr("meta[property='og:title']", "content"));

  const color = cleanText(variant?.color);

  return {
    site: "Sports Direct",
    // Aynı modelin her rengi aynı adreste, yalnızca çapa değişiyor; renk
    // başlıkta olmazsa sepetteki satırlar ayırt edilemiyor.
    title:
      color && !name.toLowerCase().includes(color.toLowerCase())
        ? `${name} - ${color}`
        : name,
    price:
      cleanPrice(findSportsDirectPriceText()) ||
      formatStructuredPrice(offer?.price, offer?.priceCurrency || "GBP"),
    currency: "GBP",
    image:
      findImageBySelectors([
        "img[src*='cdn.media.amplience.net']",
        "main picture img",
      ]) ||
      cleanText(variant?.image) ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    // Sayfada kargo ve öneri kartlarının tutarları da var.
    preventPriceFallback: true,
  };
}
