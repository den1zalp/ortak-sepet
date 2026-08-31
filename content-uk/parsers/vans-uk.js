// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// Vans'in İngiltere mağazası ayrı bir alan adında değil: vans.co.uk global
// vans.com adresinin /en-gb/ yoluna yönleniyor. Content script yalnızca o yola
// enjekte ediliyor (bkz. manifest.json), yoksa aynı kod /de/ ya da /fr/
// sayfalarında euro fiyatını "UK" bölgesiyle damgalardı.
//
// Sayfada okunacak yapısal veri yok: JSON-LD yalnızca WebSite/BreadcrumbList
// düğümleri taşıyor, Product hiç basılmıyor ve og: etiketleri sunucudan gelen
// HTML'de bulunmuyor. Arayüz de Tailwind yardımcı sınıflarıyla kurulmuş, yani
// fiyatın ya da başlığın tutunabileceği anlamlı bir sınıf adı yok.
//
// Bu yüzden başlığa tutunup fiyatı oradan buluyoruz: ürün adı h1, ödenecek
// tutar ise h1 ile aynı kutunun içinde duran ilk fiyat düğümü. Sayfanın
// altındaki öneri şeritleri onlarca fiyat daha basıyor; kutuyla sınırlamak
// onları tamamen dışarıda bırakıyor.

// looksLikeGbpPrice metni 90 karakterle sınırlıyor; sarmalayıcı kutunun metni
// başlığı da taşıdığı için o sınıra takılabiliyor. Kutu ararken yalnızca
// tutarın varlığına bakıyoruz.
function hasVansUkAmount(text) {
  const clean = cleanText(text);

  return /£/.test(clean) && /\d/.test(clean);
}

// text-decoration miras alınmadığı için düğümün kendisi kadar kutuya kadar
// olan atalarına da bakılıyor. Sınıf adına güvenmek Tailwind'de kırılgan.
function isVansUkStruckThrough(element, container) {
  let current = element;

  while (current) {
    if (window.getComputedStyle(current).textDecorationLine.includes("line-through")) {
      return true;
    }

    if (current === container) return false;

    current = current.parentElement;
  }

  return false;
}

function findVansUkPriceContainer() {
  const heading = document.querySelector("h1");
  if (!heading) return null;

  let container = heading.parentElement;

  // Fiyat, başlığın üç ata yukarısındaki kutuda; sayfa düzeni değişirse diye
  // birkaç adım daha bakıyoruz ama öneri şeritlerine ulaşacak kadar değil.
  for (let step = 0; container && step < 4; step += 1) {
    if (hasVansUkAmount(container.textContent)) return container;

    container = container.parentElement;
  }

  return null;
}

function findVansUkPriceText() {
  const container = findVansUkPriceContainer();
  if (!container) return "";

  const priceNodes = Array.from(container.querySelectorAll("*")).filter(
    (element) => looksLikeGbpPrice(element.textContent) && !hasChildWithPriceText(element),
  );

  // İndirimli düzen doğrulanamadı: sitede indirim bölümü bulunamadığı için
  // üstü çizili liste fiyatının ödenecek tutardan önce mi sonra mı geldiği
  // görülemedi. Sıraya güvenmek yerine üstü çizili olanı eliyoruz.
  const payable = priceNodes.find((element) => !isVansUkStruckThrough(element, container));

  return cleanText(payable?.textContent || "");
}

// h1 yalnızca model adını veriyor ("Classic Slip-On Shoes") ve her renk ayrı
// sayfada duruyor; renk olmadan sepette iki ürün ayırt edilemiyor. Renk
// varyasyon alanının başlığında "Color: Black/White" biçiminde yazılı —
// İngiltere mağazası olmasına rağmen site Amerikan yazımını kullanıyor, iki
// yazımı da kabul ediyoruz. Yedek olarak sayfa başlığındaki "in <renk>"
// kalıbı okunuyor.
function findVansUkColor() {
  const label = Array.from(document.querySelectorAll("fieldset p, fieldset legend")).find(
    (element) => /^colou?r\s*:/i.test(cleanText(element.textContent)),
  );

  if (label) return cleanText(label.textContent).replace(/^colou?r\s*:\s*/i, "");

  const fromTitle = cleanText(document.title).match(/\bin\s+([^|]+?)\s*\|/i);

  return fromTitle ? cleanText(fromTitle[1]) : "";
}

// Ürün kodu adresin sonunda duruyor ("/p/old-skool-classic-backpack-VN000H4YHTL")
// ve galeri görsellerinin yolunda da aynı kod geçiyor. Kodla eşleştirmezsek en
// büyük görsel seçiliyor ve sayfadaki tanıtım görseli ("Free gift with this
// backpack") ürünün fotoğrafının önüne geçebiliyor.
function findVansUkImage() {
  const sku = (window.location.pathname.match(/-([A-Z0-9]{8,})\/?$/) || [])[1];

  return (
    (sku && findImageBySelectors([`img[src*="/${sku}-"]`])) ||
    findImageBySelectors(["img[src*='assets.vans.eu/images/']"]) ||
    findMainImage()
  );
}

function parseVansUk() {
  const name =
    cleanText(getText("h1")) ||
    cleanText(document.title).replace(/\s*\|\s*Vans.*$/i, "").replace(/\s+in\s+[^|]+$/i, "");

  const color = findVansUkColor();

  return {
    site: "Vans UK",
    title: color && !name.toLowerCase().includes(color.toLowerCase())
      ? `${name} - ${color}`
      : name,
    price: cleanPrice(findVansUkPriceText()),
    currency: "GBP",
    image: findVansUkImage(),
    url: window.location.href,
    // Sayfadaki diğer fiyatlar öneri şeritlerindeki başka ürünlere ait;
    // jenerik tarama onlardan birini seçebilir. Yanlış fiyat, fiyatsız
    // üründen kötü.
    preventPriceFallback: true,
  };
}
