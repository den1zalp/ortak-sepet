// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
//
// crocs.com.tr Shopify Hydrogen (Remix) üzerinde çalışıyor ve tüm arayüzü
// Tailwind yardımcı sınıflarıyla kuruyor: fiyatın, başlığın ya da görselin
// tutunabileceğek anlamlı bir sınıf adı yok. Sayfada JSON-LD ve og: etiketi de
// bulunmuyor, yani okunacak tek yer görünen DOM.
//
// Bu yüzden başlığa tutunup fiyatı oradan buluyoruz: ürün başlığı <main> içindeki
// h1, ödenecek tutar ise onu izleyen ilk kardeş düğümdeki fiyat.

// Sayfa aynı ürünü iki kez basıyor: biri mobil (lg:hidden), biri masaüstü
// düzeni. İkisi de DOM'da duruyor, yalnızca biri görünür. Ayrıca sepet
// çekmecesindeki "Sepetinizde Ürününüz Bulunmamaktadır." de bir h1 —
// document.querySelector("h1") onu seçerdi, o yüzden <main> ile sınırlıyoruz.
function findCrocsTrTitleElement() {
  const headings = Array.from(document.querySelectorAll("main h1"));

  return (
    headings.find((heading) => heading.getBoundingClientRect().width > 0) ||
    headings[0] ||
    null
  );
}

// İndirimli üründe iki tutar var ve sıraları düzene göre değişiyor: masaüstünde
// önce üstü çizili liste fiyatı, mobilde önce indirimli tutar geliyor. "İlk
// fiyatı al" demek masaüstünde liste fiyatını seçtiriyordu. Üstü çizgi
// Tailwind'de "line-through" sınıfıyla geliyor ama sınıf adına güvenmek
// kırılgan; hesaplanmış stile bakıyoruz. text-decoration miras alınmadığı için
// düğümün kendisi kadar fiyat kutusuna kadar olan atalarına da bakılıyor.
function isCrocsTrStruckThrough(element, container) {
  let current = element;

  while (current) {
    const decoration = window.getComputedStyle(current).textDecorationLine || "";

    if (decoration.includes("line-through")) return true;
    if (current === container) return false;

    current = current.parentElement;
  }

  return false;
}

function findCrocsTrPriceText() {
  const title = findCrocsTrTitleElement();
  if (!title) return "";

  let sibling = title.nextElementSibling;

  // Başlıkla fiyatın arasına "Yeni Renkler" gibi rozetler girebiliyor.
  for (let step = 0; sibling && step < 4; step += 1) {
    if (looksLikeTryPrice(sibling.textContent)) {
      // Tutar "₺" ve rakamı ayrı <span>'lere bölüyor, bu yüzden en içteki
      // fiyat düğümü ikisini birden kapsayan sarmalayıcı oluyor.
      const priceNodes = Array.from(sibling.querySelectorAll("*")).filter(
        (element) =>
          looksLikeTryPrice(element.textContent) &&
          !hasChildWithPriceText(element),
      );

      const payable = priceNodes.find(
        (element) => !isCrocsTrStruckThrough(element, sibling),
      );

      if (payable) return cleanText(payable.textContent);
    }

    sibling = sibling.nextElementSibling;
  }

  return "";
}

function parseCrocsTr() {
  return {
    site: "Crocs",
    // Başlık rengi de taşıyor ("Classic - Atmosfer"), ayrıca ayıklamaya gerek yok.
    title:
      cleanText(findCrocsTrTitleElement()?.textContent) ||
      cleanText(document.title).replace(/^\s*Crocs\s*\|\s*/i, ""),
    price: cleanPrice(findCrocsTrPriceText()),
    image: findProductImage({
      minWidth: 200,
      minHeight: 200,
      cdnRegex: /cdn\.shopify\.com/i,
    }),
    url: window.location.href,
    // Genel tarama üstü çizili liste fiyatını ya da alttaki "Bunlar da
    // ilgini çekebilir" kartlarını yakalayabiliyor; yanlış fiyat, fiyatsız
    // üründen kötü.
    preventPriceFallback: true,
  };
}
