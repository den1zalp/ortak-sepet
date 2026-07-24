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

  function hostIncludes(fragment) {
    return (context) => context.host.includes(fragment);
  }

  const parsers = [
    {
      id: "zara",
      label: "Zara TR",
      matches: hostIncludes("zara"),
      parse: () => parseZara(),
    },
    {
      id: "bershka",
      label: "Bershka TR",
      matches: hostIncludes("bershka"),
      parse: () => parseBershka(),
    },
    {
      id: "hm",
      label: "H&M TR",
      matches: hostIncludes("hm.com"),
      parse: () => parseHm(),
    },
    {
      id: "jeanslab",
      label: "JeansLab",
      matches: hostIncludes("jeanslab"),
      parse: () => parseJeansLab(),
      waitForPrice: true,
    },
    {
      id: "trendyol",
      label: "Trendyol",
      matches: hostIncludes("trendyol"),
      parse: () => parseTrendyol(),
    },
    {
      id: "hepsiburada",
      label: "Hepsiburada",
      matches: hostIncludes("hepsiburada"),
      parse: () => parseHepsiburada(),
    },
    {
      id: "n11",
      label: "N11",
      matches: hostIncludes("n11"),
      parse: () => parseN11(),
    },
    {
      id: "amazon-tr",
      label: "Amazon TR",
      matches: hostIncludes("amazon"),
      parse: () => parseAmazonTr(),
    },
    {
      id: "teknosa",
      label: "Teknosa",
      matches: hostIncludes("teknosa"),
      parse: () => parseTeknosa(),
    },
    {
      id: "vatan",
      label: "Vatan Bilgisayar",
      matches: hostIncludes("vatanbilgisayar"),
      parse: () => parseVatan(),
    },
    {
      id: "mediamarkt",
      label: "MediaMarkt TR",
      matches: hostIncludes("mediamarkt"),
      parse: () => parseMediaMarkt(),
    },
    {
      id: "idefix",
      label: "idefix",
      matches: hostIncludes("idefix"),
      parse: () => parseIdefix(),
    },
    {
      id: "pazarama",
      label: "Pazarama",
      matches: hostIncludes("pazarama"),
      parse: () => parsePazarama(),
    },
    {
      id: "itopya",
      label: "İtopya",
      matches: hostIncludes("itopya"),
      parse: () => parseItopya(),
    },
    {
      id: "incehesap",
      label: "İncehesap",
      matches: hostIncludes("incehesap"),
      parse: () => parseIncehesap(),
    },
    {
      id: "sephora-tr",
      label: "Sephora TR",
      matches: hostIncludes("sephora"),
      parse: () => parseSephora(),
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
