// Ortak Sepet - Columbia Türkiye.
//
// Bu mağaza ortak platform parser'ıyla okunamıyor, çünkü sayfada tutunacak
// hiçbir işaret yok: `h1` yok, JSON-LD yok, `og:` etiketleri yok, sınıf adları
// da MUI/emotion tarafından derlemede üretiliyor ("muirtl-1juxlzk") ve her
// sürümde değişiyor. Jenerik okuma bu yüzden ürün adı yerine sayfa başlığını
// ("Columbia Türkiye Online Shop") sepete yazıyordu.
//
// Sağlam kaynak Next.js'in sayfaya gömdüğü `__NEXT_DATA__`: ürün adı, ödenecek
// tutar, görsel ve bedenler orada duruyor ve sayfanın ilk HTML'iyle geliyor —
// yani fiyat için render beklemek de gerekmiyor.
//
// Sayfa ayrıca Insider öneri widget'ları basıyor ve onlar da başka ürünlerin
// fiyatlarını gösteriyor ("%60 İndirim ... 8.999,96 TL"); DOM'dan fiyat aramak
// bu yüzden yanlış tutarı verebiliyordu.
function readColumbiaTrProduct() {
  const node = document.getElementById("__NEXT_DATA__");

  if (!node) return null;

  try {
    return JSON.parse(node.textContent)?.props?.pageProps?.product || null;
  } catch {
    return null;
  }
}

// Görsel adresi ikiye bölünmüş geliyor: CDN alan adı ve dosya yolu.
function findColumbiaTrImage(product) {
  for (const picture of product.pictures || []) {
    const domain = cleanText(picture?.cdnDomainName);
    const path = cleanText(picture?.filePath);

    if (domain && path) {
      return `${domain.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
    }
  }

  return "";
}

// Bedenler varyant listesinde; aynı beden birden fazla varyantta (renk, depo)
// tekrar ettiği için tekilleştiriliyor ve stoğu bitenler atlanıyor.
function findColumbiaTrSizes(product) {
  const sizes = [];

  for (const variant of product.variants || []) {
    if (String(variant?.specName || "").toLowerCase() !== "size") continue;
    if (Number(variant?.quantity) <= 0) continue;

    const name = cleanText(variant?.specValueName);

    if (name && !sizes.includes(name)) sizes.push(name);
  }

  return sizes;
}

function parseColumbiaTr() {
  const product = readColumbiaTrProduct();

  // Veri bulunamazsa alan boş bırakılıyor; normalizeProduct jenerik okumayla
  // dolduruyor. Yanlış bir tutar yazmaktansa eksik yazmak doğru.
  if (!product) return { site: "Columbia" };

  const price = product.price || [product.prices].flat().filter(Boolean)[0] || null;

  // newPrice ödenecek tutar, oldPrice indirimsiz liste fiyatı; indirim yokken
  // ikisi aynı geliyor.
  const amount = price?.newPrice ?? price?.oldPrice ?? null;

  return {
    site: "Columbia",
    title: cleanText(product.productName),
    price: formatStructuredPrice(amount, price?.currencyCode || "TRY"),
    currency: price?.currencyCode || null,
    image: findColumbiaTrImage(product),
    sizes: findColumbiaTrSizes(product),
    url: window.location.href,
  };
}
