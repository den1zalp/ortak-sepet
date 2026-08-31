// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// Nike'ın Türkiye mağazası ayrı bir alan adında değil: global nike.com
// adresinin /tr/ yolunda (nike.com.tr oraya yönleniyor). Content script
// yalnızca o yola enjekte ediliyor (bkz. manifest.json), yoksa aynı kod /gb/
// sayfalarında sterlin fiyatını "TR" bölgesiyle damgalardı. İngiltere mağazası
// aynı sayfa yapısını kullanıyor, karşılığı content-uk/parsers/nike-uk.js.
//
// Sayfada okunacak yapısal fiyat yok: JSON-LD "ProductGroup" düğümü basıyor,
// içinde offers alanı bulunmuyor. Ama fiyatın kendi data-testid'si var ve
// indirimli üründe ödenecek tutar ile üstü çizili liste fiyatı ayrı
// testid'lerde duruyor:
//
//   #price-container
//     [data-testid="currentPrice-container"]  → 1.999₺   (ödenecek)
//     [data-testid="initialPrice-container"]  → 2.799₺   (üstü çizili)
//     [data-testid="OfferPercentage"]         → %28 indirim
//
// Kutunun tamamını okumak "1.999₺2.799₺%28 indirim" veriyor; yüzdeyi eleyip
// ilk tutarı alsak bile sıraya güvenmiş oluruz. Doğrudan ödenecek tutarın
// testid'sini okuyoruz.
function findNikeTrPriceText() {
  return cleanText(getText("#price-container [data-testid='currentPrice-container']"));
}

// h1 kısaltılmış model adını veriyor ("Nike Air Max Moto 2K"); og:title ise
// ürünün tam adını ("Nike Air Max Moto 2K Erkek Ayakkabısı").
function findNikeTrName() {
  return (
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    // Sayfada konum soran bir kalıcı pencere de h1 kullanıyor ve DOM'da ürün
    // başlığından önce gelebiliyor; id ile seçmek şart.
    cleanText(getText("h1#pdp_product_title"))
  );
}

// Aynı modelin her rengi ayrı sayfada ve ad renk taşımıyor. Renk ürün
// açıklamasının ilk maddesinde: "Gösterilen Renk: Beyaz/Siyah/Wolf Grey".
// Aynı metin alttaki özellik listesinde de geçtiği için testid ile
// sınırlıyoruz.
function findNikeTrColor() {
  const label = cleanText(getText("[data-testid='product-description-color-description']"));

  return label.replace(/^(gösterilen renk|colou?r shown)\s*:\s*/i, "");
}

function parseNikeTr() {
  const name = findNikeTrName();
  const color = findNikeTrColor();

  return {
    site: "Nike",
    title:
      color && !name.toLowerCase().includes(color.toLowerCase())
        ? `${name} - ${color}`
        : name,
    price: cleanPrice(findNikeTrPriceText()),
    // og:image seçili rengi takip ediyor ama sosyal paylaşım için üretilmiş
    // birleşik bir görsel; galerideki fotoğraf ürünün kendisi.
    image:
      findProductImage({
        minWidth: 300,
        minHeight: 300,
        cdnRegex: /static\.nike\.com\/a\/images/i,
        titleSelectors: ["h1#pdp_product_title"],
      }) || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    // Sayfanın altındaki "Bunları da beğenebilirsin" kartları onlarca fiyat
    // daha basıyor; jenerik tarama onlardan birini seçebilir. Yanlış fiyat,
    // fiyatsız üründen kötü.
    preventPriceFallback: true,
  };
}
