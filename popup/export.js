// Ortak Sepet popup module: export.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function createExportFilename() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  return `ortak-sepet-${datePart}.csv`;
}

function buildCsvContent(items) {
  const headers = [
    translate("csvProductName"),
    translate("csvSite"),
    translate("csvPrice"),
    translate("csvQuantity"),
    translate("csvSubtotal"),
    translate("csvCurrency"),
    translate("csvCategory"),
    translate("csvPaymentPlan"),
    translate("csvDelivery"),
    translate("csvManualPrice"),
    translate("csvUrl"),
  ];

  const rows = items.map((item) => {
    const itemTotal = calculateItemTotal(item);
    const currency = getItemCurrency(item);
    const installmentDisplay = getInstallmentDisplay(item);
    const shippingDisplay = getShippingDisplay(item);

    return [
      item.title || "",
      item.site || "",
      item.price || "",
      getQuantity(item),
      itemTotal === null ? "" : formatPriceByCurrency(itemTotal, currency),
      currency,
      item.category ? translateCategory(item.category) : "",
      installmentDisplay.text,
      shippingDisplay.text,
      item.manualPrice === true ? translate("yes") : translate("no"),
      item.url || "",
    ];
  });

  const csvLines = [headers, ...rows].map((row) => {
    return row.map(escapeCsvValue).join(",");
  });

  return `\ufeff${csvLines.join("\n")}`;
}

async function exportCartAsCsv() {
  const items = await getCartItems();

  if (items.length === 0) {
    setStatus(translate("csvNoItems"));
    return;
  }

  const csvContent = buildCsvContent(items);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = createExportFilename();
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus(translate("csvExported"));
}
