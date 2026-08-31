// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// Nike'ın İngiltere mağazası global nike.com adresinin /gb/ yolunda; content
// script yalnızca o yola enjekte ediliyor (bkz. manifest.json). Türkiye
// mağazası aynı sayfa yapısını kullanıyor, karşılığı
// content/parsers/nike-tr.js — birine yapılan düzeltme çoğu zaman ötekinde de
// geçerli.
//
// JSON-LD "ProductGroup" düğümü basıyor ve içinde offers yok, yani fiyat
// yalnızca DOM'da. İndirimli üründe ödenecek tutarla üstü çizili liste fiyatı
// ayrı testid'lerde duruyor:
//
//   #price-container
//     [data-testid="currentPrice-container"]  → £101.49  (ödenecek)
//     [data-testid="initialPrice-container"]  → £144.99  (üstü çizili)
//
// Kutunun tamamı "£101.49£144.9930% off" veriyor; sıraya güvenmek yerine
// doğrudan ödenecek tutarın testid'sini okuyoruz.
function findNikeUkPriceText() {
  return cleanText(getText("#price-container [data-testid='currentPrice-container']"));
}

// h1 kısaltılmış model adını veriyor ("Nike Vomero 18"); og:title tam adı
// ("Nike Vomero 18 Men's Road Running Shoes").
function findNikeUkName() {
  return (
    cleanText(getAttr("meta[property='og:title']", "content")) ||
    // Türkiye'den bakınca sayfada konum soran bir pencere açılıyor ve onun
    // başlığı da h1; DOM'da ürün başlığından önce geliyor, id ile seçmek şart.
    cleanText(getText("h1#pdp_product_title"))
  );
}

// Aynı modelin her rengi ayrı sayfada ve ad renk taşımıyor. Renk ürün
// açıklamasının ilk maddesinde: "Colour Shown: White/Volt Tint/Sapphire".
// Aynı metin alttaki özellik listesinde de geçtiği için testid ile
// sınırlıyoruz.
function findNikeUkColor() {
  const label = cleanText(getText("[data-testid='product-description-color-description']"));

  return label.replace(/^(colou?r shown|gösterilen renk)\s*:\s*/i, "");
}

function parseNikeUk() {
  const name = findNikeUkName();
  const color = findNikeUkColor();

  return {
    site: "Nike UK",
    title:
      color && !name.toLowerCase().includes(color.toLowerCase())
        ? `${name} - ${color}`
        : name,
    price: cleanPrice(findNikeUkPriceText()),
    currency: "GBP",
    // og:image sosyal paylaşım için üretilmiş birleşik bir görsel; galerideki
    // fotoğraf ürünün kendisi ve seçili rengi gösteriyor.
    image:
      findImageBySelectors(["img[src*='static.nike.com/a/images']"]) ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    // Sayfanın altındaki öneri kartları onlarca fiyat daha basıyor; jenerik
    // tarama onlardan birini seçebilir. Yanlış fiyat, fiyatsız üründen kötü.
    preventPriceFallback: true,
  };
}
