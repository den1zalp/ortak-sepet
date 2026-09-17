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
    // --- Aşağıdaki mağazalar ortak platform parser'ını kullanıyor ---
    // Hepsi ürün sayfasında schema.org Product verisi yayımlıyor; seçici
    // listeleri yalnızca o veri okunamadığında devreye giren yedekler.
    // waitForPrice, fiyatı JavaScript'le sonradan basan mağazalarda açık.
    {
      id: "mavi",
      label: "Mavi",
      matches: hostIs("mavi.com"),
      parse: () => parsePlatformProduct({ site: "Mavi" }),
      waitForPrice: true,
    },
    {
      id: "ltb",
      label: "LTB",
      matches: hostIs("ltbjeans.com"),
      parse: () => parsePlatformProduct({ site: "LTB" }),
      waitForPrice: true,
    },
    {
      id: "koton",
      label: "Koton",
      matches: hostIs("koton.com"),
      parse: () => parsePlatformProduct({ site: "Koton", priceSelectors: AKINON_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "levis-tr",
      label: "Levi's TR",
      matches: hostIs("levis.com.tr"),
      parse: () => parsePlatformProduct({ site: "Levi's", priceSelectors: SFCC_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "lcwaikiki",
      label: "LC Waikiki",
      matches: hostIs("lcw.com"),
      parse: () => parsePlatformProduct({ site: "LC Waikiki", priceSelectors: AKINON_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "colins",
      label: "Colin's",
      matches: hostIs("colins.com.tr"),
      parse: () => parsePlatformProduct({ site: "Colin's", priceSelectors: SFCC_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "tudors",
      label: "Tudors",
      matches: hostIs("tudors.com"),
      parse: () => parsePlatformProduct({ site: "Tudors", priceSelectors: TICIMAX_PRICE_SELECTORS }),
    },
    {
      id: "defacto",
      label: "DeFacto",
      matches: hostIs("defacto.com.tr"),
      parse: () => parsePlatformProduct({ site: "DeFacto" }),
      waitForPrice: true,
    },
    {
      id: "jackjones-tr",
      label: "Jack & Jones TR",
      matches: hostIs("jackjones.com.tr"),
      parse: () => parsePlatformProduct({ site: "Jack & Jones" }),
      waitForPrice: true,
    },
    {
      id: "gratis",
      label: "Gratis",
      matches: hostIs("gratis.com"),
      parse: () => parsePlatformProduct({ site: "Gratis" }),
      waitForPrice: true,
    },
    {
      id: "watsons",
      label: "Watsons",
      matches: hostIs("watsons.com.tr"),
      parse: () => parsePlatformProduct({ site: "Watsons" }),
      waitForPrice: true,
    },
    {
      id: "rossmann",
      label: "Rossmann",
      matches: hostIs("rossmann.com.tr"),
      parse: () => parsePlatformProduct({ site: "Rossmann" }),
      waitForPrice: true,
    },
    {
      // Türkiye mağazası global alan adının /tr/ yolunda; content script
      // yalnızca oraya enjekte ediliyor (bkz. manifest.json).
      id: "apple-tr",
      label: "Apple TR",
      matches: hostIs("apple.com"),
      parse: () =>
        parsePlatformProduct({
          site: "Apple",
          priceSelectors: ["[data-autom='full-price']", ".rc-prices-fullprice", ".as-price-currentprice"],
        }),
      waitForPrice: true,
    },
    {
      id: "atasun",
      label: "Atasun Optik",
      matches: hostIs("atasunoptik.com.tr"),
      parse: () => parsePlatformProduct({ site: "Atasun Optik" }),
    },
    {
      id: "beymen",
      label: "Beymen",
      matches: hostIs("beymen.com"),
      parse: () => parsePlatformProduct({ site: "Beymen", priceSelectors: AKINON_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "calvinklein-tr",
      label: "Calvin Klein TR",
      matches: hostIs("calvinklein.com"),
      parse: () =>
        parsePlatformProduct({
          site: "Calvin Klein",
          // İngiltere mağazasıyla aynı markup; orada JSON-LD'de offers boş
          // geliyor ve fiyat yalnızca bu işaretten okunabiliyor.
          priceSelectors: [
            "[data-testid='ProductHeaderPrice-PriceText']",
            "[data-testid='ProductHeaderPrice-PriceDisplay']",
            ...SFCC_PRICE_SELECTORS,
          ],
        }),
      waitForPrice: true,
    },
    {
      id: "champion-tr",
      label: "Champion TR",
      matches: hostIs("championturkiye.com"),
      parse: () => parsePlatformProduct({ site: "Champion", priceSelectors: SHOPIFY_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "columbia-tr",
      label: "Columbia TR",
      matches: hostIs("columbia.com.tr"),
      parse: () => parsePlatformProduct({ site: "Columbia" }),
      waitForPrice: true,
    },
    {
      id: "desa",
      label: "Desa",
      matches: hostIs("desa.com.tr"),
      parse: () => parsePlatformProduct({ site: "Desa", priceSelectors: TICIMAX_PRICE_SELECTORS }),
    },
    {
      id: "karaca",
      label: "Karaca",
      matches: hostIs("karaca.com"),
      parse: () => parsePlatformProduct({ site: "Karaca" }),
    },
    {
      id: "konyali-saat",
      label: "Konyalı Saat",
      matches: hostIs("konyalisaat.com.tr"),
      parse: () => parsePlatformProduct({ site: "Konyalı Saat" }),
    },
    {
      id: "lacoste-tr",
      label: "Lacoste TR",
      matches: hostIs("lacoste.com.tr"),
      parse: () => parsePlatformProduct({ site: "Lacoste", priceSelectors: AKINON_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "lego-tr",
      label: "LEGO TR",
      matches: hostIs("lego.tr"),
      parse: () => parsePlatformProduct({ site: "LEGO", priceSelectors: TSOFT_PRICE_SELECTORS }),
    },
    {
      id: "marksandspencer-tr",
      label: "Marks & Spencer TR",
      matches: hostIs("marksandspencer.com.tr"),
      parse: () =>
        parsePlatformProduct({ site: "Marks & Spencer", priceSelectors: AKINON_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      // Türkiye mağazası mi.com'un /tr/ yolunda, İngiltere'ninki /uk/ yolunda.
      id: "mi-tr",
      label: "Mi Store TR",
      matches: hostIs("mi.com"),
      parse: () => parsePlatformProduct({ site: "Mi Store" }),
      waitForPrice: true,
    },
    {
      id: "mudo",
      label: "Mudo",
      matches: hostIs("mudo.com.tr"),
      parse: () => parsePlatformProduct({ site: "Mudo", priceSelectors: AKINON_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "oysho",
      label: "Oysho TR",
      matches: hostIs("oysho.com"),
      parse: () => parseInditexProduct("Oysho"),
      waitForPrice: true,
    },
    {
      // Pandora'nın iki mağazası da pandora.net'te ama ayrı alt alan adlarında:
      // tr.pandora.net ve uk.pandora.net. Hangi content script'in yükleneceğini
      // manifest'teki alt alan adı belirliyor.
      id: "pandora-tr",
      label: "Pandora TR",
      matches: hostIs("pandora.net"),
      parse: () => parsePlatformProduct({ site: "Pandora", priceSelectors: SFCC_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "penti",
      label: "Penti",
      matches: hostIs("penti.com"),
      parse: () => parsePlatformProduct({ site: "Penti" }),
      waitForPrice: true,
    },
    {
      id: "pullandbear-tr",
      label: "Pull & Bear TR",
      matches: hostIs("pullandbear.com"),
      parse: () => parseInditexProduct("Pull & Bear"),
      waitForPrice: true,
    },
    {
      id: "saatvesaat",
      label: "Saat&Saat",
      matches: hostIs("saatvesaat.com.tr"),
      parse: () => parsePlatformProduct({ site: "Saat&Saat" }),
    },
    {
      id: "stradivarius-tr",
      label: "Stradivarius TR",
      matches: hostIs("stradivarius.com"),
      parse: () => parseInditexProduct("Stradivarius"),
      waitForPrice: true,
    },
    {
      id: "superstep",
      label: "SuperStep",
      matches: hostIs("superstep.com.tr"),
      parse: () => parsePlatformProduct({ site: "SuperStep", priceSelectors: AKINON_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "supplementler",
      label: "Supplementler.com",
      matches: hostIs("supplementler.com"),
      parse: () => parsePlatformProduct({ site: "Supplementler" }),
    },
    {
      id: "swatch-tr",
      label: "Swatch TR",
      matches: hostIs("swatch.com"),
      parse: () => parsePlatformProduct({ site: "Swatch" }),
      waitForPrice: true,
    },
    {
      id: "underarmour-tr",
      label: "Under Armour TR",
      matches: hostIs("underarmour.com.tr"),
      parse: () => parsePlatformProduct({ site: "Under Armour", priceSelectors: SFCC_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "zuhalmuzik",
      label: "Zuhal Müzik",
      matches: hostIs("zuhalmuzik.com"),
      parse: () => parsePlatformProduct({ site: "Zuhal Müzik" }),
    },
    {
      id: "madamecoco",
      label: "Madame Coco",
      matches: hostIs("madamecoco.com"),
      parse: () => parsePlatformProduct({ site: "Madame Coco", priceSelectors: AKINON_PRICE_SELECTORS }),
      waitForPrice: true,
    },
    {
      id: "englishhome",
      label: "English Home",
      matches: hostIs("englishhome.com"),
      parse: () => parsePlatformProduct({ site: "English Home", priceSelectors: TICIMAX_PRICE_SELECTORS }),
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
