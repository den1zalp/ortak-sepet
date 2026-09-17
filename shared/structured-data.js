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
// Beden / varyant seçenekleri
//
// Kullanıcı sepete eklediği ürünün bedenini popup'ta bir açılır listeden
// seçiyor; liste burada, ürün sayfasından okunuyor. Bölgeye bağlı bir tarafı
// yok, iki content script de aynı kodu kullanıyor.
//
// Tarama bilerek "işaretli kap" üzerinden yürüyor: sayfadaki her düğmeyi okuyup
// beden gibi görüneni toplamak, adet artırma düğmelerini ve renk adlarını da
// beden sanıyordu. Bunun yerine önce beden seçicisi olduğu markup'tan belli olan
// kaplar bulunuyor (select[name*=beden], [data-qa-action*=size], başlığı "Beden"
// olan liste...), seçenekler yalnızca onların içinden alınıyor. İşareti olmayan
// kapta ise metnin beden jetonuna benzemesi (S/M/XL, 40, 29/32) şart koşuluyor.
//
// Kozmetik ve ev tekstilinde aynı seçici hacim ya da ebat veriyor ("50 ml",
// "Tek Kişilik"); onlar da alınıyor, kullanıcı için seçilecek şey aynı.

// "size" sözcüğü sınıf adında her geçtiğinde beden seçicisi demek değil:
// Tailwind'in size-4 / size-6 / size-full yardımcı sınıfları genişlik-yükseklik
// veriyor ve sayfadaki onlarca düğümde bulunuyor, "resize" de içinde "size"
// geçiriyor. Lacoste'ta bu yüzden sepete beden diye "0" yazılıyordu.
// Bu yüzden "size" yalnızca sözcük sınırındayken ve ardından ölçü eki
// gelmiyorken işaret sayılıyor; Türkçe karşılıklarında böyle bir çakışma yok.
const SIZE_LABEL_PATTERN =
  /beden|numara|ebat|ölçü|olcu|boyut|talla|variant|varyant|(?:^|[^a-z])sizes?(?!-(?:\d|full|px|auto|fit|min|max))(?:[^a-z]|$)/i;

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

// "Beden seçiniz" gibi yer tutucular listeye girmemeli: seçilmemiş hâli
// anlatıyorlar, satın alınabilir bir beden değiller.
// Beden seçicisinin içinde ya da yanında duran ama seçenek olmayan metinler:
// yer tutucular, beden rehberi bağlantıları, eylem düğmeleri ("Favorilerime
// Ekle", "Paylaş" — Levi's) ve bülten formunun alanları ("E-posta Adresi *" —
// Under Armour TR). Hepsi gerçek sayfalarda sepete beden diye yazılmıştı.
// Beden kutusunun yakınındaki arayüz eylemleri ve form alanları: arama ve
// gönder düğmeleri (Madame Coco "ARA", Mudo "GÖNDER"), giriş formu (Under
// Armour TR "Giriş Yap", "Parolayı Yenile"), gezinme bağlantısı (Marks &
// Spencer "Anasayfa") ve ekran okuyucu etiketi (Levi's UK "Sale price is").
// Hepsi gerçek sayfalarda sepete beden diye yazılmıştı.
const SIZE_UI_PATTERN =
  /^(ara|search|gonder|submit|kapat|close|uygula|temizle|filtrele|sirala|anasayfa|home|devam|iptal|tamam|length|uzunluk|boy)$|giris yap|kayit ol|uye ol|parola|sifre|oturum|hesabim|price is|fiyat/i;

const SIZE_PLACEHOLDER_PATTERN =
  /seçin|secin|seçiniz|seciniz|choose|select|please|lütfen|lutfen|tablo|rehber|guide|chart|bedenimi bul|bedenini bul|find my|stokta yok|out of stock|tükendi|tukendi|bildir|notify|ekle|paylaş|paylas|favori|favourite|favorite|karşılaştır|karsilastir|e-posta|e-mail|email|telefon|adres|share|shipping|kargo|teslimat|iade/i;

// Listeleme filtresinin seçenekleri: "29/30 bedeninde 40 ürün", "Beden (tüm
// bedenler)". Koton'un ürün sayfasında filtre kutusu da duruyor ve seçenekleri
// gerçek beden seçicisininkilerle karışıyordu.
const SIZE_FACET_PATTERN = /bedeninde|tum bedenler|adet urun|urun\)?$/i;

// Beden tablosunun sekmeleri beden değil, ürün türü ve kalıp adları: Colin's ve
// Tudors'ta sepete "GÖMLEK", "DENIM ÖLÇÜLERİ", "SLİM FİT" yazılıyordu.
const GARMENT_WORD_PATTERN =
  /olculeri|gomlek|tisort|t-?shirt|sweatshirt|triko|mont|pantolon|cargo|kemer|boxer|elbise|etek|ceket|ayakkabi|canta|denim|jean|polo yaka|slim|regular|relax|oversize|klasik|modern|kalip|buyuk beden|genis kalip|\bfit\b/i;

// Bazı mağazalar seçeneğin metnine etiketi de koyuyor: Under Armour'da her
// beden "UK Size: 3" diye geliyor ve açılır listede tekrar tekrar "UK Size:"
// okumak gereksiz. Önek yalnızca beden etiketiyse atılıyor; "L/XL: ..." gibi
// bedenin kendisinde iki nokta geçen değerler korunuyor.
function stripSizeLabelPrefix(value) {
  const withColon = value.match(/^([^:]{1,14}):\s*(.+)$/);

  if (withColon) {
    return SIZE_LABEL_PATTERN.test(withColon[1]) ? withColon[2] : value;
  }

  // İki nokta olmadan da yazılıyor: Levi's UK seçenekleri "Size S" diye
  // listeliyor ve açılır listede her satırda "Size" okumak gereksiz.
  const withoutColon = value.match(/^(beden|size|numara|talla)\s+(.+)$/i);

  return withoutColon ? withoutColon[2] : value;
}

// Türkçe büyük İ küçültülünce noktası ayrı bir işaret olarak kalıyor
// ("SLİM" → "sli̇m") ve /slim/i kalıbı tutmuyordu; eleme kuralları bu yüzden
// büyük harfle yazılmış seçeneklerde çalışmıyordu. shared/category.js aynı
// normalizasyonu kendi anahtar kelimeleri için yapıyor.
function normalizeSizeWords(text) {
  return String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/i\u0307/g, "i")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function looksLikeSizeText(text) {
  const value = cleanText(text);

  if (!value || value.length > 24) return false;
  if (SIZE_PLACEHOLDER_PATTERN.test(normalizeSizeWords(value))) return false;

  // Listeleme sayfasının beden filtresi seçeneğin yanına o bedendeki ürün
  // sayısını yazıyor ("200x220 Cm (174)"). Gerçek bir beden seçeneği sonuna
  // parantez içinde sayı almaz; bu eleme olmadan kategori sayfasının filtre
  // kutusu beden listesi sanılıyordu.
  if (/\(\s*\d+\s*\)$/.test(value)) return false;

  // Sıfır bir beden değil. Beden seçicisi sanılan bir kaptan tek başına "0"
  // geldiğinde sepette tek seçenekli, anlamsız bir liste çıkıyordu.
  if (/^0+([.,]0+)?$/.test(value)) return false;

  // Seçeneğin değil, başlığın kendisi: "Beden:" (Penti'de yakalandı).
  if (/:$/.test(value)) return false;

  // Form alanı etiketi: zorunlu alanlar yıldızla işaretleniyor (Under Armour TR).
  if (value.includes("*")) return false;

  // İşaretlenmemiş onay kutusunun tarayıcı varsayılanı; Marks & Spencer UK'de
  // beden listesine "on" diye giriyordu.
  if (/^(on|off)$/i.test(value)) return false;

  // Etiketin kendisi ("Beden", "Size") seçenek değil.
  if (/^(beden|size|numara|ebat|talla|boy|renk|color|colour)$/i.test(value)) return false;

  const normalized = normalizeSizeWords(value);

  // Harf ya da rakam taşımayan metin beden değil: Marks & Spencer'ın beden
  // kutusunda ayraç olarak duran "/" listeye giriyordu.
  if (!/[\p{L}\p{N}]/u.test(value)) return false;

  if (SIZE_UI_PATTERN.test(normalized)) return false;
  if (SIZE_FACET_PATTERN.test(normalized)) return false;
  if (GARMENT_WORD_PATTERN.test(normalized)) return false;

  // Gerçek beden adları kısa: "M", "29/32", "Tek Kişilik", "6 (EU 39)". Üçten
  // fazla sözcük varsa elimizdeki şey beden değil, bir renk ya da pazarlama
  // adıdır — Levi's UK'de renk seçeneği ("At That Point - Green") beden
  // listesine böyle giriyordu.
  if (value.split(/\s+/).length > 3) return false;

  // Önek atıldıktan sonra hâlâ iki nokta taşıyan metin beden değil, bir
  // etiket-değer satırı: Levi's TR'de "Fit Referance : Ribcage" giriyordu.
  if (value.includes(":")) return false;

  // Üç haneden uzun sayı beden değil, varyant kimliği: Champion'da seçenek
  // listesine "55342174437720" düşüyordu.
  if (/^\d{4,}$/.test(value)) return false;

  // "1 / 5" galeri sayacı ve "3.5/5" puanı kot bedeni kalıbına ("29/32")
  // benziyor. Gerçek kot bedeninde iki sayı da yirminin üstünde; Mi ve
  // Under Armour sayfalarında sepete beden diye sayfa sayacı yazılıyordu.
  const slashPair = value.match(/^(\d{1,3})(?:[.,]\d+)?\s*[\/-]\s*(\d{1,3})(?:[.,]\d+)?$/);

  if (slashPair && (Number(slashPair[1]) < 20 || Number(slashPair[2]) < 20)) {
    return false;
  }

  // Tek başına duran sayının beden olabilmesi için makul bir aralıkta olması ve
  // başında sıfır bulunmaması gerekiyor: Under Armour'un renk kodları ("001",
  // "513", "738") beden listesine böyle giriyordu. Gerçek sayı bedenleri
  // ayakkabıda 14-50, konfeksiyonda 24-60 aralığında.
  const bareNumber = value.match(/^(\d{1,3})(?:[.,]\d{1,2})?$/);

  if (bareNumber && (/^0\d/.test(bareNumber[1]) || Number(bareNumber[1]) > 100)) {
    return false;
  }

  // İçinde fiyat geçen metin beden değil, fiyat satırıdır.
  if (/[₺£$€]|\bTL\b|\bGBP\b/i.test(value)) return false;

  return true;
}

function isStrictSizeToken(text) {
  return SIZE_TOKEN_PATTERN.test(cleanText(text));
}

function isDisabledSizeOption(element) {
  if (!element) return false;

  if (element.disabled === true) return true;
  if (element.getAttribute && element.getAttribute("aria-disabled") === "true") return true;

  const className = String(element.className || "");

  return /disabled|sold-?out|out-?of-?stock|unavailable|tukendi|tükendi/i.test(className);
}

function isSelectedSizeOption(element) {
  if (!element || !element.getAttribute) return false;

  if (element.getAttribute("aria-checked") === "true") return true;
  if (element.getAttribute("aria-selected") === "true") return true;
  if (element.getAttribute("data-selected") === "true") return true;
  if (element.checked === true) return true;

  const className = String(element.className || "");

  return /(^|[^a-z])(selected|active|checked|is-current)([^a-z]|$)/i.test(className);
}

// Kabın beden seçicisi olduğunu markup'tan anlamaya çalışıyoruz: kendi
// nitelikleri ya da hemen öncesindeki başlık/etiket metni.
// Renk seçicisi de beden seçicisine benzeyen bir kap ama içindekiler beden
// değil: Under Armour sayfasında renk kodları (001, 513, 738) sepete beden
// diye yazılıyordu. Kalıba "swatch" eklenemez — aynı sayfada beden düğmeleri de
// "SizeSwatchesSection" sınıfını taşıyor ve gerçek beden listesi elenirdi.
const COLOUR_CONTAINER_PATTERN = /renk|colou?r/i;

// Beden tablosu (ölçü tablosu) bir seçici değil: içindeki hücreler ürün türü,
// kalıp adı ve santimetre değerleri taşıyor. Desa'da sayfadaki tek "beden" kabı
// bu tabloydu.
function isSizeChartContainer(element) {
  if (!element || !element.getAttribute) return false;

  const attributes = [
    element.getAttribute("class"),
    element.getAttribute("id"),
    element.getAttribute("data-testid"),
    element.getAttribute("aria-label"),
  ]
    .filter(Boolean)
    .join(" ");

  if (/tablo|chart|guide|rehber|ölçü|olcu|measure/i.test(attributes)) return true;

  // Tablo taşıyan kap seçici değil, ölçü tablosudur.
  return Boolean(element.querySelector && element.querySelector("table"));
}

// Beden seçicisi ürün formunda durur; menüde, modalda, başlıkta ya da alt
// bilgide değil. Koton'un kategori menüsü ("Kadın", "Erkek", "Mayo") beden
// listesine bu yüzden sızıyordu: menü de sayfada duruyor ve gizli olsa bile
// kabı beden işareti taşıyabiliyor.
const SITE_CHROME_PATTERN = /modal|menu|menü|nav|drawer|popup|header|footer|cookie|cerez|çerez|basket|sepet|mini-?cart/i;

function isSiteChromeContainer(element) {
  let current = element;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (current.getAttribute) {
      const attributes = [
        current.getAttribute("class"),
        current.getAttribute("id"),
        current.getAttribute("role"),
        current.getAttribute("data-testid"),
      ]
        .filter(Boolean)
        .join(" ");

      if (SITE_CHROME_PATTERN.test(attributes)) return true;
    }

    const tag = current.tagName ? current.tagName.toLowerCase() : "";

    if (tag === "nav" || tag === "header" || tag === "footer" || tag === "dialog") {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

function isColourContainer(element) {
  if (!element || !element.getAttribute) return false;

  const attributes = [
    element.getAttribute("class"),
    element.getAttribute("id"),
    element.getAttribute("data-testid"),
    element.getAttribute("aria-label"),
  ]
    .filter(Boolean)
    .join(" ");

  return COLOUR_CONTAINER_PATTERN.test(attributes);
}

function hasSizeSignal(element) {
  if (!element || !element.getAttribute) return false;

  if (isColourContainer(element)) return false;

  const attributes = [
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

  if (SIZE_LABEL_PATTERN.test(attributes)) return true;

  const labelledBy = element.getAttribute("aria-labelledby");

  if (labelledBy && document.getElementById) {
    const label = document.getElementById(labelledBy);
    if (label && SIZE_LABEL_PATTERN.test(cleanText(label.textContent))) return true;
  }

  // Başlık çoğu sitede kabın kardeşi: "Beden" <div>...seçenekler...</div>
  const previous = element.previousElementSibling;

  if (previous) {
    const previousText = cleanText(previous.textContent);
    if (previousText.length <= 40 && SIZE_LABEL_PATTERN.test(previousText)) return true;
  }

  const parent = element.parentElement;

  if (parent && parent.getAttribute) {
    const parentAttributes = [
      parent.getAttribute("id"),
      parent.getAttribute("class"),
      parent.getAttribute("data-testid"),
    ]
      .filter(Boolean)
      .join(" ");

    if (SIZE_LABEL_PATTERN.test(parentAttributes)) return true;
  }

  return false;
}

function collectSizesFromSelect(select) {
  const options = Array.from(select.options || []);
  const sizes = [];
  let selected = "";

  for (const option of options) {
    const text = stripSizeLabelPrefix(
      cleanText(option.textContent) || cleanText(option.value),
    );

    if (!looksLikeSizeText(text)) continue;
    if (isDisabledSizeOption(option)) continue;

    sizes.push(text);

    if (option.selected) selected = text;
  }

  return { sizes, selected };
}

function collectSizesFromContainer(container, requireStrictToken) {
  // İşaretli kapta seçenekler herhangi bir etikette olabiliyor: Beymen bedenleri
  // düz <span> olarak basıyor ve yalnızca li/button/label/a aramak onları
  // tamamen kaçırıyordu. İşareti olmayan kapta liste dar tutuluyor, çünkü orada
  // her yaprağı aday saymak sayfanın yarısını beden sanmak demek.
  const selector = requireStrictToken
    ? "li, button, label, a, span[data-size], div[data-size], input[type='radio']"
    : "li, button, label, a, span, div, option, input[type='radio']";

  const candidates = Array.from(container.querySelectorAll(selector));

  const sizes = [];
  let selected = "";

  for (const candidate of candidates) {
    // İç içe düğümlerde aynı metni iki kez okumamak için yalnızca başka bir
    // aday içermeyen en alttaki düğümü alıyoruz.
    // İç içe düğümlerde aynı metni iki kez okumamak için yalnızca başka bir
    // aday içermeyen en alttaki düğüm alınıyor.
    if (candidate.children && candidate.children.length > 1) continue;
    if (candidate.querySelector && candidate.querySelector("li, button, label, a")) continue;

    const text = stripSizeLabelPrefix(
      cleanText(candidate.getAttribute("data-size")) ||
        cleanText(candidate.getAttribute("aria-label")) ||
        cleanText(candidate.textContent) ||
        cleanText(candidate.value),
    );

    if (!looksLikeSizeText(text)) continue;
    if (requireStrictToken && !isStrictSizeToken(text)) continue;
    if (isDisabledSizeOption(candidate)) continue;

    sizes.push(text);

    if (isSelectedSizeOption(candidate)) selected = text;
  }

  return { sizes, selected };
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
      const sizes = [];

      for (const variant of variants) {
        const raw = variant.size ?? null;
        const text = cleanText(typeof raw === "object" ? raw?.name : raw);

        if (text && looksLikeSizeText(text)) sizes.push(text);
      }

      if (sizes.length) return sizes;
    } catch {
      continue;
    }
  }

  return [];
}

function dedupeSizes(sizes) {
  const seen = new Set();
  const unique = [];

  for (const size of sizes) {
    const key = size.toLocaleLowerCase("tr-TR");

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(size);

    // Liste bu kadar uzunsa beden değil başka bir liste yakalanmıştır.
    if (unique.length >= 40) break;
  }

  return unique;
}

// Sayfadaki beden seçeneklerini ve varsa sayfada seçili olanı döndürür.
// Tüm body'yi gezdiği için pahalı: taksit ve kargo taraması gibi yalnızca ürün
// oturduktan sonra bir kez çağrılır, yoklama döngüsünün içinde asla.
function findSizeOptions() {
  const sizes = [];
  let selected = "";

  for (const select of document.querySelectorAll("select")) {
    if (!hasSizeSignal(select)) continue;

    const fromSelect = collectSizesFromSelect(select);

    sizes.push(...fromSelect.sizes);
    if (!selected) selected = fromSelect.selected;
  }

  const containerSelector = [
    "[class*='size' i]",
    "[class*='beden' i]",
    "[id*='size' i]",
    "[id*='beden' i]",
    "[data-testid*='size' i]",
    "[data-qa-action*='size' i]",
    "[aria-label*='beden' i]",
    "fieldset",
    "ul",
  ].join(",");

  for (const container of document.querySelectorAll(containerSelector)) {
    const signalled = hasSizeSignal(container);

    // Seçicide "ul" ve "fieldset" de var: ağır bir sayfada bunlardan yüzlerce
    // olabiliyor ve her birinde görünürlük kontrolü layout tetikliyor. İşareti
    // olmayan kapta önce ucuz olan çocuk sayısına bakıyoruz — gerçek bir beden
    // seçicisinde kırktan fazla seçenek olmuyor.
    if (!signalled && container.childElementCount > 40) continue;
    if (isColourContainer(container)) continue;
    if (isSizeChartContainer(container)) continue;
    if (isSiteChromeContainer(container)) continue;
    if (!isVisibleElement(container)) continue;
    const fromContainer = collectSizesFromContainer(container, !signalled);

    // İşareti olmayan kapta tek bir jeton beden listesi sayılmaz; gerçek beden
    // seçicisinde her zaman birden fazla seçenek olur.
    if (!signalled && fromContainer.sizes.length < 2) continue;

    sizes.push(...fromContainer.sizes);
    if (!selected) selected = fromContainer.selected;
  }

  if (!sizes.length) sizes.push(...collectSizesFromStructuredData());

  const uniqueSizes = dedupeSizes(sizes);

  return {
    sizes: uniqueSizes,
    size: uniqueSizes.includes(selected) ? selected : "",
  };
}
