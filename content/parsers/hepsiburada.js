// Ortak Sepet - generated from content.js. Keep site-specific logic in this file.
function findMainHepsiburadaPrice() {
  const titleElement =
    document.querySelector("[data-test-id='title']") ||
    document.querySelector("h1");

  const titleRect = titleElement ? titleElement.getBoundingClientRect() : null;

  const elements = Array.from(
    document.querySelectorAll("span, div, ins, strong"),
  );

  const candidates = elements
    .filter((element) => {
      const text = cleanText(element.textContent);

      if (!isVisibleElement(element)) return false;
      if (!looksLikeTryPrice(text)) return false;
      if (hasChildWithPriceText(element)) return false;

      const rect = element.getBoundingClientRect();

      if (rect.left > window.innerWidth * 0.72) return false;
      if (titleRect && rect.top < titleRect.bottom - 30) return false;
      if (titleRect && rect.top > titleRect.bottom + 450) return false;

      return true;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const text = cleanText(element.textContent);

      let score = 0;

      score += fontSize * 8;
      score += fontWeight / 80;

      if (titleRect) {
        const distanceFromTitle = Math.abs(rect.top - titleRect.bottom);
        score += Math.max(0, 180 - distanceFromTitle);
      }

      if (
        rect.left > window.innerWidth * 0.28 &&
        rect.left < window.innerWidth * 0.7
      ) {
        score += 80;
      }

      if (
        /premium|kazanc|kazanç|indirim|kampanya|diğer|satici|satıcı|ürüne git|teslimat/i.test(
          text,
        )
      ) {
        score -= 250;
      }

      return {
        text,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || "";
}

function parseHepsiburada() {
  const mainPrice = findMainHepsiburadaPrice();

  return {
    site: "Hepsiburada",
    title:
      cleanText(getText("[data-test-id='title']")) ||
      cleanText(getText("h1")) ||
      cleanText(getAttr("meta[property='og:title']", "content")),
    price:
      cleanPrice(mainPrice) ||
      cleanPrice(getText("[data-test-id='price-current-price']")) ||
      cleanPrice(getText("[data-test-id='price']")) ||
      cleanPrice(getAttr("meta[property='product:price:amount']", "content")),
    image:
      getAttr("[data-test-id='product-image-image']", "src") ||
      getAttr("img[alt][src*='productimages']", "src") ||
      getAttr("meta[property='og:image']", "content"),
    url: window.location.href,
  };
}
