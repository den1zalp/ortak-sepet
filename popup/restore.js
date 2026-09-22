// Ortak Sepet - yedekten geri yükleme sayfası.
//
// Neden ayrı bir sayfa: dosya seçici açılınca popup kapanıyor ve seçim
// sonucunu işleyecek kod da onunla birlikte gidiyor. Sekmede açılan sayfa
// seçici boyunca ayakta kalıyor.
//
// Depo anahtarları popup/config.js ile aynı; bu sayfa popup'ın modüllerini
// yüklemiyor, çünkü onlar popup'ın DOM'unu bekliyor.
const CART_KEY = "ortakSepetItems";
const PURCHASED_KEY = "ortakSepetPurchased";
const UNDO_KEY = "ortakSepetUndo";
const LANGUAGE_KEY = "ortakSepetLanguage";
const THEME_KEY = "ortakSepetTheme";

const TEXTS = {
  tr: {
    title: "Yedekten Geri Yükle",
    subtitle: "Daha önce indirdiğin yedek dosyasını seç.",
    fileLabel: "Yedek dosyası (.json)",
    confirm: "Geri Yükle",
    close: "Sekmeyi Kapat",
    summary: "{items} ürün, {purchased} alınan ürün. Yedek tarihi: {date}.",
    summaryNoDate: "{items} ürün, {purchased} alınan ürün.",
    readFailed: "Dosya okunamadı.",
    invalidJson: "Bu dosya bozuk görünüyor; JSON olarak okunamadı.",
    invalidFormat: "Bu bir Ortak Sepet yedeği değil.",
    emptyBackup: "Yedek boş; geri yüklenecek bir şey yok.",
    restored: "{items} ürün ve {purchased} alınan ürün geri yüklendi. Sepeti eklentiden açabilirsin.",
    restoreFailed: "Geri yükleme tamamlanamadı.",
    note:
      "Geri yükleme mevcut sepetin yerine geçer. Üzerine yazılan liste beş dakika boyunca eklentideki “Geri Al” ile döndürülebilir.",
  },
  en: {
    title: "Restore From Backup",
    subtitle: "Choose the backup file you downloaded earlier.",
    fileLabel: "Backup file (.json)",
    confirm: "Restore",
    close: "Close Tab",
    summary: "{items} products, {purchased} bought products. Backup date: {date}.",
    summaryNoDate: "{items} products, {purchased} bought products.",
    readFailed: "The file could not be read.",
    invalidJson: "This file looks damaged; it could not be read as JSON.",
    invalidFormat: "This is not an Ortak Sepet backup.",
    emptyBackup: "The backup is empty; there is nothing to restore.",
    restored: "{items} products and {purchased} bought products restored. Open the basket from the extension.",
    restoreFailed: "The restore could not be completed.",
    note:
      "Restoring replaces the current basket. The replaced list can be brought back for five minutes with “Undo” in the extension.",
  },
};

const fileInput = document.getElementById("backupFile");
const statusEl = document.getElementById("restoreStatus");
const summaryEl = document.getElementById("restoreSummary");
const confirmBtn = document.getElementById("restoreConfirmBtn");
const closeBtn = document.getElementById("restoreCloseBtn");

let language = "tr";
let pendingBackup = null;

function translate(key, values = {}) {
  const dictionary = TEXTS[language] || TEXTS.tr;
  let text = dictionary[key] || TEXTS.tr[key] || key;

  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }

  return text;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function applyTexts() {
  document.documentElement.lang = language;
  document.getElementById("restoreTitle").textContent = translate("title");
  document.getElementById("restoreSubtitle").textContent = translate("subtitle");
  document.getElementById("fileLabel").textContent = translate("fileLabel");
  confirmBtn.querySelector(".action-label").textContent = translate("confirm");
  closeBtn.textContent = translate("close");
  document.getElementById("restoreNote").textContent = translate("note");
}

function formatBackupDate(isoText) {
  if (!isoText) return "";

  const date = new Date(isoText);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(language === "tr" ? "tr-TR" : "en-GB");
}

function showBackup(backup) {
  pendingBackup = backup;

  const date = formatBackupDate(backup.exportedAt);

  summaryEl.textContent = translate(date ? "summary" : "summaryNoDate", {
    items: backup.items.length,
    purchased: backup.purchased.length,
    date,
  });

  summaryEl.hidden = false;
  confirmBtn.disabled = false;
  setStatus("");
}

const FAILURE_TEXTS = {
  json: "invalidJson",
  format: "invalidFormat",
  empty: "emptyBackup",
};

fileInput.addEventListener("change", async () => {
  pendingBackup = null;
  confirmBtn.disabled = true;
  summaryEl.hidden = true;

  const file = fileInput.files?.[0];

  if (!file) return;

  let text = "";

  try {
    text = await file.text();
  } catch {
    setStatus(translate("readFailed"));
    return;
  }

  const result = OrtakSepetBackup.parseBackup(text);

  if (!result.ok) {
    setStatus(translate(FAILURE_TEXTS[result.reason] || "invalidFormat"));
    return;
  }

  showBackup(result);
});

confirmBtn.addEventListener("click", async () => {
  if (!pendingBackup) return;

  confirmBtn.disabled = true;

  try {
    // Üzerine yazmadan önce mevcut hâl "Geri Al" anlık görüntüsüne yazılıyor:
    // yanlış dosya seçen kullanıcı sepetini kaybetmesin. Biçim popup'taki
    // saveUndoSnapshot ile aynı, yoksa popup okuyamaz.
    const current = await browser.storage.local.get([CART_KEY, PURCHASED_KEY]);

    await browser.storage.local.set({
      [UNDO_KEY]: {
        items: current[CART_KEY] || [],
        purchased: current[PURCHASED_KEY] || [],
        at: Date.now(),
      },
    });

    await browser.storage.local.set({
      [CART_KEY]: pendingBackup.items,
      [PURCHASED_KEY]: pendingBackup.purchased,
    });

    summaryEl.hidden = true;
    setStatus(
      translate("restored", {
        items: pendingBackup.items.length,
        purchased: pendingBackup.purchased.length,
      }),
    );
    pendingBackup = null;
    fileInput.value = "";
  } catch {
    setStatus(translate("restoreFailed"));
    confirmBtn.disabled = false;
  }
});

closeBtn.addEventListener("click", async () => {
  const tab = await browser.tabs.getCurrent();

  if (tab?.id) await browser.tabs.remove(tab.id);
});

async function initRestorePage() {
  const stored = await browser.storage.local.get([LANGUAGE_KEY, THEME_KEY]);

  language = stored[LANGUAGE_KEY] === "en" ? "en" : "tr";
  document.body.classList.toggle("dark-mode", stored[THEME_KEY] === "dark");

  applyTexts();
}

initRestorePage();
