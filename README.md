# Ortak Sepet

**Ortak Sepet**, farklı e-ticaret sitelerindeki ürünleri tek bir lokal sepette toplamanızı sağlayan ücretsiz bir tarayıcı eklentisidir. **Firefox ve Chrome'da aynı kaynak koddan çalışır.**

Eklenti, desteklenen ürün sayfalarından ürün adı, fiyat, görsel, kargo/teslimat bilgisi ve taksit/finance durumunu okuyarak ürünleri tek bir sepet arayüzünde gösterir. Sepet verileri yalnızca tarayıcınızda lokal olarak saklanır ve herhangi bir harici sunucuya gönderilmez.

## Kurulum

Firefox Add-ons:

https://addons.mozilla.org/en-US/firefox/addon/ortak-sepet/

Chrome için mağaza yayını henüz yok; aşağıdaki geliştirme adımlarıyla paketlenmemiş olarak yüklenebilir.

## Özellikler

* Desteklenen e-ticaret sitelerinden ürün ekleme
* Türkiye ve İngiltere alışveriş siteleri için destek
* Ürün adı, fiyat, görsel, site ve ürün linki gösterme
* Kargo / teslimat bilgisi okuma
* Taksit / finance bilgisi okuma
* TL ve GBP toplamlarını ayrı ayrı hesaplama
* Genel toplam ve seçili ürün toplamı hesaplama
* Ürün adedi artırma ve azaltma
* Aynı ürün tekrar eklenirse adedi artırma
* Satın alınan ürünü "Alındı" ile ayrı listeye taşıma
* Alınan ürünleri ay ay gruplayıp aylık harcama toplamını gösterme
* Ürünleri otomatik kategorize etme
* Kategoriye göre gruplama ve renkli kategori ayrımı
* Taksit / finance olan ürünleri filtreleme
* Kategorileri tek butonla açma ve kapatma
* Tek butonla tüm fiyatları güncelleme (paralel çalışır ve durdurulabilir)
* Manuel fiyat girme
* CSV / Excel dışa aktarma
* Sepeti paylaşılabilir düz metin olarak panoya kopyalama
* Sepeti temizlemede iki adımlı onay ve geri alma
* Sağ tık menüsünden ürünü sepete ekleme
* Tarayıcı ikonunda sepetteki ürün sayısını gösterme
* Türkçe / İngilizce dil seçimi
* Karanlık mod desteği
* Verileri tarayıcıda lokal olarak saklama

## Demo

<img width="1920" height="1022" alt="firefox_jQkLozpWDW" src="https://github.com/user-attachments/assets/825b6bf9-0be2-40a6-8893-2ad6c0919126" />


## Desteklenen Siteler

### Türkiye

* Amazon Türkiye
* Hepsiburada
* Trendyol
* n11
* Teknosa
* Vatan Bilgisayar
* MediaMarkt Türkiye
* Pazarama
* Çiçeksepeti
* idefix
* D&R
* İtopya
* İncehesap
* IKEA Türkiye
* Samsonite Türkiye
* Decathlon Türkiye
* Sephora Türkiye
* Zippo Türkiye
* Birkenstock Türkiye
* Crocs Türkiye
* Vans Türkiye
* Boyner
* Zara
* Bershka
* H&M
* JeansLab

### İngiltere

* Amazon UK
* eBay UK
* Vinted UK
* Argos
* Currys
* Diesel UK
* Temu
* AliExpress
* Sephora UK
* Gymshark
* IKEA UK
* Samsonite UK
* Decathlon UK
* Zippo UK
* Birkenstock UK (`birkenstock.com/gb`)
* Crocs UK
* Vans UK (`vans.com/en-gb`)
* iFixit UK (`ifixit.com/en-gb`)

## Kullanım

1. Desteklenen bir ürün sayfasına gidin.
2. Eklenti ikonuna tıklayın.
3. Ürünü Ortak Sepet'e ekleyin.

Alternatif olarak desteklenen ürün sayfalarında sağ tık menüsündeki **“Ortak Sepet’e ekle”** seçeneğini kullanabilirsiniz.

## Not

Bu proje geliştirme aşamasındadır. Fiyat, taksit/finance, kargo ve teslimat bilgileri ürün sayfasındaki görünür bilgilerden okunur. Bazı sitelerde fiyat, kampanya, stok, kargo veya teslimat bilgileri sepette ya da ödeme adımında değişebilir. Bu nedenle satın alma öncesinde bilgiler kullanıcı tarafından kontrol edilmelidir.

## Kullanılan Teknolojiler

* JavaScript
* WebExtensions (Manifest V3, Firefox + Chrome)
* Content Scripts
* Background Scripts
* Context Menus
* Browser Storage
* DOM Parsing
* HTML
* CSS

## Geliştirme İçin Kurulum

Depo, paketlenmemiş eklentinin kendisidir; derleme adımı yoktur.

**Firefox**

1. `about:debugging#/runtime/this-firefox` adresine git.
2. **Load Temporary Add-on** seç.
3. Proje klasöründeki `manifest.json` dosyasını seç.

**Chrome**

1. `chrome://extensions` adresine git.
2. Sağ üstten **Developer mode**'u aç.
3. **Load unpacked** ile proje klasörünü seç.

Ardından desteklenen bir ürün sayfasına gidip eklenti popup'ından veya sağ tık menüsünden ürünü sepete ekle.

AMO doğrulaması için:

```bash
npx --yes web-ext lint
```

## Testler

```bash
npm install
npm run test:setup   # Chrome for Testing (bir kez)
npm test             # birim + uçtan uca testler
npm run test:live    # canlı ürün sayfalarında parser doğrulaması
```

Ayrıntılar ve yeni test yazma rehberi: [`test/README.md`](test/README.md).

## Tek Kaynaktan İki Tarayıcı

Aynı klasör her iki tarayıcıya da yüklenir. Farklılıklar manifest içinde çözülür:

* `background` anahtarı hem `scripts` hem `service_worker` içerir. Chrome `service_worker`'ı kullanır, Firefox onu yok sayıp `scripts`'i kullanır. (`web-ext lint` bunun için beklenen bir uyarı verir; hata değildir.)
* `browser-polyfill.js` her iki tarayıcıda da yüklenir. Firefox'ta `browser` API'si yerleşik olduğu için polyfill no-op çalışır.
* `background.js` polyfill'i yalnızca `importScripts` tanımlıysa yükler — yani sadece Chrome service worker'ında.
* `browser_specific_settings` Firefox'a özeldir; Chrome bu anahtarı yok sayar.
* UK content script'i polyfill içermez, çünkü `content-uk.js` doğrudan `chrome.*` namespace'ini kullanır ve bunu iki tarayıcı da destekler.

## Dosya Yapısı

```text
ortak-sepet/
- manifest.json          # tek manifest, iki tarayıcı
- background.js          # Firefox event page / Chrome service worker
- browser-polyfill.js
- shared/                # background + popup ortak modülleri (cart, category)
- content.js             # TR içerik script'i giriş noktası
- content/               # TR: shared/core.js + parsers/
- content-uk.js          # UK içerik script'i giriş noktası
- content-uk/            # UK: shared/ + parsers/
- popup.html / popup.css
- popup/                 # popup modülleri (config, i18n, state, render, ...)
- icons/
- test/                  # unit / e2e / live testleri (pakete girmez)
- tools/                 # mağaza paketleyici (pakete girmez)
```

`shared/cart.js` sepete ekleme ve sepet yazma işlemlerinin tek kaynağıdır: hem
popup'taki **Bu Ürünü Ekle** butonu hem de sağ tık menüsü aynı kod yolunu
kullanır. Her yazım öncesi depo yeniden okunur, böylece dakikalarca sürebilen
fiyat güncellemesi bu sırada yapılan değişiklikleri ezmez.

`package.json` içindeki `webextension-polyfill` bağımlılığı çalışma zamanında
kullanılmaz; depodaki `browser-polyfill.js` dosyası bu paketten kopyalanmıştır ve
polyfill'i güncellemek için tutulur.

## Planlanan İyileştirmeler

* Daha fazla site desteği
* Parser doğruluğunu artırma
* Manuel kategori düzenleme
* JSON export / import desteği
* Stok durumu tespiti
* Daha gelişmiş fiyat değişim takibi
* Kategori kurallarını İngilizce ürün adları için genişletme

## Marka ve Bağlantı Bildirimi

Bu proje Amazon, Hepsiburada, Trendyol, n11, Teknosa, Vatan Bilgisayar, MediaMarkt, Pazarama, Çiçeksepeti, idefix, D&R, İtopya, İncehesap, IKEA, Samsonite, Decathlon, Sephora, Zippo, Birkenstock, Crocs, Vans, Boyner, Zara, Bershka, H&M, JeansLab, eBay, Vinted, Argos, Currys, Diesel, Temu, AliExpress, Gymshark veya listelenen diğer platformlarla bağlantılı, sponsorlu, onaylı ya da resmi bir proje değildir.

Listelenen tüm marka adları, yalnızca eklentinin hangi sitelerde çalışmayı hedeflediğini açıklamak amacıyla kullanılmıştır. Tüm marka adları ve ticari markalar ilgili sahiplerine aittir.

## Veri ve Gizlilik

Bu eklenti ürün bilgilerini kullanıcının tarayıcısında lokal olarak saklar. Ürün listesi, fiyat bilgileri veya sepet verileri herhangi bir harici sunucuya gönderilmez.

Eklenti, desteklenen ürün sayfalarındaki görünür bilgileri okumaya çalışır. Fiyat, taksit/finance, kargo ve teslimat bilgileri bazı sitelerde sepette veya ödeme adımında değişebileceğinden, bilgiler kullanıcı tarafından kontrol edilmelidir.

## Privacy Policy

Privacy policy is available here:

[PRIVACY.md](PRIVACY.md)

## Lisans

Bu proje **açık kaynak değildir**; kaynağı görüntülenebilir (source available) olarak sunulmuştur.

* **Serbest:** kaynağı inceleme, kişisel ve ticari olmayan kullanım, bu depoya katkı amaçlı değişiklik.
* **Yazılı izin gerektirir:** ticari kullanım, kodun başka bir projede kullanılması, yeniden yayınlama veya herhangi bir eklenti mağazasına sunma, türev çalışma dağıtımı.

Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.

`browser-polyfill.js` bu lisansın kapsamı dışındadır; Mozilla'ya ait olup [MPL-2.0](https://mozilla.org/MPL/2.0/) ile dağıtılmaktadır.
