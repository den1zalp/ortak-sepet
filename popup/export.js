// Ortak Sepet popup module: export.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

// Ürün adları rastgele sayfalardan geliyor. Tırnak içine almak Excel'in bir
// hücreyi formül olarak yorumlamasını engellemez; = + - @ ile başlayan değerin
// başına tek tırnak koyup metin olarak kalmasını garantiliyoruz.
function escapeCsvValue(value) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return `"${safeText.replace(/"/g, '""')}"`;
}

// Excel ayracı yerel ayardan okur: Türkçe Excel noktalı virgül bekler, virgülle
// ayrılmış dosyayı tek sütuna basar.
function getCsvSeparator() {
  return currentLanguage === "tr" ? ";" : ",";
}

function createExportFilename() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  return `ortak-sepet-${datePart}.csv`;
}

// CSV de yedek de aynı yoldan iniyor: blob + bağlantı. İndirme izni
// istemiyoruz, popup'ın kendi sayfasından tıklanan bir bağlantı yetiyor.
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Yedek, sepetin yanında "Aldıklarım" listesini de taşıyor: aylık harcama
// dökümü orada duruyor ve sepetle birlikte kaybolması aynı derde giriyor.
async function exportCartAsJson() {
  const [items, purchased] = await Promise.all([getCartItems(), getPurchasedItems()]);

  if (items.length === 0 && purchased.length === 0) {
    setStatus(translate("backupNoData"));
    return;
  }

  const backup = OrtakSepetBackup.createBackup(
    items,
    purchased,
    browser.runtime.getManifest().version,
  );

  downloadFile(
    JSON.stringify(backup, null, 2),
    `ortak-sepet-yedek-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json;charset=utf-8",
  );

  setStatus(translate("backupSaved", { count: items.length + purchased.length }));
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

  const separator = getCsvSeparator();

  const csvLines = [headers, ...rows].map((row) => {
    return row.map(escapeCsvValue).join(separator);
  });

  return `\ufeff${csvLines.join("\n")}`;
}

// Sepeti mesajlaşma uygulamasına yapıştırılabilir düz metne çeviriyoruz:
// paylaşmak isteyen kullanıcı için dosya indirmekten çok daha pratik.
function buildCartText(items) {
  const lines = [
    translate("copyHeader", { count: calculateTotalItemCount(items) }),
    "",
  ];

  for (const item of items) {
    const quantity = getQuantity(item);
    const price = getPriceDisplayText(item);
    const quantityPart = quantity > 1 ? ` x ${quantity}` : "";
    const sitePart = item.site ? ` (${item.site})` : "";

    lines.push(`• ${item.title || translate("noProductTitle")} — ${price}${quantityPart}${sitePart}`);

    if (item.url) {
      lines.push(`  ${item.url}`);
    }
  }

  lines.push("", translate("copyTotal", { total: calculateTotal(items) }));

  return lines.join("\n");
}

async function writeToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Pano API'si engellenmişse eski yöntemle dene.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  textarea.remove();
  return copied;
}

async function copyCartToClipboard() {
  const items = await getCartItems();

  if (items.length === 0) {
    setStatus(translate("csvNoItems"));
    return;
  }

  const copied = await writeToClipboard(buildCartText(items));
  setStatus(translate(copied ? "cartCopied" : "copyFailed"));
}

async function exportCartAsCsv() {
  const items = await getCartItems();

  if (items.length === 0) {
    setStatus(translate("csvNoItems"));
    return;
  }

  downloadFile(buildCsvContent(items), createExportFilename(), "text/csv;charset=utf-8");
  setStatus(translate("csvExported"));
}
