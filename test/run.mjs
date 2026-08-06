// Test koşucusu. Her test dosyası ayrı bir Node süreci olarak çalışır: hepsi
// kendi Chrome'unu açıp kapattığı için tek süreçte toplamak sızıntı üretiyor.
//
//   node test/run.mjs            # unit + e2e (varsayılan, `npm test`)
//   node test/run.mjs unit       # yalnızca tarayıcısız birim testleri
//   node test/run.mjs e2e        # eklenti yüklü Chrome testleri
//   node test/run.mjs live       # canlı ürün sayfaları (ağ gerektirir, yavaş)
//   node test/run.mjs all
//   node test/run.mjs e2e/purchased    # tek dosya
//
// live testleri varsayılana dahil değil: gerçek mağaza sayfalarına bağlı
// oldukları için site değişince eklentide hata olmadan da kırmızıya dönerler.

import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = resolve(dirname(fileURLToPath(import.meta.url)));
const GROUPS = ["unit", "e2e", "live"];
const DEFAULT_GROUPS = ["unit", "e2e"];

function filesIn(group) {
  const dir = join(TEST_DIR, group);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => `${group}/${name}`);
}

function resolveTargets(args) {
  if (args.length === 0) return DEFAULT_GROUPS.flatMap(filesIn);

  const targets = [];

  for (const arg of args) {
    if (arg === "all") {
      targets.push(...GROUPS.flatMap(filesIn));
      continue;
    }

    if (GROUPS.includes(arg)) {
      targets.push(...filesIn(arg));
      continue;
    }

    // "e2e/purchased" veya "e2e/purchased.test.mjs"
    const withSuffix = arg.endsWith(".test.mjs") ? arg : `${arg}.test.mjs`;

    if (!existsSync(join(TEST_DIR, withSuffix))) {
      console.error(`Bilinmeyen test: ${arg}`);
      console.error(`Seçenekler: ${GROUPS.join(", ")}, all veya ${GROUPS.flatMap(filesIn).join(", ")}`);
      process.exit(1);
    }

    targets.push(withSuffix);
  }

  return targets;
}

function run(file) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [join(TEST_DIR, file)], { stdio: "inherit" });
    child.on("close", (code) => resolvePromise(code === 0));
  });
}

const targets = resolveTargets(process.argv.slice(2));
const failed = [];

for (const file of targets) {
  console.log(`\n${"=".repeat(60)}\n${file}\n${"=".repeat(60)}`);
  if (!(await run(file))) failed.push(file);
}

console.log(`\n${"=".repeat(60)}`);

if (failed.length === 0) {
  console.log(`${targets.length} test dosyasının hepsi geçti.`);
  process.exit(0);
}

console.log(`${failed.length}/${targets.length} test dosyası başarısız:`);
for (const file of failed) console.log(`  ${file}`);
process.exit(1);
