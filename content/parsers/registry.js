// Ortak Sepet - TR site parser registry
// Each parser describes how to recognise a site and which site-specific parser to run.
(function () {
  function createContext(input) {
    const href = typeof input === "string" ? input : input?.href || window.location.href;
    let url = null;

    try {
      url = new URL(href);
    } catch (_) {
      url = null;
    }

    return {
      href,
      url,
      host: url?.hostname || window.location.hostname || "",
    };
  }

  // Alan adı üzerinden eşleşiyoruz. Parça araması yanlış siteyi seçebiliyor:
  // "pazarama.com" içinde "zara" da geçiyor.
  function hostIs(domain) {
    return (context) => {
      const host = String(context.host || "").replace(/^www\d*\./, "");
      return host === domain || host.endsWith(`.${domain}`);
    };
  }

  const parsers = [
    {
      id: "zara",
      label: "Zara TR",
      matches: hostIs("zara.com"),
      parse: () => parseZara(),
    },
    {
      id: "bershka",
      label: "Bershka TR",
      matches: hostIs("bershka.com"),
      parse: () => parseBershka(),
    },
    {
      id: "hm",
      label: "H&M TR",
      matches: hostIs("hm.com"),
      parse: () => parseHm(),
    },
    {
      id: "jeanslab",
      label: "JeansLab",
      matches: hostIs("jeanslab.com"),
      parse: () => parseJeansLab(),
      waitForPrice: true,
    },
    {
      id: "trendyol",
      label: "Trendyol",
      matches: hostIs("trendyol.com"),
      parse: () => parseTrendyol(),
    },
    {
      id: "hepsiburada",
      label: "Hepsiburada",
      matches: hostIs("hepsiburada.com"),
      parse: () => parseHepsiburada(),
    },
    {
      id: "n11",
      label: "N11",
      matches: hostIs("n11.com"),
      parse: () => parseN11(),
    },
    {
      id: "amazon-tr",
      label: "Amazon TR",
      matches: hostIs("amazon.com.tr"),
      parse: () => parseAmazonTr(),
    },
    {
      id: "teknosa",
      label: "Teknosa",
      matches: hostIs("teknosa.com"),
      parse: () => parseTeknosa(),
    },
    {
      id: "vatan",
      label: "Vatan Bilgisayar",
      matches: hostIs("vatanbilgisayar.com"),
      parse: () => parseVatan(),
    },
    {
      id: "mediamarkt",
      label: "MediaMarkt TR",
      matches: hostIs("mediamarkt.com.tr"),
      parse: () => parseMediaMarkt(),
    },
    {
      id: "idefix",
      label: "idefix",
      matches: hostIs("idefix.com"),
      parse: () => parseIdefix(),
    },
    {
      id: "pazarama",
      label: "Pazarama",
      matches: hostIs("pazarama.com"),
      parse: () => parsePazarama(),
    },
    {
      id: "itopya",
      label: "İtopya",
      matches: hostIs("itopya.com"),
      parse: () => parseItopya(),
    },
    {
      id: "incehesap",
      label: "İncehesap",
      matches: hostIs("incehesap.com"),
      parse: () => parseIncehesap(),
    },
    {
      id: "sephora-tr",
      label: "Sephora TR",
      matches: hostIs("sephora.com.tr"),
      parse: () => parseSephora(),
    },
    {
      id: "ciceksepeti",
      label: "Çiçeksepeti",
      matches: hostIs("ciceksepeti.com"),
      parse: () => parseCiceksepeti(),
    },
    {
      id: "dr",
      label: "D&R",
      matches: hostIs("dr.com.tr"),
      parse: () => parseDr(),
    },
    {
      id: "ikea-tr",
      label: "IKEA TR",
      matches: hostIs("ikea.com.tr"),
      parse: () => parseIkeaTr(),
      waitForPrice: true,
    },
    {
      id: "samsonite-tr",
      label: "Samsonite TR",
      matches: hostIs("samsonite.com.tr"),
      parse: () => parseSamsoniteTr(),
    },
    {
      id: "decathlon-tr",
      label: "Decathlon TR",
      matches: hostIs("decathlon.com.tr"),
      parse: () => parseDecathlonTr(),
      waitForPrice: true,
    },
    {
      id: "zippo-tr",
      label: "Zippo TR",
      matches: hostIs("zippo.com.tr"),
      parse: () => parseZippoTr(),
    },
  ];

  function getOrtakSepetParserForUrl(input) {
    const context = createContext(input);

    return (
      parsers.find((parser) => {
        try {
          return parser.matches(context);
        } catch (_) {
          return false;
        }
      }) || null
    );
  }

  globalThis.ORTAK_SEPET_SITE_PARSERS = parsers;
  globalThis.getOrtakSepetParserForUrl = getOrtakSepetParserForUrl;
})();
