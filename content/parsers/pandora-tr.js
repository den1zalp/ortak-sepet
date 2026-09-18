// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// tr.pandora.net Chakra UI ile yazılmış: sınıf adları ("css-1pzpb6g") derleme
// çıktısı ve kalıcı değil, JSON-LD hiç yok, og:image de yok. Elimizdeki tek
// kararlı tutamak data-testid değerleri.
//
// Fiyat ürünün satın alma kutusunda ("buy-box"); alttaki öneri kartları
// [data-testid='product-tile-price'] kullanıyor, onlara hiç bakmıyoruz.
// Kapsamlar sırayla deneniyor, "ilk var olanı seç" değil: "buy-box" sayfada
// duruyor ama fiyatı içermiyor (fiyat onun dışında, "product-view" içinde).
// İlk var olan kapsamı seçmek fiyatı hiç bulamamaya yol açıyordu.
function findPandoraPriceText(scopeSelectors) {
  const scopes = [
    ...scopeSelectors.map((selector) => document.querySelector(selector)),
    document.body,
  ].filter(Boolean);

  for (const scope of scopes) {
    const node = Array.from(scope.querySelectorAll("span, p, div")).find((element) => {
      if (element.closest("[data-testid='product-tile-price']")) return false;

      const ownText = cleanText(
        Array.from(element.childNodes)
          .filter((child) => child.nodeType === 3)
          .map((child) => child.textContent)
          .join(" "),
      );

      // Metni yalnızca tutardan ibaret olan öge aranıyor; gevşek eşleşme
      // ürün kutusundaki "Kargo 2,99 TL" gibi satırları fiyat sanıyor.
      return /^₺?\s?[\d.]+(?:,\d{2})?\s?(?:TL)?$/.test(ownText) && /\d/.test(ownText);
    });

    if (node) return cleanText(node.textContent);
  }

  return "";
}

// Galerideki görselin adresi boyut parametresi taşıyor (sw=384) ve sayfa onu
// zaten indirmiş oluyor. Adresi olduğu gibi kullanıyoruz: sepetteki kare 58
// piksel, 384 fazlasıyla yetiyor ve tarayıcı önbellekten okuduğu için anında
// görünüyor. Boyutu yükseltmek CDN'i o ölçüyü ilk istekte üretmeye zorluyor ve
// görsel saniyelerce boş kalıyor.
function findPandoraImage() {
  const image =
    document.querySelector("[data-testid='hero-container'] img") ||
    document.querySelector("img[itemprop='image']");

  return image?.currentSrc || image?.getAttribute("src") || "";
}

// h1 iki tane: ilki sayfa başındaki "Pandora" logosu, ikincisi ürün adı.
function findPandoraTitle() {
  const headings = Array.from(document.querySelectorAll("h1"))
    .map((element) => cleanText(element.textContent))
    .filter((text) => text && !/^pandora$/i.test(text));

  return (
    headings[0] ||
    cleanText(document.title).replace(/\s*\|\s*Pandora.*$/i, "")
  );
}

function parsePandoraTr() {
  return {
    site: "Pandora",
    title: findPandoraTitle(),
    price: formatTryPriceText(
      findPandoraPriceText(["[data-testid='buy-box']", "[data-testid='product-view']"]),
    ),
    image: findPandoraImage(),
    url: window.location.href,
    preventPriceFallback: true,
  };
}
