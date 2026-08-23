// Zippo TR görsel adresi: sayfadaki <img src> boyutlandırma ekiyle yazılıyor
// ve o adres 404 dönüyor (bkz. content/parsers/zippo-tr.js). Sepette görselin
// boş çıkmasına yol açan tam olarak buydu; ağ gerekmeden sınanıyor.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

// Sayfadan yalnızca galeri <img>'i taklit ediliyor; parser başka bir şey
// sormuyor.
let galleryImage = null;

const context = vm.createContext({
  window: { location: { hostname: "www.zippo.com.tr", href: "" }, innerWidth: 1280, innerHeight: 900 },
  document: {
    querySelector: (selector) =>
      selector === ".product__media-wrapper img" ? galleryImage : null,
    querySelectorAll: () => [],
    title: "",
  },
  console,
  URL,
});
context.globalThis = context;

for (const file of ["content/shared/core.js", "content/parsers/zippo-tr.js"]) {
  vm.runInContext(readFileSync(join(REPO_ROOT, file), "utf8"), context, { filename: file });
}

const { findZippoTrImageUrl } = context;

check("findZippoTrImageUrl tanımlı", typeof findZippoTrImageUrl === "function");

function imageFor({ src = "", srcset = "", currentSrc = "" } = {}) {
  galleryImage = {
    currentSrc,
    getAttribute: (name) => (name === "src" ? src : name === "srcset" ? srcset : null),
  };

  return findZippoTrImageUrl();
}

const CLEAN = "https://www.zippo.com.tr/images/products/1_13749_HQ.jpg";
const BROKEN = `${CLEAN};width=1946`;

// Sayfadaki gerçek biçim: src kırık, srcset aynı dosyayı eksiz gösteriyor.
check(
  "srcset kırık src'nin önüne geçiyor",
  imageFor({ src: BROKEN, srcset: `${CLEAN} 246w, ${CLEAN} 1946w` }) === CLEAN,
  imageFor({ src: BROKEN, srcset: `${CLEAN} 246w, ${CLEAN} 1946w` }),
);

check(
  "srcset yoksa boyut eki kırpılıyor",
  imageFor({ src: BROKEN }) === CLEAN,
  imageFor({ src: BROKEN }),
);

check(
  "currentSrc srcset'ten sonra geliyor",
  imageFor({ src: BROKEN, currentSrc: CLEAN }) === CLEAN,
  imageFor({ src: BROKEN, currentSrc: CLEAN }),
);

check("temiz adres olduğu gibi kalıyor", imageFor({ src: CLEAN }) === CLEAN, imageFor({ src: CLEAN }));

// Kırpma yalnızca dosya adının sonundaki eki almalı; yol içindeki noktalı
// virgül adresi bozmamalı.
const WITH_SEMICOLON_IN_PATH = "https://www.zippo.com.tr/images/a;b/1_1_HQ.jpg";
check(
  "yol içindeki ';' korunuyor",
  imageFor({ src: WITH_SEMICOLON_IN_PATH }) === WITH_SEMICOLON_IN_PATH,
  imageFor({ src: WITH_SEMICOLON_IN_PATH }),
);

galleryImage = null;
check("galeri yoksa boş dönüyor", findZippoTrImageUrl() === "", JSON.stringify(findZippoTrImageUrl()));

summary();
