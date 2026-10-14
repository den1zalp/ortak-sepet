// Ortak Sepet popup module: rates.js
// Döviz kuru ve tutarları seçilen para birimine çevirme.
//
// Kur Avrupa Merkez Bankası'nın günlük kurundan geliyor (Frankfurter). İstek
// yalnızca kullanıcı toplamı bir para biriminde (TL, £, $, €) görmeyi seçtiyse atılıyor ve içinde
// sepet ya da kullanıcı bilgisi yok. Kur günde bir değiştiği için en fazla
// RATES_MAX_AGE_MS'de bir yenileniyor; alınamazsa son kayıtlı kur kullanılıyor.

const RATES_KEY = "ortakSepetRates";
const DISPLAY_CURRENCY_KEY = "ortakSepetDisplayCurrency";
const RATES_URL = "https://api.frankfurter.dev/v1/latest?from=TRY&to=GBP,EUR,USD";
const RATES_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const RATES_TIMEOUT_MS = 8000;
// "mixed": hiçbir para birimi seçili değil; her ürün kendi para biriminde,
// toplam "1.000 TL + £50" gibi.
const DISPLAY_CURRENCIES = ["mixed", "TRY", "GBP", "USD", "EUR"];
const CURRENCY_SYMBOLS = { GBP: "£", USD: "$", EUR: "€" };

// { date: "2026-10-13", fetchedAt, rates: { GBP, EUR, USD } }; rates 1 TL'nin
// karşılığı.
let currentRates = null;
let currentDisplayCurrency = "mixed";
let ratesRequest = null;

async function getDisplayCurrency() {
  const result = await browser.storage.local.get(DISPLAY_CURRENCY_KEY);
  return DISPLAY_CURRENCIES.includes(result[DISPLAY_CURRENCY_KEY]) ? result[DISPLAY_CURRENCY_KEY] : "mixed";
}

async function setDisplayCurrency(currency) {
  currentDisplayCurrency = currency;
  await browser.storage.local.set({ [DISPLAY_CURRENCY_KEY]: currency });
}

async function loadStoredRates() {
  const result = await browser.storage.local.get(RATES_KEY);
  currentRates = isValidRates(result[RATES_KEY]) ? result[RATES_KEY] : null;
}

function isValidRates(value) {
  return Boolean(value?.rates && Number.isFinite(value.rates.GBP) && value.rates.GBP > 0);
}

function areRatesFresh() {
  return Boolean(currentRates && Date.now() - (currentRates.fetchedAt || 0) < RATES_MAX_AGE_MS);
}

// Kur eskiyse (force ile her durumda) yeniler; yeni kur geldiyse true döner.
// Aynı anda tek istek.
async function refreshRatesIfStale({ force = false } = {}) {
  if (currentDisplayCurrency === "mixed") return false;
  if (!force && areRatesFresh()) return false;

  ratesRequest ||= fetchRates().finally(() => {
    ratesRequest = null;
  });

  return ratesRequest;
}

async function fetchRates() {
  try {
    // Servis yanıtı bir gün önbellekte tutulsun diyor; kur gün içinde
    // yayımlandığında eski yanıt gelmesin diye önbellek her seferinde
    // sunucuya sorularak doğrulanıyor.
    const response = await fetch(RATES_URL, {
      cache: "no-cache",
      signal: AbortSignal.timeout(RATES_TIMEOUT_MS),
    });
    if (!response.ok) return false;

    const data = await response.json();
    const rates = { date: data.date, fetchedAt: Date.now(), rates: data.rates };
    if (!isValidRates(rates)) return false;

    currentRates = rates;
    await browser.storage.local.set({ [RATES_KEY]: rates });
    return true;
  } catch {
    // Ağ yok ya da servis yanıt vermedi: varsa son kayıtlı kur kullanılıyor.
    return false;
  }
}

function isConvertingCurrencies() {
  return currentDisplayCurrency !== "mixed" && Boolean(currentRates);
}

// 1 TL'nin karşılığı; TL için 1. Bilinmeyen para biriminde null.
function getRateFromTry(currency) {
  if (currency === "TRY") return 1;
  const rate = currentRates?.rates?.[currency];
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function convertAmount(value, fromCurrency, toCurrency) {
  const fromRate = getRateFromTry(fromCurrency);
  const toRate = getRateFromTry(toCurrency);

  if (fromRate === null || toRate === null) return null;

  return (value / fromRate) * toRate;
}

// Ürünün fiyatı görünüm para biriminde; çevirmeye gerek yoksa ya da
// çevrilemiyorsa null.
function getConvertedPriceText(item) {
  if (!isConvertingCurrencies()) return null;

  const currency = getItemCurrency(item);
  const price = extractNumberFromPrice(item.price);

  if (price === null || currency === currentDisplayCurrency) return null;

  const converted = convertAmount(price, currency, currentDisplayCurrency);
  return converted === null ? null : `≈ ${formatPriceByCurrency(converted, currentDisplayCurrency)}`;
}

// Toplam kartının altındaki kur satırı: "1 £ = 65,39 TL · 13.10.2026 kuru".
// TL seçiliyken sterlinin, diğerlerinde seçilen para biriminin TL karşılığı.
function getRateInfoText() {
  if (currentDisplayCurrency === "mixed") return "";
  if (!currentRates) return translate(ratesRequest ? "rateLoading" : "rateUnavailable");

  const shownCurrency = currentDisplayCurrency === "TRY" ? "GBP" : currentDisplayCurrency;
  const rate = getRateFromTry(shownCurrency);
  if (rate === null) return translate("rateUnavailable");

  const inLira = formatPriceByCurrency(1 / rate, "TRY");
  const date = new Date(`${currentRates.date}T12:00:00`);
  const dateText = Number.isNaN(date.getTime())
    ? currentRates.date
    : date.toLocaleDateString(currentLanguage === "en" ? "en-GB" : "tr-TR");

  return translate("rateInfo", { rate: `1 ${CURRENCY_SYMBOLS[shownCurrency]} = ${inLira}`, date: dateText });
}
