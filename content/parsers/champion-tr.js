// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// championturkiye.com, LTB ile aynı MUI/emotion altyapısında: sınıf adları
// ("muirtl-4mav5x") derlemeyle değişen karmalar, seçici yazmak kalıcı olmaz.
// JSON-LD ise ürünün ödenecek tutarını veriyor.
function parseChampionTr() {
  const structured = parseJsonLdProduct();

  return {
    site: "Champion",
    // JSON-LD adı ürünü tanıtmaya yetmiyor ("Hooded Sweatshirt"); document.title
    // koleksiyon, cinsiyet, renk ve kalıbı da yazıyor ("Script Shop Erkek Siyah
    // Standard Fit Hooded Sweatshirt | Champion Türkiye").
    title:
      cleanText(document.title).replace(/\s*\|\s*Champion Türkiye\s*$/i, "") ||
      cleanText(getText("h1")) ||
      structured?.title,
    price: structured?.price,
    currency: structured?.currency || null,
    image:
      structured?.image ||
      findProductImage({ minWidth: 300, minHeight: 300, cdnRegex: /img-champion\.mncdn\.com/i }),
    url: window.location.href,
    // Alttaki öneri kartları onlarca fiyat basıyor; ana fiyat okunamazsa
    // onlardan birine düşmemeli.
    preventPriceFallback: true,
  };
}
