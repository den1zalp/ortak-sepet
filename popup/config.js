// Ortak Sepet popup module: config.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

// Sepet anahtarı shared/cart.js içinde; popup depoya oradan erişir.
const VIEW_MODE_KEY = "ortakSepetViewMode";
// Alınan ürünler ayrı anahtarda: rozet sayısı, toplamlar ve fiyat güncellemesi
// yalnızca sepeti okuduğu için alınanlar bu akışların hiçbirine karışmıyor.
const PURCHASED_KEY = "ortakSepetPurchased";
const UNDO_KEY = "ortakSepetUndo";
// Geri alma teklifi bu süre boyunca geçerli; popup kapanıp açılsa da durur.
const UNDO_WINDOW_MS = 5 * 60 * 1000;
const COMPACT_MODE_KEY = "ortakSepetCompactMode";
const LANGUAGE_KEY = "ortakSepetLanguage";
const THEME_KEY = "ortakSepetTheme";
// Vurgu rengi: hazır renklerden biri ({ preset }) ya da kaydırıcıyla seçilen
// renk tonu ({ hue }).
const ACCENT_KEY = "ortakSepetAccent";
const SORT_KEY = "ortakSepetSort";
// "added" depodaki sıra, yani eklenme sırası.
const SORT_OPTIONS = ["added", "newest", "price-asc", "price-desc", "name", "store"];

// Her renk iki tonlu: toplam kartı ve logo bu ikisinin arasında geçiş yapıyor.
const ACCENT_PRESETS = [
  { id: "indigo", colors: ["#4f46e5", "#7c3aed"] },
  { id: "blue", colors: ["#2563eb", "#0891b2"] },
  { id: "teal", colors: ["#0d9488", "#0284c7"] },
  { id: "green", colors: ["#16a34a", "#0d9488"] },
  { id: "orange", colors: ["#ea580c", "#db2777"] },
  { id: "pink", colors: ["#db2777", "#9333ea"] },
  { id: "red", colors: ["#dc2626", "#ea580c"] },
  { id: "graphite", colors: ["#334155", "#0f172a"] },
];

const addCurrentProductBtn = document.getElementById("addCurrentProductBtn");
const categorizeProductsBtn = document.getElementById("categorizeProductsBtn");
const installmentProductsBtn = document.getElementById(
  "installmentProductsBtn",
);
const updateAllPricesBtn = document.getElementById("updateAllPricesBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const backupCartBtn = document.getElementById("backupCartBtn");
const restoreCartBtn = document.getElementById("restoreCartBtn");
const copyCartBtn = document.getElementById("copyCartBtn");
const undoBtn = document.getElementById("undoBtn");
const dismissStatusBtn = document.getElementById("dismissStatusBtn");
const compactViewBtn = document.getElementById("compactViewBtn");
const countryGroupingBtn = document.getElementById("countryGroupingBtn");
const clearCartBtn = document.getElementById("clearCartBtn");
const statusEl = document.getElementById("status");
const cartItemsEl = document.getElementById("cartItems");
const totalPriceEl = document.getElementById("totalPrice");
const selectedTotalPriceEl = document.getElementById("selectedTotalPrice");
const itemCountEl = document.getElementById("itemCount");
const languageToggleBtn = document.getElementById("languageToggleBtn");
const languageControlEl = document.getElementById("languageControl");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const appSubtitleEl = document.getElementById("appSubtitle");
const itemCountLabelEl = document.getElementById("itemCountLabel");
const totalPriceLabelEl = document.getElementById("totalPriceLabel");
const selectedTotalPriceLabelEl = document.getElementById("selectedTotalPriceLabel");
const actionGridEl = document.getElementById("actionGrid");
const summarySectionEl = document.getElementById("summarySection");
const footerActionsEl = document.getElementById("footerActions");
const cartTabBtn = document.getElementById("cartTabBtn");
const purchasedTabBtn = document.getElementById("purchasedTabBtn");
const cartPanelEl = document.getElementById("cartPanel");
const purchasedPanelEl = document.getElementById("purchasedPanel");
const purchasedItemsEl = document.getElementById("purchasedItems");
const purchasedSummaryEl = document.getElementById("purchasedSummary");
const markPurchasedBtn = document.getElementById("markPurchasedBtn");
const permissionNoticeEl = document.getElementById("permissionNotice");
const moreActionsBtn = document.getElementById("moreActionsBtn");
const moreActionsMenuEl = document.getElementById("moreActionsMenu");
const updateProgressEl = document.getElementById("updateProgress");
const updateProgressBarEl = document.getElementById("updateProgressBar");
const groupByLabelEl = document.getElementById("groupByLabel");
const currencySwitchEl = document.getElementById("currencySwitch");
const rateInfoEl = document.getElementById("rateInfo");
const sortControlEl = document.getElementById("sortControl");
const sortBtn = document.getElementById("sortBtn");
const sortMenuEl = document.getElementById("sortMenu");
const sortMenuTitleEl = document.getElementById("sortMenuTitle");
const sortOptionsEl = document.getElementById("sortOptions");
const accentMenuTitleEl = document.getElementById("accentMenuTitle");
const accentSwatchesEl = document.getElementById("accentSwatches");
const accentCustomLabelEl = document.getElementById("accentCustomLabel");
const accentHueInput = document.getElementById("accentHueInput");

const I18N = {
  tr: {
    appSubtitle: "Alışverişte ortak sepetiniz",
    moreActions: "Diğer işlemler",
    groupBy: "Grupla",
    chipCategory: "Kategori",
    chipInstallment: "Taksit",
    chipCountry: "Ülke",
    chipCompact: "Kompakt",
    accentColor: "Tema",
    accentCustom: "Özel renk",
    sortBy: "Sırala",
    dismissStatus: "Bildirimi kapat",
    displayCurrency: "Toplamın para birimi",
    currency_TRY: "TL",
    currency_GBP: "£",
    currency_USD: "$",
    currency_EUR: "€",
    showInCurrency: "Toplamı {currency} olarak göster",
    showOwnCurrencies: "Kendi para birimlerine dön",
    rateInfo: "{rate} · {date} kuru (Avrupa Merkez Bankası)",
    rateLoading: "Kur alınıyor…",
    rateUnavailable: "Kur alınamadı; tutarlar kendi para biriminde.",
    convertedPriceTitle: "Günlük kurla yaklaşık karşılığı",
    sort_added: "Eklenme sırası",
    sort_newest: "En son eklenen",
    "sort_price-asc": "Fiyat: artan",
    "sort_price-desc": "Fiyat: azalan",
    sort_name: "Ürün adı (A-Z)",
    sort_store: "Mağaza (A-Z)",
    accent_indigo: "Mor",
    accent_blue: "Mavi",
    accent_teal: "Turkuaz",
    accent_green: "Yeşil",
    accent_orange: "Turuncu",
    accent_pink: "Pembe",
    accent_red: "Kırmızı",
    accent_graphite: "Grafit",
    cartActions: "Sepet işlemleri",
    switchToEnglish: "İngilizceye Geç",
    switchToTurkish: "Türkçeye Geç",
    enableDarkMode: "Karanlık Mod",
    enableLightMode: "Aydınlık Mod",
    addCurrentProduct: "Bu Ürünü Ekle",
    categorizeProducts: "Kategorize Et",
    removeCategories: "Kategorileri Kaldır",
    installmentProducts: "Taksit / Finance",
    removeInstallmentGrouping: "Taksit Grubunu Kaldır",
    updateAllPrices: "Fiyatları Güncelle",
    cancelUpdate: "Güncellemeyi Durdur",
    pricesUpdateCancelled: "Güncelleme durduruldu. {changed} ürünün fiyatı değişti, {failed} ürün güncellenemedi.",
    exportCsv: "CSV / Excel",
    backupCart: "Yedekle",
    restoreCart: "Geri Yükle",
    tabPurchased: "Aldıklarım",
    markPurchased: "Alındı",
    markSelectedPurchased: "Seçilenleri Alındı İşaretle",
    markPurchasedLabel: "Alındı olarak işaretle: {title}",
    purchasedMoved: "{count} ürün alınanlara taşındı.",
    noSelectedItems: "Seçili ürün yok.",
    restoreToCart: "Sepete Geri Al",
    restoreToCartLabel: "Sepete geri al: {title}",
    deletePurchase: "Kaydı Sil",
    deletePurchaseLabel: "Kaydı sil: {title}",
    purchaseRestored: "Ürün sepete geri alındı.",
    purchaseDeleted: "Kayıt silindi.",
    emptyPurchased: "Henüz alınmış ürün yok. Sepetteki bir üründe “Alındı” butonuna bastığında burada ay ay listelenir.",
    purchasedThisMonth: "Bu ay",
    purchasedAllTime: "Tümü",
    purchasedOn: "Alınma",
    copyCart: "Sepeti Kopyala",
    cartCopied: "Sepet panoya kopyalandı.",
    copyFailed: "Sepet kopyalanamadı.",
    copyHeader: "Ortak Sepet — {count} ürün",
    copyTotal: "Toplam: {total}",
    selectItemLabel: "Seçili toplama dahil et: {title}",
    decreaseQuantityLabel: "Adet azalt: {title}",
    increaseQuantityLabel: "Adet artır: {title}",
    openLinkLabel: "Ürün sayfasını aç: {title}",
    manualPriceLabel: "Manuel fiyat gir: {title}",
    removeLabel: "Ürünü sil: {title}",
    clearCartConfirm: "Sepetin tamamı silinecek. Onaylamak için tekrar tıkla.",
    clearCartConfirmButton: "Emin misin?",
    undo: "Geri Al",
    undoDone: "Son işlem geri alındı.",
    undoUnavailable: "Geri alınacak işlem yok.",
    compactView: "Kompakt Görünüm",
    normalView: "Normal Görünüm",
    countryGrouping: "Ülkeye Göre Grupla",
    removeCountryGrouping: "Ülke Gruplamasını Kaldır",
    clearCart: "Sepeti Temizle",
    itemCount: "Ürün sayısı",
    total: "Genel toplam",
    selectedTotal: "Seçili toplam",
    cart: "Sepet",
    emptyCart: "Sepet boş. Desteklenen bir ürün sayfasına giderek ürün ekleyebilirsiniz.",
    selectedTotalTitle: "Seçili toplama dahil et",
    noProductTitle: "Ürün adı yok",
    unknownSite: "Bilinmeyen site",
    priceReadFailed: "Fiyat okunamadı",
    priceUnavailable: "Ana fiyat yok",
    stockStatus: "Durum",
    noActiveOffer: "Satışta değil / satın alma seçeneklerinde",
    subtotalNotIncluded: "Ara toplam: Toplama dahil edilmedi",
    productAddedWithoutPrice: "Ürün eklendi, ancak ana satış fiyatı bulunamadı. Fiyat toplama dahil edilmedi.",
    source: "Kaynak",
    manual: "Manuel",
    previous: "Önceki",
    installment: "Taksit",
    finance: "Finansman",
    delivery: "Kargo",
    check: "Kontrol",
    available: "Var",
    unavailable: "Yok",
    freeDelivery: "Ücretsiz kargo",
    deliveryInfoAvailable: "Kargo/teslimat bilgisi var",
    calculatedAtCheckout: "Sepette hesaplanır",
    subtotalUnavailable: "Ara toplam hesaplanamadı",
    subtotal: "Ara toplam: {total}",
    lastFailed: "Başarısız",
    lastManual: "Manuel",
    lastManualKept: "Manuel korundu",
    lastPermission: "Site izni gerekiyor",
    lastUnavailable: "Ana fiyat yok",
    lastSuccess: "Başarılı",
    grantPermission: "İzin Ver",
    grantPermissionLabel: "{title} için site iznini ver",
    permissionNotice:
      "{count} sitenin erişim izni verilmemiş; o sitelerdeki ürünler güncellenemiyor.",
    permissionNoticeAll: "İzin Ver",
    permissionNoticeAllLabel: "Eksik site izinlerinin tümünü ver",
    permissionRequestHint:
      "Tarayıcı izni sorarken bu pencere kapanabilir; onayladıktan sonra tekrar açın.",
    quantity: "Adet: {quantity}",
    goToLink: "Linke Git",
    manualPrice: "Manuel Fiyat Gir",
    remove: "Sil",
    installmentAvailableGroup: "Taksit / Finance Var",
    installmentUnavailableGroup: "Taksit / Finance Yok",
    productMeta: "{products} ürün • {quantity} adet • {total}",
    countryTurkey: "Türkiye",
    countryUnitedKingdom: "İngiltere",
    readingProduct: "Ürün okunuyor...",
    activeTabMissing: "Aktif sekme bulunamadı.",
    productReadFailed: "Bu sayfadan ürün okunamadı.",
    unsupportedPage: "Bu sayfada eklenti çalışmıyor olabilir. Desteklenen bir ürün sayfasında dene.",
    reloadPageHint:
      "Eklenti bu sekme açıkken yüklenmiş olabilir. Sayfayı yenileyip tekrar dene.",
    duplicateAdded: "Bu ürün zaten vardı, adedi artırıldı ve seçili yapıldı.",
    productAdded: "Ürün sepete eklendi.",
    noItemsToCategorize: "Kategorize edilecek ürün yok.",
    noItemsToGroup: "Gruplanacak ürün yok.",
    noItemsToUpdate: "Güncellenecek ürün yok.",
    pricesUpdating: "Fiyatlar güncelleniyor...",
    pricesUpdatingProgress: "Fiyatlar güncelleniyor: {current}/{total}",
    pricesUpdateFailed: "Fiyatlar güncellenemedi.",
    pricesUpdateDone: "Güncelleme tamamlandı. {changed} ürünün fiyatı değişti, {failed} ürün güncellenemedi.",
    pricesUpdateError: "Güncelleme sırasında hata oluştu.",
    promptNewPrice: "Yeni fiyatı gir:",
    invalidPrice: "Geçerli bir fiyat girilmedi.",
    manualPriceUpdated: "Fiyat manuel olarak güncellendi.",
    productRemoved: "Ürün silindi.",
    quantityZeroRemoved: "Adet 0 oldu, ürün silindi.",
    csvNoItems: "Dışa aktarılacak ürün yok.",
    csvExported: "Sepet CSV olarak dışa aktarıldı. Excel ile açabilirsiniz.",
    backupNoData: "Yedeklenecek veri yok.",
    backupSaved: "{count} kayıt JSON dosyasına yedeklendi. Geri yüklemek için \"Geri Yükle\" kullan.",
    cartCleared: "Sepet temizlendi.",
    yes: "Evet",
    no: "Hayır",
    csvProductName: "Ürün Adı",
    csvSite: "Site",
    csvPrice: "Fiyat",
    csvQuantity: "Adet",
    csvSubtotal: "Ara Toplam",
    csvCurrency: "Para Birimi",
    csvCategory: "Kategori",
    csvPaymentPlan: "Taksit / Finance",
    csvDelivery: "Kargo / Teslimat",
    csvManualPrice: "Manuel Fiyat",
    csvUrl: "URL",
  },
  en: {
    appSubtitle: "Your shared shopping basket",
    moreActions: "More actions",
    groupBy: "Group",
    chipCategory: "Category",
    chipInstallment: "Finance",
    chipCountry: "Country",
    chipCompact: "Compact",
    accentColor: "Theme",
    accentCustom: "Custom colour",
    sortBy: "Sort",
    dismissStatus: "Dismiss notification",
    displayCurrency: "Currency for totals",
    currency_TRY: "TL",
    currency_GBP: "£",
    currency_USD: "$",
    currency_EUR: "€",
    showInCurrency: "Show totals in {currency}",
    showOwnCurrencies: "Back to each product's own currency",
    rateInfo: "{rate} · rate of {date} (European Central Bank)",
    rateLoading: "Getting the exchange rate…",
    rateUnavailable: "Exchange rate unavailable; amounts shown in their own currency.",
    convertedPriceTitle: "Approximate value at the daily rate",
    sort_added: "Order added",
    sort_newest: "Newest first",
    "sort_price-asc": "Price: low to high",
    "sort_price-desc": "Price: high to low",
    sort_name: "Product name (A-Z)",
    sort_store: "Store (A-Z)",
    accent_indigo: "Purple",
    accent_blue: "Blue",
    accent_teal: "Teal",
    accent_green: "Green",
    accent_orange: "Orange",
    accent_pink: "Pink",
    accent_red: "Red",
    accent_graphite: "Graphite",
    cartActions: "Basket actions",
    switchToEnglish: "Switch to English",
    switchToTurkish: "Switch to Turkish",
    enableDarkMode: "Dark Mode",
    enableLightMode: "Light Mode",
    addCurrentProduct: "Add This Product",
    categorizeProducts: "Categorise",
    removeCategories: "Remove Categories",
    installmentProducts: "Instalments / Finance",
    removeInstallmentGrouping: "Remove Finance Group",
    updateAllPrices: "Refresh Prices",
    cancelUpdate: "Stop Refreshing",
    pricesUpdateCancelled: "Refresh stopped. {changed} product prices changed, {failed} products could not be refreshed.",
    exportCsv: "CSV / Excel",
    backupCart: "Back Up",
    restoreCart: "Restore",
    tabPurchased: "Purchased",
    markPurchased: "Bought",
    markSelectedPurchased: "Mark Selected as Bought",
    markPurchasedLabel: "Mark as bought: {title}",
    purchasedMoved: "{count} products moved to purchased.",
    noSelectedItems: "No products are selected.",
    restoreToCart: "Move to Basket",
    restoreToCartLabel: "Move back to basket: {title}",
    deletePurchase: "Delete Record",
    deletePurchaseLabel: "Delete record: {title}",
    purchaseRestored: "Product moved back to the basket.",
    purchaseDeleted: "Record deleted.",
    emptyPurchased: "Nothing purchased yet. Press “Bought” on a basket item and it will be listed here month by month.",
    purchasedThisMonth: "This month",
    purchasedAllTime: "All time",
    purchasedOn: "Bought on",
    copyCart: "Copy Basket",
    cartCopied: "Basket copied to the clipboard.",
    copyFailed: "The basket could not be copied.",
    copyHeader: "Ortak Sepet — {count} products",
    copyTotal: "Total: {total}",
    selectItemLabel: "Include in selected total: {title}",
    decreaseQuantityLabel: "Decrease quantity: {title}",
    increaseQuantityLabel: "Increase quantity: {title}",
    openLinkLabel: "Open product page: {title}",
    manualPriceLabel: "Enter manual price: {title}",
    removeLabel: "Remove product: {title}",
    clearCartConfirm: "This will remove every product. Click again to confirm.",
    clearCartConfirmButton: "Are you sure?",
    undo: "Undo",
    undoDone: "Last action undone.",
    undoUnavailable: "There is nothing to undo.",
    compactView: "Compact View",
    normalView: "Normal View",
    countryGrouping: "Group by Country",
    removeCountryGrouping: "Remove Country Grouping",
    clearCart: "Clear Basket",
    itemCount: "Item count",
    total: "Total",
    selectedTotal: "Selected total",
    cart: "Basket",
    emptyCart: "Your basket is empty. Open a supported product page to add an item.",
    selectedTotalTitle: "Include in selected total",
    noProductTitle: "No product title",
    unknownSite: "Unknown site",
    priceReadFailed: "Price could not be read",
    priceUnavailable: "No main price",
    stockStatus: "Status",
    noActiveOffer: "Unavailable / buying options only",
    subtotalNotIncluded: "Subtotal: Not included in total",
    productAddedWithoutPrice: "Product added, but the main selling price was not available. It was not included in totals.",
    source: "Source",
    manual: "Manual",
    previous: "Previous",
    installment: "Instalments",
    finance: "Finance",
    delivery: "Delivery",
    check: "Check",
    available: "Available",
    unavailable: "Unavailable",
    freeDelivery: "Free delivery",
    deliveryInfoAvailable: "Delivery information available",
    calculatedAtCheckout: "Calculated at checkout",
    subtotalUnavailable: "Subtotal could not be calculated",
    subtotal: "Subtotal: {total}",
    lastFailed: "Failed",
    lastManual: "Manual",
    lastManualKept: "Manual kept",
    lastPermission: "Site access needed",
    lastUnavailable: "No main price",
    lastSuccess: "Successful",
    grantPermission: "Grant Access",
    grantPermissionLabel: "Grant site access for {title}",
    permissionNotice:
      "Access to {count} site(s) has not been granted, so those products cannot be refreshed.",
    permissionNoticeAll: "Grant Access",
    permissionNoticeAllLabel: "Grant all missing site permissions",
    permissionRequestHint:
      "This window may close while the browser asks for permission; reopen it once you have confirmed.",
    quantity: "Qty: {quantity}",
    goToLink: "Open Link",
    manualPrice: "Enter Manual Price",
    remove: "Remove",
    installmentAvailableGroup: "Instalments / Finance Available",
    installmentUnavailableGroup: "No Instalments / Finance",
    productMeta: "{products} products • {quantity} items • {total}",
    countryTurkey: "Türkiye",
    countryUnitedKingdom: "United Kingdom",
    readingProduct: "Reading product...",
    activeTabMissing: "Active tab could not be found.",
    productReadFailed: "Product could not be read from this page.",
    unsupportedPage: "The extension may not work on this page. Try a supported product page.",
    reloadPageHint:
      "The extension may have been loaded while this tab was open. Reload the page and try again.",
    duplicateAdded: "This product was already in the basket, so its quantity was increased and selected.",
    productAdded: "Product added to basket.",
    noItemsToCategorize: "There are no products to categorise.",
    noItemsToGroup: "There are no products to group.",
    noItemsToUpdate: "There are no products to refresh.",
    pricesUpdating: "Refreshing prices...",
    pricesUpdatingProgress: "Refreshing prices: {current}/{total}",
    pricesUpdateFailed: "Prices could not be refreshed.",
    pricesUpdateDone: "Refresh complete. {changed} product prices changed, {failed} products could not be refreshed.",
    pricesUpdateError: "An error occurred while refreshing prices.",
    promptNewPrice: "Enter a new price:",
    invalidPrice: "A valid price was not entered.",
    manualPriceUpdated: "Price updated manually.",
    productRemoved: "Product removed.",
    quantityZeroRemoved: "Quantity reached 0, product removed.",
    csvNoItems: "There are no products to export.",
    csvExported: "Basket exported as CSV. You can open it with Excel.",
    backupNoData: "There is nothing to back up.",
    backupSaved: "{count} records backed up to a JSON file. Use \"Restore\" to bring them back.",
    cartCleared: "Basket cleared.",
    yes: "Yes",
    no: "No",
    csvProductName: "Product Name",
    csvSite: "Site",
    csvPrice: "Price",
    csvQuantity: "Quantity",
    csvSubtotal: "Subtotal",
    csvCurrency: "Currency",
    csvCategory: "Category",
    csvPaymentPlan: "Instalments / Finance",
    csvDelivery: "Delivery",
    csvManualPrice: "Manual Price",
    csvUrl: "URL",
  },
};

const CATEGORY_LABELS = {
  en: {
    "Anne & Bebek": "Mother & Baby",
    "İçecek": "Drinks",
    "Elektronik": "Electronics",
    "Telefon & Aksesuar": "Phone & Accessories",
    "Bilgisayar": "Computers",
    "Ev & Yaşam": "Home & Living",
    "Kişisel Bakım": "Personal Care",
    "Giyim": "Clothing",
    "Kitap & Kırtasiye": "Books & Stationery",
    "Market": "Groceries",
    "Oyuncak": "Toys",
    "Otomotiv": "Automotive",
    "Diğer": "Other",
  },
};

let currentLanguage = "tr";
let currentTheme = "light";
let currentAccent = { preset: "indigo" };
let currentSort = "added";
