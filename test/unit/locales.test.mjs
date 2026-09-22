// Eklenti açıklaması manifest'te değil _locales altında duruyor; tarayıcı
// kendi diline göre seçiyor. Anahtar bir dilde eksikse açıklama sessizce
// varsayılan dile düşüyor, hiç yoksa Chrome eklentiyi yüklemiyor.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { REPO_ROOT, createChecker } from "../helpers/extension.mjs";

const { check, checkEqual, summary } = createChecker();

const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "manifest.json"), "utf8"));
const localesDir = join(REPO_ROOT, "_locales");

check("_locales klasörü var", existsSync(localesDir));

const locales = readdirSync(localesDir);

check("en ve tr çevirileri var", locales.includes("en") && locales.includes("tr"), locales.join(", "));
check("default_locale tanımlı", Boolean(manifest.default_locale), String(manifest.default_locale));
check(
  "default_locale gerçekten var",
  locales.includes(manifest.default_locale),
  manifest.default_locale,
);

// Manifest'te geçen her "__MSG_x__" anahtarı toplanıyor.
const placeholders = new Set();

const collect = (value) => {
  if (typeof value === "string") {
    const match = value.match(/^__MSG_(\w+)__$/);
    if (match) placeholders.add(match[1]);
  } else if (value && typeof value === "object") {
    Object.values(value).forEach(collect);
  }
};

collect(manifest);

check("manifest çeviri anahtarı kullanıyor", placeholders.size > 0, [...placeholders].join(", "));

const messagesByLocale = {};

for (const locale of locales) {
  const path = join(localesDir, locale, "messages.json");

  check(`${locale}: messages.json var`, existsSync(path));

  let messages = null;

  try {
    messages = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    check(`${locale}: messages.json okunabiliyor`, false, error.message);
    continue;
  }

  messagesByLocale[locale] = messages;

  for (const key of placeholders) {
    const text = messages[key]?.message;

    check(`${locale}: ${key} tanımlı`, typeof text === "string" && text.trim() !== "");
  }
}

// Diller birbirinden sapmasın: birine eklenen anahtar ötekinde de olmalı,
// yoksa o dildeki kullanıcı sessizce İngilizce metni görür.
const keysOf = (locale) => Object.keys(messagesByLocale[locale] || {}).sort();

checkEqual("tr ve en aynı anahtarları taşıyor", keysOf("tr"), keysOf("en"));

// Aynı metin iki dile de kopyalanmış olmasın: açıklama gerçekten çevrilmiş mi?
for (const key of placeholders) {
  const tr = messagesByLocale.tr?.[key]?.message;
  const en = messagesByLocale.en?.[key]?.message;

  check(`${key}: iki dilde farklı metin`, Boolean(tr) && Boolean(en) && tr !== en, `${tr} / ${en}`);
}

// Chrome mağazası manifest açıklamasını 132 karakterle sınırlıyor.
for (const [locale, messages] of Object.entries(messagesByLocale)) {
  const text = messages.extensionDescription?.message || "";

  check(`${locale}: açıklama 132 karakteri aşmıyor`, text.length <= 132, `${text.length} karakter`);
}

summary();
