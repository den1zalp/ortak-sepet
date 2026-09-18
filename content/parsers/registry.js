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
    {
      id: "birkenstock-tr",
      label: "Birkenstock TR",
      matches: hostIs("birkenstock.com.tr"),
      parse: () => parseBirkenstockTr(),
    },
    {
      id: "crocs-tr",
      label: "Crocs TR",
      matches: hostIs("crocs.com.tr"),
      parse: () => parseCrocsTr(),
      waitForPrice: true,
    },
    {
      id: "vans-tr",
      label: "Vans TR",
      matches: hostIs("vans.com.tr"),
      parse: () => parseVansTr(),
    },
    {
      id: "boyner",
      label: "Boyner",
      matches: hostIs("boyner.com.tr"),
      parse: () => parseBoyner(),
    },
    {
      // Türkiye mağazası global alan adının /tr/ yolunda; content script
      // yalnızca oraya enjekte edildiği için host eşleşmesi yeterli.
      id: "nike-tr",
      label: "Nike TR",
      matches: hostIs("nike.com"),
      parse: () => parseNikeTr(),
      // Fiyat kutusu bir saniyeyi aşabiliyor.
      waitForPrice: true,
    },
    {
      id: "adidas-tr",
      label: "Adidas TR",
      matches: hostIs("adidas.com.tr"),
      parse: () => parseAdidasTr(),
    },
    {
      id: "mavi",
      label: "Mavi",
      matches: hostIs("mavi.com"),
      parse: () => parseMavi(),
    },
    {
      id: "ltb",
      label: "LTB",
      matches: hostIs("ltbjeans.com"),
      parse: () => parseLtb(),
    },
    {
      id: "koton",
      label: "Koton",
      matches: hostIs("koton.com"),
      parse: () => parseKoton(),
    },
    {
      id: "levis-tr",
      label: "Levi's TR",
      matches: hostIs("levis.com.tr"),
      parse: () => parseLevisTr(),
    },
    {
      id: "lcwaikiki",
      label: "LC Waikiki",
      matches: hostIs("lcw.com"),
      parse: () => parseLcWaikiki(),
    },
    {
      id: "colins",
      label: "Colin's",
      matches: hostIs("colins.com.tr"),
      parse: () => parseColins(),
    },
    {
      id: "tudors",
      label: "Tudors",
      matches: hostIs("tudors.com"),
      parse: () => parseTudors(),
    },
    {
      id: "defacto",
      label: "DeFacto",
      matches: hostIs("defacto.com.tr"),
      parse: () => parseDefacto(),
    },
    {
      id: "jackjones-tr",
      label: "Jack & Jones TR",
      matches: hostIs("jackjones.com.tr"),
      parse: () => parseJackJonesTr(),
    },
    {
      id: "gratis",
      label: "Gratis",
      matches: hostIs("gratis.com"),
      parse: () => parseGratis(),
    },
    {
      id: "watsons",
      label: "Watsons",
      matches: hostIs("watsons.com.tr"),
      parse: () => parseWatsons(),
    },
    {
      id: "rossmann",
      label: "Rossmann",
      matches: hostIs("rossmann.com.tr"),
      parse: () => parseRossmann(),
    },
    {
      id: "atasun",
      label: "Atasun Optik",
      matches: hostIs("atasunoptik.com.tr"),
      parse: () => parseAtasun(),
    },
    {
      id: "apple-tr",
      label: "Apple TR",
      matches: hostIs("apple.com"),
      parse: () => parseAppleTr(),
    },
    {
      id: "beymen",
      label: "Beymen",
      matches: hostIs("beymen.com"),
      parse: () => parseBeymen(),
    },
    {
      id: "calvinklein-tr",
      label: "Calvin Klein TR",
      matches: hostIs("calvinklein.com"),
      parse: () => parseCalvinKleinTr(),
    },
    {
      id: "champion-tr",
      label: "Champion TR",
      matches: hostIs("championturkiye.com"),
      parse: () => parseChampionTr(),
    },
    {
      id: "desa",
      label: "Desa",
      matches: hostIs("desa.com.tr"),
      parse: () => parseDesa(),
    },
    {
      id: "karaca",
      label: "Karaca",
      matches: hostIs("karaca.com"),
      parse: () => parseKaraca(),
    },
    {
      id: "konyali-saat",
      label: "Konyalı Saat",
      matches: hostIs("konyalisaat.com.tr"),
      parse: () => parseKonyaliSaat(),
    },
    {
      id: "lacoste-tr",
      label: "Lacoste TR",
      matches: hostIs("lacoste.com.tr"),
      parse: () => parseLacosteTr(),
    },
    {
      id: "marksandspencer-tr",
      label: "Marks & Spencer TR",
      matches: hostIs("marksandspencer.com.tr"),
      parse: () => parseMarksAndSpencerTr(),
    },
    {
      id: "mi-tr",
      label: "Mi TR",
      matches: hostIs("mi.com"),
      parse: () => parseMiTr(),
    },
    {
      id: "mudo",
      label: "Mudo",
      matches: hostIs("mudo.com.tr"),
      parse: () => parseMudo(),
    },
    {
      id: "oysho-tr",
      label: "Oysho TR",
      matches: hostIs("oysho.com"),
      parse: () => parseOyshoTr(),
    },
    {
      id: "pandora-tr",
      label: "Pandora TR",
      matches: hostIs("pandora.net"),
      parse: () => parsePandoraTr(),
    },
    {
      id: "penti",
      label: "Penti",
      matches: hostIs("penti.com"),
      parse: () => parsePenti(),
    },
    {
      id: "pullandbear-tr",
      label: "Pull & Bear TR",
      matches: hostIs("pullandbear.com"),
      parse: () => parsePullAndBearTr(),
    },
    {
      id: "stradivarius-tr",
      label: "Stradivarius TR",
      matches: hostIs("stradivarius.com"),
      parse: () => parseStradivariusTr(),
    },
    {
      id: "swatch-tr",
      label: "Swatch TR",
      matches: hostIs("swatch.com"),
      parse: () => parseSwatchTr(),
    },
    {
      id: "superstep",
      label: "SuperStep",
      matches: hostIs("superstep.com.tr"),
      parse: () => parseSuperStep(),
    },
    {
      id: "saatvesaat",
      label: "Saat & Saat",
      matches: hostIs("saatvesaat.com.tr"),
      parse: () => parseSaatveSaat(),
    },
    {
      id: "zuhalmuzik",
      label: "Zuhal Müzik",
      matches: hostIs("zuhalmuzik.com"),
      parse: () => parseZuhalMuzik(),
    },
    {
      id: "underarmour-tr",
      label: "Under Armour TR",
      matches: hostIs("underarmour.com.tr"),
      parse: () => parseUnderArmourTr(),
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
