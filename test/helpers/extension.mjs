// Testlerin ortak altyapısı: depo kökü, Chrome'u bulma, eklentiyi yükleme,
// sonuç sayacı.
//
// Chrome 137+ komut satırından `--load-extension`'ı engelliyor, o yüzden normal
// Chrome değil Chrome for Testing gerekiyor. Kurulumu: `npm run test:setup`.

import { existsSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const BROWSERS_DIR = join(REPO_ROOT, "test", ".browsers");

// Chrome for Testing'in platforma göre değişen yolu.
const CHROME_BINARIES = [
  ["chrome-win64", "chrome.exe"],
  ["chrome-win32", "chrome.exe"],
  ["chrome-linux64", "chrome"],
  ["chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
  ["chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
];

function findChrome() {
  if (process.env.ORTAK_SEPET_CHROME) {
    if (!existsSync(process.env.ORTAK_SEPET_CHROME)) {
      throw new Error(
        `ORTAK_SEPET_CHROME gösterdiği dosya yok: ${process.env.ORTAK_SEPET_CHROME}`,
      );
    }

    return process.env.ORTAK_SEPET_CHROME;
  }

  const chromeDir = join(BROWSERS_DIR, "chrome");

  if (existsSync(chromeDir)) {
    // Birden fazla sürüm kuruluysa en yenisi.
    for (const version of readdirSync(chromeDir).sort().reverse()) {
      for (const parts of CHROME_BINARIES) {
        const candidate = join(chromeDir, version, ...parts);
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  throw new Error(
    "Chrome for Testing bulunamadı. `npm run test:setup` ile kur veya " +
      "ORTAK_SEPET_CHROME ortam değişkeniyle yol ver.",
  );
}

// Eklentiyi yüklü bir Chrome açar ve service worker'a bağlanır.
// extensionPath: varsayılan olarak depo kökü (paketlenmemiş eklentinin kendisi);
// paket testi bunun yerine dist/chrome veriyor.
export async function launchExtension({
  extensionPath = REPO_ROOT,
  windowSize = "1280,950",
  profilePrefix = "ortak-sepet-",
} = {}) {
  const { default: puppeteer } = await import("puppeteer-core");

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: false,
    userDataDir: mkdtempSync(join(tmpdir(), profilePrefix)),
    args: [
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-first-run",
      "--no-default-browser-check",
      `--window-size=${windowSize}`,
    ],
  });

  const workerTarget =
    browser.targets().find((target) => target.type() === "service_worker") ||
    (await browser.waitForTarget((target) => target.type() === "service_worker", {
      timeout: 30000,
    }));

  return {
    browser,
    workerTarget,
    sw: await workerTarget.worker(),
    extensionId: new URL(workerTarget.url()).host,
  };
}

// Content script'e mesaj atıp ürünü okur. Doğrudan sayfadan değil service
// worker üzerinden gidiyoruz ki gerçek mesaj köprüsü de sınanmış olsun.
export function readProductFromTab(sw, url) {
  return sw.evaluate(async (targetUrl) => {
    const tabs = await browser.tabs.query({});
    const tab = tabs.find((candidate) => candidate.url === targetUrl);

    if (!tab) return { ok: false, error: "sekme bulunamadı" };

    try {
      return await browser.tabs.sendMessage(tab.id, { type: "GET_PRODUCT" });
    } catch (error) {
      return { ok: false, error: String(error && error.message) };
    }
  }, url);
}

// Görsel adresini gerçekten indirmeyi dener; adres doğru görünüp sunucu resim
// döndürmüyorsa sepette boş kare çıkıyor. check(...) ile doğrudan kullanılsın
// diye [ad, sonuç, ayrıntı] üçlüsü döner.
export async function imageLoads(url, label) {
  if (!url) return [label, false, "adres yok"];

  try {
    const response = await fetch(url, { redirect: "follow" });
    const type = response.headers.get("content-type") || "";

    return [label, response.ok && /^image\//i.test(type), `${response.status} ${type}`];
  } catch (error) {
    return [label, false, error.message.split("\n")[0]];
  }
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Testlerin bıraktığı ekran görüntüleri depoya değil test/screenshots/ altına
// düşsün; klasör .gitignore'da.
export function screenshotPath(name) {
  const dir = join(REPO_ROOT, "test", "screenshots");
  mkdirSync(dir, { recursive: true });
  return join(dir, name);
}

// Basit sonuç sayacı: her dosya kendi kontrollerini sayar, summary() süreci
// uygun çıkış koduyla bitirir.
export function createChecker() {
  let failures = 0;

  function check(name, ok, detail = "") {
    if (!ok) {
      failures += 1;
      console.log(`FAIL ${name}${detail ? " " + detail : ""}`);
    } else {
      console.log(`ok   ${name}${detail ? " — " + detail : ""}`);
    }
  }

  // Beklenen/gelen karşılaştırması gereken yerlerde.
  function checkEqual(name, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);

    if (!ok) {
      failures += 1;
      console.log(
        `FAIL ${name}\n  beklenen: ${JSON.stringify(expected)}\n  gelen:    ${JSON.stringify(actual)}`,
      );
    } else {
      console.log(`ok   ${name}`);
    }
  }

  function summary() {
    console.log(failures === 0 ? "\nGEÇTİ" : `\n${failures} BAŞARISIZ`);
    process.exit(failures === 0 ? 0 : 1);
  }

  return { check, checkEqual, summary, getFailures: () => failures };
}
