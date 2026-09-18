// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// uk.pandora.net, tr.pandora.net ile aynı Chakra UI kurulumu: sınıf adları
// derleme çıktısı, JSON-LD ve og:image yok. Kararlı olan data-testid'ler.
//
// Fiyat satın alma kutusunda; alttaki öneri kartları
// [data-testid='product-tile-price'] kullanıyor ve dışarıda bırakılıyor.
// Kapsamlar sırayla deneniyor: "buy-box" sayfada var ama TR mağazasında
// fiyatı içermiyordu, fiyat "product-view" içinde kalıyor.
function findPandoraUkPriceText() {
  const scopes = [
    document.querySelector("[data-testid='buy-box']"),
    document.querySelector("[data-testid='product-view']"),
    document.body,
  ].filter(Boolean);

  // Metni yalnızca tutardan ibaret olan ögeyi arıyoruz. Gevşek bir eşleşme
  // ("£" geçen her kısa metin) ürün kutusundaki "Standard delivery £2.99"
  // satırını fiyat sanıyordu.
  const isOnlyPrice = (text) => /^£\s?[\d,]+(?:\.\d{2})?$/.test(text);

  for (const scope of scopes) {
    const node = Array.from(scope.querySelectorAll("span, p, div")).find((element) => {
      if (element.closest("[data-testid='product-tile-price']")) return false;

      const ownText = cleanText(
        Array.from(element.childNodes)
          .filter((child) => child.nodeType === 3)
          .map((child) => child.textContent)
          .join(" "),
      );

      return isOnlyPrice(ownText);
    });

    if (node) return cleanText(node.textContent);
  }

  return "";
}

function parsePandoraUk() {
  const heading = Array.from(document.querySelectorAll("h1"))
    .map((element) => cleanText(element.textContent))
    .find((text) => text && !/^pandora$/i.test(text));

  const hero =
    document.querySelector("[data-testid='hero-container'] img") ||
    document.querySelector("img[itemprop='image']");

  return {
    site: "Pandora UK",
    title: heading || cleanText(document.title).replace(/\s*\|\s*Pandora.*$/i, ""),
    price: cleanPrice(findPandoraUkPriceText()),
    currency: "GBP",
    // Adres olduğu gibi kullanılıyor: sayfa o boyutu zaten indirmiş oluyor ve
    // sepetteki 58 piksellik kare için fazlasıyla yetiyor. Boyutu yükseltmek
    // CDN'i yeni bir ölçü üretmeye zorluyor, görsel saniyelerce boş kalıyor.
    image: String(hero?.currentSrc || hero?.getAttribute("src") || ""),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
