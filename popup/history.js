// Ortak Sepet popup module: history.js
// Ürünün fiyat geçmişi: kart düğmesinden açılan pencerede basamaklı grafik ve
// değişimlerin listesi.
//
// Geçmişte fiyatın okunduğu her gün için bir nokta var (shared/cart.js →
// recordPriceHistory). Fiyat iki okuma arasında değişmiş olabilir ama bunu
// bilmiyoruz; bildiğimiz, okunduğu günlerdeki fiyat. Bu yüzden çizgi basamaklı:
// her nokta bir sonrakine kadar yatay devam ediyor, son nokta son kontrole
// kadar uzuyor. Her okuma bir nokta; noktasız gün kontrol edilmemiş gün.
//
// Çizim elle SVG: eklenti sayfası dışarıdan kütüphane yükleyemiyor ve tek
// seriye bir kütüphane gerekmiyor. Değerler grafiğin altındaki listede de
// yazıyor; grafik ve ipucu bir şey saklamıyor.

const SVG_NS = "http://www.w3.org/2000/svg";
const CHART_HEIGHT = 168;
const CHART_MARGIN = { top: 12, right: 14, bottom: 24 };
const HISTORY_DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_RANGES = ["7", "30", "all"];
// Noktalar bu kadar sıklaşınca yalnızca fiyatın değiştiği günler ve son gün
// nokta olarak çiziliyor; bir yılın her günü üst üste binerdi.
const MIN_DOT_SPACING = 7;

let currentHistoryRange = "30";
let openHistoryItem = null;

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function getLocale() {
  return currentLanguage === "en" ? "en-GB" : "tr-TR";
}

function formatHistoryDate(time, options = { day: "2-digit", month: "2-digit", year: "numeric" }) {
  return new Date(time).toLocaleDateString(getLocale(), options);
}

function getPriceHistoryPoints(item) {
  return OrtakSepetCart.getPriceHistory(item)
    .map((point) => ({
      time: new Date(point.at).getTime(),
      value: extractNumberFromPrice(point.price),
      price: point.price,
    }))
    .filter((point) => Number.isFinite(point.time) && point.value !== null)
    .sort((a, b) => a.time - b.time);
}

// Eksen için yuvarlak adım: 1, 2, 2,5 ya da 5 × 10ⁿ.
function niceStep(rough) {
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

function getValueTicks(min, max) {
  const spread = max - min || Math.max(Math.abs(max) * 0.1, 1);
  const step = niceStep(spread / 3);
  const low = Math.floor((min - (max === min ? spread / 2 : 0)) / step) * step;
  const high = Math.ceil((max + (max === min ? spread / 2 : 0)) / step) * step;
  const ticks = [];

  for (let value = low; value <= high + step / 2; value += step) ticks.push(Number(value.toFixed(6)));

  return { ticks, step };
}

// Eksen yazısı kısa: kuruşsuz ("26.290 TL", "£439"), adım küçükse kuruşlu.
function formatAxisValue(value, currency, step) {
  const digits = step < 1 ? 2 : 0;
  const options = { minimumFractionDigits: digits, maximumFractionDigits: digits };

  switch (currency) {
    case "GBP":
      return `£${value.toLocaleString("en-GB", options)}`;
    case "USD":
      return `$${value.toLocaleString("en-US", options)}`;
    case "EUR":
      return `€${value.toLocaleString("de-DE", options)}`;
    default:
      return `${value.toLocaleString("tr-TR", options)} TL`;
  }
}

function formatPriceChange(current, previous, currency) {
  if (!previous) return null;

  const difference = current.value - previous.value;
  if (Math.abs(difference) < 0.005) return null;

  return {
    direction: difference < 0 ? "down" : "up",
    text: `${difference < 0 ? "↓" : "↑"} ${formatPriceByCurrency(Math.abs(difference), currency)}`,
  };
}

// Seçilen aralığın verisi. carried: aralıktan önceki son okuma; aralık o
// fiyatla başlıyor ama o gün aralıkta değil, nokta çizilmiyor.
function getHistoryView(points, endTime, range) {
  const startTime = range === "all" ? points[0].time : endTime - Number(range) * HISTORY_DAY_MS;
  const firstIndex = points.findIndex((point) => point.time >= startTime);
  const inRange = firstIndex === -1 ? [] : points.slice(firstIndex);
  const carried = firstIndex === -1 ? points[points.length - 1] : firstIndex > 0 ? points[firstIndex - 1] : null;

  return { startTime, inRange, carried, previousOf: (point) => points[points.indexOf(point) - 1] || null };
}

function createPriceChart(view, endTime, currency, width) {
  const { startTime, inRange, carried, previousOf } = view;
  const wrapper = document.createElement("div");
  wrapper.className = "os-history-chart";
  wrapper.tabIndex = 0;

  const values = [...inRange, ...(carried ? [carried] : [])].map((point) => point.value);
  const { ticks, step } = getValueTicks(Math.min(...values), Math.max(...values));
  const labels = ticks.map((tick) => formatAxisValue(tick, currency, step));
  const left = Math.max(...labels.map((label) => label.length)) * 6.2 + 10;

  const plotLeft = left;
  const plotRight = width - CHART_MARGIN.right;
  const plotTop = CHART_MARGIN.top;
  const plotBottom = CHART_HEIGHT - CHART_MARGIN.bottom;

  const timeSpan = endTime - startTime || 1;
  const x = (time) => plotLeft + ((time - startTime) / timeSpan) * (plotRight - plotLeft);
  const low = ticks[0];
  const high = ticks[ticks.length - 1];
  const y = (value) => plotBottom - ((value - low) / (high - low)) * (plotBottom - plotTop);

  const svg = svgElement("svg", {
    width,
    height: CHART_HEIGHT,
    viewBox: `0 0 ${width} ${CHART_HEIGHT}`,
    "aria-hidden": "true",
  });

  // Izgara ve değer ekseni: ince, geri planda.
  ticks.forEach((tick, index) => {
    svg.appendChild(svgElement("line", { class: "os-chart-grid", x1: plotLeft, x2: plotRight, y1: y(tick), y2: y(tick) }));
    const label = svgElement("text", { class: "os-chart-axis", x: plotLeft - 8, y: y(tick), "text-anchor": "end", "dominant-baseline": "middle" });
    label.textContent = labels[index];
    svg.appendChild(label);
  });

  // Zaman ekseni: aralığın başı, sonu ve aralık uzunsa iki ara tarih.
  const dateOptions = { day: "numeric", month: "short" };
  const labelCount = endTime - startTime >= 3 * HISTORY_DAY_MS ? 4 : 2;
  for (let index = 0; index < labelCount; index++) {
    const time = startTime + ((endTime - startTime) * index) / (labelCount - 1);
    const anchor = index === 0 ? "start" : index === labelCount - 1 ? "end" : "middle";
    const label = svgElement("text", { class: "os-chart-axis", x: x(time), y: CHART_HEIGHT - 6, "text-anchor": anchor });
    label.textContent = formatHistoryDate(time, dateOptions);
    svg.appendChild(label);
  }

  // Basamaklı çizgi: aralıktan önceki fiyatla başlıyorsa aralığın başından.
  const first = carried || inRange[0];
  let path = `M${carried ? x(startTime) : x(first.time)},${y(first.value)}`;
  for (const point of carried ? inRange : inRange.slice(1)) path += `H${x(point.time)}V${y(point.value)}`;
  path += `H${x(endTime)}`;
  svg.appendChild(svgElement("path", { class: "os-chart-line", d: path }));

  const crosshair = svgElement("line", { class: "os-chart-crosshair", y1: plotTop, y2: plotBottom, visibility: "hidden" });
  svg.appendChild(crosshair);

  // Her okuma bir nokta; sıklaşınca yalnızca değişimler ve son okuma.
  const dense = (plotRight - plotLeft) / inRange.length < MIN_DOT_SPACING;
  const dots = inRange.map((point, index) => {
    const changed = Boolean(formatPriceChange(point, previousOf(point), currency));
    const visible = !dense || changed || index === inRange.length - 1 || !previousOf(point);
    const dot = svgElement("circle", { class: "os-chart-dot", cx: x(point.time), cy: y(point.value), r: visible ? 4 : 0 });
    svg.appendChild(dot);
    return { dot, visible };
  });

  const tooltip = document.createElement("div");
  tooltip.className = "os-chart-tooltip";
  tooltip.hidden = true;
  const tooltipValue = document.createElement("strong");
  const tooltipDate = document.createElement("span");
  const tooltipChange = document.createElement("span");
  tooltipChange.className = "os-price-delta";
  tooltip.append(tooltipValue, tooltipDate, tooltipChange);

  let activeIndex = -1;

  const resetDots = () => dots.forEach(({ dot, visible }) => dot.setAttribute("r", visible ? 4 : 0));

  const showPoint = (index) => {
    activeIndex = index;
    const point = inRange[index];
    const pointX = x(point.time);

    resetDots();
    dots[index].dot.setAttribute("r", 5.5);
    crosshair.setAttribute("x1", pointX);
    crosshair.setAttribute("x2", pointX);
    crosshair.setAttribute("visibility", "visible");

    tooltipValue.textContent = point.price;
    tooltipDate.textContent = formatHistoryDate(point.time);
    const previous = previousOf(point);
    const change = formatPriceChange(point, previous, currency);
    tooltipChange.textContent = change ? change.text : translate(previous ? "historyUnchanged" : "historyFirstRecord");
    tooltipChange.dataset.direction = change ? change.direction : "";
    tooltip.hidden = false;

    // İpucu noktanın üstünde; grafiğin tepesine yakın noktada yer yoksa altında.
    // Noktayı hiçbir zaman örtmüyor.
    const tooltipWidth = tooltip.offsetWidth;
    const leftEdge = Math.min(Math.max(pointX - tooltipWidth / 2, 0), width - tooltipWidth);
    const above = y(point.value) - tooltip.offsetHeight - 10;
    tooltip.style.left = `${leftEdge}px`;
    tooltip.style.top = `${above >= 0 ? above : y(point.value) + 10}px`;
  };

  const hide = () => {
    activeIndex = -1;
    tooltip.hidden = true;
    crosshair.setAttribute("visibility", "hidden");
    resetDots();
  };

  // İmleç en yakın okumaya yapışıyor; tam noktaya denk getirmek gerekmiyor.
  wrapper.addEventListener("pointermove", (event) => {
    const pointerX = event.clientX - svg.getBoundingClientRect().left;
    let nearest = 0;
    inRange.forEach((point, index) => {
      if (Math.abs(x(point.time) - pointerX) < Math.abs(x(inRange[nearest].time) - pointerX)) nearest = index;
    });
    if (nearest !== activeIndex) showPoint(nearest);
  });
  wrapper.addEventListener("pointerleave", hide);

  wrapper.addEventListener("focus", () => showPoint(inRange.length - 1));
  wrapper.addEventListener("blur", hide);
  wrapper.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = activeIndex + (event.key === "ArrowLeft" ? -1 : 1);
    showPoint(Math.min(Math.max(next, 0), inRange.length - 1));
  });

  wrapper.append(svg, tooltip);
  return wrapper;
}

function createHistoryStat(label, value, detail = "") {
  const stat = document.createElement("div");
  const name = document.createElement("span");
  const strong = document.createElement("strong");
  name.textContent = label;
  strong.textContent = value;
  stat.append(name, strong);

  if (detail) {
    const small = document.createElement("small");
    small.textContent = detail;
    stat.appendChild(small);
  }

  return stat;
}

function createHistoryNote(text) {
  const note = document.createElement("p");
  note.className = "os-history-note";
  note.textContent = text;
  return note;
}

function createRangeSwitch() {
  const row = document.createElement("div");
  row.className = "os-purchased-currency-row";

  const label = document.createElement("span");
  label.className = "os-purchased-currency-label";
  label.id = "priceHistoryRangeLabel";
  label.textContent = translate("historyRange");

  const group = document.createElement("div");
  group.className = "os-currency os-currency-plain";
  group.setAttribute("role", "group");
  group.setAttribute("aria-labelledby", label.id);

  for (const range of HISTORY_RANGES) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.historyRange = range;
    button.textContent = translate(`historyRange_${range}`);
    button.setAttribute("aria-pressed", String(range === currentHistoryRange));
    group.appendChild(button);
  }

  row.append(label, group);
  return row;
}

// Aralıkta fiyatın değiştiği günler, en yeni üstte. İlk kayıt da bir satır.
// Değişmeyen okumalar listeye girmiyor; onlar grafikte nokta.
function createHistoryList(view, currency) {
  const changes = view.inRange.filter((point) => {
    const previous = view.previousOf(point);
    return !previous || formatPriceChange(point, previous, currency);
  });

  if (changes.length === 0) return createHistoryNote(translate("historyNoChangesInRange"));

  const section = document.createElement("section");
  section.className = "os-history-changes";

  const heading = document.createElement("h3");
  heading.textContent = translate("historyChanges");

  const list = document.createElement("ol");

  for (const point of changes.reverse()) {
    const row = document.createElement("li");
    const date = document.createElement("span");
    const price = document.createElement("strong");
    const change = document.createElement("span");

    date.textContent = formatHistoryDate(point.time);
    price.textContent = point.price;
    change.className = "os-price-delta";

    const difference = formatPriceChange(point, view.previousOf(point), currency);
    change.textContent = difference ? difference.text : translate("historyFirstRecord");
    if (difference) change.dataset.direction = difference.direction;

    row.append(date, price, change);
    list.appendChild(row);
  }

  section.append(heading, list);
  return section;
}

function buildPriceHistoryContent(item, width) {
  const points = getPriceHistoryPoints(item);
  const currency = getItemCurrency(item);
  const nodes = [];

  if (points.length === 0) {
    nodes.push(createHistoryNote(translate("historyEmpty")));
    return nodes;
  }

  const last = points[points.length - 1];
  const lastChecked = new Date(item.lastCheckedAt).getTime();
  const endTime = Math.max(last.time, Number.isFinite(lastChecked) ? lastChecked : last.time);

  const stats = document.createElement("div");
  stats.className = "os-history-stats";
  const view = points.length > 1 ? getHistoryView(points, endTime, currentHistoryRange) : null;

  if (!view) {
    stats.appendChild(createHistoryStat(translate("historyNow"), last.price, formatHistoryDate(last.time)));
    nodes.push(stats, createHistoryNote(translate("historyNoChanges")));
  } else if (view.inRange.length === 0) {
    nodes.push(
      createRangeSwitch(),
      createHistoryNote(translate("historyNoChecksInRange", { price: last.price, date: formatHistoryDate(last.time) })),
    );
  } else {
    const lowest = view.inRange.reduce((best, point) => (point.value < best.value ? point : best));
    const highest = view.inRange.reduce((best, point) => (point.value > best.value ? point : best));

    stats.append(
      createHistoryStat(translate("historyNow"), last.price),
      createHistoryStat(translate("historyLowest"), lowest.price, formatHistoryDate(lowest.time)),
      createHistoryStat(translate("historyHighest"), highest.price, formatHistoryDate(highest.time)),
    );

    const chart = createPriceChart(view, endTime, currency, width);
    chart.setAttribute("role", "img");
    chart.setAttribute(
      "aria-label",
      translate("historyChartLabel", {
        from: formatHistoryDate(view.startTime),
        to: formatHistoryDate(endTime),
        min: lowest.price,
        max: highest.price,
        now: last.price,
      }),
    );

    nodes.push(createRangeSwitch(), stats, chart);
  }

  if (Number.isFinite(lastChecked)) {
    nodes.push(createHistoryNote(translate("historyLastChecked", { date: formatHistoryDate(lastChecked) })));
  }

  if (item.manualPrice === true && item.price) {
    nodes.push(createHistoryNote(translate("historyManualNote", { price: item.price })));
  }

  if (view && view.inRange.length > 0) nodes.push(createHistoryList(view, currency));

  return nodes;
}

// Grafik genişliği pencerenin gerçek genişliğinden; pencere açılmadan ölçülemiyor.
function renderPriceHistory() {
  if (!openHistoryItem) return;

  priceHistoryBodyEl.textContent = "";
  const width = Math.max(priceHistoryBodyEl.clientWidth, 240);
  priceHistoryBodyEl.append(...buildPriceHistoryContent(openHistoryItem, width));
}

async function openPriceHistory(id) {
  const item = (await getCartItems()).find((entry) => entry.id === id);
  if (!item) return;

  openHistoryItem = item;
  priceHistoryTitleEl.textContent = translate("priceHistory");
  priceHistoryProductEl.textContent = [item.title, item.site].filter(Boolean).join(" · ");
  priceHistoryCloseBtn.setAttribute("aria-label", translate("close"));
  priceHistoryBodyEl.textContent = "";

  priceHistoryDialogEl.showModal();
  renderPriceHistory();
}

priceHistoryBodyEl.addEventListener("click", (event) => {
  const button = event.target.closest?.("[data-history-range]");
  if (!button || button.dataset.historyRange === currentHistoryRange) return;

  currentHistoryRange = button.dataset.historyRange;
  renderPriceHistory();
  priceHistoryBodyEl.querySelector(`[data-history-range="${currentHistoryRange}"]`)?.focus();
});

priceHistoryCloseBtn.addEventListener("click", () => priceHistoryDialogEl.close());

priceHistoryDialogEl.addEventListener("close", () => {
  openHistoryItem = null;
});

// Pencerenin dışına (karartılmış alana) tıklayınca kapanıyor.
priceHistoryDialogEl.addEventListener("click", (event) => {
  if (event.target === priceHistoryDialogEl) priceHistoryDialogEl.close();
});
