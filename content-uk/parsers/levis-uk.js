// Ortak Sepet - generated from content-uk.js. Keep site-specific logic in this file.
//
// levi.com (İngiltere mağazası /GB/ yolunda) Türkiye'deki levis.com.tr ile
// akraba değil: orası T-Soft teması, burası Levi's'in kendi SAP Commerce
// kurulumu.
//
// Fiyat ürün başlığının kutusunda: ".product-info--pdp .price-container .price".
// Aynı ".price-container" sınıfı sayfadaki "kalıbı karşılaştır" ve "bunlar da
// ilgini çekebilir" kartlarında onlarca kez geçiyor, o yüzden arama ürün
// bloğuyla sınırlı. İndirimli üründe ödenecek tutar ".price.hard-sale",
// üstü çizili liste fiyatı ".price.strikedOut" sınıfında.
//
// Not: bu sayfa geliştirme ortamından açılamıyor (Akamai otomasyona ve
// yurt dışı adreslere "Access Denied" dönüyor), parser sayfanın kullanıcının
// tarayıcısından alınan dökümüne göre yazıldı. Canlı test site erişilemezse
// "ATLANDI" satırı basar.
function findLevisUkPriceBox() {
  return (
    document.querySelector(".product-info--pdp .price-container") ||
    document.querySelector(".product-title-block .price-container")
  );
}

function findLevisUkPriceText() {
  const box = findLevisUkPriceBox();
  if (!box) return "";

  const sale = box.querySelector(".price.hard-sale");
  if (sale) return cleanText(sale.textContent);

  const regular = Array.from(box.querySelectorAll(".price")).find(
    (element) => !element.classList.contains("strikedOut"),
  );

  return cleanText(regular?.textContent);
}

// Galeride, renk seçeneklerinde ve küçük önizleme şeridinde hep aynı CDN
// kullanılıyor; ilk eşleşen görsel 155 piksellik bir önizleme karesi olabiliyor
// ve sepette bulanık duruyor. Sayfadaki en büyük görseli seçiyoruz.
//
// Adres yalnızca gerçekten küçükse büyütülüyor: sayfanın indirdiği ölçü
// tarayıcı önbelleğinde hazır, başka bir ölçü istemek CDN'i yeni bir görsel
// üretmeye zorluyor ve sepette saniyelerce boş kare kalıyor.
const LEVIS_UK_MIN_IMAGE_WIDTH = 200;

function upgradeLevisUkImageSize(url) {
  if (!url) return "";

  return String(url)
    .replace(/([?&]wid=)\d+/i, "$1600")
    .replace(/([?&]hei=)\d+/i, "$1600");
}

function findLevisUkImage() {
  const candidates = Array.from(
    document.querySelectorAll("img[src*='lscoglobal.scene7.com']"),
  );

  if (candidates.length === 0) return "";

  const biggest = candidates.reduce(
    (best, image) => ((image.naturalWidth || 0) > (best.naturalWidth || 0) ? image : best),
    candidates[0],
  );

  const source = getImageUrl(biggest);

  return (biggest.naturalWidth || 0) >= LEVIS_UK_MIN_IMAGE_WIDTH
    ? source
    : upgradeLevisUkImageSize(source);
}

// JSON-LD'de ürün bir ProductGroup içinde: hasVariant dizisinin ilk ögesi
// seçili rengin Product'ı ve teklif fiyatı onda duruyor. Paylaşılan okuma
// (parseJsonLdProduct) hasVariant'ın içine inip o Product'ı buluyor.
function parseLevisUk() {
  const structured = parseJsonLdProduct();

  return {
    site: "Levi's UK",
    // h1 yalnızca model adını veriyor ("510™ Skinny Jeans") ve aynı modelin her
    // rengi ayrı sayfada; renksiz başlıkla sepetteki satırlar ayırt edilemiyor.
    // og:title rengi de taşıyor ("510™ Skinny Jeans - Black | Levi's® GB").
    title:
      cleanText(getAttr("meta[property='og:title']", "content")).replace(
        /\s*\|\s*Levi'?s®?\s*GB\s*$/i,
        "",
      ) ||
      cleanText(getText("h1")) ||
      structured?.title,
    price: cleanPrice(findLevisUkPriceText()) || structured?.price,
    currency: structured?.currency || "GBP",
    image:
      findLevisUkImage() ||
      structured?.image ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
    // Sayfada başka ürünlerin fiyatları da var; ana fiyat okunamazsa onlardan
    // birine düşmemeli.
    preventPriceFallback: true,
  };
}
