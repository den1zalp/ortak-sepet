// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// crocs.co.uk Salesforce Commerce Cloud kullanıyor. Sayfada üç ayrı fiyat
// bloğu var: renk gruplarının üstündeki grup fiyatları (indirimli renkler ayrı
// grupta toplandığı için burada iki farklı tutar görünüyor) ve sepete ekleme
// kutusundaki seçili varyantın fiyatı. Yalnızca sonuncusu seçili renge ait,
// diğerlerini okumak beyaz terlikte indirimli rengin fiyatını gösteriyordu.
//
// İndirimli varyantta blok "List Price:£54.99 £38.49 (30%)" metnini veriyor:
// üstü çizili liste fiyatı önce geldiği için bloğun tamamını okumak yanlış
// tutarı seçtiriyor. İndirimli tutar ayrı sınıfta duruyor, önce ona bakıyoruz.
//
// Renk gruplarının üstündeki ".sf-product_price" bloğu yedek olarak bile
// kullanılamıyor: indirimli bir üründe sayfadaki ilk blok üstü çizili £54.99'u
// verirken ödenecek tutar £38.49 oluyor.
function findCrocsUkPriceText() {
  return (
    cleanText(getText(".sf-product_buystack-actions-price .sf-u-color-sale")) ||
    cleanText(getText(".sf-product_buystack-actions-price"))
  );
}

// h1 yalnızca model adını veriyor ("Classic Clog"); renk olmadan aynı terliğin
// iki rengi sepette ayırt edilemiyor. Renk başlığı "Colour: White" biçiminde,
// ön eki atıp yalnızca rengi alıyoruz.
function findCrocsUkColor() {
  const label = cleanText(getText("h2.sf-product-color-swatch-label"));
  const withoutPrefix = label.replace(/^colou?r\s*:\s*/i, "");

  if (withoutPrefix && withoutPrefix !== label) return withoutPrefix;

  const selected = document.querySelector(
    "#product-variations-list .sf-product_color-selected",
  );

  return cleanText(selected?.getAttribute("aria-label") || "");
}

function parseCrocsUk() {
  const name =
    cleanText(getText("h1.sf-product_name")) ||
    cleanText(getAttr("meta[property='og:title']", "content"));

  const color = findCrocsUkColor();
  const gallery = document.querySelector("img.sf-product_gallery-image");

  return {
    site: "Crocs UK",
    title: color ? `${name} - ${color}` : name,
    price: cleanPrice(findCrocsUkPriceText()),
    // og:image seçili rengi takip ediyor (adres varyant kodunu taşıyor), o
    // yüzden galeri okunamazsa yedek olarak güvenli.
    image:
      (gallery ? getImageUrl(gallery) : "") ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    // JSON-LD'deki offers dizisi ürünün tüm renklerini kapsıyor ve ilk teklif
    // seçili renge ait olmak zorunda değil: beyaz terlik £49.99 iken dizinin
    // başında indirimli bir rengin £34.99'u duruyor. Yanlış fiyat, fiyatsız
    // üründen kötü.
    preventPriceFallback: true,
  };
}
