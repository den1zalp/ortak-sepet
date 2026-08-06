// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function findPazaramaMainPrice() {
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector("[class*='product-title']") ||
    document.querySelector("[class*='ProductTitle']");

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const elements = Array.from(
    document.querySelectorAll("span, div, p, strong"),
  );

  const candidates = elements
    .filter((element) => {
      if (!isVisibleElement(element)) return false;

      const text = cleanText(element.textContent);

      if (!looksLikeTryPrice(text)) return false;
      if (hasChildWithPriceText(element)) return false;
      if (text.length > 90) return false;

      const rect = element.getBoundingClientRect();

      if (titleRect) {
        if (rect.top < titleRect.bottom - 120) return false;
        if (rect.top > titleRect.bottom + 520) return false;
      }

      if (rect.left < window.innerWidth * 0.35) return false;
      if (rect.left > window.innerWidth * 0.85) return false;

      return true;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const text = cleanText(element.textContent);

      let score = 0;

      score += fontSize * 14;
      score += fontWeight / 60;

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 280 - distanceFromTitle);
      }

      if (/sepette/i.test(text)) score += 60;

      if (
        /taksit|garanti|sigorta|kargo|teslimat|indirim|puan|kampanya|hizmet|ay|başlayan|baslayan|detay/i.test(
          text,
        )
      ) {
        score -= 400;
      }

      return {
        text,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
}

function findPazaramaMainImage() {
  return (
    findProductImage({
      cdnRegex: /pazarama|product|urun|ürün|images|media|resize|cdn/i,
    }) ||
    getAttr("meta[property='og:image']", "content") ||
    getAttr("meta[name='twitter:image']", "content")
  );
}

function parsePazarama() {
  const mainPrice = findPazaramaMainPrice();

  return {
    site: "Pazarama",
    title:
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")) ||
      cleanText(document.title),
    price:
      cleanPrice(mainPrice) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")) ||
      cleanPrice(getAttr("meta[property='og:price:amount']", "content")),
    image: findPazaramaMainImage(),
    url: window.location.href,
  };
}
