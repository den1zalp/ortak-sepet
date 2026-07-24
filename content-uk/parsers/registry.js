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

  function hostIncludes(fragment) {
    return (context) => context.host.includes(fragment);
  }

  const parsers = [
    {
      id: "amazon-uk",
      label: "Amazon UK",
      matches: hostIncludes("amazon.co.uk"),
      parse: () => parseAmazonUk(),
    },
    {
      id: "ebay-uk",
      label: "eBay UK",
      matches: hostIncludes("ebay.co.uk"),
      parse: () => parseEbayUk(),
    },
    {
      id: "vinted-uk",
      label: "Vinted UK",
      matches: hostIncludes("vinted.co.uk"),
      parse: () => parseVintedUk(),
    },
    {
      id: "argos-uk",
      label: "Argos UK",
      matches: hostIncludes("argos.co.uk"),
      parse: () => parseArgosUk(),
    },
    {
      id: "currys-uk",
      label: "Currys UK",
      matches: hostIncludes("currys.co.uk"),
      parse: () => parseCurrysUk(),
    },
    {
      id: "diesel-uk",
      label: "Diesel UK",
      matches: hostIncludes("diesel"),
      parse: () => parseDieselUk(),
      waitForFinance: true,
    },
    {
      id: "temu-uk",
      label: "Temu UK",
      matches: hostIncludes("temu"),
      parse: () => parseTemuUk(),
      waitForPrice: true,
    },
    {
      id: "aliexpress-uk",
      label: "AliExpress UK",
      matches: hostIncludes("aliexpress"),
      parse: () => parseAliExpressUk(),
      waitForPrice: true,
    },
    {
      id: "sephora-uk",
      label: "Sephora UK",
      matches: hostIncludes("sephora"),
      parse: () => parseSephoraUk(),
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
