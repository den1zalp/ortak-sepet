// Mağaza paketleyici: aynı kaynaktan Firefox (AMO) ve Chrome Web Store zip'i üretir.
//
// Depo paketlenmemiş eklentinin kendisi olduğu için kod dönüşümü yok; tek fark
// manifest. Chrome MV3 `background.scripts`'i tanımıyor, Firefox da
// `background.service_worker`'ı kullanmıyor. Aynı dosyada ikisini birden tutmak
// geliştirirken pratik ama mağaza incelemesinde uyarı üretiyor, o yüzden pakete
// girerken her tarayıcıya kendi manifest'ini yazıyoruz.
//
// Kullanım:
//   node tools/build.mjs            # ikisi birden
//   node tools/build.mjs firefox    # tek hedef
//   node tools/build.mjs chrome
//
// Denetim:
//   npx web-ext lint --source-dir dist/firefox   # 0 hata, 0 uyarı beklenir
//   npx web-ext run --source-dir dist/firefox    # paketi Firefox'ta açar
//   Chrome: chrome://extensions → Load unpacked → dist/chrome

import { createZip } from "./zip.mjs";
import { readFileSync, writeFileSync, rmSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

// Pakete yalnızca burada sayılanlar girer. Kara liste yerine beyaz liste:
// depoya düşen ekran görüntüsü, not, test çıktısı yanlışlıkla mağazaya gitmesin.
// README, LICENSE, PRIVACY.md, package.json ve tools/ pakete girmez — mağazalar
// bunları dosya olarak istemiyor, gizlilik politikası listelemede URL veriliyor.
const INCLUDE_FILES = [
  "background.js",
  "browser-polyfill.js",
  "content.js",
  "content-uk.js",
  "popup.html",
  "popup.css",
];

const INCLUDE_DIRS = ["icons", "shared", "popup", "content", "content-uk"];

const TARGETS = {
  firefox: {
    label: "Firefox (AMO)",
    transform(manifest) {
      // Firefox event page kullanır; service_worker anahtarı web-ext lint'te
      // uyarı üretiyor ve Firefox tarafından zaten okunmuyor.
      delete manifest.background.service_worker;
      return manifest;
    },
  },
  chrome: {
    label: "Chrome Web Store",
    transform(manifest) {
      // Chrome MV3'te `background.scripts` geçersiz, `browser_specific_settings`
      // ise tanınmayan anahtar uyarısı veriyor.
      delete manifest.background.scripts;
      delete manifest.browser_specific_settings;
      return manifest;
    },
  },
};

function collectFiles() {
  const files = [...INCLUDE_FILES];

  for (const dir of INCLUDE_DIRS) {
    const walk = (current) => {
      for (const entry of readdirSync(join(ROOT, current))) {
        const relPath = posix.join(current, entry);
        if (statSync(join(ROOT, relPath)).isDirectory()) walk(relPath);
        else files.push(relPath);
      }
    };
    walk(dir);
  }

  return files.sort();
}

// Manifest'te adı geçen her dosya pakete girmiş mi? Yeni bir parser eklenip
// INCLUDE listesi güncellenmezse eklenti mağazada sessizce bozulur; burada patlasın.
function verifyManifestReferences(manifest, files) {
  const packaged = new Set(files);
  const referenced = new Set();

  const add = (value) => {
    if (typeof value === "string" && !value.startsWith("http")) referenced.add(value);
  };

  for (const block of manifest.content_scripts || []) (block.js || []).forEach(add);
  (manifest.background?.scripts || []).forEach(add);
  add(manifest.background?.service_worker);
  add(manifest.action?.default_popup);
  Object.values(manifest.icons || {}).forEach(add);
  Object.values(manifest.action?.default_icon || {}).forEach(add);

  const missing = [...referenced].filter((file) => !packaged.has(file));
  if (missing.length > 0) {
    throw new Error(
      `Manifest'te geçen şu dosyalar pakete girmiyor:\n  ${missing.join("\n  ")}\n` +
        "tools/build.mjs içindeki INCLUDE listesini güncelle.",
    );
  }
}

function build(targetName, sourceManifest, files) {
  const target = TARGETS[targetName];
  const manifest = target.transform(JSON.parse(JSON.stringify(sourceManifest)));
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;

  verifyManifestReferences(manifest, files);

  // Paketlenmemiş kopya: "Load unpacked" ve `web-ext lint --source-dir` için.
  const stageDir = join(DIST, targetName);
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });

  const entries = [{ name: "manifest.json", data: Buffer.from(manifestText, "utf8") }];
  for (const file of files) {
    entries.push({ name: file, data: readFileSync(join(ROOT, file)) });
  }

  for (const entry of entries) {
    const outPath = join(stageDir, entry.name);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, entry.data);
  }

  const zipName = `ortak-sepet-${targetName}-${manifest.version}.zip`;
  const zipPath = join(DIST, zipName);
  const zip = createZip(entries);
  writeFileSync(zipPath, zip);

  const kb = (zip.length / 1024).toFixed(1);
  console.log(`${target.label}`);
  console.log(`  ${relative(ROOT, zipPath)}  (${entries.length} dosya, ${kb} KB)`);
  console.log(`  ${relative(ROOT, stageDir)}  (paketlenmemiş kopya)`);
}

const requested = process.argv.slice(2);
const targets = requested.length > 0 ? requested : Object.keys(TARGETS);

for (const name of targets) {
  if (!TARGETS[name]) {
    console.error(`Bilinmeyen hedef: ${name}. Seçenekler: ${Object.keys(TARGETS).join(", ")}`);
    process.exit(1);
  }
}

const sourceManifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
const files = collectFiles();
mkdirSync(DIST, { recursive: true });

console.log(`Ortak Sepet ${sourceManifest.version}\n`);
for (const name of targets) build(name, sourceManifest, files);
