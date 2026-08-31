# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje

**Ortak Sepet** — farklı e-ticaret sitelerindeki ürünleri tek bir lokal sepette
toplayan WebExtension (Manifest V3). Tek kaynak koddan hem Firefox hem Chrome'da
çalışır. Derleme adımı yoktur: depo klasörünün kendisi paketlenmemiş eklentidir.

Kod yorumları ve kullanıcıya görünen metinler ağırlıklı Türkçe; commit mesajları
İngilizce. Yeni kod yazarken dokunduğun dosyanın dilini sürdür.

## Komutlar

```bash
npm run test:setup                 # Chrome for Testing'i test/.browsers altına indirir (bir kez, ~430 MB)
npm test                           # unit + e2e
npm run test:unit                  # tarayıcısız, saniyeler sürer
npm run test:e2e                   # eklenti yüklü Chrome
npm run test:live                  # canlı mağaza sayfaları, ağ gerektirir, varsayılana dahil değil
node test/run.mjs e2e/purchased    # tek dosya
node test/run.mjs all              # unit + e2e + live

npm run lint                       # web-ext lint (AMO doğrulaması)
node tools/build.mjs               # dist/firefox + dist/chrome ve mağaza zip'leri
node tools/build.mjs chrome        # tek hedef
```

Her test dosyası ayrı bir Node süreci olarak kendi Chrome'unu açıp kapatır;
`test/run.mjs` yalnızca sırayla çalıştırıp sonucu toplar. Testler
`headless: false` koşar (service worker headless'ta güvenilir kaydolmuyor), o
yüzden çalışırken ekranda Chrome pencereleri açılır. Başka bir Chrome kullanmak
için `ORTAK_SEPET_CHROME="/yol/chrome.exe" npm test`.

Eklentiyi elle yüklemek: Firefox `about:debugging#/runtime/this-firefox` →
Load Temporary Add-on → `manifest.json`; Chrome `chrome://extensions` →
Developer mode → Load unpacked → proje klasörü.

## Mimari

### Modül sistemi yok

Hiçbir dosya `import`/`export` kullanmaz. Content script'ler, popup ve
background aynı global scope'a yüklenen düz script dosyalarıdır; paylaşım global
adlar üzerinden olur (`OrtakSepetCart`, `getOrtakSepetParserForUrl`,
`cleanPrice`, `getText` …). **Yükleme sırası manifest'te tanımlıdır ve
önemlidir** — yeni bir dosya eklerken `manifest.json` içindeki ilgili
`content_scripts[].js` listesine bağımlılıklarından sonra yazılmalı, popup
modülü ise `popup.html` script etiketlerine, yeni bir üst klasör ise
`tools/build.mjs` INCLUDE listesine eklenmelidir.

Parser dosyalarının başındaki "generated from content.js" yorumu bir üretim
adımına işaret etmiyor; dosyalar tek büyük content script'ten bölündüğü için
kalmış. Doğrudan düzenlenirler.

### İki bölge, iki content script bloğu

TR ve UK ayrı content script blokları olarak yüklenir ve neredeyse simetrik iki
ağaçtır:

| | TR | UK |
|---|---|---|
| giriş | `content.js` | `content-uk.js` |
| ortak yardımcılar | `content/shared/core.js` | `content-uk/shared/core.js` + `marketplace.js` |
| parser'lar | `content/parsers/*.js` | `content-uk/parsers/*.js` |
| registry getter | `getOrtakSepetParserForUrl` | `getOrtakSepetUkParserForUrl` |
| `region` damgası | `"TR"` | `"UK"` |

`shared/structured-data.js` ikisinde de yüklenir ve bölgeden bağımsız kısımları
tutar (`getText`, `getAttr`, JSON-LD `Product` ve `og:`/`product:` meta okuma).
Bölgeye bağlı olanlar — `getSiteName()`, `cleanPrice()`,
`formatStructuredPrice()` — ilgili `core.js` içindedir; hangi core yüklüyse
onunki çalışır. TR fiyatları "1.299,90 TL" biçimini, UK tarafı çok para birimli
`marketplace.js` normalizasyonunu kullanır.

Bir bölgeye eklenen düzeltmenin diğerinde de geçerli olup olmadığını kontrol et;
tarihsel olarak aynı hata iki kopyada ayrı ayrı yaşamıştı.

### Ürün okuma akışı

1. Kullanıcı popup'taki **Bu Ürünü Ekle**'ye basar ya da sağ tık menüsünü kullanır.
2. `background.js` / popup ilgili sekmeye `{ type: "GET_PRODUCT" }` mesajı atar.
3. Content script `registry.js`'ten host'a düşen parser'ı bulur (`hostIs()` —
   **alan adı eşleşmesi, parça araması değil**: `"pazarama.com"` içinde `"zara"`
   de geçer ve site tespiti fiyat/kargo kurallarının tamamını belirler).
   Parser yoksa `parseGenericProduct()` (JSON-LD → meta → sayfa) devreye girer.
4. `normalizeProduct()` parser çıktısını jenerik okumayla harmanlar, taksit
   (`findInstallmentInfo` / `findFinanceInfo`) ve kargo (`findShippingInfo`)
   taramasını **bir kez** ekler — bu taramalar tüm body'yi, shadow root'ları ve
   iframe'leri gezdiği için pahalı; `waitForPrice` yoklama döngüsünün içinde
   asla çağrılmaz.
5. `shared/cart.js` → `OrtakSepetCart.addProduct()` depoya yazar.

Bir parser `parse()` içinde `{ site, title, price, image, url }` döner; opsiyonel
`preventPriceFallback: true` ile jenerik fiyata düşmeyi kapatabilir. Registry
kaydında `waitForPrice: true` verilirse fiyat gelene kadar ~2.2 sn yoklanır (geç
render eden siteler: JeansLab, IKEA TR, Decathlon TR).

### `shared/cart.js` tek yazma yolu

Sepete ekleme ve sepet yazma işlemlerinin tek kaynağıdır — popup butonu da sağ
tık menüsü de aynı kod yolunu kullanır. **Her yazımdan önce depo yeniden
okunur**: dakikalarca sürebilen toplu fiyat güncellemesi bu sırada kullanıcının
yaptığı değişiklikleri ezmemeli. `saveRefreshedItem()` yalnızca fiyat alanlarını
yazar; `quantity`, `selected`, `category` kullanıcınındır.

Ayrıca burada Firefox MV3'e özgü bir durum ele alınıyor: manifest'teki host
izinleri Firefox'ta isteğe bağlı sayılıyor, güncellemeyle eklenen yeni bir site
kullanıcıya sorulmadan izinsiz kalıyor (Firefox bug 1893232). O sayfada content
script hiç çalışmaz. `getDeclaredOriginForItem()` / `findMissingOrigins()` bunu
tespit eder, popup "İzin ver" düğmesi gösterir. İzin isteği kullanıcı
tıklamasının içinden, **hiçbir `await` olmadan** çıkmalı — Firefox ilk
`await`'te kullanıcı hareketi hakkını düşürüyor (bkz. `popup/init.js`
`requestPermissionFromClick`).

### background.js

Chrome'da service worker, Firefox'ta event page. Chrome tarafında polyfill ve
ortak modüller `importScripts` ile yüklenir; Firefox'ta `importScripts`
tanımsızdır ve aynı dosyalar manifest'in `background.scripts` listesinden gelir.
Sorumlulukları: context menu, rozet sayısı, görsel indirip data URL'e çevirme
(LRU cache), ve toplu fiyat güncellemesi — `UPDATE_CONCURRENCY = 3` paralel
sekme, popup'tan iptal edilebilir, ilerleme `UPDATE_PRICES_PROGRESS` /
`UPDATE_PRICES_DONE` mesajlarıyla bildirilir. Yavaş/SPA siteler için
`getUpdateProfile()` host bazlı zaman aşımı ve deneme sayısı verir.

### popup

`popup.html` + sorumluluk başına bir dosya, şu sırayla yüklenir: `config.js`
(DOM referansları, depo anahtarları, I18N sözlüğü), `i18n.js`, `state.js`,
`totals.js`, `render.js`, `media.js`, `actions.js`, `export.js`, `init.js`
(event bağlama).

### Depo anahtarları (`browser.storage.local`)

`ortakSepetItems` (sepet), `ortakSepetPurchased` (alınanlar — rozet, toplam ve
fiyat güncellemesi akışlarına hiç karışmaz), `ortakSepetUndo` (5 dakikalık geri
alma anlık görüntüsü), `ortakSepetViewMode`, `ortakSepetCompactMode`,
`ortakSepetLanguage`, `ortakSepetTheme`.

## Tek kaynaktan iki tarayıcı

Farklar kod içinde değil manifest'te çözülür:

* `background` hem `scripts` hem `service_worker` içerir; Chrome ikincisini,
  Firefox birincisini kullanır. `web-ext lint` bunun için beklenen bir uyarı verir.
* `browser-polyfill.js` her iki tarayıcıda yüklenir; Firefox'ta no-op'tur.
* UK content script'i polyfill içermez — `content-uk.js` doğrudan `chrome.*`
  namespace'ini kullanır, iki tarayıcı da destekler.
* `browser_specific_settings` yalnızca Firefox içindir.
* `tools/build.mjs` paketlerken her hedefe kendi manifest'ini yazar (Chrome'dan
  `background.scripts` + `browser_specific_settings`, Firefox'tan
  `background.service_worker` silinir) ve manifest'te adı geçen her dosyanın
  pakete girdiğini doğrulayıp girmiyorsa hata verir.
* `tools/zip.mjs` deterministik zip üretir (sabit tarih, `/` ayracı) — Windows'un
  `Compress-Archive` çıktısı mağazalarda sorun çıkarıyordu.

`package.json`'daki `webextension-polyfill` bağımlılığı çalışma zamanında
kullanılmaz; `browser-polyfill.js` bu paketten kopyalanmıştır ve polyfill'i
güncellemek için tutulur.

## Yeni site eklerken

1. `content/parsers/<site>.js` (veya `content-uk/parsers/`) yaz.
2. İlgili `registry.js`'e kaydı ekle (`hostIs("alan.com")`).
3. `manifest.json`: `host_permissions`, ilgili `content_scripts[].matches` ve
   dosyayı `content_scripts[].js` listesine ekle (registry'den **önce**).
4. TR ise `content/shared/core.js` içindeki `getSiteName()`'e ekle.
5. `npm run test:unit` — `unit/registry.test.mjs` manifest'teki her host'un bir
   parser'a düştüğünü ve registry'deki her `parse` fonksiyonunun tanımlı
   olduğunu doğrular.
6. `npm run test:live` ile gerçek sayfada dene (varsayılan koşuya dahil değil).
7. `manifest.json` sürümünü ve `CHANGELOG.md`'yi güncelle.

## Testler

| Klasör | Ne sınar | `npm test`'e dahil |
|---|---|---|
| `unit/` | `shared/` modülleri ve manifest ↔ registry tutarlılığı, `node:vm` içinde sahte DOM ile | evet |
| `e2e/` | Eklenti yüklü Chrome'da popup davranışı (puppeteer-core) | evet |
| `live/` | Gerçek mağaza sayfalarında parser doğrulaması | hayır |

`live/` varsayılana dahil değil: site tasarımı değişince eklentide hiçbir hata
olmadan da kırmızıya döner. Parser'a dokunurken elle çalıştır.

Yeni test yazarken `test/helpers/extension.mjs` ortak parçaları verir
(`launchExtension`, `createChecker`, `readProductFromTab`, `wait`, `REPO_ROOT`).
Depo yolunu koda gömme. Ayrıntı: `test/README.md`.

## Sürüm ve changelog

Sürüm tek yerden gelir: `manifest.json` içindeki `version`
(`e2e/package.test.mjs` beklenen sürümü oradan okur). `CHANGELOG.md` Türkçe;
sürüm başlıkları altında **Eklenenler / Değişenler / Düzeltilenler /
Geliştirme** bölümleri, her madde kalın bir cümlelik özet + kullanıcının gördüğü
belirtiyi ve nedenini anlatan açıklama içerir.
