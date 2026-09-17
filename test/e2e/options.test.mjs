// Seçenek satırları popup'ta gerçekten çalışıyor mu?
//
// Beden tek eksen olmaktan çıkıp renk/uzunluk/depolama eklendiğinde popup'ın
// yarısı değişti (satırların çizimi, seçim, satır birleştirme, CSV, alınanlar).
// Diğer e2e dosyaları seçeneksiz ürünlerle çalıştığı için bu değişikliklerin
// hiçbirine dokunmuyorlardı.
import { launchExtension, createChecker, screenshotPath } from "../helpers/extension.mjs";

const { check, summary } = createChecker();

const { browser, sw, extensionId } = await launchExtension({ windowSize: "1280,980" });

const base = {
  price: "2.990,00 TL",
  currency: "TRY",
  currencySymbol: "TL",
  region: "TR",
  site: "Jack & Jones",
  quantity: 1,
  selected: true,
};

await sw.evaluate(async (base) => {
  await browser.storage.local.set({
    ortakSepetViewMode: "normal",
    ortakSepetItems: [
      // İki eksenli ürün: beden seçili değil, renk tek değerli.
      {
        ...base,
        id: "iki-eksen",
        title: "Erkek Chris 402 Loose Fit Jean",
        url: "https://www.jackjones.com.tr/p/1",
        options: [
          { key: "size", label: "Beden", values: ["30", "31", "32"], selected: "" },
          { key: "colour", label: "Renk", values: ["Mavi"], selected: "Mavi" },
        ],
      },
      // Aynı ürün, beden 32: seçim 32'ye çevrilirse bu satırla birleşmeli.
      {
        ...base,
        id: "ikiz",
        title: "Erkek Chris 402 Loose Fit Jean",
        url: "https://www.jackjones.com.tr/p/1",
        quantity: 2,
        options: [
          { key: "size", label: "Beden", values: ["30", "31", "32"], selected: "32" },
          { key: "colour", label: "Renk", values: ["Mavi"], selected: "Mavi" },
        ],
      },
      // Seçeneksiz ürün: satır çıkmamalı, "Beden Gir" düğmesi çıkmalı.
      {
        ...base,
        id: "seceneksiz",
        title: "Philips Airfryer",
        url: "https://www.hepsiburada.com/p/2",
        site: "Hepsiburada",
      },
      // Eski biçimde kaydedilmiş ürün: göç yolu arayüzde de çalışmalı.
      {
        ...base,
        id: "eski",
        title: "Eski kayıt",
        url: "https://www.mavi.com/p/3",
        site: "Mavi",
        sizes: ["S", "M", "L"],
        size: "M",
      },
    ],
  });
  await browser.storage.local.remove(["ortakSepetPurchased", "ortakSepetUndo"]);
}, base);

const popup = await browser.newPage();
await popup.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, 1500));

const readRows = () =>
  popup.evaluate(() =>
    [...document.querySelectorAll("#cartItems .cart-item")].map((el) => ({
      title: el.querySelector(".cart-title")?.textContent?.trim(),
      labels: [...el.querySelectorAll(".detail-label")].map((n) => n.textContent.trim()),
      selects: [...el.querySelectorAll("select.size-select")].map((n) => ({
        key: n.dataset.optionKey,
        value: n.value,
        options: [...n.options].map((o) => o.textContent.trim()),
      })),
      buttons: [...el.querySelectorAll(".cart-actions button")].map((n) => n.textContent.trim()),
      text: el.innerText.replace(/\s+/g, " "),
    })),
  );

const rows = await readRows();

const twoAxis = rows.find((row) => row.text.includes("Chris 402") && row.text.includes("Beden:"));
check("iki eksenli üründe beden satırı var", twoAxis?.labels.includes("Beden:"), twoAxis?.labels.join(","));
check("iki eksenli üründe renk satırı var", twoAxis?.labels.includes("Renk:"), twoAxis?.labels.join(","));
check("beden açılır listesi çizildi", twoAxis?.selects.some((s) => s.key === "size"), JSON.stringify(twoAxis?.selects));
check(
  "tek değerli renk açılır liste değil",
  !twoAxis?.selects.some((s) => s.key === "colour"),
  JSON.stringify(twoAxis?.selects),
);
check("renk değeri yazılı", twoAxis?.text.includes("Mavi"), twoAxis?.text.slice(0, 80));

const noOptions = rows.find((row) => row.title?.includes("Airfryer"));
check("seçeneksiz üründe seçenek satırı yok", !noOptions?.labels.includes("Beden:"), noOptions?.labels.join(","));
check("seçeneksiz üründe 'Beden Gir' düğmesi var", noOptions?.buttons.includes("Beden Gir"), noOptions?.buttons.join(","));

const legacy = rows.find((row) => row.title?.includes("Eski kayıt"));
check("eski kayıt seçenek satırı çizildi", legacy?.labels.includes("Beden:"), legacy?.labels.join(","));
check(
  "eski kaydın seçimi korundu",
  legacy?.selects.find((s) => s.key === "size")?.value,
  "M",
);

// --- seçim değiştirince depoya yazılıyor mu, satırlar birleşiyor mu? -------
await popup.evaluate(() => {
  const select = [...document.querySelectorAll("select.size-select")].find(
    (node) => node.dataset.optionKey === "size" && node.value === "",
  );

  select.value = "32";
  select.dispatchEvent(new Event("change", { bubbles: true }));
});

await new Promise((r) => setTimeout(r, 1500));

const stored = await sw.evaluate(async () => {
  const { ortakSepetItems } = await browser.storage.local.get("ortakSepetItems");
  return ortakSepetItems.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    selected: (item.options || []).map((o) => `${o.key}=${o.selected}`).join(","),
  }));
});

const jackJones = stored.filter((item) => item.id === "iki-eksen" || item.id === "ikiz");
check("aynı seçime gelen satır birleşti", jackJones.length, 1);
check("birleşen satırın adedi toplandı", jackJones[0]?.quantity, 3);
check("seçim depoya yazıldı", jackJones[0]?.selected.includes("size=32"), jackJones[0]?.selected);

const status = await popup.evaluate(() => document.querySelector("#status")?.textContent?.trim());
check("birleşme kullanıcıya söylendi", /birleştirildi/i.test(status || ""), status);

// --- panoya kopyalanan metin seçimleri taşıyor mu? ------------------------
const copyText = await popup.evaluate(() => {
  const item = { title: "X", price: "1 TL", options: [{ key: "size", label: "Beden", values: [], selected: "32" }] };
  return typeof formatSelectedOptions === "function" ? formatSelectedOptions(item) : "(yok)";
});

check("seçim özeti biçimlendi", copyText, "Beden: 32");

await popup.screenshot({ path: screenshotPath("options.png") });

const consoleErrors = [];
popup.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await popup.reload({ waitUntil: "load" });
await new Promise((r) => setTimeout(r, 1200));

check("popup konsolunda hata yok", consoleErrors.length === 0, consoleErrors.join(" | "));

await browser.close();
summary();
