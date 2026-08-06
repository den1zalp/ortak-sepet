# Değişiklik Geçmişi

Sürüm numarası `manifest.json` içindeki `version` alanından gelir.

## 1.6.0 — yayımlanmadı

### Eklenenler

* **Aldıklarım sekmesi.** Sepetteki ürün "Alındı" ile ayrı bir listeye taşınır.
  Alınanlar ay ay gruplanır ve her ayın harcama toplamı gösterilir. Alınan ürünün
  fiyatı, adedi ve para birimi o anki hâliyle dondurulur; sonraki fiyat
  güncellemeleri geçmiş ayların harcamasını değiştirmez.
* **Sepeti Kopyala.** Sepet, paylaşılabilir düz metin olarak panoya kopyalanır.
* **Geri alma.** Silme, sepeti temizleme ve alındı işaretleme geri alınabilir
  (5 dakika geçerli).
* **Sepeti temizlemede iki adımlı onay.**
* **Yeni siteler:** IKEA Türkiye, IKEA UK, Çiçeksepeti, D&R, Samsonite Türkiye,
  Samsonite UK.
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
