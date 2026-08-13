// Ortak Sepet - UK site parser registry
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

  // Alan adı üzerinden eşleşiyoruz; parça araması komşu bir markanın alan
  // adına da denk gelebiliyor.
  function hostIs(domain) {
    return (context) => {
      const host = String(context.host || "").replace(/^www\d*\./, "");
      return host === domain || host.endsWith(`.${domain}`);
    };
  }

  const parsers = [
    {
      id: "amazon-uk",
      label: "Amazon UK",
      matches: hostIs("amazon.co.uk"),
      parse: () => parseAmazonUk(),
    },
    {
      id: "ebay-uk",
      label: "eBay UK",
      matches: hostIs("ebay.co.uk"),
      parse: () => parseEbayUk(),
    },
    {
      id: "vinted-uk",
      label: "Vinted UK",
      matches: hostIs("vinted.co.uk"),
      parse: () => parseVintedUk(),
    },
    {
      id: "argos-uk",
      label: "Argos UK",
      matches: hostIs("argos.co.uk"),
      parse: () => parseArgosUk(),
    },
    {
      id: "currys-uk",
      label: "Currys UK",
      matches: hostIs("currys.co.uk"),
      parse: () => parseCurrysUk(),
    },
    {
      id: "diesel-uk",
      label: "Diesel UK",
      matches: hostIs("diesel.com"),
      parse: () => parseDieselUk(),
      waitForFinance: true,
    },
    {
      id: "temu-uk",
      label: "Temu UK",
      matches: hostIs("temu.com"),
      parse: () => parseTemuUk(),
      waitForPrice: true,
    },
    {
      id: "aliexpress-uk",
      label: "AliExpress UK",
      matches: hostIs("aliexpress.com"),
      parse: () => parseAliExpressUk(),
      waitForPrice: true,
    },
    {
      id: "sephora-uk",
      label: "Sephora UK",
      matches: hostIs("sephora.co.uk"),
      parse: () => parseSephoraUk(),
      waitForPrice: true,
    },
    {
      id: "gymshark-uk",
      label: "Gymshark UK",
      matches: hostIs("gymshark.com"),
      parse: () => parseGymsharkUk(),
    },
    {
      id: "ikea-uk",
      label: "IKEA UK",
      matches: hostIs("ikea.com"),
      parse: () => parseIkeaUk(),
      waitForPrice: true,
    },
    {
      id: "samsonite-uk",
      label: "Samsonite UK",
      matches: hostIs("samsonite.co.uk"),
      parse: () => parseSamsoniteUk(),
    },
    {
      id: "decathlon-uk",
      label: "Decathlon UK",
      matches: hostIs("decathlon.co.uk"),
      parse: () => parseDecathlonUk(),
      waitForPrice: true,
    },
  ];

  function getOrtakSepetUkParserForUrl(input) {
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

  globalThis.ORTAK_SEPET_UK_SITE_PARSERS = parsers;
  globalThis.getOrtakSepetUkParserForUrl = getOrtakSepetUkParserForUrl;
})();
