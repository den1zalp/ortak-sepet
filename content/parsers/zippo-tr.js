// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// zippo.com.tr Shopify Dawn temasını kullanıyor. Ödenecek tutar ".product-price"
// sınıfını taşıyan bir düğümde duruyor ("₺229,90"); bu sınıf yalnızca ana ürün
// fiyatında geçiyor, öneri kartlarındaki fiyat blokları farklı bir yapı
// kullanıyor. JSON-LD'deki offers alanında ise fiyat hiç yok (yalnızca
// priceCurrency/availability var), bu yüzden sayfadan okumaya güveniyoruz.
function findZippoTrPriceText() {
  return (
    cleanText(getText(".price__sale .price-item--sale .product-price")) ||
    cleanText(getText(".price__regular .price-item--regular .product-price")) ||
    cleanText(getText(".product-price"))
  );
}

// Galerideki <img src> Shopify'ın boyutlandırma ekiyle yazılıyor
// ("...1_13749_HQ.jpg;width=1946") ama sitenin görsel sunucusu bu biçimi
// tanımıyor: adres 404 dönüyor. Sayfada göze çarpmıyor, çünkü tarayıcı
// görseli srcset'ten seçiyor ve src'ye hiç dokunmuyor; sepete src gittiği
// için ürünün görseli boş kalıyordu.
//
// srcset'teki adaylar eksiz ve hepsi aynı dosyayı gösteriyor (site farklı
// boyut üretmiyor, yalnızca genişlik tanımlarını çoğaltıyor), o yüzden ilk
// adayı almak yeterli.
function findZippoTrImageUrl() {
  const image = document.querySelector(".product__media-wrapper img");

  if (!image) return "";

  const fromSrcset = String(image.getAttribute("srcset") || "")
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .find(Boolean);

  const url =
    fromSrcset || image.currentSrc || image.getAttribute("src") || "";

  // Yine de eke sahip bir adrese düşersek dosya adından sonrasını kırpıyoruz.
  return String(url).replace(/;[^/;]*$/, "");
}

function parseZippoTr() {
  return {
    site: "Zippo",
    // h1 temiz ürün adını veriyor; document.title sonuna site sloganı ekliyor.
    title:
      cleanText(getText("h1")) ||
      cleanText(document.title).replace(
        /\s*-\s*Orijinal Zippo.*$/i,
        "",
      ),
    price:
      cleanPrice(findZippoTrPriceText()) ||
      cleanPrice(findMainPrice()),
    // og:image sabit bir tanıtım görseli, ürüne özel değil; galerideki ilk
    // görsel ürünün kendisi.
    image:
      findZippoTrImageUrl() ||
      findProductImage({
        minWidth: 150,
        minHeight: 150,
        cdnRegex: /zippo\.com\.tr\/images\/products/i,
      }),
    url: window.location.href,
  };
}
