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

const browser = {
  storage: { local: { async get() { return {}; }, async set() {} } },
  runtime: { getManifest: () => manifest },
  permissions: { async getAll() { return { origins: grantedOrigins }; } },
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
