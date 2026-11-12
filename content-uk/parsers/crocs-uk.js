// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// crocs.co.uk Kasım 2026'da Next.js tabanlı yeni bir vitrine geçti; eski
// Salesforce sınıfları (".sf-product_…") kalmadı, öğeler data-testid taşıyor.
//
// Sayfada iki tür fiyat var: renk gruplarının üstündeki grup fiyatları
// ("pdp-color-group-price-N", indirimli renkler ayrı grupta toplanıyor) ve
// "Select a size" düğmesinin altındaki "pdp-price" bloğu. Yalnızca sonuncusu
// seçili renge göre değişiyor; grup fiyatını okumak indirimli renkte üstü
// çizili £59.99'u veriyordu.
//
// İndirimli varyantta blok iki <p> taşıyor: üstü çizili liste fiyatı
// (".line-through") ve ödenecek tutar (".text-promo", "£35.99 (40%)").
// Bloğun başındaki ekran okuyucu metni de liste fiyatını içerdiği için bloğun
// tamamı okunmuyor; ödenecek tutarın kendi <p>'si alınıyor.
function findCrocsUkPriceText() {
  const block = document.querySelector("[data-testid='pdp-price']");
  if (!block) return "";

  const amount =
    block.querySelector("p.text-promo") ||
    Array.from(block.querySelectorAll("p")).find(
      (element) => !element.classList.contains("line-through"),
    );

  return cleanText(amount?.textContent || "");
}

// h1 yalnızca model adını veriyor ("Classic Lined Clog"); renk olmadan aynı
// terliğin iki rengi sepette ayırt edilemiyor.
function findCrocsUkColor() {
  return (
    cleanText(getText("[data-testid='pdp-selected-color-name']")) ||
    cleanText(
      document
        .querySelector("[data-slot='swatch'][aria-checked='true']")
        ?.getAttribute("aria-label") || "",
    )
  );
}

// og:image ve JSON-LD görselleri seçili rengi takip etmiyor: Cargo seçiliyken
// de başka bir rengin (_060_) fotoğrafını veriyor. Galeri görsellerinin adresi
// renk kodunu taşıyor ("/products/203591_3BX_ALT100/"), bu kod da adresteki
// ?cid= ile aynı. Kod yoksa (ör. cid'siz adres) seçili rengin adıyla başlayan
// alt metne bakılıyor.
function findCrocsUkImage(color) {
  const images = Array.from(
    document.querySelectorAll("img[src*='media.crocs.com/images'], img[srcset*='media.crocs.com/images']"),
  );
  const colorCode = new URL(window.location.href).searchParams.get("cid");

  const byCode = colorCode
    ? images.find((img) => (img.currentSrc || img.src).includes(`_${colorCode}_`))
    : null;
  const byAlt = color
    ? images.find((img) => (img.alt || "").toLowerCase().startsWith(`${color.toLowerCase()} `))
    : null;
  const image = byCode || byAlt;

  return image ? getImageUrl(image) : "";
}

function parseCrocsUk() {
  const name =
    cleanText(getText("h1[data-testid='pdp-product-name']")) ||
    cleanText(getText("h1")) ||
    cleanText(getAttr("meta[property='og:title']", "content"));

  const color = findCrocsUkColor();

  return {
    site: "Crocs UK",
    title: color ? `${name} - ${color}` : name,
    price: cleanPrice(findCrocsUkPriceText()),
    image:
      findCrocsUkImage(color) || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    // JSON-LD ürünün bütün renklerini kapsıyor ve seçili renge ait değil.
    // Yanlış fiyat, fiyatsız üründen kötü.
    preventPriceFallback: true,
  };
}
