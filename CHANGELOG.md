# Değişiklik Geçmişi

Sürüm numarası `manifest.json` içindeki `version` alanından gelir.

## 1.8.0 — yayımlanmadı

### Eklenenler

* **Yeni siteler:** Decathlon Türkiye, Decathlon UK, Zippo Türkiye, Zippo UK.
* **Eksik site izni artık görünür.** Firefox, güncellemeyle eklenen yeni bir
  sitenin iznini kullanıcıya sormadan vermiyor; o sitede eklenti hiç
  çalışmadığı hâlde kullanıcı yalnızca "Başarısız" görüyordu. Artık sepetin
  üstünde sebebi söyleyen bir satır ve tek tıkla izni veren bir düğme çıkıyor.
  İzin verilmemiş bir ürün sayfasında "Bu Ürünü Ekle"ye basıldığında da aynı
  uyarı geliyor.

### Değişenler

* Fiyat güncellemesi izni olmayan sitede artık sekme açmıyor; "Başarısız"
  yerine "Site izni gerekiyor" yazıyor ve bu ürünler hata sayılmıyor.

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

* JSON-LD'de iç içe dizi olarak gelen ve fiyatı `priceSpecification` altında
  tutan `offers` biçimi için `findStructuredOffer()` eklendi; iki içerik
  script'i de aynı yardımcıyı kullanıyor.
* Paket testi sürüm numarasını `manifest.json`'dan okuyor; sabit yazılmıştı ve
  her sürüm yükseltmesinde alakasız bir hata veriyordu.
* Kargo ifadesinin eşiğe bağlı olup olmadığı `test/unit/shipping.test.mjs` ile
  ağ gerektirmeden sınanıyor; örnekler gerçek mağaza sayfalarından alındı.

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
