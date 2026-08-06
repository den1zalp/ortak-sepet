// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// samsonite.com.tr Ticimax altyapısında. Ödenecek tutar "#fiyat2" kutusundaki
// ".spanFiyat" içinde duruyor ("25.290 TL"). Aynı fiyat bloğunda ikinci ürüne
// özel kampanya tutarı da basılıyor ("2.'ye %30 İndirim 17.703 TL"); genel
// fiyat taraması bu daha büyük puntolu satırı seçebildiği için fiyatı doğrudan
// kutudan okuyoruz.
function findSamsoniteTrPriceText() {
  return (
    cleanText(getText("#fiyat2 .spanFiyat")) ||
    cleanText(getText("#fiyat1 .spanFiyat")) ||
    cleanText(getText("#divIndirimliFiyat .spanFiyat")) ||
    cleanText(getText("#divIndirimsizFiyat .spanFiyat"))
  );
}

function parseSamsoniteTr() {
  return {
    site: "Samsonite",
    // h1 ürünün tam adını veriyor; og:title sonuna " | Samsonite" ekliyor.
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")).replace(
        /\s*\|\s*Samsonite.*$/i,
        "",
      ),
    price: cleanPrice(findSamsoniteTrPriceText()),
    // Galerideki <img> etiketleri lazy-load: sayfa açılırken hepsinin src'si
    // "blank.png" oluyor. og:image ilk andan itibaren gerçek görseli veriyor.
    image:
      getAttr("meta[property='og:image']", "content") ||
      getAttr("meta[name='twitter:image']", "content"),
    url: window.location.href,
  };
}
