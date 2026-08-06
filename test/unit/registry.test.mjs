// manifest ↔ registry ↔ parser tutarlılığı. Tarayıcı gerekmiyor: content
// script'ler node:vm içinde sahte bir document ile yükleniyor, sonra
// manifest'teki her host'un bir parser'a düştüğü doğrulanıyor.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "manifest.json"), "utf8"));

function loadBlock(blockIndex, entryFile, hosts, registryGetter) {
  const files = manifest.content_scripts[blockIndex].js.filter(
    (file) => !file.includes("browser-polyfill") && file !== entryFile,
  );

  const windowStub = { location: { hostname: "", href: "" }, innerWidth: 1280, innerHeight: 900 };
  const context = vm.createContext({
    window: windowStub,
    document: { querySelector: () => null, querySelectorAll: () => [], title: "" },
    console,
    URL,
    browser: { runtime: { onMessage: { addListener() {} } } },
    chrome: { runtime: { onMessage: { addListener() {} } } },
  });
  context.globalThis = context;

  for (const file of files) {
    try {
      vm.runInContext(readFileSync(join(REPO_ROOT, file), "utf8"), context, { filename: file });
    } catch (error) {
      check(`${file} yüklendi`, false, error.message);
      return;
    }
  }

  check(`content_scripts[${blockIndex}] dosyaları yüklendi (${files.length})`, true);

  // Registry'deki her parse fonksiyonu gerçekten tanımlı mı?
  const registryFile = files.find((file) => file.endsWith("registry.js"));
  const registrySource = readFileSync(join(REPO_ROOT, registryFile), "utf8");
  const parseNames = [...registrySource.matchAll(/parse:\s*\(\)\s*=>\s*(\w+)\(/g)].map((m) => m[1]);

  check(`${registryFile}: parser sayısı > 0`, parseNames.length > 0);

  for (const name of parseNames) {
    check(`${name} tanımlı`, typeof context[name] === "function");
  }

  // Manifest'teki her host bir parser'a düşüyor mu?
  const getParser = context[registryGetter];
  check(`${registryGetter} global`, typeof getParser === "function");

  for (const host of hosts) {
    const parser = getParser(`https://www.${host}/product/1`);
    check(`${host} -> ${parser ? parser.id : "YOK"}`, Boolean(parser));
  }
}

const trHosts = manifest.content_scripts[0].matches.map((m) => m.replace("*://*.", "").replace("/*", ""));
const ukHosts = manifest.content_scripts[1].matches.map((m) => m.replace("*://*.", "").replace("/*", ""));

console.log("--- TR ---");
loadBlock(0, "content.js", trHosts, "getOrtakSepetParserForUrl");
console.log("--- UK ---");
loadBlock(1, "content-uk.js", ukHosts, "getOrtakSepetUkParserForUrl");

summary();
