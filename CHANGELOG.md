# Değişiklik Geçmişi

Sürüm numarası `manifest.json` içindeki `version` alanından gelir.

## 1.12.0 — 18 Eylül 2026

### Eklenenler

* **34 yeni Türkiye mağazası:** Mavi, LTB, Koton, LC Waikiki, Colin's, Tudors,
  DeFacto, Mudo, Penti, Beymen, Desa, Karaca, SuperStep, Gratis, Watsons,
  Rossmann, Atasun Optik, Konyalı Saat, Saat & Saat, Zuhal Müzik, Apple
  Türkiye, Mi Türkiye, Levi's Türkiye, Jack & Jones Türkiye, Calvin Klein
  Türkiye, Champion Türkiye, Lacoste Türkiye, Marks & Spencer Türkiye, Pandora
  Türkiye, Oysho Türkiye, Pull & Bear Türkiye, Stradivarius Türkiye, Swatch
  Türkiye, Under Armour Türkiye.
* **15 yeni İngiltere mağazası:** Sports Direct, Apple UK, Mi UK, Levi's UK,
  Jack & Jones UK, Calvin Klein UK, Champion UK, Lacoste UK, Marks & Spencer
  UK, Pandora UK, Oysho UK, Pull & Bear UK, Stradivarius UK, Swatch UK, Under
  Armour UK.
* **Liste fiyatı yazan yapılandırılmış veriye güvenilmiyor.** DeFacto,
  Rossmann ve Karaca ürün sayfasında indirimli tutarı gösterirken JSON-LD ya da
  meta etiketinde liste fiyatını yayımlıyor: DeFacto'da sayfada 699,99 TL
  ödenirken `offers.price` 999.99, Rossmann'da 159,00 TL'ye karşı 249, Karaca'da
  `product:price:amount` 1999 iken ödenecek tutar 1.799 TL. Bu üç mağazada fiyat
  yalnızca sayfadan okunuyor ve jenerik yedek kapatıldı, yoksa aynı yanlış tutar
  oradan geri gelirdi.
* **Üyeye, karta ve çoklu alıma bağlı tutarlar alınmıyor.** Tudors'ta üyelere
  özel "Sepette 299,99 TL", Gratis'te "Gratis Kart Fiyatı", Beymen'de "2 ve
  üzeri 5.180 TL", Desa'da "2. ürüne %50 indirim" tutarları ürünün tek başına
  ödenecek fiyatı değil; sepet listesi herkesin ödeyeceği tutarı göstermeli. LC
  Waikiki'deki "sepette indirim" ise herkese açık olduğu için o tutar alınıyor.
* **Champion UK'de para birimi sayfadan okunuyor.** JSON-LD teklifi
  `priceCurrency: "EUR"` diyor ama sayfa £ gösteriyor; teklife güvenmek ürünü
  sepette euro sayıp sterlin toplamından düşürüyordu.
* **Banka taksit tablosu artık konumdan bağımsız bulunuyor.** Colin's, Karaca,
  Mudo ve Marks & Spencer Türkiye taksit seçeneklerini ürün adının 1000-3000
  piksel altındaki bir tabloda yazıyor ve taksit taraması oraya hiç
  bakmıyordu. Tablo, ya gerçek bir tablo başlığı ("Taksit Sayısı / Taksit
  Tutarı") taşıyan ya da birbirinden farklı en az iki taksit satırı (2, 3,
  4…) ve en az üç tutar içeren öge olarak aranıyor. Eşik bilerek yüksek:
  Levi's Türkiye'nin "6500 TL ve üzeri … 6 taksit" kampanya bandını slider
  dört kez basıyor, Jack & Jones'un altbilgisinde "Taksitlendirme
  Seçeneklerimiz" bağlantısı var; ikisi de ürüne ait taksit bilgisi değil ve
  bu eşiği geçmiyor. Tarama yalnızca konuma bakan arama boş döndüğünde
  çalıştığı için "taksit yok" diyen bir ifadeyi de ezmiyor.
* **Apple Türkiye'de taksit, Apple UK'de yanlış finansman düzeltildi.** Apple
  "1.083,00 TL x 3 aya kadar taksit" yazıyor; tarama yalnızca "…aya **varan**
  taksit" kalıbını tanıyordu. Apple UK'de ise her sayfanın altbilgisindeki
  Barclays taksit sözleşmesi yüzünden 59 sterlinlik bir kumandada bile
  "finansman var" çıkıyordu; artık yalnızca fiyat kutusuna bakılıyor.

### Düzeltilenler

* **İç içe dizi olarak yazılan JSON-LD görseli.** LTB görselleri `[[".."]]`
  biçiminde basıyor; paylaşılan okuma ilk katmanı alıp adresleri virgülle
  birleştiriyor ve sepette açılmayan bir adres bırakıyordu. Görsel alanı artık
  düzleştiriliyor — dizi, dizi içinde dizi ve `{"url": …}` nesnesi dâhil.
* **Kuruşu nokta ile yazan mağazalarda fiyat.** DeFacto "699.99 TL" yazıyor ve
  fiyat tarayıcısı bunun yalnızca sonundaki "99 TL"yi görüyordu. Noktadan sonra
  üç hane gelirse binlik ayıracı sayılıyor, bir ya da iki hane gelirse kuruş.
* **Sepette karışık fiyat biçimi.** Colin's "1999,90 TL", DeFacto "1199.99 TL"
  yazıyordu; tutarlar artık tek biçime ("1.999,90 TL") getiriliyor.

### Geliştirme

* Canlı testler için ortak sürücü (`test/helpers/live-store.mjs`): mağaza
  başına listeleme ya da sitemap'ten ürün adresi topluyor, eklentinin okuduğu
  tutarı sayfanın kendi yazdığı tutarla karşılaştırıyor, üstü çizili tutarın
  alınmadığını ve taksit beklentisini doğruluyor. Bot korumasına takılan
  mağazalar hata değil "atlandı" sayılıyor.
* Yedi yeni canlı test dosyası (`live/tr-fashion`, `tr-fashion-2`,
  `stores-3`…`stores-7`) yeni mağazaları kapsıyor.
* `unit/variant-parsers.test.mjs`: Under Armour UK ve Sports Direct bot
  korumasının arkasında olduğu için canlı testlere giremiyor. İkisinin de en
  kırılgan yanı JSON-LD'deki ProductGroup içinden **seçili** varyantı
  bulmak — Under Armour'da adresteki renk parametresi, Sports Direct'te
  çapadaki renk kodu — ve bu tarayıcısız test onu sabitliyor.
* `unit/registry.test.mjs` manifest kalıbından host çıkarırken yalnızca
  `*://*.alan.com/*` biçimini tanıyordu; `*://tr.calvinklein.com/*` gibi tek bir
  alt alan adına sabitlenmiş kalıplarda patlıyordu.

## 1.11.0 — 31 Ağustos 2026

### Eklenenler

* **Yeni siteler:** Vans Türkiye, Vans UK, Boyner, Nike Türkiye, Nike UK,
  Adidas Türkiye, Adidas UK.
* **Vans Türkiye'de indirimli tutar okunuyor.** Ürün sayfası indirim varken iki
  fiyat basıyor: üstü çizili liste fiyatı ve ödenecek tutar. Fiyat kutusunun
  tamamını okumak ikisini birden veriyor, bu yüzden ödenecek tutarı taşıyan
  sınıf ayrıca aranıyor. Vans başlığı da yalnızca model adını verdiği için
  ("KNU SKOOL AYAKKABI") renk başlığa ekleniyor.
* **Boyner'de sepette uygulanan indirim doğru okunuyor.** Ürünün üstünde
  "Sepette11.058,99 TL" gibi bir tutar duruyor ve aynı fiyat sayfada üç kez
  basılıyor — ürün bilgisinde, yukarı kaydırınca çıkan yapışkan başlıkta ve
  alttaki öneri kartlarında. Öneri kartındaki tutar başka bir ürüne ait
  olduğundan okuma ürün bilgisi bloğuyla sınırlandı. Marka adı başlığın
  dışında ayrı bir satırda durduğu için ("Converse" + "x Coca-Cola Beyaz Omuz
  Çanta") sepette markasız görünmesin diye ikisi birleştiriliyor.
* **Vans UK'de fiyatın tutunacak bir sınıfı yok.** Sayfa Tailwind yardımcı
  sınıflarıyla kurulmuş, JSON-LD'de Product düğümü yok ve og: etiketleri
  sunucudan gelen HTML'de bulunmuyor. Fiyat, ürün başlığının bulunduğu
  kutunun içindeki ilk tutar olarak bulunuyor; sayfanın altındaki öneri
  şeritleri onlarca fiyat daha bastığı için kutuyla sınırlamak şart.
  İndirimli üründe kutuda iki tutar oluyor — "Initial price: £125.00" üstü
  çizili, "Discounted price: £81.25" ödenecek olan — ve üstü çizili eleniyor.
* **Nike ve Adidas'ta indirimli tutar okunuyor.** Dört sayfada da JSON-LD
  yalnızca "ProductGroup" düğümü basıyor ve içinde fiyat yok, yani okunacak tek
  yer görünen DOM. İki sitede de ödenecek tutar ile üstü çizili liste fiyatı
  ayrı işaretlerde duruyor — Nike'ta "currentPrice-container" /
  "initialPrice-container", Adidas'ta "main-price" / "original-price" — bu
  yüzden fiyat kutusunun tamamı değil doğrudan ödenecek tutar okunuyor.
  Aramanın ürün kutusuyla sınırlanması şart: Adidas'ta sayfadaki ilk fiyat
  bileşeni alttaki öneri kartına ait (ürün 10.199 TL iken o kutu 2.049 TL
  diyordu), Nike'ta ise öneri şeritleri onlarca fiyat daha basıyor.
* **Nike'ta renk, Adidas'ta marka başlığa ekleniyor.** Nike'ın h1'i kısaltılmış
  model adını veriyor ("Nike Vomero 18") ve rengi hiç taşımıyor; tam ad
  og:title'dan, renk ürün açıklamasının ilk maddesinden alınıp birleştiriliyor.
  Adidas'ta h1 marka ve renk taşımıyor ("Samba OG Shoes"), og:title üçünü
  birden veriyor.

### Bilinen sınırlar

* **Vans'in İngiltere mağazası ayrı bir alan adında değil**, global
  `vans.com` adresinin `/en-gb/` yolunda; `vans.co.uk` oraya yönleniyor.
  Eklenti yalnızca o yola giriyor, sitenin diğer ülke sayfaları
  desteklenmiyor — oradaki euro fiyatı "İngiltere" bölgesiyle damgalanırdı.
  Site otomasyonla sürülen tarayıcıya ürün sayfasını vermediği için canlı
  test bu siteyi atlıyor; parser gerçek sayfalarda elle doğrulandı.
* **Nike'ın iki mağazası da global alan adının yolunda:** Türkiye
  `nike.com/tr`, İngiltere `nike.com/gb` (nike.com.tr birincisine yönleniyor).
  Eklenti yalnızca bu iki yola giriyor; sitenin diğer ülke sayfaları
  desteklenmiyor, çünkü oradaki fiyat yanlış bölgeyle damgalanırdı.
* **Adidas otomasyonla sürülen tarayıcıya sayfa vermiyor**, kendi engel
  sayfasını basıyor. Kullanıcının tarayıcısında sorun yok ama canlı test iki
  Adidas sitesini de atlıyor; parserlar gerçek sayfalarda elle doğrulandı.

### Geliştirme

* `test/live/vans-boyner.test.mjs` iki siteyi de canlı sayfalarda doğruluyor
  ve parser'ın döndürdüğü tutarı sayfadaki tutarla ayrıca karşılaştırıyor;
  site geç render etmeye başlarsa parser sessizce jenerik yedeğe düşüp testi
  yanlış sebeple yeşil yakabiliyordu. Vans için outlet listesi de geziliyor,
  yoksa indirimli fiyat yolu hiç sınanmıyordu.
* `test/live/nike-adidas.test.mjs` dört siteyi de indirim listelemesinden
  geziyor: bu iki markada asıl risk üstü çizili liste fiyatını sepete yazmak,
  o yüzden her üründe okunan tutar hem sayfadaki ödenecek tutarla
  karşılaştırılıyor hem de üstü çizili tutardan farklı olduğu doğrulanıyor.

## 1.10.0 — 31 Ağustos 2026

### Eklenenler

* **Yeni siteler:** Birkenstock Türkiye, Birkenstock UK, Crocs Türkiye,
  Crocs UK, iFixit UK.
* **Aynı modelin farklı rengi sepette artık ayırt ediliyor.** Birkenstock ve
  Crocs'un dört sayfasında da ürün başlığı yalnızca model adını veriyor
  ("Classic Clog", "ARIZONA EVA") ve her renk ayrı bir sayfada duruyor; iki
  rengi sepete atınca ikisi de aynı adla görünürdü. Başlığa seçili renk
  ekleniyor: "Classic Clog - White".

### Düzeltilenler

* **Eşiğe bağlı ücretsiz kargo, Türkiye sitelerinde de koşulsuz sanılıyordu.**
  TR mağazaları ücretsiz kargoyu bir sepet tutarına bağlayıp bunu her sayfada
  bant olarak basıyor ("2000 TL ve üzeri alışverişlerde Ücretsiz Kargo").
  Tarama yalnızca "ücretsiz kargo" ifadesini aradığı için eşik okunmuyor, 300
  TL'lik üründe bile kargo ücretsiz işaretleniyordu. Artık ifadenin iki yanına
  bakılıyor — İngilizcede eşik ifadenin ardından gelirken Türkçede önüne
  geçiyor — ve eşik varsa ürün "Sepette hesaplanır" oluyor. Aynı düzeltme UK
  tarafında 1.9.0'da yapılmıştı; TR tarafı bugüne kadar eksikti, yani
  Birkenstock ve Crocs'un yanı sıra eşik bandı basan diğer TR siteleri de
  düzeldi.

### Bilinen sınırlar

* **Birkenstock'un İngiltere mağazası ayrı bir alan adında değil**, global
  `birkenstock.com` adresinin `/gb/` yolunda. Eklenti yalnızca o yola giriyor;
  aynı sitenin `/de/`, `/fr/` gibi diğer ülke sayfaları desteklenmiyor, çünkü
  oradaki euro fiyatı "İngiltere" bölgesiyle damgalanırdı.
* **Crocs Türkiye taksit bilgisi vermiyor**, ürün sayfasında taksit metni
  bulunmuyor; sepette "Yok" görünür.
* **iFixit'in yalnızca mağaza sayfaları destekleniyor.** İngiltere mağazası
  `ifixit.com/en-gb/products/` altında; sitenin geri kalanı tamir rehberi
  wiki'si ve orada sepete eklenecek bir şey yok, o yüzden eklenti oraya hiç
  girmiyor.

### Geliştirme

* Kargo ifadesinin eşiğe bağlı olup olmadığı TR tarafında da
  `test/unit/shipping.test.mjs` ile ağ gerektirmeden sınanıyor; örnekler
  gerçek mağaza sayfalarından alındı.
* `test/live/birkenstock-crocs.test.mjs` dört siteyi de canlı ürün
  sayfalarında doğruluyor: indirimli üründe ödenecek tutarın seçilmesi, seçili
  renge ait olmayan fiyat bloklarının atlanması ve görselin gerçekten
  indirilebilmesi.
* İzin eşlemesi artık yola bağlı manifest kalıplarını da tanıyor
  (`*://*.birkenstock.com/gb/*`); tanımasaydı o üründe eksik site izni fark
  edilmezdi.
* `test/live/ifixit.test.mjs` indirimli iFixit ürünlerinde sepete üstü çizili
  liste fiyatının değil ödenecek tutarın girdiğini doğruluyor; site ikisini
  aynı fiyat bloğunda basıyor.

## 1.9.1 — 1.10.0 ile yayımlandı

### Düzeltilenler

* **Zippo Türkiye ürünlerinde sepetteki görsel boş çıkıyordu.** Sitenin galeri
  görselinin adresi sonunda bir boyut eki taşıyor ("...HQ.jpg;width=1946") ve
  bu adres açılmıyor. Sayfada fark edilmiyor, çünkü tarayıcı görseli aynı
  etiketin `srcset` listesinden yüklüyor; sepete ise açılmayan adres
  kaydediliyordu. Artık çalışan adres alınıyor.

### Geliştirme

* Canlı parser testleri ürün görselinin adresini yalnızca biçim olarak
  denetlemiyor, gerçekten indiriyor: doğru görünüp açılmayan bir adres artık
  testten geçemiyor.
* Zippo TR görsel adresi `test/unit/zippo-image.test.mjs` ile ağ gerekmeden de
  sınanıyor.

## 1.9.0 — 23 Ağustos 2026

### Eklenenler

* **Yeni siteler:** Zippo Türkiye, Zippo UK.

### Düzeltilenler

* **Eşiğe bağlı ücretsiz kargo, koşulsuz ücretsiz kargo sanılıyordu.** İngiltere
  sitelerinin çoğu ücretsiz kargoyu bir sepet tutarına bağlıyor ve bunu her
  sayfada bant olarak basıyor ("FREE SHIPPING ON ORDERS OVER £70"). Tarama
  yalnızca "free delivery" ifadesini aradığı için eşik okunmuyor, ürünün fiyatı
  ne olursa olsun kargo ücretsiz işaretleniyordu — £7,20'lik üründe bile. İfade
  artık kendisinden sonraki metinle birlikte okunuyor; yanında eşik varsa ürün
  "Sepette hesaplanır" oluyor. Zippo UK'in yanı sıra Samsonite UK ve Gymshark da
  eklendiklerinden beri yanlış okunuyordu; onlar da düzeldi.

### Geliştirme

* Kargo ifadesinin eşiğe bağlı olup olmadığı `test/unit/shipping.test.mjs` ile
  ağ gerektirmeden sınanıyor; örnekler gerçek mağaza sayfalarından alındı.

## 1.8.0 — 23 Ağustos 2026

### Eklenenler

* **Yeni siteler:** Decathlon Türkiye, Decathlon UK.
* **Eksik site izni artık görünür.** Firefox, güncellemeyle eklenen yeni bir
  sitenin iznini kullanıcıya sormadan vermiyor; o sitede eklenti hiç
  çalışmadığı hâlde kullanıcı yalnızca "Başarısız" görüyordu. Artık sepetin
  üstünde sebebi söyleyen bir satır ve tek tıkla izni veren bir düğme çıkıyor.
  İzin verilmemiş bir ürün sayfasında "Bu Ürünü Ekle"ye basıldığında da aynı
  uyarı geliyor.

### Değişenler

* Fiyat güncellemesi izni olmayan sitede artık sekme açmıyor; "Başarısız"
  yerine "Site izni gerekiyor" yazıyor ve bu ürünler hata sayılmıyor.

### Geliştirme

* JSON-LD'de iç içe dizi olarak gelen ve fiyatı `priceSpecification` altında
  tutan `offers` biçimi için `findStructuredOffer()` eklendi; iki içerik
  script'i de aynı yardımcıyı kullanıyor.
* Paket testi sürüm numarasını `manifest.json`'dan okuyor; sabit yazılmıştı ve
  her sürüm yükseltmesinde alakasız bir hata veriyordu.

## 1.7.0 — 13 Ağustos 2026

### Eklenenler

* **Yeni siteler:** Samsonite Türkiye, Samsonite UK.

### Geliştirme

* Test seti depoya taşındı ve `npm test`e bağlandı (`test/` altında birim,
  uçtan uca ve canlı sayfa testleri).
* İki içerik script'inde birebir kopya duran JSON-LD/meta okuma
  `shared/structured-data.js`'e çıkarıldı.
* Ürün görseli taraması tek bir `findProductImage()` fonksiyonunda toplandı;
  yedi parser aynı döngüyü kopyalamıştı.
* Kullanılmayan fonksiyonlar ve çeviri anahtarları silindi.

## 1.6.0 — 6 Ağustos 2026

### Eklenenler

* **Aldıklarım sekmesi.** Sepetteki ürün "Alındı" ile ayrı bir listeye taşınır.
  Alınanlar ay ay gruplanır ve her ayın harcama toplamı gösterilir. Alınan ürünün
  fiyatı, adedi ve para birimi o anki hâliyle dondurulur; sonraki fiyat
  güncellemeleri geçmiş ayların harcamasını değiştirmez.
* **Sepeti Kopyala.** Sepet, paylaşılabilir düz metin olarak panoya kopyalanır.
* **Geri alma.** Silme, sepeti temizleme ve alındı işaretleme geri alınabilir
  (5 dakika geçerli).
* **Sepeti temizlemede iki adımlı onay.**
* **Yeni siteler:** IKEA Türkiye, IKEA UK, Çiçeksepeti, D&R.
* **Erişilebilirlik.** Sepetteki her denetim ürün adıyla etiketlendi; durum satırı
  ekran okuyucuya bildirim veriyor.

### Değişenler

* **Taksit bilgisi artık "Bilinmiyor" göstermiyor.** Sayfadan taksit okunamadığında
  "Yok" yazıyor — kullanıcı açısından taksit yoksa yoktur.
* **Fiyat güncelleme yeniden yazıldı.** Aynı anda üç sekmede çalışıyor, ortasında
  durdurulabiliyor ve ilerleme gösteriyor.
* **CSV dışa aktarma.** Türkçe Excel'de sütunların ayrışması için `;` ayracı;
  `=`, `+`, `-`, `@` ile başlayan hücreler formül olarak çalıştırılmasın diye
  kaçırılıyor.
* Para birimi artık sayfanın yapısal verisinden (JSON-LD / meta) okunuyor;
  bölgeye göre tahmin edilmiyor.
* `clipboardWrite` izni eklendi (yalnızca Kopyala butonu için).

### Düzeltilenler

* **Pazarama sayfaları Zara parser'ına düşüyordu.** Host eşleşmesi metin araması
  yapıyordu ve "pazarama.com" içinde "zara" geçiyor. Eşleşme alan adı bazına
  çevrildi.
* **Fiyatı sonda sembolle yazan sitelerde para birimi kayboluyordu** ("19.599₺" →
  "19.599"). TL fiyatları artık tek biçimde saklanıyor.
* **Fiyat güncellemesi sırasında yapılan değişiklikler siliniyordu.** Güncelleme
  dakikalarca sürebildiği için o sırada eklenen/silinen ürünler bayat bir
  anlık görüntüyle geri yazılıyordu. Artık her yazımdan önce depo yeniden okunuyor
  ve ürünler id ile eşleştiriliyor.
* Ürün görseli yüklenemediğinde devreye giren yedek, alınan ürün kayıtlarında
  çalışmıyordu.
* Ürün adı İngilizce olduğunda kategori bulunamıyordu; kategori kuralları
  genişletildi ve "Telefon"/"Bilgisayar" kuralları "Elektronik"in önüne alındı.

### Geliştirme

* Sepete ekleme ve sepet yazma tek bir modüle (`shared/cart.js`) taşındı; popup
  butonu ile sağ tık menüsü artık aynı kod yolunu kullanıyor.
* Ürün sayfası taramasında pahalı düzen hesaplarından önce ucuz metin filtresi
  çalışıyor.
* `idefix.js` ve `n11.js` içindeki çift tanımlar silindi (~220 satır ölü kod).
* Mağaza paketleyici eklendi (`tools/build.mjs`): tek komutla Firefox ve Chrome
  zip'lerini üretiyor, her mağaza için manifest'i ayıklıyor.

## 1.5.1 — 24 Temmuz 2026

* Gymshark UK desteği.
* Popup arayüzü 1.3.8'deki hâline döndürüldü.

## 1.5.0 — 24 Temmuz 2026

* Sürüm numarası yükseltildi; işlevsel değişiklik yok.

## 1.3.2 ve öncesi

Firefox ve Chrome eklentileri bu sürümde tek kaynak ağacında birleştirildi ve
lisans MIT yerine kaynağı görüntülenebilir (source available) bir lisansla
değiştirildi. Daha eski sürümlerin geçmişi bu depoda yok.
