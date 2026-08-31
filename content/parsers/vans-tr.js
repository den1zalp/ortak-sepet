// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// vans.com.tr sayfayı sunucuda üretiyor: fiyat da başlık da ilk HTML'de hazır
// geliyor, geç render yok.
//
// Fiyat kutusu ".p-price" iki biçimde geliyor: indirim yoksa tek bir
// ".oneprice", indirim varsa ".newprice" (ödenecek) ve ".oldprice" (üstü
// çizili liste fiyatı). Kutunun tamamını okumak indirimli üründe iki tutarı
// birden veriyor, o yüzden sınıfları tek tek deniyoruz.
//
// Aynı ".oneprice"/".newprice" sınıfları mobil düzendeki
// ".mobile-p-title-area" kopyasında da geçiyor ve o kopya DOM'da daha önce
// duruyor; ".p-price" ile sınırlamak masaüstü/mobil ayrımını gereksiz kılıyor
// çünkü iki kopya da aynı tutarı gösteriyor ama seçicinin nereye baktığı
// belirsiz kalmasın.
function findVansTrPriceText() {
  return (
    cleanText(getText(".p-price .newprice")) ||
    cleanText(getText(".p-price .oneprice")) ||
    cleanText(getText(".p-price"))
  );
}

// h1 yalnızca model adını veriyor ("KNU SKOOL AYAKKABI"); aynı modelin her
// rengi ayrı sayfada durduğu için renk olmadan sepette iki ürün ayırt
// edilemiyor. Renk "RENK : Navy/True White" biçiminde yazılı, etiketi atıp
// yalnızca değeri alıyoruz.
function findVansTrColor() {
  return cleanText(getText(".p-colours p span"));
}

function parseVansTr() {
  const name =
    cleanText(getText("h1.p-name")) ||
    cleanText(getAttr("meta[property='og:title']", "content"));

  const color = findVansTrColor();

  return {
    site: "Vans",
    title: color && !name.toLowerCase().includes(color.toLowerCase())
      ? `${name} - ${color}`
      : name,
    price:
      cleanPrice(findVansTrPriceText()) ||
      // JSON-LD'deki teklif indirimli üründe de ödenecek tutarı veriyor
      // (liste fiyatı yalnızca DOM'da duruyor), bu yüzden yedek olarak güvenli.
      parseJsonLdProduct()?.price ||
      cleanPrice(findMainPrice()),
    // JSON-LD görselinin adresinde çift bölü var
    // ("st-vans.mncdn.com//mnresize/..."); og:image aynı dosyayı temiz adresle
    // ve daha büyük boyutta veriyor.
    image:
      getAttr("meta[property='og:image']", "content") ||
      parseJsonLdProduct()?.image,
    url: window.location.href,
  };
}
