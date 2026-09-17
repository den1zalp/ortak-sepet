// shared/structured-data.js içindeki beden taraması. Tarayıcı gerekmiyor:
// modül node:vm içinde, aşağıdaki küçük DOM taklidiyle çalıştırılıyor.
//
// Taklit sadece findSizeOptions()'ın gerçekten sorduğu üç seçiciyi tanıyor
// ("select", ld+json script'leri ve kap seçicisi); amaç CSS motorunu değil,
// seçeneklerin hangi kaptan alınıp neyin elendiğini sınamak.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { checkEqual: check, summary } = createChecker();

const CANDIDATE_TAGS = ["li", "button", "label", "a", "input", "span", "div"];

function element(tag, options = {}) {
  const {
    attrs = {},
    text = "",
    children = [],
    disabled = false,
    checked = false,
  } = options;

  const node = {
    tag,
    attrs,
    disabled,
    checked,
    children,
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    get className() {
      return attrs.class || "";
    },
    get textContent() {
      return children.length
        ? children.map((child) => child.textContent).join(" ")
        : text;
    },
    get value() {
      return attrs.value || "";
    },
    get childElementCount() {
      return children.length;
    },
    previousElementSibling: null,
    parentElement: null,
    getBoundingClientRect: () => ({ width: 200, height: 40, top: 100, left: 100 }),
  };

  const descendants = (list) =>
    list.flatMap((child) => [child, ...descendants(child.children || [])]);

  // Seçiciyi parçalara ayırıp etiket adını tam eşleştiriyoruz. "includes" ile
  // bakmak yanlış sonuç veriyordu: "table".includes("a") doğru döndüğü için her
  // bağlantı tablo sanılıyor ve gerçek kodun ölçü tablosu elemesi testte yanlış
  // yere tetikleniyordu.
  const matchesSelector = (child, selector) =>
    selector
      .split(",")
      .map((part) => part.trim())
      .some((part) => {
        if (part === child.tag) return true;

        const withAttribute = part.match(/^(\w+)\[([\w-]+)(?:=['"]?([^'"\]]+)['"]?)?\]$/);

        if (!withAttribute || withAttribute[1] !== child.tag) return false;

        const value = child.getAttribute(withAttribute[2]);

        return withAttribute[3] ? value === withAttribute[3] : Boolean(value);
      });

  node.querySelectorAll = (selector) =>
    descendants(children).filter((child) => matchesSelector(child, selector));

  node.querySelector = (selector) => node.querySelectorAll(selector)[0] || null;

  for (const child of children) {
    child.parentElement = node;
  }

  for (let index = 1; index < children.length; index += 1) {
    children[index].previousElementSibling = children[index - 1];
  }

  return node;
}

function select(attrs, optionTexts) {
  const node = element("select", { attrs });

  node.options = optionTexts.map((entry) => {
    const text = typeof entry === "string" ? entry : entry.text;
    const option = element("option", {
      text,
      disabled: entry.disabled === true,
      attrs: entry.attrs || {},
    });

    option.selected = entry.selected === true;
    return option;
  });

  return node;
}

// Eksenlerin tamamını döndüren sürüm; renk ekseni testleri bunu kullanıyor.
function runScanAxes(input) {
  return buildContext(input).findProductOptions();
}

function buildContext({ selects = [], containers = [], jsonLd = [] }) {
  const context = vm.createContext({
    console,
    document: {
      querySelectorAll: (selector) => {
        if (selector === "select") return selects;
        if (selector === "script[type='application/ld+json']") {
          return jsonLd.map((json) => ({ textContent: JSON.stringify(json) }));
        }
        return containers;
      },
      querySelector: () => null,
      getElementById: () => null,
      title: "",
    },
    window: {
      location: { href: "https://example.com/p", hostname: "example.com" },
      getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
    },
  });

  // cleanText normalde bölgenin core.js'inden geliyor; burada TR'dekiyle aynısı.
  vm.runInContext(
    "function cleanText(text){ return text ? String(text).replace(/\\s+/g,' ').trim() : ''; }" +
      "function getSiteName(){ return 'Test'; }" +
      "function cleanPrice(value){ return value || null; }" +
      "function formatStructuredPrice(){ return null; }",
    context,
  );

  vm.runInContext(
    readFileSync(join(REPO_ROOT, "shared/structured-data.js"), "utf8"),
    context,
    { filename: "shared/structured-data.js" },
  );

  return context;
}

function runScan(input) {
  return buildContext(input).findSizeOptions();
}

// --- select tabanlı beden seçici ---
const fromSelect = runScan({
  selects: [
    select({ name: "beden", id: "product-size" }, [
      { text: "Beden seçiniz" },
      "S",
      { text: "M", selected: true },
      "L",
      { text: "XL", disabled: true },
    ]),
  ],
});

check("select: bedenler okundu", fromSelect.sizes.join(","), "S,M,L");
check("select: seçili beden", fromSelect.size, "M");

// Beden ile ilgisi olmayan select'ler hiç okunmamalı.
const unrelatedSelect = runScan({
  selects: [select({ name: "adet", id: "quantity" }, ["1", "2", "3"])],
});

check("select: adet seçicisi elendi", unrelatedSelect.sizes.length, 0);

// --- düğme/liste tabanlı beden seçici ---
const sizeButtons = element("div", {
  attrs: { class: "product-size-selector" },
  children: [
    element("button", { text: "29/32" }),
    element("button", { text: "30/32", attrs: { class: "size-option selected" } }),
    element("button", { text: "31/32", attrs: { class: "size-option sold-out" } }),
  ],
});

const fromButtons = runScan({ containers: [sizeButtons] });

check("düğme: bedenler okundu", fromButtons.sizes.join(","), "29/32,30/32");
check("düğme: seçili beden", fromButtons.size, "30/32");
check("düğme: tükenen beden elendi", fromButtons.sizes.includes("31/32"), false);

// İşareti olmayan kapta yalnızca beden jetonu kabul ediliyor: renk listesi
// aynı markup'la gelse bile sepete beden diye yazılmamalı.
const colours = element("ul", {
  attrs: { class: "swatch-list" },
  children: [
    element("li", { text: "Siyah" }),
    element("li", { text: "Lacivert" }),
    element("li", { text: "Beyaz" }),
  ],
});

check("işaretsiz kap: renkler elendi", runScan({ containers: [colours] }).sizes.length, 0);

// İşaretsiz kapta jeton gibi görünen tek bir metin beden listesi sayılmaz.
const singleToken = element("ul", {
  attrs: { class: "pagination" },
  children: [element("li", { text: "2" })],
});

check("işaretsiz kap: tek jeton elendi", runScan({ containers: [singleToken] }).sizes.length, 0);

// Başlığı "Beden" olan kap, sınıf adı bir şey söylemese de okunur.
const labelledByHeading = element("div", {
  attrs: { class: "wrapper" },
  children: [
    element("span", { text: "Beden" }),
    element("div", {
      attrs: { class: "options" },
      children: [element("button", { text: "36" })],
    }),
  ],
});

labelledByHeading.children[1].previousElementSibling = labelledByHeading.children[0];

check(
  "başlıktan tanınan kap",
  runScan({ containers: [labelledByHeading.children[1]] }).sizes.join(","),
  "36",
);

// İşaretsiz kapta kırktan fazla çocuk varsa bu bir beden seçicisi değil: ağır
// sayfalarda yüzlerce "ul" geziliyordu ve her biri layout tetikliyordu.
const longList = element("ul", {
  attrs: { class: "menu" },
  children: Array.from({ length: 41 }, (_, index) => element("li", { text: String(index + 30) })),
});

check("işaretsiz uzun liste elendi", runScan({ containers: [longList] }).sizes.length, 0);

// Aynı liste beden işareti taşıyorsa okunmaya devam ediyor.
const longSizeList = element("ul", {
  attrs: { class: "beden-listesi" },
  children: Array.from({ length: 41 }, (_, index) => element("li", { text: String(index + 30) })),
});

check("işaretli uzun liste okundu", runScan({ containers: [longSizeList] }).sizes.length > 0, true);

// Tailwind'in size-4 / size-6 / size-full yardımcı sınıfları beden işareti
// değil; "resize" de içinde "size" geçiriyor. Lacoste bu yüzden sepete beden
// diye "0" yazıyordu. (Gerçek sayfada yakalandı.)
const tailwindNoise = element("div", {
  attrs: { class: "flex items-center justify-center size-6 rounded-full" },
  children: [element("span", { text: "0" })],
});

check("tailwind size-6 beden sayılmıyor", runScan({ containers: [tailwindNoise] }).sizes.length, 0);

const resizeNoise = element("div", {
  attrs: { class: "ot-text-resize" },
  children: [element("button", { text: "38" })],
});

check("resize sınıfı beden sayılmıyor", runScan({ containers: [resizeNoise] }).sizes.length, 0);

// Gerçek beden sınıfları eşleşmeye devam etmeli.
const realSize = element("div", {
  attrs: { class: "product-size-list" },
  children: [element("button", { text: "38" }), element("button", { text: "40" })],
});

check("gerçek size sınıfı okunuyor", runScan({ containers: [realSize] }).sizes.join(","), "38,40");

// Sıfır bir beden değil.
const zeroOnly = element("div", {
  attrs: { class: "beden-secimi" },
  children: [element("button", { text: "0" })],
});

check("sıfır beden sayılmıyor", runScan({ containers: [zeroOnly] }).sizes.length, 0);

// --- yer tutucu ve fiyat metni ---
const noisy = element("div", {
  attrs: { class: "size-box" },
  children: [
    element("button", { text: "Beden Tablosu" }),
    element("button", { text: "1.299,90 TL" }),
    element("button", { text: "38" }),
    element("button", { text: "40" }),
  ],
});

check("yer tutucu ve fiyat elendi", runScan({ containers: [noisy] }).sizes.join(","), "38,40");

// Kategori sayfasının beden filtresi seçeneğin yanına ürün sayısını yazıyor;
// bu bir beden listesi değil. (Karaca kategori sayfasında yakalandı.)
const facets = element("div", {
  attrs: { class: "filter-beden" },
  children: [
    element("li", { text: "200x220 Cm (174)" }),
    element("li", { text: "160x230 Cm (93)" }),
    element("li", { text: "S/M (7)" }),
  ],
});

check("filtre sayacı elendi", runScan({ containers: [facets] }).sizes.length, 0);

// Aşağıdakilerin hepsi gerçek ürün sayfalarında sepete beden diye yazılmıştı.

// Galeri sayacı ("1 / 5") kot bedeni kalıbına benziyor. (Mi Store, Mi UK)
const gallery = element("div", {
  attrs: { class: "product-size-picker" },
  children: [
    element("button", { text: "1 / 5" }),
    element("button", { text: "2 / 5" }),
    element("button", { text: "3 / 5" }),
  ],
});

check("galeri sayacı beden sayılmıyor", runScan({ containers: [gallery] }).sizes.length, 0);

// Gerçek kot bedeni aynı kalıpta ama iki sayı da yirminin üstünde.
const jeans = element("div", {
  attrs: { class: "beden-secimi" },
  children: [element("button", { text: "29/32" }), element("button", { text: "30 / 34" })],
});

check("kot bedeni okunuyor", runScan({ containers: [jeans] }).sizes.join(","), "29/32,30 / 34");

// Başlığın kendisi seçenek değil. (Penti)
const withLabel = element("div", {
  attrs: { class: "size-list" },
  children: [
    element("span", { text: "Beden:" }),
    element("button", { text: "S" }),
    element("button", { text: "M" }),
  ],
});

check("başlık metni elendi", runScan({ containers: [withLabel] }).sizes.join(","), "S,M");

// Varyant kimliği beden değil. (Champion UK)
const variantId = element("div", {
  attrs: { class: "size-options" },
  children: [
    element("button", { text: "UNI" }),
    element("button", { text: "55342174437720" }),
  ],
});

// Geriye kalan "UNI" tek beden işareti olduğu için eksen hiç açılmıyor;
// kimliğin elendiğini gerçek bedenli bir kapla ayrıca ölçüyoruz.
check("varyant kimliği elendi", runScan({ containers: [variantId] }).sizes.length, 0);

const variantIdWithSize = element("div", {
  attrs: { class: "size-options" },
  children: [
    element("button", { text: "S" }),
    element("button", { text: "55342174437720" }),
  ],
});

check(
  "varyant kimliği gerçek bedenin yanında da elendi",
  runScan({ containers: [variantIdWithSize] }).sizes.join(","),
  "S",
);

// Renk seçicisi beden seçicisi değil; renk kodları sayı gibi görünüyor.
// (Under Armour UK: 001, 513, 738)
const colourCodes = element("div", {
  attrs: { class: "size-selector colour-options" },
  children: [
    element("button", { text: "001" }),
    element("button", { text: "513" }),
    element("button", { text: "738" }),
  ],
});

check("renk kodları elendi", runScan({ containers: [colourCodes] }).sizes.length, 0);

// Beden rehberi bağlantısı seçenek değil. (Under Armour UK)
const guide = element("div", {
  attrs: { class: "size-block" },
  children: [
    element("a", { text: "Size & Fit Guide" }),
    element("button", { text: "40" }),
    element("button", { text: "41" }),
  ],
});

check("beden rehberi elendi", runScan({ containers: [guide] }).sizes.join(","), "40,41");

// Renk kodları sayı gibi görünüyor ve renk kabı işaretlenmemiş olabilir:
// başında sıfır olan ya da yüzü aşan sayı beden değil. (Under Armour UK)
const numericColourCodes = element("ul", {
  attrs: { class: "uawc-fullSize" },
  children: [
    element("li", { text: "001" }),
    element("li", { text: "513" }),
    element("li", { text: "738" }),
  ],
});

check("renk kodu sayıları elendi", runScan({ containers: [numericColourCodes] }).sizes.length, 0);

// Aynı sayfadaki gerçek ayakkabı bedenleri okunmaya devam etmeli; beden
// düğmeleri de "swatch" sınıfı taşıyor, o yüzden swatch renk işareti sayılamaz.
const shoeSizes = element("div", {
  attrs: { class: "SizeSwatchesSection-module__sizes" },
  children: [
    element("button", { text: "3.5" }),
    element("button", { text: "4 (Out of Stock)" }),
    element("button", { text: "5" }),
    element("a", { text: "Size & Fit Guide" }),
  ],
});

check("ayakkabı bedenleri okundu", runScan({ containers: [shoeSizes] }).sizes.join(","), "3.5,5");

// Seçenek metnindeki etiket öneki atılıyor. (Under Armour UK: "UK Size: 3")
const labelledValues = element("div", {
  attrs: { class: "size-list" },
  children: [
    element("button", { text: "UK Size: 3" }),
    element("button", { text: "UK Size: 3.5" }),
  ],
});

check("etiket öneki atıldı", runScan({ containers: [labelledValues] }).sizes.join(","), "3,3.5");

// Beden kutusunun yanındaki eylem düğmeleri ve form alanları seçenek değil.
// (Levi's TR: "Favorilerime Ekle", "Paylaş" · Under Armour TR: "E-posta Adresi *"
// · Marks & Spencer UK: işaretlenmemiş onay kutusunun "on" değeri.)
const noise = element("div", {
  attrs: { class: "product-size" },
  children: [
    element("button", { text: "Favorilerime Ekle" }),
    element("button", { text: "Paylaş" }),
    element("label", { text: "E-posta Adresi *" }),
    element("input", { attrs: { type: "radio", value: "on" }, text: "on" }),
    element("button", { text: "28-30" }),
    element("button", { text: "29-32" }),
  ],
});

check("eylem ve form metinleri elendi", runScan({ containers: [noise] }).sizes.join(","), "28-30,29-32");

// Etiketin kendisi ve etiket-değer satırı seçenek değil. (Levi's TR)
const labelNoise = element("div", {
  attrs: { class: "size-box" },
  children: [
    element("span", { text: "Beden" }),
    element("button", { text: "Fit Referance : Ribcage" }),
    element("button", { text: "24" }),
    element("button", { text: "26" }),
  ],
});

check("etiket satırları elendi", runScan({ containers: [labelNoise] }).sizes.join(","), "24,26");

// Listeleme filtresi ürün sayfasında da duruyor ve seçenekleri gerçek beden
// seçicisininkilerle karışıyordu. (Koton)
const facetBox = element("div", {
  attrs: { class: "rfbz-bd beden-filtre" },
  children: [
    element("li", { text: "Beden (tüm bedenler)" }),
    element("li", { text: "29/30 bedeninde 40 ürün" }),
    element("li", { text: "30/32 bedeninde 35 ürün" }),
    element("li", { text: "29/30" }),
    element("li", { text: "30/32" }),
  ],
});

check("filtre seçenekleri elendi", runScan({ containers: [facetBox] }).sizes.join(","), "29/30,30/32");

// Beden tablosunun sekmeleri ürün türü ve kalıp adı; beden değil.
// (Colin's: "DENIM ÖLÇÜLERİ" sepete seçili beden olarak yazılmıştı · Tudors)
const chartTabs = element("div", {
  attrs: { class: "beden-secimi" },
  children: [
    element("button", { text: "GÖMLEK" }),
    element("button", { text: "DENIM ÖLÇÜLERİ" }),
    element("button", { text: "SLİM FİT" }),
    element("button", { text: "BÜYÜK BEDEN" }),
    element("button", { text: "S" }),
    element("button", { text: "M" }),
  ],
});

check("ürün türü ve kalıp adları elendi", runScan({ containers: [chartTabs] }).sizes.join(","), "S,M");

// Ölçü tablosu taşıyan kap bir seçici değil. (Desa'da sayfadaki tek "beden"
// kabı buydu.)
const chartTable = element("div", {
  attrs: { class: "beden-bilgisi" },
  children: [
    element("table", {
      children: [element("td", { text: "40" }), element("td", { text: "41" })],
    }),
  ],
});

check("ölçü tablosu okunmuyor", runScan({ containers: [chartTable] }).sizes.length, 0);

// İşaretli kapta seçenekler düz span olabiliyor. (Beymen)
const spanSizes = element("div", {
  attrs: { id: "sizes" },
  children: [
    element("span", { attrs: { class: "m-variation__item" }, text: "39" }),
    element("span", { attrs: { class: "m-variation__item" }, text: "40" }),
    element("span", { attrs: { class: "m-variation__item" }, text: "41" }),
  ],
});

check("span bedenler okundu", runScan({ containers: [spanSizes] }).sizes.join(","), "39,40,41");

// Seçenek metnindeki "Size" öneki iki nokta olmadan da atılıyor, kargo ve
// favori bağlantıları ile renk adı listeye girmiyor. (Levi's UK)
const levis = element("div", {
  attrs: { class: "product-size" },
  children: [
    element("button", { text: "At That Point - Green" }),
    element("button", { text: "Size S" }),
    element("button", { text: "Size M" }),
    element("a", { text: "Shipping Info" }),
    element("a", { text: "Add to Favourite" }),
  ],
});

check("Levi's çöpü elendi, önek atıldı", runScan({ containers: [levis] }).sizes.join(","), "S,M");

// Beden kutusunun yanındaki arayüz eylemleri ve form alanları seçenek değil.
// (Mudo "GÖNDER" · Madame Coco "ARA" · Marks & Spencer "Anasayfa" ·
// Under Armour TR giriş formu · Levi's UK "Sale price is")
const uiNoise = element("div", {
  attrs: { class: "beden-alani" },
  children: [
    element("button", { text: "ARA" }),
    element("button", { text: "GÖNDER" }),
    element("a", { text: "Anasayfa" }),
    element("button", { text: "Giriş Yap" }),
    element("button", { text: "Parolayı Yenile" }),
    element("span", { text: "Sale price is" }),
    element("button", { text: "XS" }),
    element("button", { text: "S" }),
  ],
});

check("arayüz eylemleri elendi", runScan({ containers: [uiNoise] }).sizes.join(","), "XS,S");

// Ayraç karakteri seçenek değil. (Marks & Spencer TR)
const separator = element("div", {
  attrs: { class: "size-list" },
  children: [element("span", { text: "/" }), element("span", { text: "M" }), element("span", { text: "L" })],
});

check("ayraç elendi", runScan({ containers: [separator] }).sizes.join(","), "M,L");

// Denetim koşumunda diğer mağazalarda çıkanlar: breadcrumb adları ve karusel
// sayacı (Marks & Spencer TR), sepete ekleme düğmesi (Oysho).
const navNoise = element("div", {
  attrs: { class: "size-selector" },
  children: [
    element("a", { text: "Erkek" }),
    element("a", { text: "Giyim" }),
    element("span", { text: "1 of 6" }),
    element("button", { text: "Add to basket" }),
    element("button", { text: "S (UK SREG)" }),
    element("button", { text: "M (UK MREG)" }),
  ],
});

check(
  "breadcrumb ve karusel sayacı elendi",
  runScan({ containers: [navNoise] }).sizes.join(","),
  "S (UK SREG),M (UK MREG)",
);

// Adet seçicisinin rakamları beden değil. (Supplementler)
const quantityBox = element("div", {
  attrs: { class: "product-size adet-secimi" },
  children: [
    element("button", { text: "1" }),
    element("button", { text: "2" }),
    element("button", { text: "3" }),
  ],
});

check("adet seçicisi okunmuyor", runScan({ containers: [quantityBox] }).sizes.length, 0);

// Koca bir kap beden seçicisi değil, sayfa bölümüdür: Marks & Spencer TR'de
// "beden" işaretli sarmalayıcı ürün açıklamasını ve mağaza şehirlerini de
// kapsıyordu.
const hugeSection = element("div", {
  attrs: { class: "beden-ve-detay" },
  children: [
    element("p", { text: "x".repeat(700) }),
    element("button", { text: "S" }),
    element("button", { text: "M" }),
  ],
});

check("koca kap okunmuyor", runScan({ containers: [hugeSection] }).sizes.length, 0);

// Promosyon, stok uyarısı ve renk adı elendi. (Marks & Spencer TR, Supplementler)
const promoNoise = element("div", {
  attrs: { class: "size-box" },
  children: [
    element("span", { text: "%42" }),
    element("span", { text: "Son 3 adet" }),
    element("span", { text: "krem" }),
    element("span", { text: "ECRU MIX" }),
    element("button", { text: "HEMEN AL" }),
    element("button", { text: "S (UK SREG)" }),
  ],
});

check("promosyon ve renk elendi", runScan({ containers: [promoNoise] }).sizes.join(","), "S (UK SREG)");

// Renk ekseninde de başlık ve "daha fazla" düğmesi seçenek değil.
// (Under Armour UK: "Product Colours", "Show More")
const colourNoise = element("div", {
  attrs: { class: "product-colour-picker" },
  children: [
    element("span", { text: "Product Colours" }),
    element("button", { text: "Show More" }),
    element("button", { text: "Siyah" }),
    element("button", { text: "Lacivert" }),
  ],
});

check(
  "renk ekseninde başlık elendi, renk adları kaldı",
  runScanAxes({ containers: [colourNoise] }).find((a) => a.key === "colour")?.values.join(","),
  "Siyah,Lacivert",
);

// Renk sayı değildir ve bölüm başlıkları renk sayılmaz. (Tudors "43",
// English Home "4", LTB "female/male", Lacoste "Ürün Özellikleri")
const colourJunk = element("div", {
  attrs: { class: "renk-secimi" },
  children: [
    element("button", { text: "43" }),
    element("a", { text: "female" }),
    element("a", { text: "Ürün Özellikleri" }),
    element("button", { text: "Antrasit" }),
  ],
});

check(
  "renk ekseninde sayı ve başlık elendi",
  runScanAxes({ containers: [colourJunk] }).find((a) => a.key === "colour")?.values.join(","),
  "Antrasit",
);

// Renk kodu renk adı değil. (Mi UK)
const hexSwatches = element("div", {
  attrs: { class: "colour-options" },
  children: [
    element("button", { text: "Black" }),
    element("button", { text: "#000000" }),
  ],
});

check(
  "renk kodu listeye girmiyor",
  runScanAxes({ containers: [hexSwatches] })
    .find((axis) => axis.key === "colour")
    ?.values.join(","),
  "Black",
);

// Gözlüğün çerçeve ölçüsü beden değil. (Atasun)
const frameSpecs = element("div", {
  attrs: { class: "size-options" },
  children: [
    element("button", { text: "54 MM" }),
    element("button", { text: "21 MM" }),
    element("button", { text: "145 MM" }),
  ],
});

check("milimetre ölçüsü beden sayılmıyor", runScan({ containers: [frameSpecs] }).sizes.length, 0);

// Santimetre gerçek bir seçim olabiliyor. (Madame Coco, Karaca)
const cmSizes = element("div", {
  attrs: { class: "size-options" },
  children: [
    element("button", { text: "200x220 Cm" }),
    element("button", { text: "240x260 Cm" }),
  ],
});

check(
  "santimetre ölçüsü beden kalıyor",
  runScan({ containers: [cmSizes] }).sizes.join(","),
  "200x220 Cm,240x260 Cm",
);

// "Tek beden" işareti bir seçim değil, bedeni olmayan ürün demek; sepette
// "Beden: OS" satırı çıkmamalı. (Levi's "OS", Champion UK "UNI")
for (const marker of ["OS", "UNI", "Tek Ebat", "Standart"]) {
  const box = element("div", {
    attrs: { class: "size-box" },
    children: [element("button", { text: marker })],
  });

  check(`tek beden isareti eksen acmiyor: ${marker}`, runScan({ containers: [box] }).sizes.length, 0);
}

// Gerçek bedenlerin arasında geçiyorsa seçenektir ve kalır.
const mixed = element("div", {
  attrs: { class: "size-box" },
  children: [
    element("button", { text: "Tek Ebat" }),
    element("button", { text: "S" }),
    element("button", { text: "M" }),
  ],
});

check("karışık listede tek ebat kalıyor", runScan({ containers: [mixed] }).sizes.join(","), "Tek Ebat,S,M");

// Stokta tek gerçek beden kalmışsa o bilgi değerli, eksen durmalı.
const lastOne = element("div", {
  attrs: { class: "size-box" },
  children: [element("button", { text: "38" })],
});

check("tek gerçek beden kalıyor", runScan({ containers: [lastOne] }).sizes.join(","), "38");

// --- yapılandırılmış veri yedeği ---
const fromJsonLd = runScan({
  jsonLd: [
    {
      "@type": "Product",
      name: "Kot Pantolon",
      hasVariant: [{ size: "30/32" }, { size: "32/32" }],
    },
  ],
});

check("JSON-LD varyant bedenleri", fromJsonLd.sizes.join(","), "30/32,32/32");

// DOM'da beden varken JSON-LD'ye hiç düşülmemeli.
const domWins = runScan({
  selects: [select({ name: "beden" }, ["S", "M"])],
  jsonLd: [{ "@type": "Product", name: "X", hasVariant: [{ size: "XXL" }] }],
});

check("DOM, JSON-LD'nin önünde", domWins.sizes.join(","), "S,M");

// --- tekilleştirme ---
const duplicated = runScan({
  selects: [select({ name: "beden" }, ["M", "m", " M "])],
});

check("aynı beden bir kez", duplicated.sizes.length, 1);

summary();
