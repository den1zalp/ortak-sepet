// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// adidas.com.tr ile adidas.co.uk aynı platformu kullanıyor; karşılığı
// content-uk/parsers/adidas-uk.js — birine yapılan düzeltme çoğu zaman
// ötekinde de geçerli.
//
// JSON-LD "ProductGroup" düğümü basıyor ve içinde offers yok, yani fiyat
// yalnızca DOM'da. Fiyat kutusundaki testid'ler indirimli üründe şöyle
// dolduruluyor:
//
//   [data-testid="main-price"]      → "İndirimli fiyat2.669 TL"  (ödenecek)
//   [data-testid="original-price"]  → "4.499 TL Orijinal fiyat"  (üstü çizili)
//   [data-testid="discount-text"]   → "-40%"
//
// İndirim yokken yalnızca "main-price" oluyor ve içeriği "Fiyat10.199 TL".
// Yani ödenecek tutar her iki durumda da "main-price"; ekran okuyucu için
// eklenen "Fiyat"/"İndirimli fiyat" ön ekini cleanPrice zaten eliyor.
//
// Aramayı ürün sayfasının fiyat bileşeniyle sınırlamak şart: sayfada
// "price-component" testid'sini taşıyan başka kutular da var ve ilki alttaki
// öneri kartına ait (ürün 10.199 TL iken o kutu 2.049 TL diyordu). Ürünün
// kendi kutusu ek olarak "_pdp_" sınıfını taşıyor.
function findAdidasTrPriceText() {
  return cleanText(
    getText("[data-testid='price-component'][class*='_pdp_'] [data-testid='main-price']"),
  );
}

// h1 marka ve renk taşımıyor ("Adizero EVO SL Ayakkabı"); og:title üçünü
// birden veriyor ("adidas Adizero EVO SL Ayakkabı - Beyaz | adidas Türkiye").
// Aynı ayakkabının iki rengi sepette ancak böyle ayırt ediliyor.
function findAdidasTrTitle() {
  const fromMeta = cleanText(getAttr("meta[property='og:title']", "content")).replace(
    /\s*\|\s*adidas.*$/i,
    "",
  );

  return fromMeta || cleanText(getText("[data-testid='product-title']"));
}

// Galeri görselinin src'si düşük çözünürlüklü yer tutucu ("w_500"); tarayıcının
// gerçekten yüklediği dosya srcset'ten geliyor ("h_840"). currentSrc onu
// veriyor, henüz yüklenmediyse srcset'in ilk adayına düşüyoruz.
function findAdidasTrImageUrl() {
  const image = document.querySelector("picture[data-testid='pdp-gallery-picture'] img");

  if (!image) return "";

  const fromSrcset = String(image.getAttribute("srcset") || "")
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .find(Boolean);

  return image.currentSrc || fromSrcset || image.getAttribute("src") || "";
}

function parseAdidasTr() {
  return {
    site: "Adidas",
    title: findAdidasTrTitle(),
    price: cleanPrice(findAdidasTrPriceText()),
    // og:image sosyal paylaşım için 1200x630'a kırpılmış hâli; galerideki
    // fotoğraf ürünün kendisi ve seçili rengi gösteriyor.
    image:
      findAdidasTrImageUrl() || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    // Fiyat kutusunun hemen altında taksit tutarı yazıyor ("Vade farksız 3
    // taksit imkanı 3.399,67 TL") ve alttaki öneri kartlarının da fiyatı var;
    // jenerik tarama bunlardan birini seçebilir.
    preventPriceFallback: true,
  };
}
