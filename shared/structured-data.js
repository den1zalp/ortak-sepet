// Ortak Sepet - TR ve UK içerik script'lerinin ortak modülü.
//
// Buradaki hiçbir şey siteye ya da bölgeye bağlı değil: DOM'dan seçiciyle metin
// okumak, schema.org Product verisini bulmak, og:/product: meta etiketlerini
// okumak. İki tarafta da birebir aynı kopyalar duruyordu; birinde düzeltilen
// hata diğerinde kalıyordu.
//
// Bölgeye bağlı kısımlar burada değil, çağıran tarafın core.js'inde:
// getSiteName(), cleanPrice() ve formatStructuredPrice(). Hangi core yüklüyse
// onunkiler çalışır.

function getText(selector) {
  const element = document.querySelector(selector);
  return element ? element.textContent.trim() : "";
}

function getAttr(selector, attr) {
  const element = document.querySelector(selector);
  return element ? element.getAttribute(attr) || "" : "";
}

function isVisibleElement(element) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

// JSON-LD ve meta etiketleri fiyatı makine biçiminde verir ("1299.90") ve para
// birimini ayrı bir alanda söyler. Bu biçim görünür fiyat düzenimize uymadığı
// için cleanPrice onu okuyamıyordu; burada sayıyı doğrudan çevirip para
// birimini tahmin etmek yerine bildirilen değeri kullanıyoruz.
function parseStructuredPriceNumber(rawPrice) {
  if (rawPrice === null || rawPrice === undefined) return null;

  const text = String(rawPrice).trim();
  if (!text) return null;

  if (/^\d+(?:\.\d{1,2})?$/.test(text)) {
    const number = Number.parseFloat(text);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  return null;
}

// Product düğümü sayfanın her yerinde olabilir: dizinin içinde, @graph altında
// ya da başka bir düğümün alanında. Hepsine bakıyoruz.
function findProductInJsonLd(data) {
  if (!data) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findProductInJsonLd(item);
      if (found) return found;
    }
  }

  if (typeof data === "object") {
    const type = data["@type"];

    const isProduct =
      type === "Product" || (Array.isArray(type) && type.includes("Product"));

    if (isProduct) {
      return data;
    }

    if (data["@graph"]) {
      const foundInGraph = findProductInJsonLd(data["@graph"]);
      if (foundInGraph) return foundInGraph;
    }

    for (const key of Object.keys(data)) {
      if (typeof data[key] === "object") {
        const found = findProductInJsonLd(data[key]);
        if (found) return found;
      }
    }
  }

  return null;
}

// schema.org görseli dört ayrı biçimde geliyor: düz adres, adres dizisi,
// { url } nesnesi ya da iç içe dizi. Sonuncusu LTB'de sepete kırık görsel
// yazıyordu: image[0] yine bir dizi olduğu için adres alanına bütün galeri
// virgülle birleştirilmiş tek metin olarak düşüyor ve o adres 404 veriyordu.
// Mağazanın yapılandırılmış verisi bozuk adres de basabiliyor: Champion
// "https:files/CHPEU_806020_KK001_Full.jpg" veriyor — şema var ama host yok ve
// adres hiçbir yere çıkmıyor. Böyle bir değeri kullanmaktansa boş dönüp
// çağıranın og:image yedeğine düşmesi doğru.
// Mağazanın og:image'i bazen ürün değil site logosu oluyor (Mavi) ve sepete
// ürün yerine logo düşüyordu. Adres logo/yer tutucu gibi görünüyorsa sayfadaki
// gerçek ürün görselini aramak daha doğru.
const LOGO_IMAGE_PATTERN = /logo|placeholder|no-?image|noimage|default-?image|sprite/i;

function looksLikeLogoImage(url) {
  return LOGO_IMAGE_PATTERN.test(String(url || ""));
}

function isUsableImageUrl(url) {
  return /^(https?:\/\/|\/\/|\/)/.test(url);
}

// Görünen fiyat metnini sayıya çevirir. Ayraç düzeni siteye göre değişiyor:
// "1.299,90" ile "1,299.90" aynı tutar. Son ayraç ondalık kabul ediliyor, üç
// haneli gruplar binlik sayılıyor (shared/cart.js ile aynı kural).
function priceTextToNumber(raw) {
  let cleaned = String(raw || "").replace(/[^\d.,]/g, "");

  if (!cleaned) return null;

  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");

  if (comma !== -1 && dot !== -1) {
    cleaned =
      comma > dot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (comma !== -1) {
    const parts = cleaned.split(",");
    cleaned =
      parts.length > 1 && parts.slice(1).every((part) => part.length === 3)
        ? cleaned.replace(/,/g, "")
        : cleaned.replace(",", ".");
  } else if (dot !== -1) {
    const parts = cleaned.split(".");

    if (parts.length > 1 && parts.slice(1).every((part) => part.length === 3)) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

// Metinde geçen tutarlardan biri hedefle aynı mı? Karşılaştırma sayısal:
// parser "5.499,00 TL" derken sayfa "5499 TL" yazabiliyor.
function textContainsPrice(text, target) {
  return Array.from(String(text || "").matchAll(/\d[\d.,]*/g)).some((match) => {
    const value = priceTextToNumber(match[0]);
    return value !== null && Math.abs(value - target) < 0.01;
  });
}

function isStruckElement(element) {
  if (!element || !element.tagName) return false;

  const tag = element.tagName.toLowerCase();

  if (tag === "del" || tag === "s" || tag === "strike") return true;

  try {
    const style = window.getComputedStyle(element);
    const decoration = style.textDecorationLine || style.textDecoration || "";

    return decoration.includes("line-through");
  } catch {
    return false;
  }
}

function hasStruckAncestor(node) {
  let current = node;

  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (isStruckElement(current)) return true;
    current = current.parentElement;
  }

  return false;
}

// Ürün bilgisinin durduğu bölge: başlığın birkaç üstündeki kap. Fiyat aramaları
// sayfanın tamamında değil burada yapılıyor — sayfanın altındaki öneri
// kartlarında da üstü çizili tutarlar var ve Champion'da onlardan biri ürünün
// kendi fiyatıyla aynı olduğu için indirimsiz ürün indirimli sanılmıştı.
function getProductArea() {
  const heading = document.querySelector("h1");

  if (!heading) return document.body;

  let area = heading;

  for (let depth = 0; depth < 4 && area.parentElement; depth += 1) {
    area = area.parentElement;
  }

  return area;
}

// Verilen tutarı üstü çizili gösteren düğümü bulur.
//
// Mağazaların bir kısmı schema.org'a ödenecek tutarı değil liste fiyatını
// yazıyor: Supplementler'de JSON-LD 5499 derken sayfada 5499 üstü çizili ve
// ödenecek tutar 4299. Yapılandırılmış veriye körlemesine güvenmek sepete
// indirimsiz fiyatı yazıyordu.
//
// Karar sınıf adına değil hesaplanmış stile bakarak veriliyor: "original",
// "old" gibi sınıflar indirimsiz üründe de bulunuyor ve o sayfalarda ödenecek
// tutarın kendisini taşıyorlar.
function findStruckPriceNode(priceText) {
  const target = priceTextToNumber(priceText);

  if (target === null) return null;

  const area = getProductArea();

  for (const candidate of area.querySelectorAll("*")) {
    if (candidate.children.length > 2) continue;
    if (!isStruckElement(candidate)) continue;
    if (!textContainsPrice(candidate.textContent, target)) continue;

    return candidate;
  }

  return null;
}

function isStruckThroughPrice(priceText) {
  return Boolean(findStruckPriceNode(priceText));
}

// Kabın metnini üstü çizili kısımlar olmadan verir. Düğümler kopyalanıyor,
// sayfaya dokunulmuyor.
function textWithoutStruckAmounts(element) {
  let clone = null;

  try {
    clone = element.cloneNode(true);
  } catch {
    return cleanText(element.textContent);
  }

  for (const node of clone.querySelectorAll("del, s, strike")) {
    node.remove();
  }

  // Sınıf adıyla işaretlenmiş olanlar kopyada hesaplanmış stil taşımıyor, o
  // yüzden asıl düğümlerdeki üstü çizili metinler ayrıca çıkarılıyor.
  for (const node of element.querySelectorAll("*")) {
    if (!isStruckElement(node)) continue;

    const struckText = cleanText(node.textContent);

    if (!struckText) continue;

    for (const candidate of clone.querySelectorAll("*")) {
      if (cleanText(candidate.textContent) === struckText) candidate.remove();
    }
  }

  return cleanText(clone.textContent);
}

// Üstü çizili tutarın yanındaki ödenecek tutarı bulur. İndirimli üründe ikisi
// hep aynı kutuda duruyor, o yüzden üstü çizili düğümden başlanıp yukarı
// çıkılıyor ve kabın metninden üstü çizili kısım atıldıktan sonra kalan tutar
// okunuyor.
//
// Tutarı düğüm düğüm aramak işe yaramıyor: Supplementler'de rakam ile para
// birimi ayrı span'lerde ("4299" + "TL"), ikisini birleştiren kapta ise üstü
// çizili tutar da bulunuyor. Metinden çıkarıp bölgenin kendi cleanPrice'ına
// vermek ikisini de çözüyor.
function findSalePriceNearStruckPrice(priceText) {
  const struckNode = findStruckPriceNode(priceText);
  const target = priceTextToNumber(priceText);

  if (!struckNode || target === null) return "";

  let scope = struckNode.parentElement;

  for (let depth = 0; depth < 4 && scope; depth += 1) {
    const candidate = cleanPrice(textWithoutStruckAmounts(scope));
    const value = candidate === null ? null : priceTextToNumber(candidate);

    if (value !== null && value > 0 && value < target) return candidate;

    scope = scope.parentElement;
  }

  return "";
}

function pickStructuredImage(image) {
  for (const candidate of [image].flat(Infinity)) {
    const url =
      typeof candidate === "string"
        ? candidate.trim()
        : candidate && typeof candidate === "object" && typeof candidate.url === "string"
          ? candidate.url.trim()
          : "";

    if (url && isUsableImageUrl(url)) return url;
  }

  return "";
}

// Bazı mağazalar ürün adını yapılandırılmış veriye HTML varlığıyla yazıyor
// (Levi's TR: "Kısa Kollu G&#246;mlek") ve o metin sepete olduğu gibi düşüyordu.
// DOM'dan okunan metinde bu sorun yok, tarayıcı zaten çözüyor; çözülmesi gereken
// yalnızca JSON-LD ve meta etiketlerinden gelen ham metin.
//
// Çözüm elle yapılıyor: bir eleman oluşturup innerHTML'e yazmak daha kısa olurdu
// ama AMO doğrulaması innerHTML atamasını güvenlik uyarısı olarak işaretliyor.
const HTML_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ouml: "ö",
  Ouml: "Ö",
  uuml: "ü",
  Uuml: "Ü",
  ccedil: "ç",
  Ccedil: "Ç",
  szlig: "ß",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  deg: "°",
  reg: "®",
  trade: "™",
};

function decodeHtmlEntities(text) {
  const value = String(text || "");

  if (!value.includes("&")) return value;

  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const code =
        entity[1].toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);

      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
    }

    const named = HTML_ENTITIES[entity] ?? HTML_ENTITIES[entity.toLowerCase()];

    return named === undefined ? match : named;
  });
}

function parseJsonLdProduct() {
  const scripts = document.querySelectorAll("script[type='application/ld+json']");

  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent);
      const product = findProductInJsonLd(json);

      if (!product) continue;

      const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;

      const image = pickStructuredImage(product.image);

      const rawPrice = offers?.price ?? offers?.lowPrice ?? offers?.highPrice;
      const currency = String(offers?.priceCurrency || "").toUpperCase();

      return {
        site: getSiteName(),
        title: cleanText(decodeHtmlEntities(product.name)),
        price: formatStructuredPrice(rawPrice, currency) || cleanPrice(rawPrice),
        currency: currency || null,
        image,
        url: window.location.href,
      };
    } catch {
      continue;
    }
  }

  return null;
}

// parseJsonLdProduct() offers'ı tek katmanlı ve fiyatı doğrudan offers.price
// altında bekliyor. Bazı siteler ikisini de farklı yazıyor: Decathlon offers'ı
// iç içe dizi olarak ([[{...}]]), fiyatı da priceSpecification altında veriyor.
// Sadece teklifi döndürüyoruz; biçimlendirmeyi çağıran core'un
// formatStructuredPrice()'ı yapar.
function findStructuredOffer() {
  const scripts = document.querySelectorAll("script[type='application/ld+json']");

  for (const script of scripts) {
    try {
      const product = findProductInJsonLd(JSON.parse(script.textContent));

      if (!product) continue;

      const offers = [product.offers].flat(Infinity).filter(Boolean);

      for (const offer of offers) {
        const specification = offer.priceSpecification || {};
        const price = offer.price ?? specification.price;

        if (price === null || price === undefined) continue;

        return {
          price,
          currency: String(
            offer.priceCurrency || specification.priceCurrency || "",
          ).toUpperCase(),
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function parseMetaProduct() {
  const title =
    getAttr("meta[property='og:title']", "content") ||
    getAttr("meta[name='twitter:title']", "content") ||
    document.title;

  const image =
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content");

  const price =
    getAttr("meta[property='product:price:amount']", "content") ||
    getAttr("meta[property='og:price:amount']", "content") ||
    getAttr("meta[name='price']", "content");

  const currency = String(
    getAttr("meta[property='product:price:currency']", "content") ||
      getAttr("meta[property='og:price:currency']", "content") ||
      "",
  ).toUpperCase();

  if (!title && !price && !image) return null;

  return {
    site: getSiteName(),
    title: cleanText(decodeHtmlEntities(title)),
    price: formatStructuredPrice(price, currency) || cleanPrice(price),
    currency: currency || null,
    image,
    url: window.location.href,
  };
}

// ---------------------------------------------------------------------------
// Ürün seçenekleri: beden, renk, uzunluk, depolama
//
// Kullanıcı sepete eklediği ürünün seçeneklerini popup'ta açılır listelerden
// seçiyor; listeler burada, ürün sayfasından okunuyor. Bölgeye bağlı bir tarafı
// yok, iki content script de aynı kodu kullanıyor.
//
// Eksen kavramı sonradan geldi: önce yalnızca beden okunuyordu, ama aynı kutuda
// duran renk, uzunluk (Jack & Jones'ta "Uzunluk Seç") ve depolama (Apple'da
// 256/512 GB) da kullanıcının seçtiği şeyler. Hepsi aynı taramadan çıkıyor;
// değişen tek şey hangi etiketin altında toplandıkları.
//
// Tarama bilerek "işaretli kap" üzerinden yürüyor: sayfadaki her düğmeyi okuyup
// seçenek gibi görüneni toplamak, adet düğmelerini, menü başlıklarını ve
// kampanya metinlerini de seçenek sanıyordu. Aşağıdaki elemelerin her biri
// gerçek bir ürün sayfasında yakalandı; test/unit/size.test.mjs hangisinin
// nereden geldiğini tek tek yazıyor.

const OPTION_LABEL_PATTERNS = {
  // "size" en gevşek kalıp olduğu için en sonda sınanıyor.
  colour: /renk|colou?r/i,
  storage: /depolama|storage|hafiza|hafıza|kapasite|capacity/i,
  length: /uzunluk|boy secim|boy sec|\binseam\b|\blength\b|\bboy\b/i,
  size: /beden|numara|ebat|ölçü|olcu|boyut|talla|variant|varyant|(?:^|[^a-z])sizes?(?!-(?:\d|full|px|auto|fit|min|max))(?:[^a-z]|$)/i,
};

const OPTION_AXIS_ORDER = ["size", "colour", "length", "storage"];

// "Tek beden" bir seçim değil: ürünün bedeni yok demek. Sayfa bunu "OS"
// (Levi's), "UNI" (Champion), "Tek Ebat" ya da "Standart" diye işaretliyor ve
// sepette "Beden: OS" satırı çıkıyordu. Tek değerli beden ekseni bundan
// ibaretse eksen hiç gösterilmiyor; birden fazla değer arasında geçiyorsa
// ("Tek Ebat" ile "S" bir arada) gerçek bir seçenektir ve kalır.
const ONE_SIZE_PATTERN =
  /^(os|uni|u|std|tek|onesize|one size|tek ebat|tek beden|tek boy|standart|standard|universal|beden yok)$/i;

function isOneSizeOnlyAxis(axis) {
  const values = axis?.values || [];

  return (
    axis?.key === "size" &&
    values.length === 1 &&
    ONE_SIZE_PATTERN.test(normalizeOptionWords(values[0]))
  );
}

// Parser kendi seçeneklerini okuduğunda tarama hiç çalışmıyor; aynı eleme
// oradan gelen listeye de uygulansın diye ayrı bir kapı.
function dropOneSizeAxes(options) {
  return (options || []).filter((axis) => !isOneSizeOnlyAxis(axis));
}

// Sayfadaki etiket metni popup'ta olduğu gibi gösterilmiyor; bilinen eksenlerde
// kullanıcının dili kullanılıyor. Yine de saklanıyor: bilinmeyen bir eksen
// çıkarsa gösterilecek tek şey o.
const OPTION_AXIS_LABELS = {
  size: "Beden",
  colour: "Renk",
  length: "Uzunluk",
  storage: "Depolama",
};

// Renk adları uzun olabiliyor ("At That Point - Green" — Levi's UK), beden ve
// uzunluk kısadır.
const OPTION_MAX_WORDS = { size: 3, length: 3, storage: 3, colour: 6 };

// Tek başına bir beden sayılabilecek metinler: harf bedenleri, sayı bedenleri
// (40, 8.5), kot bedeni (29/32) ve hacim/ölçü ekli olanlar.
const SIZE_TOKEN_PATTERN = new RegExp(
  "^(?:" +
    "xx?x?s|s|m|xx?x?l|l|[2-6]\\s?x\\s?[sl]|" +
    "\\d{1,3}(?:[.,]\\d{1,2})?|" +
    "\\d{1,3}\\s*[\\/-]\\s*\\d{1,3}|" +
    "\\d{1,3}(?:[.,]\\d{1,2})?\\s?(?:cm|mm|ml|cl|lt|gr|g|kg|eu|uk|us|tr|w|l)|" +
    "tek ebat|tek beden|tek boy|one size|standart|standard" +
    ")$",
  "i",
);

// Beden kutusunun yakınındaki arayüz eylemleri ve form alanları: arama ve
// gönder düğmeleri (Madame Coco "ARA", Mudo "GÖNDER"), giriş formu (Under
// Armour TR "Giriş Yap", "Parolayı Yenile"), gezinme bağlantısı (Marks &
// Spencer "Anasayfa") ve ekran okuyucu etiketi (Levi's UK "Sale price is").
const OPTION_UI_PATTERN =
  /^(ara|search|gonder|submit|kapat|close|uygula|temizle|filtrele|sirala|anasayfa|home|devam|iptal|tamam|length|uzunluk|boy|renk|color|colour|depolama|storage)$|giris yap|kayit ol|uye ol|parola|sifre|oturum|hesabim|price is|fiyat|add to|sepete|show more|show less|daha fazla|product colou?rs|tum renkler/i;

// Stok uyarısı, promosyon ve yardım bağlantıları seçenek kutusunun içinde ya da
// hemen yanında duruyor: "Son 3 adet", "%42", "HEMEN AL", "Benzer ürünleri bul"
// (Marks & Spencer TR ve Supplementler).
const OPTION_PROMO_PATTERN =
  /%|son \d+|hemen al|benzer|kali[pb]i nasil|kazancli|stokta|indirim|kampanya|\badet\b|shaker/i;

// Renk adları beden seçicisinin yanında duruyor ve kısa oldukları için jeton
// gibi görünüyorlar ("krem", "ECRU MIX" — Marks & Spencer TR). Renk ekseninde
// bunlar gerçek değer olduğu için eleme yalnızca diğer eksenlerde çalışıyor.
const COLOUR_WORD_PATTERN =
  /^(siyah|beyaz|krem|ekru|ecru|bej|lacivert|mavi|kirmizi|yesil|sari|gri|antrasit|kahve|kahverengi|pembe|mor|turuncu|bordo|haki|vizon|gumus|altin|black|white|cream|navy|blue|red|green|yellow|grey|gray|pink|purple|orange|brown|beige|khaki|silver|gold|ivory|multi|turquoise|teal|burgundy|charcoal|olive|mint|coral|lilac|fuchsia|indigo|sand|stone|rust|taupe|camel|denim blue|off-white|wine)(\s|$)/i;

// Breadcrumb ve gezinme adları ("Erkek", "Giyim" — Marks & Spencer TR) ile
// karusel sayaçları ("1 of 6") seçenek değil.
const OPTION_NAVIGATION_PATTERN =
  /^(erkek|kadin|cocuk|bebek|genc|unisex|giyim|aksesuar|ayakkabi|canta|kozmetik|indirim|yeni)$|^\d+\s+of\s+\d+$/i;

// "Beden seçiniz" gibi yer tutucular listeye girmemeli: seçilmemiş hâli
// anlatıyorlar, satın alınabilir bir seçenek değiller.
const OPTION_PLACEHOLDER_PATTERN =
  /seçin|secin|seçiniz|seciniz|choose|select|please|lütfen|lutfen|tablo|rehber|guide|chart|bedenimi bul|bedenini bul|find my|stokta yok|out of stock|tükendi|tukendi|bildir|notify|ekle|paylaş|paylas|favori|favourite|favorite|karşılaştır|karsilastir|e-posta|e-mail|email|telefon|adres|share|shipping|kargo|teslimat|iade/i;

// Listeleme filtresinin seçenekleri: "29/30 bedeninde 40 ürün", "Beden (tüm
// bedenler)". Koton'un ürün sayfasında filtre kutusu da duruyor ve seçenekleri
// gerçek seçicininkilerle karışıyordu.
const OPTION_FACET_PATTERN = /bedeninde|tum bedenler|adet urun|urun\)?$/i;

// Beden tablosunun sekmeleri seçenek değil, ürün türü ve kalıp adları: Colin's
// ve Tudors'ta sepete "GÖMLEK", "DENIM ÖLÇÜLERİ", "SLİM FİT" yazılıyordu.
const GARMENT_WORD_PATTERN =
  /olculeri|gomlek|tisort|t-?shirt|sweatshirt|triko|mont|pantolon|cargo|kemer|boxer|elbise|etek|ceket|ayakkabi|canta|denim|jean|polo yaka|slim|regular|relax|oversize|klasik|modern|kali[pb]|buyuk beden|genis kalip|\bfit\b/i;

// Türkçe büyük İ küçültülünce noktası ayrı bir işaret olarak kalıyor
// ("SLİM" → "sli̇m") ve /slim/i kalıbı tutmuyordu; eleme kuralları bu yüzden
// büyük harfle yazılmış seçeneklerde çalışmıyordu. shared/category.js aynı
// normalizasyonu kendi anahtar kelimeleri için yapıyor.
function normalizeOptionWords(text) {
  return String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/i̇/g, "i")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

// Bazı mağazalar seçeneğin metnine etiketi de koyuyor: Under Armour'da her
// beden "UK Size: 3" diye geliyor ve açılır listede tekrar tekrar "UK Size:"
// okumak gereksiz.
function stripOptionLabelPrefix(value) {
  const withColon = value.match(/^([^:]{1,14}):\s*(.+)$/);

  if (withColon) {
    const isLabel = Object.values(OPTION_LABEL_PATTERNS).some((pattern) =>
      pattern.test(withColon[1]),
    );

    return isLabel ? withColon[2] : value;
  }

  // İki nokta olmadan da yazılıyor: Levi's UK seçenekleri "Size S" diye
  // listeliyor.
  const withoutColon = value.match(/^(beden|size|numara|talla|renk|colou?r)\s+(.+)$/i);

  return withoutColon ? withoutColon[2] : value;
}

// Ürün/varyant kodu: boşluksuz, hem harf hem rakam taşıyan kısa metin
// ("W60094Z4-CVL" — LC Waikiki). Renk adı böyle görünmez ama beden görünebilir
// ("W32L34"), o yüzden yalnızca renk ekseninde eleniyor.
function looksLikeProductCode(value) {
  return (
    value.length >= 5 &&
    !/\s/.test(value) &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value) &&
    /^[A-Za-z0-9._\/-]+$/.test(value)
  );
}

// LC Waikiki rengi "Yeni Siyah / W60094Z4-CVL" diye yazıyor: adın yanında ürün
// kodu duruyor ve birleşik metin uzunluk sınırına takılıp eleniyordu, geriye
// kopyala düğmesinin title'ındaki çıplak kod kalıyordu. Kod eki atılıp rengin
// adı bırakılıyor. Ayraçların iki yanındaki boşluk şart: "29/32" bir beden.
function stripOptionCodeSuffix(value) {
  const match = value.match(/^(.+?)\s+[\/|-]\s+(\S+)$/);

  return match && looksLikeProductCode(match[2]) ? match[1].trim() : value;
}

function looksLikeOptionText(text, axis) {
  const value = cleanText(text);

  if (!value || value.length > 24) return false;

  // Harf ya da rakam taşımayan metin seçenek değil: Marks & Spencer'ın beden
  // kutusunda ayraç olarak duran "/" listeye giriyordu.
  if (!/[\p{L}\p{N}]/u.test(value)) return false;

  // Sondaki noktalama etiketi gizliyordu: Apple UK renk listesine "Colour."
  // diye giriyordu.
  const normalized = normalizeOptionWords(value).replace(/[.:,;]+$/, "");

  if (OPTION_PLACEHOLDER_PATTERN.test(normalized)) return false;
  if (OPTION_UI_PATTERN.test(normalized)) return false;
  if (OPTION_NAVIGATION_PATTERN.test(normalized)) return false;
  if (OPTION_PROMO_PATTERN.test(normalized)) return false;
  if (OPTION_FACET_PATTERN.test(normalized)) return false;
  if (GARMENT_WORD_PATTERN.test(normalized)) return false;

  // Renk ekseninde renk adı gerçek değerdir; diğer eksenlerde çöptür.
  if (axis !== "colour" && COLOUR_WORD_PATTERN.test(normalized)) return false;

  if (axis === "colour") {
    // Renk bir sayı değil: Tudors'ta "43", English Home'da "4" renk listesine
    // giriyordu. Artı işareti de sayı sayılıyor: LC Waikiki diğer renkleri
    // "+1" rozetiyle gösteriyor.
    if (/^[+\d.,\/-]+$/.test(value)) return false;

    // Ürün kodu rengin adı değil: LC Waikiki'de kopyala düğmesinin title'ındaki
    // "W60094Z4-CVL" sepete renk diye yazılıyordu.
    if (looksLikeProductCode(value)) return false;

    // Kaç renk olduğunu söyleyen rozet bir renk değil ("1 Renk" — LC Waikiki).
    if (/^\+?\d+\s*(renk|renkler|colou?rs?)$/i.test(normalized)) return false;

    // Renk kodu rengin adı değil: Mi UK'de swatch'ın "#000000" değeri listeye
    // "Black"in yanına ayrı bir renk gibi giriyordu.
    if (/^#[0-9a-f]{3,8}$/i.test(value)) return false;

    // Cinsiyet bağlantıları ve bölüm başlıkları renk kutusunun yanında duruyor
    // (LTB "female/male", Lacoste "Ürün Özellikleri").
    if (/^(male|female|erkek|kadin|unisex|cocuk)$/i.test(normalized)) return false;
    if (/ozellik|aciklama|detay|bilgi|yorum|degerlendirme/i.test(normalized)) return false;
  }

  // İçinde fiyat geçen metin seçenek değil, fiyat satırıdır.
  if (/[₺£$€]|\bTL\b|\bGBP\b/i.test(value)) return false;

  // Listeleme sayfasının filtresi seçeneğin yanına o bedendeki ürün sayısını
  // yazıyor ("200x220 Cm (174)" — Karaca). Gerçek bir seçenek sonuna parantez
  // içinde sayı almaz; "6 (EU 39)" gibi değerler harf taşıdığı için kalıyor.
  if (/\(\s*\d+\s*\)$/.test(value)) return false;

  // Etiketin kendisi ("Beden", "Size") seçenek değil.
  if (/^(beden|size|numara|ebat|talla)$/i.test(value)) return false;

  // Form alanı etiketi: zorunlu alanlar yıldızla işaretleniyor.
  if (value.includes("*")) return false;

  // İşaretlenmemiş onay kutusunun tarayıcı varsayılanı; Marks & Spencer UK'de
  // beden listesine "on" diye giriyordu.
  if (/^(on|off)$/i.test(value)) return false;

  // Önek atıldıktan sonra hâlâ iki nokta taşıyan metin seçenek değil, bir
  // etiket-değer satırı: Levi's TR'de "Fit Referance : Ribcage" giriyordu.
  if (value.includes(":")) return false;

  // Milimetre bir beden değil, ürünün ölçüsü: Atasun'da gözlüğün çerçeve
  // ölçüleri ("54 MM", "21 MM", "145 MM") beden seçici gibi okunuyordu, oysa
  // gözlükte seçilecek bir beden yok. Santimetre eleniyor değil; nevresim ve
  // tencere gerçekten "200x220 Cm" diye seçiliyor.
  if (axis === "size" && /^\d+([.,]\d+)?\s*mm$/i.test(normalized)) return false;

  // Sıfır bir beden değil.
  if (/^0+([.,]0+)?$/.test(value)) return false;

  // Üç haneden uzun sayı seçenek değil, varyant kimliği: Champion'da listeye
  // "55342174437720" düşüyordu.
  if (/^\d{4,}$/.test(value)) return false;

  // "1 / 5" galeri sayacı ve "3.5/5" puanı kot bedeni kalıbına ("29/32")
  // benziyor. Gerçek kot bedeninde iki sayı da yirminin üstünde.
  const slashPair = value.match(/^(\d{1,3})(?:[.,]\d+)?\s*[\/-]\s*(\d{1,3})(?:[.,]\d+)?$/);

  if (slashPair && (Number(slashPair[1]) < 20 || Number(slashPair[2]) < 20)) {
    return false;
  }

  // Tek başına duran sayının beden olabilmesi için makul bir aralıkta olması ve
  // başında sıfır bulunmaması gerekiyor: Under Armour'un renk kodları ("001",
  // "513") beden listesine böyle giriyordu.
  const bareNumber = value.match(/^(\d{1,3})(?:[.,]\d{1,2})?$/);

  if (bareNumber && (/^0\d/.test(bareNumber[1]) || Number(bareNumber[1]) > 100)) {
    return false;
  }

  // Gerçek seçenek adları kısa. Renk adları biraz daha uzun olabiliyor.
  const maxWords = OPTION_MAX_WORDS[axis] || 3;

  if (value.split(/\s+/).length > maxWords) return false;

  return true;
}

function isStrictSizeToken(text) {
  return SIZE_TOKEN_PATTERN.test(cleanText(text));
}

function isDisabledOption(element) {
  if (!element) return false;

  if (element.disabled === true) return true;
  if (element.getAttribute && element.getAttribute("aria-disabled") === "true") return true;

  const className = String(element.className || "");

  return /disabled|sold-?out|out-?of-?stock|unavailable|tukendi|tükendi/i.test(className);
}

function isSelectedOption(element) {
  if (!element || !element.getAttribute) return false;

  if (element.getAttribute("aria-checked") === "true") return true;
  if (element.getAttribute("aria-selected") === "true") return true;
  if (element.getAttribute("data-selected") === "true") return true;
  if (element.checked === true) return true;

  const className = String(element.className || "");

  return /(^|[^a-z])(selected|active|checked|is-current)([^a-z]|$)/i.test(className);
}

// Adet seçicisinin rakamları beden jetonuna benziyor (Supplementler'de "1", "2",
// "3" listeye giriyordu) ve ayakkabı bedenleriyle karışıyor.
const QUANTITY_CONTAINER_PATTERN = /adet|quantity|\bqty\b|miktar/i;

function containerAttributes(element) {
  if (!element || !element.getAttribute) return "";

  return [
    element.getAttribute("name"),
    element.getAttribute("id"),
    element.getAttribute("class"),
    element.getAttribute("aria-label"),
    element.getAttribute("data-testid"),
    element.getAttribute("data-qa-action"),
    element.getAttribute("data-qa-qualifier"),
  ]
    .filter(Boolean)
    .join(" ");
}

function isQuantityContainer(element) {
  return QUANTITY_CONTAINER_PATTERN.test(containerAttributes(element));
}

// Beden tablosu (ölçü tablosu) bir seçici değil: içindeki hücreler ürün türü,
// kalıp adı ve santimetre değerleri taşıyor. Desa'da sayfadaki tek "beden" kabı
// bu tabloydu.
function isSizeChartContainer(element) {
  if (!element || !element.getAttribute) return false;

  if (/tablo|chart|guide|rehber|ölçü|olcu|measure/i.test(containerAttributes(element))) {
    return true;
  }

  return Boolean(element.querySelector && element.querySelector("table"));
}

// Seçici ürün formunda durur; menüde, modalda, başlıkta ya da alt bilgide
// değil. Koton'un kategori menüsü ("Kadın", "Erkek", "Mayo") beden listesine bu
// yüzden sızıyordu.
const SITE_CHROME_PATTERN =
  /modal|menu|menü|nav|drawer|popup|header|footer|cookie|cerez|çerez|basket|sepet|mini-?cart/i;

function isSiteChromeContainer(element) {
  let current = element;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (SITE_CHROME_PATTERN.test(containerAttributes(current))) return true;

    const tag = current.tagName ? current.tagName.toLowerCase() : "";

    if (tag === "nav" || tag === "header" || tag === "footer" || tag === "dialog") {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

// Kabın hangi ekseni taşıdığını markup'tan anlamaya çalışıyoruz: kendi
// nitelikleri, aria etiketi ya da hemen öncesindeki başlık metni.
function axisForContainer(element) {
  if (!element || !element.getAttribute) return null;

  const sources = [containerAttributes(element)];

  const labelledBy = element.getAttribute("aria-labelledby");

  if (labelledBy && document.getElementById) {
    const label = document.getElementById(labelledBy);
    if (label) sources.push(cleanText(label.textContent));
  }

  // Başlık çoğu sitede kabın kardeşi: "Beden" <div>…seçenekler…</div>
  const previous = element.previousElementSibling;

  if (previous) {
    const previousText = cleanText(previous.textContent);
    if (previousText.length <= 40) sources.push(previousText);
  }

  const parent = element.parentElement;

  if (parent && parent.getAttribute) {
    sources.push(
      [parent.getAttribute("id"), parent.getAttribute("class"), parent.getAttribute("data-testid")]
        .filter(Boolean)
        .join(" "),
    );
  }

  const haystack = sources.join(" ");

  for (const axis of OPTION_AXIS_ORDER) {
    if (OPTION_LABEL_PATTERNS[axis].test(haystack)) return axis;
  }

  return null;
}

function collectOptionsFromSelect(select, axis) {
  const values = [];
  let selected = "";

  for (const option of Array.from(select.options || [])) {
    const text = stripOptionCodeSuffix(
      stripOptionLabelPrefix(cleanText(option.textContent) || cleanText(option.value)),
    );

    if (!looksLikeOptionText(text, axis)) continue;
    if (isDisabledOption(option)) continue;

    values.push(text);

    if (option.selected) selected = text;
  }

  return { values, selected };
}

// "Renk: Yeni Siyah" bir seçici değil, sayfanın o an seçili olanı söylediği
// satırdır. LC Waikiki'de rengin adı yalnızca burada yazıyor — kutucuklar
// diğer renklerin ayrı ürün sayfalarına götürdüğü için seçili olanın kutucuğu
// yok ve sepette renk satırı boş geliyordu.
function isLabelValueLine(container, axis) {
  const pattern = OPTION_LABEL_PATTERNS[axis];

  if (!pattern) return false;

  const head = cleanText(container.textContent).match(/^([^:]{1,14}):\s*\S/);

  return Boolean(head && pattern.test(normalizeOptionWords(head[1])));
}

function collectOptionsFromContainer(container, axis, requireStrictToken) {
  // İşaretli kapta seçenekler herhangi bir etikette olabiliyor: Beymen bedenleri
  // düz <span> olarak basıyor ve yalnızca li/button/label/a aramak onları
  // tamamen kaçırıyordu. İşareti olmayan kapta liste dar tutuluyor, çünkü orada
  // her yaprağı aday saymak sayfanın yarısını seçenek sanmak demek.
  const selector = requireStrictToken
    ? "li, button, label, a, span[data-size], div[data-size], input[type='radio']"
    : "li, button, label, a, span, div, option, input[type='radio']";

  const values = [];
  let selected = "";

  for (const candidate of Array.from(container.querySelectorAll(selector))) {
    // İç içe düğümlerde aynı metni iki kez okumamak için yalnızca başka bir
    // aday içermeyen en alttaki düğüm alınıyor.
    if (candidate.children && candidate.children.length > 1) continue;
    if (candidate.querySelector && candidate.querySelector("li, button, label, a")) continue;

    // Renk kutucukları çoğu sitede metinsiz; adı title/alt niteliğinde taşıyorlar.
    const raw = stripOptionLabelPrefix(
      cleanText(candidate.getAttribute("data-size")) ||
        cleanText(candidate.getAttribute("aria-label")) ||
        cleanText(candidate.getAttribute("title")) ||
        cleanText(candidate.getAttribute("alt")) ||
        cleanText(candidate.textContent) ||
        cleanText(candidate.value),
    );

    const text = stripOptionCodeSuffix(raw);

    if (!looksLikeOptionText(text, axis)) continue;
    if (requireStrictToken && !isStrictSizeToken(text)) continue;
    if (isDisabledOption(candidate)) continue;

    values.push(text);

    if (isSelectedOption(candidate)) selected = text;
  }

  if (!selected && values.length === 1 && isLabelValueLine(container, axis)) {
    selected = values[0];
  }

  return { values, selected };
}

// schema.org ürünü bedenleri varyant olarak verebiliyor; sayfa geç render
// ediyorsa DOM'dan önce burası dolu oluyor.
function collectSizesFromStructuredData() {
  const scripts = document.querySelectorAll("script[type='application/ld+json']");

  for (const script of scripts) {
    try {
      const product = findProductInJsonLd(JSON.parse(script.textContent));

      if (!product) continue;

      const variants = [product.hasVariant, product.offers].flat(Infinity).filter(Boolean);
      const values = [];

      for (const variant of variants) {
        const raw = variant.size ?? null;
        const text = cleanText(typeof raw === "object" ? raw?.name : raw);

        if (text && looksLikeOptionText(text, "size")) values.push(text);
      }

      if (values.length) return values;
    } catch {
      continue;
    }
  }

  return [];
}

function dedupeOptionValues(values) {
  const seen = new Set();
  const unique = [];

  for (const value of values) {
    const key = value.toLocaleLowerCase("tr-TR");

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(value);

    // Liste bu kadar uzunsa seçenek değil başka bir liste yakalanmıştır.
    if (unique.length >= 40) break;
  }

  return unique;
}

// Sayfadaki seçenek eksenlerini ve varsa sayfada seçili olanları döndürür.
// Tüm body'yi gezdiği için pahalı: taksit ve kargo taraması gibi yalnızca ürün
// oturduktan sonra bir kez çağrılır, yoklama döngüsünün içinde asla.
function findProductOptions() {
  const collected = new Map();

  const add = (axis, result) => {
    if (!result.values.length) return;

    const current = collected.get(axis) || { values: [], selected: "" };

    current.values.push(...result.values);
    if (!current.selected) current.selected = result.selected;

    collected.set(axis, current);
  };

  for (const select of document.querySelectorAll("select")) {
    if (isQuantityContainer(select)) continue;

    const axis = axisForContainer(select);

    if (!axis) continue;

    add(axis, collectOptionsFromSelect(select, axis));
  }

  const containerSelector = [
    "[class*='size' i]",
    "[class*='beden' i]",
    "[id*='size' i]",
    "[id*='beden' i]",
    "[class*='renk' i]",
    "[class*='color' i]",
    "[class*='colour' i]",
    "[class*='uzunluk' i]",
    "[class*='length' i]",
    "[class*='storage' i]",
    "[class*='depolama' i]",
    "[data-testid*='size' i]",
    "[data-testid*='color' i]",
    "[data-qa-action*='size' i]",
    "[aria-label*='beden' i]",
    "fieldset",
    "ul",
  ].join(",");

  for (const container of document.querySelectorAll(containerSelector)) {
    const axis = axisForContainer(container);

    // Seçicide "ul" ve "fieldset" de var: ağır bir sayfada bunlardan yüzlerce
    // olabiliyor ve her birinde görünürlük kontrolü layout tetikliyor. İşareti
    // olmayan kapta önce ucuz olan çocuk sayısına bakılıyor.
    if (!axis && container.childElementCount > 40) continue;

    // Gerçek seçici küçük bir kutudur. İşaretli bile olsa koca bir kap sayfa
    // bölümüdür: Marks & Spencer TR'de "beden" işaretli sarmalayıcı ürün
    // açıklamasını ve mağaza şehirlerini de kapsıyordu.
    if (cleanText(container.textContent).length > 600) continue;

    if (isQuantityContainer(container)) continue;
    if (isSizeChartContainer(container)) continue;
    if (isSiteChromeContainer(container)) continue;
    if (!isVisibleElement(container)) continue;

    const result = collectOptionsFromContainer(container, axis || "size", !axis);

    // İşareti olmayan kapta tek bir jeton liste sayılmaz; gerçek seçicide her
    // zaman birden fazla seçenek olur.
    if (!axis && result.values.length < 2) continue;

    add(axis || "size", result);
  }

  if (!collected.has("size")) {
    const structured = collectSizesFromStructuredData();

    if (structured.length) collected.set("size", { values: structured, selected: "" });
  }

  const axes = [];

  for (const axis of OPTION_AXIS_ORDER) {
    const entry = collected.get(axis);

    if (!entry) continue;

    const values = dedupeOptionValues(entry.values);

    if (!values.length) continue;

    // Tek değerli eksen bir seçim değil, bilgidir: bu sitelerde diğer renkler
    // ayrı ürün sayfası ve sayfadaki tek renk zaten bu ürünün rengi. Seçili
    // sayılıyor ki sepete, CSV'ye ve paylaşılan listeye geçsin.
    const selected = values.includes(entry.selected)
      ? entry.selected
      : values.length === 1
        ? values[0]
        : "";

    if (isOneSizeOnlyAxis({ key: axis, values })) continue;

    axes.push({
      key: axis,
      label: OPTION_AXIS_LABELS[axis] || "",
      values,
      selected,
    });
  }

  return axes;
}

// Beden ekseni tek başına da isteniyor: sepet kimliği ve eski kayıtlar bunun
// üzerinden yürüyor.
function findSizeOptions() {
  const size = findProductOptions().find((axis) => axis.key === "size");

  return size
    ? { sizes: size.values, size: size.selected }
    : { sizes: [], size: "" };
}
