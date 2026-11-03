// Ortak Sepet popup module: rates.js
// Döviz kuru ve tutarları seçilen para birimine çevirme.
//
// Kur Avrupa Merkez Bankası'nın günlük kurundan geliyor (Frankfurter). İstek
// yalnızca kullanıcı toplamı bir para biriminde (TL, £, $, €) görmeyi seçtiyse atılıyor ve içinde
// sepet ya da kullanıcı bilgisi yok. Kur günde bir değiştiği için en fazla
// RATES_MAX_AGE_MS'de bir yenileniyor; alınamazsa son kayıtlı kur kullanılıyor.
//
// Aldıklarım alım günündeki kurla çevriliyor: Eylül'de sterlinle alınan ürün
// Eylül'ün kuruyla. Bugünkü kurla çevirmek geçmiş ayların harcamasını her gün
// değiştirirdi; alınan ürünün fiyatı da aynı sebeple alındığı anda donduruluyor
// (actions.js → createPurchaseRecord). Geçmiş günlerin kuru bir daha değişmediği
// için bir kez alınıp saklanıyor. Bu istek bir tarih aralığı içeriyor (en eski
// alımın birkaç gün öncesinden bugüne); ürün ya da tutar içermiyor.

const RATES_KEY = "ortakSepetRates";
const PURCHASE_RATES_KEY = "ortakSepetPurchaseRates";
const DISPLAY_CURRENCY_KEY = "ortakSepetDisplayCurrency";
const RATES_API = "https://api.frankfurter.dev/v1";
const RATES_URL = `${RATES_API}/latest?from=TRY&to=GBP,EUR,USD`;
const RATES_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const RATES_TIMEOUT_MS = 8000;
// "mixed": hiçbir para birimi seçili değil; her ürün kendi para biriminde,
// toplam "1.000 TL + £50" gibi.
const DISPLAY_CURRENCIES = ["mixed", "TRY", "GBP", "USD", "EUR"];
const CURRENCY_SYMBOLS = { GBP: "£", USD: "$", EUR: "€" };

// ECB hafta sonu ve tatillerde kur yayımlamıyor; o günlerde alınan ürüne
// önceki iş gününün kuru uygulanıyor. Paskalya'da boşluk Cuma'dan Pazartesi'ye.
const PURCHASE_RATE_LOOKBACK_DAYS = 7;
// Alım günü kuru alınamadıysa her çizimde yeniden denememek için.
const PURCHASE_RATES_RETRY_MS = 60 * 1000;

// { date: "2026-10-13", fetchedAt, rates: { GBP, EUR, USD } }; rates 1 TL'nin
// karşılığı.
let currentRates = null;
let currentDisplayCurrency = "mixed";
let ratesRequest = null;

// { from, through, checkedAt, rates: { "2026-09-22": { GBP, EUR, USD } } }.
// from–through arası sorulmuş ve kesinleşmiş günler; kuru olmayan gün o gün
// kur yayımlanmadığı anlamına geliyor.
let purchaseRates = null;
let purchaseRatesRequest = null;
let purchaseRatesFailedAt = 0;

async function getDisplayCurrency() {
  const result = await browser.storage.local.get(DISPLAY_CURRENCY_KEY);
  return DISPLAY_CURRENCIES.includes(result[DISPLAY_CURRENCY_KEY]) ? result[DISPLAY_CURRENCY_KEY] : "mixed";
}

async function setDisplayCurrency(currency) {
  currentDisplayCurrency = currency;
  await browser.storage.local.set({ [DISPLAY_CURRENCY_KEY]: currency });
}

async function loadStoredRates() {
  const result = await browser.storage.local.get([RATES_KEY, PURCHASE_RATES_KEY]);
  currentRates = isValidRates(result[RATES_KEY]) ? result[RATES_KEY] : null;

  const stored = result[PURCHASE_RATES_KEY];
  purchaseRates = stored?.rates && stored.from && stored.through ? stored : null;
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

// 1 TL'nin karşılığı; TL için 1. Bilinmeyen para biriminde null. rates
// verilmezse güncel kur.
function getRateFromTry(currency, rates = currentRates?.rates) {
  if (currency === "TRY") return 1;
  const rate = rates?.[currency];
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function convertAmount(value, fromCurrency, toCurrency, rates = currentRates?.rates) {
  const fromRate = getRateFromTry(fromCurrency, rates);
  const toRate = getRateFromTry(toCurrency, rates);

  if (fromRate === null || toRate === null) return null;

  return (value / fromRate) * toRate;
}

// Tarihler ECB'nin kullandığı biçimde, "2026-09-22". Gün ekleme UTC üzerinden:
// yerel saatle yapılınca yaz saati geçişinde bir gün kayıyor.
function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// Alım günü kullanıcının kendi takvimine göre.
function getPurchaseDateKey(record) {
  const date = new Date(record.purchasedAt);
  return Number.isNaN(date.getTime()) ? null : toDateKey(date);
}

// Alım gününün ya da ondan önceki son iş gününün kuru; sorulmamış bir günse null.
function findPurchaseDayRates(dateKey) {
  if (!purchaseRates || !dateKey) return null;

  for (let back = 0; back <= PURCHASE_RATE_LOOKBACK_DAYS; back++) {
    const rates = purchaseRates.rates[addDays(dateKey, -back)];
    if (rates) return rates;
  }

  return null;
}

// Alımı çevirecek kur: alım gününün kuru, o alınamadıysa güncel kur.
function getPurchaseRates(record) {
  return findPurchaseDayRates(getPurchaseDateKey(record)) || currentRates?.rates || null;
}

function needsPurchaseConversion(record) {
  return getItemCurrency(record) !== currentDisplayCurrency && extractNumberFromPrice(record.price) !== null;
}

// Görünüm para birimine çevrilecek alımların günleri henüz sorulmamışsa o
// günlerin kurunu alır; yeni kur geldiyse true döner. Sorulmuş aralığın
// sonrası yalnızca bugün ve dün olabiliyor (bugün yayımlanacak kur); onun için
// en fazla RATES_MAX_AGE_MS'de bir soruluyor.
async function refreshPurchaseRatesIfNeeded(records) {
  if (currentDisplayCurrency === "mixed") return false;
  if (purchaseRatesRequest) return purchaseRatesRequest;
  if (Date.now() - purchaseRatesFailedAt < PURCHASE_RATES_RETRY_MS) return false;

  const cache = purchaseRates;
  const missing = records
    .filter(needsPurchaseConversion)
    .map(getPurchaseDateKey)
    .filter((dateKey) => dateKey && (!cache || dateKey < cache.from || dateKey > cache.through))
    .sort();

  if (missing.length === 0) return false;

  const onlyRecent = cache && missing[0] > cache.through;
  if (onlyRecent && Date.now() - (cache.checkedAt || 0) < RATES_MAX_AGE_MS) return false;

  const today = toDateKey(new Date());
  let start = addDays(missing[0], -PURCHASE_RATE_LOOKBACK_DAYS);

  // Sorulan aralık eskisiyle bitişik kalsın: aradaki günlere sonradan bir alım
  // (yedekten geri yükleme) düşebilir.
  if (cache && start > cache.through) start = addDays(cache.through, 1);
  if (start > today) start = today;

  purchaseRatesRequest = fetchPurchaseRates(start, today).finally(() => {
    purchaseRatesRequest = null;
  });

  return purchaseRatesRequest;
}

async function fetchPurchaseRates(start, today) {
  try {
    const response = await fetch(`${RATES_API}/${start}..${today}?from=TRY&to=GBP,EUR,USD`, {
      signal: AbortSignal.timeout(RATES_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const fetched = Object.entries(data.rates || {}).filter(
      ([dateKey, rates]) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && isValidRates({ rates }),
    );

    // Dünün kuru kesinleşti; bugünkü henüz yayımlanmamış olabilir, o yüzden
    // bugün "sorulmuş" sayılmıyor.
    const yesterday = addDays(today, -1);
    const previous = purchaseRates;

    purchaseRates = {
      from: previous && previous.from < start ? previous.from : start,
      through: previous && previous.through > yesterday ? previous.through : yesterday,
      checkedAt: Date.now(),
      rates: { ...(previous?.rates || {}), ...Object.fromEntries(fetched) },
    };

    await browser.storage.local.set({ [PURCHASE_RATES_KEY]: purchaseRates });
    return fetched.length > 0;
  } catch {
    purchaseRatesFailedAt = Date.now();
    return false;
  }
}

// Alımın fiyatı görünüm para biriminde, alım gününün kuruyla; çevirmeye
// gerek yoksa ya da çevrilemiyorsa null.
function getPurchaseConvertedPriceText(record) {
  if (currentDisplayCurrency === "mixed" || !needsPurchaseConversion(record)) return null;

  const converted = convertAmount(
    extractNumberFromPrice(record.price),
    getItemCurrency(record),
    currentDisplayCurrency,
    getPurchaseRates(record),
  );

  return converted === null ? null : `≈ ${formatPriceByCurrency(converted, currentDisplayCurrency)}`;
}

// Aldıklarım'ın üstündeki kur satırı. Alım günü kuru alınamayan alımlar
// güncel kurla çevriliyor; bu durumda bunu söylüyor.
function getPurchasedRateInfoText(records) {
  if (currentDisplayCurrency === "mixed") return "";

  const converting = records.filter(needsPurchaseConversion);
  if (converting.length === 0) return "";

  const onPurchaseDay = converting.filter((record) => findPurchaseDayRates(getPurchaseDateKey(record)));
  if (onPurchaseDay.length === converting.length) return translate("purchasedRateInfo");
  if (purchaseRatesRequest) return translate("rateLoading");
  if (onPurchaseDay.length === 0 && !currentRates) return translate("rateUnavailable");

  return translate("purchasedRatePartial");
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

// "1 £ = 65,40 TL". Küçük çıkan oranlar 100 birim üzerinden yazılıyor:
// "1 TL = £0.02" yerine "100 TL = £1.53".
function formatRatePair(fromCurrency, toCurrency) {
  const value = convertAmount(1, fromCurrency, toCurrency);
  if (value === null) return null;

  const units = value < 0.1 ? 100 : 1;
  const unitsText = fromCurrency === "TRY" ? `${units} TL` : `${units} ${CURRENCY_SYMBOLS[fromCurrency]}`;

  return `${unitsText} = ${formatPriceByCurrency(value * units, toCurrency)}`;
}

// Toplam kartının altındaki kur satırı: sepetteki diğer para birimlerinin
// seçilen para birimindeki karşılığı ("100 TL = £1.53 · 13.10.2026 kuru").
// Çevrilecek başka para birimi yoksa (boş sepet, tek para birimi) TL ile
// sterlin arasındaki kur gösteriliyor.
function getRateInfoText(items) {
  if (currentDisplayCurrency === "mixed") return "";
  if (!currentRates) return translate(ratesRequest ? "rateLoading" : "rateUnavailable");

  const target = currentDisplayCurrency;
  const sources = [...new Set(items.map(getItemCurrency))].filter(
    (currency) => currency !== target && getRateFromTry(currency) !== null,
  );
  if (sources.length === 0) sources.push(target === "TRY" ? "GBP" : "TRY");

  const pairs = sources.map((currency) => formatRatePair(currency, target)).filter(Boolean);
  if (pairs.length === 0) return translate("rateUnavailable");

  const date = new Date(`${currentRates.date}T12:00:00`);
  const dateText = Number.isNaN(date.getTime())
    ? currentRates.date
    : date.toLocaleDateString(currentLanguage === "en" ? "en-GB" : "tr-TR");

  return translate("rateInfo", { rate: pairs.join(" · "), date: dateText });
}
