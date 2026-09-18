// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// koton.com'da ürün fiyatı JSON-LD ve og:price:amount olarak iki kez
// yayımlanıyor ve ikisi de indirimli üründe ödenecek tutarı veriyor
// (899,99 TL ödenecek, 1.499,99 TL üstü çizili iken offers.price 899.99).
//
// Sayfadan seçiciyle okumak burada özellikle riskli: ürünün altındaki öneri
// karuselleri ("rfbz-pr", "rfkai-pr" sınıfları) onlarca başka fiyat basıyor ve
// ana fiyattan daha kalabalıklar.
// h1 rengi yazmıyor ama aynı modelin her rengi ayrı sayfada duruyor; renksiz
// başlıkla sepetteki iki satır birbirinden ayırt edilemiyor. Site rengi
// "Renk: İndigo Stone" biçiminde basıyor, etiketi atıp değeri alıyoruz.
function findKotonColor() {
  const raw = cleanText(getText(".product-attributes-color"));
  return raw.replace(/^renks*:s*/i, "");
}

function parseKoton() {
  const structured = parseJsonLdProduct();
  const metaProduct = parseMetaProduct();
  const color = findKotonColor();
  const name =
    cleanText(getText("h1")) ||
    structured?.title ||
    cleanText(getAttr("meta[property='og:title']", "content"));

  return {
    site: "Koton",
    // h1 ürün adını cinsiyet ve ürün kodu olmadan veriyor; document.title
    // "Erkek ... 7WAM50010ND | Koton" biçiminde ve sepette gürültü yapıyor.
    title:
      color && !name.toLocaleLowerCase("tr-TR").includes(color.toLocaleLowerCase("tr-TR"))
        ? `${name} - ${color}`
        : name,
    price: structured?.price || metaProduct?.price || null,
    currency: structured?.currency || metaProduct?.currency || null,
    image:
      structured?.image ||
      getAttr("meta[property='og:image']", "content") ||
      findProductImage({ minWidth: 300, minHeight: 300 }),
    url: window.location.href,
    // Ana fiyat okunamadıysa öneri karusellerindeki tutarlardan birine
    // düşmektense fiyatsız kalmak doğru.
    preventPriceFallback: true,
  };
}
