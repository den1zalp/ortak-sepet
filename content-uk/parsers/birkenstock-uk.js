// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// Birkenstock'un İngiltere mağazası ayrı bir alan adında değil, global
// birkenstock.com altındaki /gb/ yolunda. Content script yalnızca o yola
// enjekte ediliyor (bkz. manifest.json), yoksa aynı kod /de/ ya da /fr/
// sayfalarında euro fiyatı "UK" bölgesiyle damgalardı.
//
// Site Salesforce Commerce Cloud kullanıyor: ödenecek tutar ".b-price-item"
// içinde, indirim varsa liste fiyatı ".m-old", indirimli tutar ".m-new"
// sınıfını alıyor. Blok metni ekran okuyucu için "Price:" ön ekiyle geliyor;
// cleanPrice() bu sözcüğü zaten eliyor.
//
// Kuşatan ".b-product_details-price" düğümü yedek olarak kullanılamıyor:
// indirimli üründe metni iki tutarı da taşıyor ve önce üstü çizili olan
// geliyor. İkisi de tutmazsa JSON-LD teklifi devreye giriyor.
function findBirkenstockUkPriceText() {
  return (
    cleanText(getText(".b-product_details-price .b-price-item.m-new")) ||
    cleanText(getText(".b-product_details-price .b-price-item:not(.m-old)"))
  );
}

// Aynı modelin her rengi ayrı sayfada ve h1 yalnızca model adını veriyor
// ("Arizona"), yani renk olmadan sepette iki ürün ayırt edilemiyor. Seçili
// renk varyasyon satırında yazılı; genişlik (Width) satırı da aynı sınıfları
// kullandığı için renk satırıyla sınırlıyoruz.
function findBirkenstockUkColor() {
  return cleanText(
    getText(".b-product_details-variations .b-variations_item.m-color .b-variations_item-value"),
  );
}

function parseBirkenstockUk() {
  const structured = parseJsonLdProduct();

  // h1 sadece "Arizona" diyor; JSON-LD adı malzemeyi de taşıyor
  // ("Arizona Birko-Flor") ve aynı modelin deri/suni deri sürümleri ancak
  // böyle ayrılıyor.
  const name =
    cleanText(structured?.title) ||
    cleanText(getText("h1.b-product_details-name")) ||
    cleanText(document.title).replace(/\s*\|\s*BIRKENSTOCK.*$/i, "");

  const color = findBirkenstockUkColor();

  return {
    site: "Birkenstock UK",
    title: color ? `${name} - ${color}` : name,
    price: cleanPrice(findBirkenstockUkPriceText()) || structured?.price || null,
    currency: structured?.currency || null,
    // JSON-LD görseli seçili rengin fotoğrafını veriyor; og:image de aynı
    // dosyayı gösteriyor ama boyutlandırma parametreleri olmadan.
    image: structured?.image || findImageBySelectors([".b-product_image-img"]),
    url: window.location.href,
  };
}
