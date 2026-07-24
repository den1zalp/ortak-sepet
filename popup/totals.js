// Ortak Sepet popup module: totals.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

function detectCurrencyFromPrice(priceText) {
  const text = String(priceText || "");

  if (/£|\bGBP\b/i.test(text)) return "GBP";
  if (/₺|\bTRY\b|\bTL\b/i.test(text)) return "TRY";
  if (/€|\bEUR\b/i.test(text)) return "EUR";
  if (/\$|\bUSD\b/i.test(text)) return "USD";
  if (/₽|\bRUB\b/i.test(text)) return "RUB";
  if (/₴|\bUAH\b/i.test(text)) return "UAH";
  if (/₹|\bINR\b/i.test(text)) return "INR";
  if (/₩|\bKRW\b/i.test(text)) return "KRW";
  if (/¥|\bJPY\b|\bCNY\b/i.test(text)) return "JPY";

  return "TRY";
}

function extractNumberFromPrice(priceText) {
  if (!priceText) return null;

  let cleaned = String(priceText)
    .replace(/[^\d.,]/g, "")
    .trim();

  if (!cleaned) return null;

  const commaIndex = cleaned.lastIndexOf(",");
  const dotIndex = cleaned.lastIndexOf(".");

  if (commaIndex !== -1 && dotIndex !== -1) {
    if (commaIndex > dotIndex) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (commaIndex !== -1) {
    cleaned = cleaned.replace(",", ".");
  } else if (dotIndex !== -1) {
    const parts = cleaned.split(".");

    const allGroupsAfterFirstAreThreeDigits =
      parts.length > 1 && parts.slice(1).every((part) => part.length === 3);

    if (allGroupsAfterFirstAreThreeDigits) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const number = Number.parseFloat(cleaned);
  return Number.isNaN(number) ? null : number;
}

function formatPriceByCurrency(value, currency = "TRY") {
  const format = (locale) =>
    value.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  switch (currency) {
    case "GBP":
      return `£${format("en-GB")}`;
    case "USD":
      return `$${format("en-US")}`;
    case "EUR":
      return `€${format("de-DE")}`;
    case "TRY":
      return `${format("tr-TR")} TL`;
    default:
      return `${format("en-US")} ${currency}`;
  }
}

function formatTRY(value) {
  return formatPriceByCurrency(value, "TRY");
}

function getItemCurrency(item) {
  return item.currency || detectCurrencyFromPrice(item.price || item.detectedPrice || "");
}

function normalizeManualPriceInput(input, item = null) {
  const number = extractNumberFromPrice(input);

  if (number === null) {
    return null;
  }

  const rawInput = String(input || "");
  const explicitCurrency = /£|\bGBP\b/i.test(rawInput)
    ? "GBP"
    : /₺|\bTL\b|\bTRY\b/i.test(rawInput)
      ? "TRY"
      : /€|\bEUR\b/i.test(rawInput)
        ? "EUR"
        : /\$|\bUSD\b/i.test(rawInput)
          ? "USD"
          : null;

  const currency = explicitCurrency || (item ? getItemCurrency(item) : "TRY");
  return formatPriceByCurrency(number, currency);
}

function calculateItemTotal(item) {
  const price = extractNumberFromPrice(item.price);
  const quantity = getQuantity(item);

  if (price === null) return null;

  return price * quantity;
}

function calculateTotalsByCurrency(items, selectedOnly = false) {
  const totals = new Map();

  for (const item of items) {
    if (selectedOnly && !isSelected(item)) continue;

    const itemTotal = calculateItemTotal(item);
    if (itemTotal === null) continue;

    const currency = getItemCurrency(item);
    totals.set(currency, (totals.get(currency) || 0) + itemTotal);
  }

  return totals;
}

function formatTotalsByCurrency(totals) {
  if (!totals || totals.size === 0) {
    return "0,00 TL";
  }

  const order = ["TRY", "GBP", "USD", "EUR"];
  const entries = Array.from(totals.entries()).sort(([a], [b]) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  return entries
    .map(([currency, value]) => formatPriceByCurrency(value, currency))
    .join(" + ");
}

function calculateTotal(items) {
  return formatTotalsByCurrency(calculateTotalsByCurrency(items));
}

function calculateSelectedTotal(items) {
  return formatTotalsByCurrency(calculateTotalsByCurrency(items, true));
}

function calculateTotalItemCount(items) {
  return items.reduce((sum, item) => sum + getQuantity(item), 0);
}

function calculateCategoryTotal(items) {
  return formatTotalsByCurrency(calculateTotalsByCurrency(items));
}

function getInstallmentDisplay(item) {
  if (item.installmentAvailable === true) {
    return {
      text: translate("available"),
      bold: true,
    };
  }

  const installmentText = String(item.installmentText || "").toLocaleLowerCase(
    "tr-TR",
  );

  if (
    installmentText.includes("bulunamadı") ||
    installmentText.includes("bulunamadi") ||
    installmentText.includes("bilgisi")
  ) {
    return {
      text: translate("unknown"),
      bold: false,
    };
  }

  if (
    installmentText.includes("yok") ||
    installmentText.includes("not available") ||
    installmentText.includes("unavailable")
  ) {
    return {
      text: translate("unavailable"),
      bold: false,
    };
  }

  return {
    text: translate("unknown"),
    bold: false,
  };
}

function getShippingDisplay(item) {
  if (item.shippingText) {
    const isStrongShipping =
      item.freeShipping === true || item.shippingAvailable === true;

    return {
      text: normalizeDeliveryText(item.shippingText),
      bold: isStrongShipping,
    };
  }

  if (item.freeShipping === true) {
    return {
      text: translate("freeDelivery"),
      bold: true,
    };
  }

  if (item.shippingAvailable === true) {
    return {
      text: translate("deliveryInfoAvailable"),
      bold: true,
    };
  }

  return {
    text: translate("calculatedAtCheckout"),
    bold: false,
  };
}

function hasUnavailableMainPrice(item) {
  return (
    item?.priceReadStatus === "unavailable" ||
    item?.priceUnavailableReason === "noActiveOffer" ||
    item?.stockAvailable === false
  );
}

function getPriceDisplayText(item) {
  if (item.price) return item.price;
  if (hasUnavailableMainPrice(item)) return translate("priceUnavailable");
  return translate("priceReadFailed");
}

function getStockDisplayText(item) {
  if (!hasUnavailableMainPrice(item)) return null;
  return translate("noActiveOffer");
}

function getItemLineTotal(item) {
  const itemTotal = calculateItemTotal(item);

  if (itemTotal === null) {
    return hasUnavailableMainPrice(item)
      ? translate("subtotalNotIncluded")
      : translate("subtotalUnavailable");
  }

  return translate("subtotal", { total: formatPriceByCurrency(itemTotal, getItemCurrency(item)) });
}

function getLastUpdateText(item) {
  if (!item.lastCheckedAt) return null;

  if (item.lastUpdateStatus === "failed") {
    return translate("lastFailed");
  }

  if (item.lastUpdateStatus === "manual") {
    return translate("lastManual");
  }

  if (item.lastUpdateStatus === "manual-kept") {
    return translate("lastManualKept");
  }

  if (item.lastUpdateStatus === "unavailable") {
    return translate("lastUnavailable");
  }

  return translate("lastSuccess");
}
