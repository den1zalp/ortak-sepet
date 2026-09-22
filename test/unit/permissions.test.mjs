// Ürün ↔ manifest origin eşlemesi. Yanlış eşleşme iki yönde de zarar veriyor:
// olmayan bir izni eksik sanıp kullanıcıyı uyarmak, ya da eksik izni fark
// edememek. Alan adı bazlı eşleşme burada kilitleniyor.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { checkEqual: check, summary } = createChecker();

const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "manifest.json"), "utf8"));

// İzin verilmiş origin kümesi testten teste değişsin diye ayarlanabilir.
let grantedOrigins = [];

// `permissions.contains` dizgi karşılaştırması değil kapsama sorusu: verilen
// izin, sorulan kalıbı kapsıyorsa doğru dönüyor. Tarayıcı izni host bazında
// tuttuğu için yol bazlı bir kalıp ("*://*.vans.com/en-gb/*") istendiğinde
// izin "*://*.vans.com/*" olarak veriliyor ve `contains` yine doğru diyor;
// testteki taklit de aynı şekilde davranmalı, yoksa burada geçen kod
// tarayıcıda yanlış uyarı üretir.
function splitPattern(pattern) {
  if (pattern === "<all_urls>") return { host: "*", path: "/*" };

  const match = String(pattern).match(/^(?:\*|https?):\/\/([^/]+)(\/.*)$/);

  return match ? { host: match[1], path: match[2] } : null;
}

function grantCovers(grantedPattern, wantedPattern) {
  const granted = splitPattern(grantedPattern);
  const wanted = splitPattern(wantedPattern);

  if (!granted || !wanted) return false;

  const grantedHost = granted.host.replace(/^\*\./, "");
  const wantedHost = wanted.host.replace(/^\*\./, "");

  const hostCovered =
    granted.host === "*" ||
    wantedHost === grantedHost ||
    (granted.host.startsWith("*.") && wantedHost.endsWith(`.${grantedHost}`));

  if (!hostCovered) return false;

  return granted.path === "/*" || granted.path === wanted.path;
}

const browser = {
  storage: { local: { async get() { return {}; }, async set() {} } },
  runtime: { getManifest: () => manifest },
  permissions: {
    async getAll() {
      return { origins: grantedOrigins };
    },
    async contains({ origins }) {
      return (origins || []).every((wanted) =>
        grantedOrigins.some((granted) => grantCovers(granted, wanted)),
      );
    },
  },
};

const context = vm.createContext({ browser, crypto, console, URL, URLSearchParams });
context.globalThis = context;

for (const file of ["shared/category.js", "shared/cart.js"]) {
  vm.runInContext(readFileSync(join(REPO_ROOT, file), "utf8"), context, { filename: file });
}

const Cart = context.OrtakSepetCart;
const originOf = (url) => Cart.getDeclaredOriginForItem({ url });

// --- alan adı eşlemesi ---
check("samsonite tr", originOf("https://www.samsonite.com.tr/urun-123"), "*://*.samsonite.com.tr/*");
check("samsonite uk", originOf("https://www.samsonite.co.uk/a/1.html"), "*://*.samsonite.co.uk/*");
check("decathlon tr", originOf("https://www.decathlon.com.tr/p/x/_/R-p-1"), "*://*.decathlon.com.tr/*");
check("decathlon uk", originOf("https://www.decathlon.co.uk/p/x/1/m1"), "*://*.decathlon.co.uk/*");
check("www yok", originOf("https://decathlon.com.tr/p/x"), "*://*.decathlon.com.tr/*");
check("alt alan adı", originOf("https://shop.trendyol.com/x"), "*://*.trendyol.com/*");

// Birkenstock'un İngiltere mağazası global alan adının /gb/ yolunda, yani
// kalıbın kendisi de yola bağlı: "*://*.birkenstock.com/gb/*". Eşleşme alan adı
// üzerinden yapılıyor, kalıptaki yol bunu bozmamalı.
check(
  "yola bağlı kalıp",
  originOf("https://www.birkenstock.com/gb/arizona/x_1.html"),
  "*://*.birkenstock.com/gb/*",
);
check("birkenstock tr ayrı kalıp", originOf("https://www.birkenstock.com.tr/x-1/"), "*://*.birkenstock.com.tr/*");
check("crocs tr", originOf("https://crocs.com.tr/classic-atmosphere"), "*://*.crocs.com.tr/*");
check("crocs uk", originOf("https://www.crocs.co.uk/p/classic-clog/10001.html"), "*://*.crocs.co.uk/*");

// "pazarama.com" içinde "zara" geçiyor: parça araması burada yanlış eşleşirdi.
check("pazarama zara'ya düşmüyor", originOf("https://www.pazarama.com/urun-p-1"), "*://*.pazarama.com/*");
// "notzara.com" gibi bir alan adı da zara.com sayılmamalı.
check("sahte alan adı", originOf("https://www.notzara.com/x"), null);
check("desteklenmeyen site", originOf("https://www.example.com/x"), null);
check("bozuk adres", originOf("bu bir url değil"), null);
check("adressiz ürün", Cart.getDeclaredOriginForItem({}), null);

// --- eksik izin tespiti ---
const items = [
  { url: "https://www.trendyol.com/a-p-1" },
  { url: "https://www.decathlon.com.tr/p/a/_/R-p-1" },
  { url: "https://www.decathlon.com.tr/p/b/_/R-p-2" },
  { url: "https://www.example.com/x" },
];

grantedOrigins = manifest.host_permissions;
check("hepsi verilmişse eksik yok", (await Cart.findMissingOrigins(items)).length, 0);

grantedOrigins = manifest.host_permissions.filter(
  (origin) => origin !== "*://*.decathlon.com.tr/*",
);
const missing = await Cart.findMissingOrigins(items);
check("eksik izin bulundu", missing.join(","), "*://*.decathlon.com.tr/*");
check("aynı site iki kez sayılmıyor", missing.length, 1);

grantedOrigins = [];
check("hiç izin yoksa", (await Cart.findMissingOrigins(items)).length, 2);
check("boş sepet", (await Cart.findMissingOrigins([])).length, 0);

// --- content script adres eşlemesi ---
// Mesaj karşılıksız kaldığında popup iki durumu ayırt ediyor: sayfa gerçekten
// desteklenmiyor mu, yoksa content script o sekmeye hiç girmedi mi. Alan adı
// bazlı eşleşme burada yetmiyor — vans.com/de-de desteklenmiyor.
const supports = (url) => Cart.isContentScriptUrl(url);

check("vans uk ürün sayfası", supports("https://www.vans.com/en-gb/p/old-skool-shoes-VN000D3HY28"), true);
check("vans.com baska ulke yolu", supports("https://www.vans.com/de-de/p/old-skool-VN000D3HY28"), false);
check("vans tr tum site", supports("https://www.vans.com.tr/knu-skool-ayakkabi_123456"), true);
check("trendyol", supports("https://www.trendyol.com/marka/urun-p-1"), true);
check("alt alan adı", supports("https://shop.trendyol.com/urun-p-1"), true);
check("desteklenmeyen site", supports("https://www.example.com/urun"), false);
// Levi's UK kalıbı "/GB/" yazıyor; yol eşleşmesi tarayıcıda büyük/küçük harf
// ayırdığı için kalıbın kendi yazımıyla sınanıyor.
check("levis uk", supports("https://www.levi.com/GB/en_GB/clothing/p/123456"), true);
// iFixit yalnızca /en-gb/products/ altında; rehber sayfaları desteklenmiyor.
check("ifixit ürün", supports("https://www.ifixit.com/en-gb/products/iphone-battery"), true);
check("ifixit rehber", supports("https://www.ifixit.com/en-gb/guide/1234"), false);
check("http de kapsanıyor", supports("http://www.trendyol.com/marka/urun-p-1"), true);
check("bozuk adres", supports("bu bir url değil"), false);
check("adres yok", supports(undefined), false);

// --- yol bazlı kalıplar ---
// Mağazanın ülke sitesi global alan adının bir yolunda olduğunda kalıp da yola
// bağlı oluyor ("*://*.vans.com/en-gb/*"). Tarayıcı izni yol bazında değil host
// bazında tuttuğu için geri "*://*.vans.com/*" veriyor; kalıbın aynısını
// aramak izin verilmiş siteyi "izin yok" sayıp ürün eklemeyi durduruyordu.
const pathScopedItems = [
  { url: "https://www.vans.com/en-gb/shoes-c00081/old-skool-shoe-vn000d3hy28" },
  { url: "https://www.nike.com/gb/t/air-max-90-shoes/CN8490-002" },
];

grantedOrigins = ["*://*.vans.com/*", "*://*.nike.com/*"];
check(
  "host bazında verilen izin yol kalıbını karşılıyor",
  (await Cart.findMissingOrigins(pathScopedItems)).length,
  0,
);

grantedOrigins = ["<all_urls>"];
check("tüm sitelere izin verilmişse eksik yok", (await Cart.findMissingOrigins(pathScopedItems)).length, 0);

grantedOrigins = ["*://*.nike.com/*"];
check(
  "gerçekten verilmemiş olan yine bulunuyor",
  (await Cart.findMissingOrigins(pathScopedItems)).join(","),
  "*://*.vans.com/en-gb/*",
);

// İzin API'si olmayan tarayıcıda uyarı hiç çıkmamalı.
const noPermissionApi = vm.createContext({
  browser: { ...browser, permissions: undefined },
  crypto,
  console,
  URL,
  URLSearchParams,
});
noPermissionApi.globalThis = noPermissionApi;

for (const file of ["shared/category.js", "shared/cart.js"]) {
  vm.runInContext(readFileSync(join(REPO_ROOT, file), "utf8"), noPermissionApi, { filename: file });
}

check(
  "izin API'si yoksa sessiz",
  (await noPermissionApi.OrtakSepetCart.findMissingOrigins(items)).length,
  0,
);

summary();
