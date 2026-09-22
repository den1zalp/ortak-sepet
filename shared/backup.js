// Ortak Sepet - yedek dosyası biçimi.
//
// Sepet tarayıcının eklenti deposunda duruyor ve o depo eklentinin kimliğine
// bağlı. Kimlik değişince sepet silinmiş gibi görünüyor: Chrome'da
// paketlenmemiş eklentinin kimliği klasör yolundan türüyor, yani aynı eklenti
// başka bir klasörden yüklendiğinde boş sepetle açılıyor. Aynı şey tarayıcı,
// profil ya da bilgisayar değiştirince de oluyor. Yedek dosyası bu bağı
// kopartıyor.
//
// CSV dışa aktarma bunun yerine geçmiyor: o, okunmak için üretiliyor —
// hesaplanmış sütunlar taşıyor, ürünün kimliğini, kategorisini, taksit ve
// kargo alanlarını taşımıyor. Yedek ise depodaki kaydın kendisi.
(function () {
  const BACKUP_FORMAT = "ortak-sepet-yedek";
  const BACKUP_VERSION = 1;

  // Ürün adı olmayan kayıt sepette gösterilemiyor. Dosya elle düzenlenmiş ya da
  // başka bir araçtan geçmiş olabileceği için geri yüklemeden önce eleniyor.
  function cleanItemList(value) {
    if (!Array.isArray(value)) return null;

    return value.filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof entry.title === "string" &&
        entry.title.trim() !== "",
    );
  }

  function createBackup(items, purchased, extensionVersion) {
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      extensionVersion: extensionVersion || "",
      items: Array.isArray(items) ? items : [],
      purchased: Array.isArray(purchased) ? purchased : [],
    };
  }

  // Okunamayan dosyanın sebebi ayrı ayrı dönüyor: kullanıcıya "dosya bozuk",
  // "bu bir Ortak Sepet yedeği değil" ve "yedek boş" farklı şeyler anlatıyor.
  function parseBackup(text) {
    let data = null;

    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, reason: "json" };
    }

    if (!data || typeof data !== "object" || data.format !== BACKUP_FORMAT) {
      return { ok: false, reason: "format" };
    }

    const items = cleanItemList(data.items);
    const purchased = cleanItemList(data.purchased);

    if (items === null || purchased === null) {
      return { ok: false, reason: "format" };
    }

    if (items.length === 0 && purchased.length === 0) {
      return { ok: false, reason: "empty" };
    }

    return {
      ok: true,
      items,
      purchased,
      exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : "",
      extensionVersion: typeof data.extensionVersion === "string" ? data.extensionVersion : "",
    };
  }

  globalThis.OrtakSepetBackup = {
    BACKUP_FORMAT,
    BACKUP_VERSION,
    createBackup,
    parseBackup,
  };
})();
