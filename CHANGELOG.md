# Değişiklik Geçmişi

Sürüm numarası `manifest.json` içindeki `version` alanından gelir.

## 1.12.0 — yayımlanmadı

### Düzeltilenler

* **Beden listesine sayfanın başka parçaları giriyordu.** Kullanıcı on yedi
  mağazada ekran görüntüsüyle bildirdi; her biri için ayrı bir eleme kuralı ve
  birim testi eklendi: listeleme filtresinin seçenekleri ("29/30 bedeninde 40
  ürün", "Beden (tüm bedenler)" — Koton), beden tablosunun sekmeleri ("GÖMLEK",
  "DENIM ÖLÇÜLERİ", "SLİM FİT" — Colin's ve Tudors; Colin's'te bu metin sepete
  seçili beden olarak da yazılmıştı), renk adı ve yardım bağlantıları
  ("At That Point - Green", "Shipping Info", "Add to Favourite" — Levi's UK),
  arayüz eylemleri ("ARA" — Madame Coco, "GÖNDER" — Mudo, "Anasayfa" — Marks &
  Spencer), giriş formunun alanları (Under Armour TR), ekran okuyucu etiketi
  ("Sale price is" — Levi's UK) ve ayraç karakteri ("/" — Marks & Spencer).
  Ölçü tablosu taşıyan kap ile menü, modal ve başlık içindeki kaplar artık hiç
  okunmuyor; gerçek beden seçicisi ürün formunda durur.
* **Kullanıcının bakmadığı mağazalar da tarandı ve aynı hatalar orada da
  çıktı.** Elli dört mağazanın hepsi gerçek ürün sayfalarında gezilip okunan
  başlık, taksit, görsel ve beden listesi tek tek gözden geçirildi. Çıkanlar:
  ürün adı yerine adres parçası ("poco-f9-pro" — Mi Store TR ve UK), beden
  listesinde breadcrumb ve karusel sayacı ("Erkek", "Giyim", "1 of 6" — Marks &
  Spencer TR), sepete ekleme düğmesi (Oysho), adet seçicisinin rakamları
  (Supplementler), indirim oranı ("%42"), stok uyarısı ("Son 3 adet"), renk
  adları ("krem", "ECRU MIX") ve sayfa bölümlerinin kendisi ("Ürün Açıklaması",
  "İSTANBUL"). Sonuncusu için kural kelime elemekten çıkıp yapısal oldu: gerçek
  beden seçicisi küçük bir kutudur, metni altı yüz karakteri aşan kap sayfa
  bölümüdür ve hiç okunmuyor.
* **Türkçe büyük İ yüzünden eleme kuralları büyük harfli seçeneklerde
  çalışmıyordu.** "SLİM" küçültülünce noktası ayrı bir işaret olarak kalıyor ve
  kalıplar tutmuyordu; metin artık `shared/category.js` ile aynı biçimde
  normalize ediliyor.
* **Beden seçenekleri düz `span` ile yazılan mağazalarda hiç okunmuyordu.**
  Beymen bedenleri `<span class="m-variation__item">39</span>` olarak basıyor ve
  tarama yalnızca `li/button/label/a` arıyordu; beden işareti taşıyan kapta artık
  her etiket okunuyor.
* **Taksit bilgisi bulunamadığında sepette "Yok" yazıyordu.** Sayfada taksit
  seçeneği olduğu hâlde eklentinin okuyamadığı mağazalar var (Champion,
  Lacoste); "bulunamadı" ile "yok" farklı şeyler ve ayrım artık arayüzde de
  görünüyor ("Bilinmiyor"). Ayrıca "Taksit Seçenekleri" başlığı sayfanın
  altında, ürün başlığından uzakta durduğu için mesafe filtresine takılıyordu
  (Karaca, Konyalı Saat) — bu ifade yeterince özel olduğundan artık sayfanın
  tamamında aranıyor, tekil yazımı da ("Taksit Seçeneği") tanınıyor.
* **Ürün adındaki HTML varlığı çözülmüyordu.** Levi's TR yapılandırılmış veriye
  "Kısa Kollu G&#246;mlek" yazıyor ve sepete de öyle düşüyordu. DOM'dan gelen
  metinde bu sorun yok, çözüm yalnızca JSON-LD ve meta etiketlerine uygulanıyor.
* **og:image site logosu olan mağazalarda sepette logo görünüyordu** (Mavi).
  Adres logo/yer tutucu gibi görünüyorsa sayfadaki ürün görseli aranıyor.
* **Görünen başlık yapılandırılmış addan zenginken kısa olan seçiliyordu.**
  Champion'da sayfada "Reverse Weave Core Short Sleeve T-shirt" yazarken sepete
  "Short Sleeve T-shirt" düşüyordu; artık adı içeren başlık kazanıyor.

### Eklenenler

* **Renk, uzunluk ve depolama seçimi.** Beden tek eksen olmaktan çıktı: ürün
  sayfasında ne varsa kendi etiketiyle okunuyor ve sepette her biri için ayrı
  bir satır çıkıyor — Jack & Jones'ta beden ve renk, Apple'da renk, Koton'da
  beden ve boy. Eksen yoksa satır da yok; televizyonun altında boş bir "Beden"
  alanı görünmüyor. Seçilenlerin tamamı satırın kimliği: aynı üründen farklı
  renk ya da farklı beden sepette ayrı satır, aynısı adet artırıyor. Tek değerli
  eksen bir seçim değil bilgidir (bu mağazalarda diğer renkler ayrı ürün
  sayfası), o yüzden açılır liste yerine değerin kendisi yazılıyor ve seçili
  sayılıyor. Renk adları çoğu sitede metin değil kutucuk olduğu için `title` ve
  `alt` nitelikleri de okunuyor. Depoda eski biçimde duran kayıtlar (yalnızca
  beden taşıyanlar) okunurken tek eksenli listeye çevriliyor; kullanıcının
  sepetindeki seçim kaybolmuyor.
* **Beden seçimi.** Ürün sepete eklenirken sayfadaki beden seçenekleri de
  okunuyor ve sepette her ürünün altında bir açılır liste çıkıyor: kot için
  "29/32", tişört için "M", kozmetikte "50 ml". Beden ürünün kimliğinin parçası
  — aynı ürünü iki farklı bedende eklemek sepette iki ayrı satır oluşturuyor,
  aynı bedeni tekrar eklemek adedi artırıyor. Sayfadan beden okunamayan
  sitelerde "Beden Gir" düğmesiyle elle yazılabiliyor. Seçilen beden CSV'ye,
  panoya kopyalanan listeye ve "Alındı" kaydına da geçiyor. Beden taraması
  taksit ve kargo taraması gibi pahalı olduğu için ürün oturduktan sonra bir kez
  çalışıyor, fiyat yoklama döngüsünün içinde değil. Fiyat güncellemesi beden
  listesini tazeliyor ama kullanıcının seçtiği bedene dokunmuyor: o satır o
  bedene ait.
* **Yeni siteler (Türkiye):** Mavi, LTB, Koton, Levi's, LC Waikiki, Colin's,
  Tudors, DeFacto, Jack & Jones, Gratis, Watsons, Rossmann, Apple, Atasun Optik,
  Beymen, Calvin Klein, Champion, Columbia, Desa, Karaca, Konyalı Saat, Lacoste,
  LEGO, Marks & Spencer, Mi Store, Mudo, Oysho, Pandora, Penti, Pull & Bear,
  Saat&Saat, Stradivarius, SuperStep, Supplementler.com, Swatch, Under Armour,
  Zuhal Müzik, Madame Coco, English Home.
* **Yeni siteler (İngiltere):** Levi's UK, Jack & Jones UK, Apple UK, Calvin
  Klein UK, Champion, Columbia UK, Lacoste UK, LEGO UK, Marks & Spencer UK,
  Mi Store UK, Pandora UK, Pull & Bear UK, Stradivarius UK, Swatch UK,
  Under Armour UK.
* **Ortak platform parser'ı.** Yeni eklenen mağazaların hemen hepsi ürün
  sayfasında schema.org Product verisi yayımlıyor (Akinon, Ticimax, SFCC,
  Shopify, T-Soft ve kendi altyapısını yazanların çoğu). Bu yüzden her siteye
  ayrı bir dosya yazmak yerine `content/parsers/platform-shared.js` ve
  `content-uk/parsers/platform-shared.js` eklendi: fiyatı önce yapılandırılmış
  veriden, o okunamazsa altyapıya göre seçici listesinden alıyorlar. Sıra
  bilinçli — indirimli üründe sayfada hem ödenecek tutar hem üstü çizili liste
  fiyatı duruyor ve `offers.price` çoğu mağazada ödenecek olanı veriyor
  (vermeyenler için aşağıdaki üstü çizili tutar düzeltmesine bakın). Oysho,
  Pull & Bear ve
  Stradivarius Zara/Bershka ile aynı Inditex altyapısında olduğu için fiyatı
  konumundan bulan ortak yola bağlandı.
* **Aynı alan adını paylaşan mağazalar.** Apple, Mi Store, Lacoste, LEGO,
  Levi's, Jack & Jones, Pull & Bear, Stradivarius, Swatch ve Pandora'nın iki
  bölgedeki mağazası aynı alan adında; hangi content script'in yükleneceğini
  manifest'teki yol (`apple.com/tr/` ↔ `apple.com/uk/`) ya da alt alan adı
  (`tr.pandora.net` ↔ `uk.pandora.net`) belirliyor. İngiltere tarafındaki site
  adı tespiti de parça aramasından alan adı eşleşmesine çevrildi:
  "marksandspencer.com" parça olarak "marksandspencer.com.tr" içinde de geçiyor
  ve Türkiye mağazasına İngiltere adını verirdi.
* **Beden taraması gerçek sayfalarda kalibre edildi.** İlk sürüm beden
  seçicisine benzeyen her kabı okuyordu ve canlı doğrulamada sepete beden diye
  şunlar yazıldı: Tailwind'in `size-4`/`size-6` yardımcı sınıfları (Lacoste'ta
  tek seçenekli "0" listesi), kategori sayfasının beden filtresi ("200x220 Cm
  (174)" — Karaca), galeri sayacı ("1 / 5" — Mi Store), varyant kimliği
  ("55342174437720" — Champion), renk kodları ("001", "513" — Under Armour) ve
  "Size & Fit Guide" bağlantısı, beden kutusunun yanındaki eylem düğmeleri
  ("Favorilerime Ekle", "Paylaş" — Levi's), bülten formunun alanları ("E-posta
  Adresi *" — Under Armour TR), işaretlenmemiş onay kutusunun "on" değeri
  (Marks & Spencer UK) ve etiket-değer satırları ("Fit Referance : Ribcage").
  Her biri için eleme kuralı ve birim testi eklendi; seçenek metnindeki etiket
  öneki de atılıyor ("UK Size: 3" → "3").
  Ölçüt şu: renk seçicisi hiç okunmuyor, sayı bedeni makul aralıkta ve başında
  sıfır olmadan kabul ediliyor, kot bedeninde ("29/32") iki sayı da yirminin
  üstünde olmalı.

### Düzeltilenler

* **Columbia Türkiye kendi parser'ına taşındı.** Sayfasında `h1`, JSON-LD ve
  `og:` etiketi yok; sınıf adları MUI/emotion tarafından derlemede üretiliyor
  ("muirtl-1juxlzk") ve her sürümde değişiyor. Jenerik okuma bu yüzden ürün adı
  yerine sayfa başlığını ("Columbia Türkiye Online Shop") sepete yazıyordu.
  Ürün adı, ödenecek tutar, görsel ve bedenler artık Next.js'in sayfaya gömdüğü
  `__NEXT_DATA__` verisinden okunuyor — o veri ilk HTML'le geldiği için fiyat
  için render beklemek de gerekmiyor. Sayfadaki Insider öneri widget'ları başka
  ürünlerin indirimli fiyatlarını basıyor ve DOM'dan fiyat aramak o tutarları
  verebiliyordu; artık o riske hiç girilmiyor. Stoğu biten bedenler listeye
  alınmıyor, varyantın varsayılan bedeni de sepete seçilmiş gibi yazılmıyor.
* **Calvin Klein'da fiyat hiç okunamıyordu.** Ürünün JSON-LD'sinde `offers`
  boş geliyor, yani fiyat sayfadan okunmak zorunda; sınıf adları ise derlemede
  hash'leniyor ("PriceDisplay_PriceDisplay__FIRRe") ve tutunacak bir şey
  bırakmıyor. Fiyat artık `data-testid` işaretinden okunuyor. Öneri kartları da
  fiyat basıyor ama onların işareti başka, ürününki "ProductHeaderPrice-"
  önekli.
* **İki başlıklı sayfalarda marka adı ürün adı sanılıyordu.** Pandora'nın ürün
  sayfasında iki `h1` var: ilki logo, ikincisi ürün adı. "İlk h1'i al" kuralı
  sepete "Pandora" yazıyordu. Başlık artık yapılandırılmış veriden gelen ürün
  adına en çok benzeyen başlık olarak seçiliyor; hiçbiri benzemiyorsa
  (başlıklar logo ya da menüyse) doğrudan o ad kullanılıyor. Başlık yeterince
  uzun olduğu sürece yine tercih ediliyor, çünkü mağazaların JSON-LD adı bazen
  daha kötü biçimlenmiş oluyor (Supplementler'inki sonunda tire taşıyor).
* **Nokta ile yazılan ondalık fiyat yanlış okunuyordu.** TR mağazaları tutarı
  genelde "1.699,99 TL" yazıyor, DeFacto ise "1699.99 TL" basıyor. Fiyat
  kalıbında noktanın ondalık olduğu bir dal yoktu; o biçim hiçbir dala uymayınca
  yalnızca sondaki "99 TL" eşleşiyor ve sepete 1.699,99 yerine **99 TL**
  yazılıyordu. Bu DeFacto'ya özel bir düzeltme değil, TR çekirdeğinin fiyat
  okumasındaki boşluktu; eklenen dal para birimi şart koşuyor ki "4.5 yıldız"
  gibi ondalıklar fiyat sanılmasın.
* **Mağaza yapılandırılmış veriye liste fiyatını yazdığında indirimli tutar
  okunuyor.** Supplementler'in JSON-LD'si 5499 derken sayfada o tutar üstü
  çizili ve ödenecek olan 4299; sepete indirimsiz fiyat yazılıyordu. Artık
  yapılandırılmış veriden gelen tutarın sayfada üstü çizili gösterilip
  gösterilmediğine bakılıyor, öyleyse yanındaki ödenecek tutar okunuyor. Karar
  sınıf adına değil hesaplanmış stile bakarak ve yalnızca ürün alanında
  veriliyor: "original"/"old" sınıfları indirimsiz üründe de bulunuyor ve
  sayfanın altındaki öneri kartlarında üstü çizili tutarlar var — ikisi de
  indirimsiz ürünü (Champion) indirimli sanmaya yol açıyordu.
* **Görseli olmayan mağazalarda sepette boş kare çıkıyordu.** LC Waikiki ürün
  sayfasında ne JSON-LD ne og:image var; ortak platform parser'ı ikisi de yoksa
  artık sayfadaki ürün görselini tarıyor. Tarama hâlâ son çare — kampanya
  afişini ürün sanmamak için önce yapılandırılmış veriye bakılıyor.
* **JSON-LD görseli iç içe dizi olduğunda sepete kırık adres yazılıyordu.**
  schema.org görseli dört ayrı biçimde gelebiliyor ve LTB `[[adres1, adres2…]]`
  biçimini kullanıyor; `image[0]` yine bir dizi olduğu için adres alanına bütün
  galeri virgülle birleşmiş tek metin olarak düşüyor ve sepette ürün görseli
  boş kare çıkıyordu. Bu biçime özel bir mağaza düzeltmesi değil: görsel artık
  hangi biçimde gelirse gelsin düzleştirilip ilk kullanılabilir adres alınıyor.
* **Mağazanın bozuk yazdığı görsel adresi kullanılmıyor.** Champion'ın
  yapılandırılmış verisi `https:files/CHPEU_806020_KK001_Full.jpg` basıyor —
  şema var, host yok — ve o adres hiçbir yere çıkmıyor. Adres kullanılabilir
  görünmüyorsa sayfanın `og:image`'ine düşülüyor; Champion'da doğru görsel
  zaten orada duruyordu.

### Bilinen sınırlar

* **Bazı mağazalar beden seçeneklerini ancak etkileşimden sonra basıyor.**
  DeFacto'da bedenler "Sepete Ekle"ye basılınca çıkıyor, Champion ve Lacoste'ta
  ise otomasyonla sürülen tarayıcıda hiç render edilmiyor. Eklenti sayfayı
  okuduğu anda orada olmayan seçeneği göremiyor; o mağazalarda beden "Beden Gir"
  ile elle yazılıyor.
* **Renk yalnızca sayfada metin olarak varsa okunuyor.** LC Waikiki gibi
  mağazalarda renk kutucukları ne metin ne de ad niteliği taşıyor; orada renk
  ekseni çıkmıyor.

* **Yeni eklenen 54 mağazanın 53'ü canlı ürün sayfasında doğrulandı.**
  Adresler `test/live/platform-urls.json` içinde; `node test/run.mjs
  live/platform-sites` hepsini tek seferde sınıyor: site adı tanınıyor mu, ad ve
  fiyat okunuyor mu, tutar sayfada gerçekten yazıyor mu ve üstü çizili liste
  fiyatı değil mi, görsel yükleniyor mu, kaç beden okunuyor.
* **Levi's UK doğrulanmadı.** Otomasyonla sürülen tarayıcıya sayfayı hiç
  vermiyor ("Access Denied") ve boş HTML döndürüyor; kullanıcının kendi
  tarayıcısında sorun yok ama canlı test o mağazayı atlıyor.
* **Bazı mağazalarda fiyat sayfada metin olarak hiç görünmüyor** (SuperStep,
  Under Armour TR, Rossmann, English Home); tutar yapılandırılmış veriden
  okunuyor ve canlı test o mağazalarda "karşılaştırılamadı" diye not düşüyor.
* **Mavi otomasyonla sürülen tarayıcıya sayfa vermiyor**, "Sorry, you have been
  blocked" basıyor. Kullanıcının kendi tarayıcısında sorun yok ama canlı test
  bu siteyi göremiyor; Adidas ve Vans'te de durum aynı.
* **Beden listesi sayfanın markup'ına bağlı.** Beden seçicisini "beden"/"size"
  işareti taşıyan kaplardan okuyoruz; işareti olmayan sitede liste boş kalır ve
  kullanıcı bedeni elle girer. Bu bilinçli: sayfadaki her düğmeyi beden adayı
  saymak renk adlarını ve adet düğmelerini de beden diye sepete yazıyordu.

### Geliştirme

* `test/live/platform-sites.test.mjs` ortak platform parser'ını kullanan
  mağazaları canlı sayfalarda doğruluyor. Adresler koda gömülü değil,
  `test/live/platform-urls.json` içinde: elli küsur mağazanın ürün adresi
  kampanya bitince ölüyor ve her ölen adres testi eklentiyle ilgisi olmayan bir
  sebeple kırmızıya çevirirdi. Adresi yazılı olmayan mağaza atlanıyor, böylece
  eldeki adreslerle kısmi koşu yapılabiliyor.
* `test/unit/size.test.mjs` beden taramasını sahte DOM'da sınıyor; içindeki
  elemelerin çoğu gerçek sayfalarda yakalanan hatalardan geldi ve her birinin
  yorumunda hangi mağazada çıktığı yazıyor.
* `test/unit/structured-image.test.mjs` JSON-LD görselinin dört biçimini ve
  bozuk adres yedeğini sınıyor.
* `test/unit/price-number.test.mjs` fiyat metninin sayıya çevrilmesini sınıyor ve
  `shared/cart.js` ile `shared/structured-data.js` kurallarının aynı sonucu
  verdiğini doğruluyor: ikisi ayrışırsa "bu tutar üstü çizili mi" sorusunun
  cevabı sessizce yanlış çıkıyor. TR çekirdeğinin nokta/virgül ondalık okuması da
  burada.

## 1.11.0 — yayımlandı

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
