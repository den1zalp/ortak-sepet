// Ortak Sepet - TR mağazaları için ortak parser.
//
// Bu dosya tek bir siteye ait değil: registry'deki pek çok kayıt buradaki
// parsePlatformProduct()'ı kendi ayarlarıyla çağırıyor. Sebebi şu: eklenen
// mağazaların hemen hepsi ürün sayfasında schema.org Product verisi
// yayımlıyor (Akinon, Ticimax, SFCC, Shopify, T-Soft ve kendi altyapısını
// yazanların çoğu). O veri varken siteye özel seçici yazmak, aynı işi kırılgan
// biçimde tekrar yapmak olurdu — sınıf adları her tasarım değişikliğinde
// değişiyor, JSON-LD değişmiyor.
//
// Fiyat sırası bilinçli olarak "önce yapılandırılmış veri":
// indirimli üründe sayfada hem ödenecek tutar hem üstü çizili liste fiyatı
// duruyor ve seçiciyle yanlış olanı almak bu depoda defalarca yaşanmış bir
// hata. offers.price ise ödenecek tutarı veriyor. Yapılandırılmış veri
// yoksa/okunamıyorsa siteye verilen seçicilere, o da yoksa normalizeProduct'ın
// jenerik taramasına düşülüyor.
//
// Siteye özel gerçek bir mantık gerektiğinde (geç render eden fiyat, kendi
// görsel kuralı, yanlış JSON-LD) o site buradan çıkıp kendi dosyasına taşınır;
// zippo-tr.js ve jeanslab.js böyle dosyalar.

// Altyapıya göre fiyat seçicileri. Bunlar yalnızca yedek: yapılandırılmış veri
// okunabildiğinde hiç çalışmıyorlar. Her listede önce "ödenecek tutar" anlamına
// gelen sınıflar var, üstü çizili liste fiyatını veren genel [class*='price']
// en sonda; sıralama indirimli üründe yanlış tutarı almamak için böyle.
const TICIMAX_PRICE_SELECTORS = [
  ".spanFiyat",
  ".indirimliFiyat",
  ".urunFiyat .fiyat",
  ".product-price .price",
  "[id*='SepetFiyat']",
  "[class*='discountPrice']",
];

const TSOFT_PRICE_SELECTORS = [
  ".product-price .price-value",
  "#product-price",
  ".discount-price",
  ".product-price",
];

const AKINON_PRICE_SELECTORS = [
  "[data-testid='price']",
  "[class*='ProductPrice__price']",
  "[class*='product-price'] [class*='current']",
  ".price-tag",
  ".product-price",
];

const SFCC_PRICE_SELECTORS = [
  ".prices .sales .value",
  ".price .sales .value",
  ".product-price .sales",
  "[data-price]",
];

const SHOPIFY_PRICE_SELECTORS = [
  ".price__sale .price-item--sale",
  ".price-item--sale",
  ".product__price .money",
  ".price .money",
];

// Yapılandırılmış veriden ödenecek tutarı çıkarır. parseJsonLdProduct() tek
// katmanlı offers bekliyor; findStructuredOffer() iç içe dizileri ve
// priceSpecification'ı da okuduğu için ikisi birlikte deneniyor.
function findPlatformStructuredPrice(structured) {
  if (structured?.price) return { price: structured.price, currency: structured.currency };

  const offer = findStructuredOffer();

  if (!offer) return { price: null, currency: null };

  return {
    price: formatStructuredPrice(offer.price, offer.currency),
    currency: offer.currency || null,
  };
}

// Sayfadaki başlıklardan ürün adını seçer.
//
// "İlk h1'i al" yetmiyor: Pandora'nın sayfasında iki h1 var ve ilki logo, yani
// sepete ürün adı yerine "Pandora" yazılıyordu. Yapılandırılmış veride ürün adı
// varsa ona en çok benzeyen başlık seçiliyor; hiçbiri benzemiyorsa (başlıklar
// logo ya da menüyse) doğrudan yapılandırılmış ad kullanılıyor.
//
// Başlık, yapılandırılmış adın kısaltılmışı olabiliyor ve o hâliyle daha
// okunaklı; bu yüzden yeterince uzun olduğu sürece başlık tercih ediliyor
// (Supplementler'in JSON-LD adı sonunda tire taşıyor).
function pickPlatformTitle(structuredName, titleSelectors) {
  const headings = [];

  for (const selector of [...titleSelectors, "h1"]) {
    for (const element of document.querySelectorAll(selector)) {
      const text = cleanText(element.textContent);
      if (text) headings.push(text);
    }
  }

  const normalize = (text) => cleanText(text).toLocaleLowerCase("tr-TR");
  const name = cleanText(structuredName);

  if (name) {
    const normalizedName = normalize(name);

    // Görünen başlık yapılandırılmış addan daha zengin olabiliyor: Champion'da
    // JSON-LD "Short Sleeve T-shirt" derken sayfada "Reverse Weave Core Short
    // Sleeve T-shirt" yazıyor ve sepete kısa ad düşüyordu. Adı içeren başlık
    // varsa o kazanır.
    const richer = headings.find((heading) => normalize(heading).includes(normalizedName));

    if (richer) return richer;

    // Ya da tersi: başlık adın kısaltılmışı ve daha okunaklı olabiliyor
    // (Supplementler'in JSON-LD adı sonunda tire taşıyor).
    const matching = headings.find(
      (heading) =>
        normalizedName.includes(normalize(heading)) &&
        heading.length >= name.length * 0.6,
    );

    return matching || name;
  }

  return headings[0] || "";
}

function parsePlatformProduct(options = {}) {
  const {
    site,
    titleSelectors = [],
    priceSelectors = [],
    imageOptions = null,
    preventPriceFallback = false,
  } = options;

  const structured = parseJsonLdProduct();
  const structuredPrice = findPlatformStructuredPrice(structured);

  const title =
    pickPlatformTitle(structured?.title, titleSelectors) ||
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    cleanText(document.title);

  // Yapılandırılmış veri her zaman ödenecek tutarı vermiyor: bazı mağazalar
  // oraya liste fiyatını yazıyor ve sayfada o tutarı üstü çizili gösteriyor.
  // Öyleyse sayfadan okumaya düşülüyor.
  const structuredIsStruck =
    Boolean(structuredPrice.price) && isStruckThroughPrice(structuredPrice.price);

  const domPrice = priceSelectors.length
    ? cleanPrice(getFirstTextFromAll(priceSelectors))
    : null;

  const price = structuredIsStruck
    ? cleanPrice(findSalePriceNearStruckPrice(structuredPrice.price)) ||
      domPrice ||
      cleanPrice(findMainPrice()) ||
      structuredPrice.price
    : structuredPrice.price || domPrice;

  // Para birimi yalnızca fiyat da yapılandırılmış veriden geldiyse ona aittir;
  // sayfadan okunan tutarın para birimini cleanPrice zaten metinde taşıyor.
  const currency = price && price === structuredPrice.price ? structuredPrice.currency : null;

  // Önce yapılandırılmış veri, sonra og:image: sayfayı tarayıp en büyük görseli
  // seçmek kampanya afişini ürün sanabiliyor. İkisi de yoksa tarama son çare —
  // LC Waikiki'de ikisi de bulunmadığı için sepette görsel hiç çıkmıyordu.
  // og:image logo olabiliyor (Mavi); öyleyse taramaya düşülüyor ve logo ancak
  // tarama da bir şey bulamazsa kullanılıyor.
  const metaImage = getAttr("meta[property='og:image']", "content");
  const scanImage = () =>
    findProductImage(imageOptions || { preferLeftSide: true, minWidth: 180, minHeight: 180 });

  const image =
    structured?.image ||
    (looksLikeLogoImage(metaImage) ? scanImage() || metaImage : metaImage || scanImage());

  return {
    site,
    title,
    price: price || null,
    currency: currency || null,
    image,
    url: window.location.href,
    preventPriceFallback,
  };
}

// Inditex mağazaları (Oysho, Pull&Bear, Stradivarius) Zara ve Bershka ile aynı
// altyapıda: ürün verisi sayfaya JavaScript'le geliyor, JSON-LD çoğu sayfada
// yok ve fiyat düğümünün sınıf adı sürekli değişiyor. Bu ailede fiyatı
// konumundan bulan findFashionMainPrice() çalışıyor — zara.js'te de aynısı.
function parseInditexProduct(site) {
  const structured = parseJsonLdProduct();
  const structuredPrice = findPlatformStructuredPrice(structured);

  const mainPrice = findFashionMainPrice({
    titleSelectors: ["h1", "[data-qa-action='product-name']", "[class*='product-detail'] h1"],
    minLeftRatio: 0.45,
    maxLeftRatio: 0.95,
    maxDistanceBelowTitle: 520,
  });

  return {
    site,
    title:
      getFirstTextFromAll([
        "h1",
        "[data-qa-action='product-name']",
        "[class*='product-name']",
        "[class*='ProductName']",
        "[class*='product-detail'] h1",
      ]) ||
      cleanText(structured?.title) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      structuredPrice.price ||
      cleanPrice(
        getFirstTextFromAll([
          "[class*='current-price-elem']",
          "[class*='price-current']",
          "[class*='money-amount__main']",
          "[class*='product-price'] [class*='amount']",
        ]),
      ) ||
      cleanPrice(mainPrice),
    currency: structuredPrice.price ? structuredPrice.currency : null,
    image:
      findProductImage({
        preferLeftSide: true,
        minWidth: 180,
        minHeight: 220,
        cdnRegex: /static|product|media|image|contents|itxst/i,
      }) || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}
