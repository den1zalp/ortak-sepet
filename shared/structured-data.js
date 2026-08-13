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

function parseJsonLdProduct() {
  const scripts = document.querySelectorAll("script[type='application/ld+json']");

  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent);
      const product = findProductInJsonLd(json);

      if (!product) continue;

      const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;

      let image = "";

      if (Array.isArray(product.image)) {
        image = product.image[0];
      } else if (typeof product.image === "string") {
        image = product.image;
      } else if (product.image && product.image.url) {
        image = product.image.url;
      }

      const rawPrice = offers?.price ?? offers?.lowPrice ?? offers?.highPrice;
      const currency = String(offers?.priceCurrency || "").toUpperCase();

      return {
        site: getSiteName(),
        title: cleanText(product.name),
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
    title: cleanText(title),
    price: formatStructuredPrice(price, currency) || cleanPrice(price),
    currency: currency || null,
    image,
    url: window.location.href,
  };
}
