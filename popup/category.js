// Ortak Sepet popup module: category.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

function normalizeForCategory(text) {
  return String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesKeyword(text, keyword) {
  const normalizedKeyword = normalizeForCategory(keyword);

  if (!normalizedKeyword) return false;

  const isShortKeyword = normalizedKeyword.length <= 3;
  const isSingleWord = !normalizedKeyword.includes(" ");

  if (isShortKeyword && isSingleWord) {
    const regex = new RegExp(
      `(^|[^a-z0-9])${escapeRegex(normalizedKeyword)}($|[^a-z0-9])`,
      "i",
    );

    return regex.test(text);
  }

  return text.includes(normalizedKeyword);
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => includesKeyword(text, keyword));
}

function categorizeProduct(item) {
  const text = normalizeForCategory(`${item.title || ""} ${item.site || ""}`);

  const rules = [
    {
      category: "Anne & Bebek",
      keywords: [
        "bebek",
        "mama",
        "devam sutu",
        "bebelac",
        "aptamil",
        "sma",
        "bez",
        "islak mendil",
        "emzik",
        "biberon",
        "oyuncak bebek",
      ],
    },
    {
      category: "İçecek",
      keywords: [
        "red bull",
        "enerji icecegi",
        "icecek",
        "kola",
        "gazoz",
        "su",
        "soda",
        "kahve",
        "cay",
        "meyve suyu",
      ],
    },
    {
      category: "Elektronik",
      keywords: [
        "usb",
        "bellek",
        "ssd",
        "hdd",
        "harddisk",
        "kulaklik",
        "mouse",
        "klavye",
        "monitor",
        "laptop",
        "notebook",
        "tablet",
        "kamera",
        "sandisk",
        "kingston",
        "samsung",
        "logitech",
        "anker",
        "powerbank",
        "sarj",
        "şarj",
        "adaptör",
        "adapter",
        "kablo",
        "hdmi",
        "galaxy tab",
      ],
    },
    {
      category: "Telefon & Aksesuar",
      keywords: [
        "iphone",
        "android",
        "telefon",
        "kilif",
        "kılıf",
        "ekran koruyucu",
        "spigen",
        "magsafe",
        "airpods",
        "watch",
        "akilli saat",
        "akıllı saat",
      ],
    },
    {
      category: "Bilgisayar",
      keywords: [
        "islemci",
        "işlemci",
        "anakart",
        "ram",
        "ekran karti",
        "ekran kartı",
        "ryzen",
        "intel",
        "nvidia",
        "amd",
        "rtx",
        "ddr5",
        "psu",
        "kasa",
        "fan",
        "sogutucu",
        "soğutucu",
      ],
    },
    {
      category: "Ev & Yaşam",
      keywords: [
        "ev",
        "mutfak",
        "banyo",
        "koltuk",
        "masa",
        "sandalye",
        "hali",
        "halı",
        "lamba",
        "nevresim",
        "yastik",
        "yastık",
        "dekorasyon",
        "supurge",
        "süpürge",
        "tencere",
        "tabak",
        "bardak",
        "dik y sarjli supurge",
        "dik süpürge",
        "kablolu supurge",
        "kablosuz supurge",
        "powercyclone",
      ],
    },
    {
      category: "Kişisel Bakım",
      keywords: [
        "sampuan",
        "şampuan",
        "parfum",
        "parfüm",
        "deodorant",
        "dis macunu",
        "diş macunu",
        "tirnak",
        "tırnak",
        "sac",
        "saç",
        "cilt",
        "krem",
        "tras",
        "tıraş",
        "tiras",
        "makyaj",
        "kozmetik",
      ],
    },
    {
      category: "Giyim",
      keywords: [
        "tisort",
        "tişört",
        "gomlek",
        "gömlek",
        "pantolon",
        "ayakkabi",
        "ayakkabı",
        "mont",
        "ceket",
        "elbise",
        "kazak",
        "sweatshirt",
        "corap",
        "çorap",
      ],
    },
    {
      category: "Kitap & Kırtasiye",
      keywords: [
        "kitap",
        "roman",
        "defter",
        "kalem",
        "kirtasiye",
        "kırtasiye",
        "ajanda",
        "silgi",
        "dosya",
      ],
    },
    {
      category: "Market",
      keywords: [
        "gida",
        "gıda",
        "makarna",
        "pirinc",
        "pirinç",
        "un",
        "seker",
        "şeker",
        "cikolata",
        "çikolata",
        "biskuvi",
        "bisküvi",
        "cips",
        "sut",
        "süt",
        "peynir",
        "zeytin",
        "yag",
        "yağ",
        "temizlik",
      ],
    },
    {
      category: "Oyuncak",
      keywords: [
        "oyuncak",
        "lego",
        "puzzle",
        "pelus",
        "peluş",
        "figür",
        "figur",
        "araba oyuncak",
      ],
    },
    {
      category: "Otomotiv",
      keywords: [
        "araba",
        "oto",
        "otomobil",
        "lastik",
        "motor yagi",
        "motor yağı",
        "silecek",
        "akü",
        "aku",
        "jant",
      ],
    },
  ];

  const matchedRule = rules.find((rule) => includesAny(text, rule.keywords));

  return matchedRule ? matchedRule.category : "Diğer";
}
