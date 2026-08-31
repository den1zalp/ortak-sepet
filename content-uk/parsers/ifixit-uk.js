// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// iFixit'in İngiltere mağazası ayrı bir alan adında değil, global ifixit.com
// altındaki /en-gb/ yolunda. Content script yalnızca oradaki ürün sayfalarına
// enjekte ediliyor (bkz. manifest.json): sitenin geri kalanı dev bir tamir
// rehberi wiki'si ve orada sepete eklenecek bir şey yok.
//
// Sayfa Tailwind yardımcı sınıflarıyla kuruluyor ama fiyat düğümleri data-slot
// ve data-testid işaretleri taşıyor; sınıf adları yerine onlara tutunuyoruz.
// İndirimli üründe blok "Sale price £18.99 Regular price £21.99 14% Off"
// metnini veriyor — üstü çizili tutar da içinde — o yüzden bloğun tamamı değil
// ödenecek tutarın kendi düğümü okunuyor. Blok işareti sayfada tek; aynı
// data-slot alttaki öneri kartlarında da geçtiği için seçici onunla
// sınırlanıyor. ("Sale price" ekran okuyucu metni; cleanPrice() "price"
// sözcüğünü zaten eliyor.)
function findIfixitUkPriceText() {
  return cleanText(
    getText("[data-testid='product-price-section'] [data-slot='price']"),
  );
}

function parseIfixitUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "iFixit UK",
    // h1 ürünün tam adını veriyor ("Anti-Clamp - B-Stock"); document.title de
    // aynı, site adı eklenmiyor.
    title:
      cleanText(getText("h1")) ||
      cleanText(structured?.title) ||
      cleanText(document.title),
    price: cleanPrice(findIfixitUkPriceText()) || structured?.price || null,
    currency: structured?.currency || null,
    // JSON-LD görsel dizisinin ilki galerinin ilk fotoğrafı; og:image aynı
    // dosyayı veriyor ama sayfada birden fazla og:image etiketi var.
    image:
      structured?.image || getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}
