# Testler

```bash
npm run test:setup   # Chrome for Testing'i test/.browsers altına kurar (bir kez)
npm test             # unit + e2e
npm run test:unit    # tarayıcısız birim testleri (saniyeler)
npm run test:e2e     # eklenti yüklü Chrome testleri
npm run test:live    # canlı ürün sayfaları (ağ gerektirir, yavaş)

node test/run.mjs e2e/purchased   # tek dosya
node test/run.mjs all
```

Her test dosyası ayrı bir Node süreci olarak çalışır ve kendi Chrome'unu açıp
kapatır; `test/run.mjs` yalnızca onları sırayla çalıştırıp sonucu toplar.

## Chrome for Testing

Chrome 137+ komut satırından `--load-extension`'ı engelliyor, o yüzden normal
Chrome ile eklenti yüklenemiyor. `npm run test:setup` Chrome for Testing'i
`test/.browsers/` altına indirir (~430 MB, .gitignore'da). Başka bir yerdeki
kurulumu kullanmak için:

```bash
ORTAK_SEPET_CHROME="/yol/chrome.exe" npm test
```

Testler `headless: false` çalışıyor — eklenti service worker'ı headless modda
güvenilir biçimde kaydolmuyor. Koşarken ekranda Chrome pencereleri açılıp
kapanır, normaldir.

## Klasörler

| Klasör | Ne sınar | `npm test`'e dahil |
|---|---|---|
| `unit/` | `shared/` modülleri ve manifest ↔ registry tutarlılığı, `node:vm` içinde | evet |
| `e2e/` | Eklenti yüklü Chrome'da popup davranışı | evet |
| `live/` | Gerçek mağaza sayfalarında parser doğrulaması | hayır |

`live/` varsayılana dahil değil: gerçek sayfalara bağlı oldukları için site
tasarımı değişince eklentide hiçbir hata olmadan da kırmızıya dönerler. Yeni bir
parser eklerken veya mevcut birine dokunurken elle çalıştır.

## Dosyalar

| Dosya | Kapsam |
|---|---|
| `unit/cart.test.mjs` | `shared/cart.js` + `shared/category.js`: fiyat/para birimi ayrıştırma, ekleme, mükerrer birleştirme, `saveRefreshedItem`, kategori kuralları |
| `unit/registry.test.mjs` | manifest'teki her host bir parser'a düşüyor mu, registry'deki her `parse` fonksiyonu tanımlı mı |
| `unit/permissions.test.mjs` | ürün adresi ↔ manifest origin eşlemesi ve eksik izin tespiti |
| `unit/shipping.test.mjs` | ücretsiz kargo ifadesi sepet eşiğine bağlı mı (TR + UK) |
| `unit/zippo-image.test.mjs` | Zippo TR galeri görselinin adresi |
| `e2e/smoke.test.mjs` | service worker kaydoluyor mu, ortak modüller yükleniyor mu, popup hatasız açılıyor mu |
| `e2e/features.test.mjs` | onay, geri alma, iptal, paralel fiyat güncellemesi |
| `e2e/copy-a11y.test.mjs` | "Sepeti Kopyala" çıktısı ve erişilebilirlik etiketleri |
| `e2e/purchased.test.mjs` | Aldıklarım sekmesi, fiyat dondurma, aylık gruplama |
| `e2e/images.test.mjs` | ürün görseli yükleme ve arka plan yedeği |
| `e2e/installments.test.mjs` | taksit okunamadığında "Yok" yazması |
| `e2e/package.test.mjs` | `tools/build.mjs` çıktısını üretip `dist/chrome`'u yükleyerek sınar |
| `live/parsers.test.mjs` | IKEA TR/UK, Çiçeksepeti, D&R, Pazarama |
| `live/ikea.test.mjs` | IKEA TR/UK ürün sayfası + sepete ekleme |
| `live/samsonite.test.mjs` | Samsonite TR/UK: fiyat, başlık, görsel, taksit |
| `live/decathlon.test.mjs` | Decathlon TR/UK: fiyat, başlık, görsel |
| `live/zippo.test.mjs` | Zippo TR/UK: fiyat, başlık, görselin gerçekten açılması |
| `live/birkenstock-crocs.test.mjs` | Birkenstock ve Crocs TR/UK: fiyat, başlık, renk, görsel |
| `live/ifixit.test.mjs` | iFixit UK: indirimli üründe liste fiyatı değil ödenecek tutar |

Ekran görüntüleri `test/screenshots/` altına düşer (.gitignore'da).

## Yeni test yazarken

`helpers/extension.mjs` ortak parçaları veriyor:

```js
import { launchExtension, createChecker, readProductFromTab, wait } from "../helpers/extension.mjs";

const { check, summary } = createChecker();
const { browser, sw, extensionId } = await launchExtension();
// ...
await browser.close();
summary();   // başarısız kontrol varsa süreci 1 ile bitirir
```

Depo yolunu koda gömme; `REPO_ROOT` yardımcıdan geliyor.

Ürün görselini sınayan canlı testler `imageLoads(url, ad)` kullanıyor: adresi
gerçekten indirip resim döndüğünü doğruluyor ve sonucu `check(...)`'e doğrudan
verilebilecek biçimde döndürüyor (`check(...(await imageLoads(url, ad)))`).
Adresin doğru *görünmesi* yetmiyor — açılmayan bir adres sepette boş kare
bırakıyor.
