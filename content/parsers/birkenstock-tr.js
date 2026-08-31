// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// birkenstock.com.tr Akinon (Omnishop) altyapısında. Fiyat kutusunda iki tutar
// yan yana duruyor: üstü çizili liste fiyatı ".price.-retail" içinde, ödenecek
// tutar ise sınıfsız ".price" içinde. Genel tarama büyük puntolu liste fiyatını
// ya da yanındaki "%30" rozetini seçebildiği için tutarı doğrudan kutudan
// okuyoruz.
//
// Tutarlar <pz-price> özel etiketinin içinde. Sunucudan gelen HTML'de ham sayı
// yazıyor ("2309.30"); etiket yükselince metin "2.309,30 ₺" oluyor. Content
// script document_idle'da çalıştığı için normalde biçimlenmiş hâlini görüyoruz,
// ama yükselme gecikirse cleanPrice ham sayıyı okuyamaz — o yüzden JSON-LD
// teklifi yedekte duruyor.
// Kutuda <pz-price>'tan başka bir şey olmadığı için sarmalayıcıyı okumak
// yetiyor; etiket adı değişse bile seçici tutar.
function findBirkenstockTrPriceText() {
  return cleanText(getText(".product-info__price .price:not(.-retail)"));
}

// h1 yalnızca model adını veriyor ("ARIZONA EVA") ve aynı modelin her rengi
// ayrı bir sayfada duruyor: renk olmadan iki farklı ürün sepette birbirinden
// ayırt edilemiyor. Seçili renk, renk varyantı etiketinin mainColor
// niteliğinde ve sayfadan sayfaya değişiyor.
function findBirkenstockTrColor() {
  const variant = document.querySelector("pz-variant[key='urun_renk']");
  return cleanText(variant?.getAttribute("mainColor") || "");
}

function parseBirkenstockTr() {
  const offer = findStructuredOffer();
  const name =
    cleanText(getText("h1.product-info__title")) || cleanText(getText("h1"));
  const color = findBirkenstockTrColor();

  return {
    site: "Birkenstock",
    title: color ? `${name} - ${color}` : name,
    price:
      cleanPrice(findBirkenstockTrPriceText()) ||
      (offer ? formatStructuredPrice(offer.price, offer.currency) : "") ||
      null,
    currency: offer?.currency || null,
    // og:image 425x425'e kırpılmış paylaşım görseli; JSON-LD'deki ilk görsel
    // ürünün tam boy fotoğrafı.
    image:
      parseJsonLdProduct()?.image ||
      findProductImage({
        minWidth: 200,
        minHeight: 200,
        cdnRegex: /akinoncloud\.com\/products/i,
      }),
    url: window.location.href,
  };
}
