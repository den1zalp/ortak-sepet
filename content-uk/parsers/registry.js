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
    {
      id: "zippo-uk",
      label: "Zippo UK",
      matches: hostIs("zippo.co.uk"),
      parse: () => parseZippoUk(),
    },
    {
      // Content script yalnızca birkenstock.com/gb/ yoluna enjekte ediliyor,
      // bu yüzden burada alan adına bakmak yetiyor (bkz. manifest.json).
      id: "birkenstock-uk",
      label: "Birkenstock UK",
      matches: hostIs("birkenstock.com"),
      parse: () => parseBirkenstockUk(),
    },
    {
      id: "crocs-uk",
      label: "Crocs UK",
      matches: hostIs("crocs.co.uk"),
      parse: () => parseCrocsUk(),
    },
    {
      id: "vans-uk",
      label: "Vans UK",
      matches: hostIs("vans.com"),
      parse: () => parseVansUk(),
    },
    {
      // İngiltere mağazası global alan adının /gb/ yolunda; content script
      // yalnızca oraya enjekte edildiği için host eşleşmesi yeterli.
      id: "nike-uk",
      label: "Nike UK",
      matches: hostIs("nike.com"),
      parse: () => parseNikeUk(),
      // Fiyat kutusu bir saniyeyi aşabiliyor.
      waitForPrice: true,
    },
    {
      id: "adidas-uk",
      label: "Adidas UK",
      matches: hostIs("adidas.co.uk"),
      parse: () => parseAdidasUk(),
    },
    {
      // Content script yalnızca ifixit.com/en-gb/products/ yoluna enjekte
      // ediliyor; sitenin geri kalanı tamir rehberi (bkz. manifest.json).
      id: "ifixit-uk",
      label: "iFixit UK",
      matches: hostIs("ifixit.com"),
      parse: () => parseIfixitUk(),
    },
    {
      id: "jackjones-uk",
      label: "Jack & Jones UK",
      matches: hostIs("jackjones.com"),
      parse: () => parseJackJonesUk(),
    },
    {
      id: "apple-uk",
      label: "Apple UK",
      matches: hostIs("apple.com"),
      parse: () => parseAppleUk(),
    },
    {
      id: "levis-uk",
      label: "Levi's UK",
      matches: hostIs("levi.com"),
      parse: () => parseLevisUk(),
    },
    {
      id: "calvinklein-uk",
      label: "Calvin Klein UK",
      matches: hostIs("calvinklein.co.uk"),
      parse: () => parseCalvinKleinUk(),
    },
    {
      id: "champion-uk",
      label: "Champion UK",
      matches: hostIs("championstore.com"),
      parse: () => parseChampionUk(),
    },
    {
      id: "lacoste-uk",
      label: "Lacoste UK",
      matches: hostIs("lacoste.com"),
      parse: () => parseLacosteUk(),
    },
    {
      id: "marksandspencer-uk",
      label: "Marks & Spencer UK",
      matches: hostIs("marksandspencer.com"),
      parse: () => parseMarksAndSpencerUk(),
    },
    {
      id: "mi-uk",
      label: "Mi UK",
      matches: hostIs("mi.com"),
      parse: () => parseMiUk(),
    },
    {
      id: "oysho-uk",
      label: "Oysho UK",
      matches: hostIs("oysho.com"),
      parse: () => parseOyshoUk(),
    },
    {
      id: "pandora-uk",
      label: "Pandora UK",
      matches: hostIs("pandora.net"),
      parse: () => parsePandoraUk(),
    },
    {
      id: "pullandbear-uk",
      label: "Pull & Bear UK",
      matches: hostIs("pullandbear.com"),
      parse: () => parsePullAndBearUk(),
    },
    {
      id: "stradivarius-uk",
      label: "Stradivarius UK",
      matches: hostIs("stradivarius.com"),
      parse: () => parseStradivariusUk(),
    },
    {
      id: "swatch-uk",
      label: "Swatch UK",
      matches: hostIs("swatch.com"),
      parse: () => parseSwatchUk(),
    },
    {
      id: "underarmour-uk",
      label: "Under Armour UK",
      matches: hostIs("underarmour.co.uk"),
      parse: () => parseUnderArmourUk(),
    },
    {
      id: "sportsdirect",
      label: "Sports Direct",
      matches: hostIs("sportsdirect.com"),
      parse: () => parseSportsDirect(),
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
