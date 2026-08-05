# Privacy Policy

Last updated: 5 August 2026

Ortak Sepet is a browser extension for Firefox and Chrome that helps users create a local shopping cart from supported e-commerce product pages.

## Data Collection

This extension does not collect, transmit, sell, share or upload personal data to any external server.

The extension reads visible product page information only when the user interacts with the add-on. This may include:

- Product name
- Product price
- Product image
- Product page URL
- Website name
- Installment text shown on the product page
- Shipping or delivery text shown on the product page

## Local Storage

Cart data is stored locally in the user's browser using the browser's extension storage API.

The stored data may include:

- Saved products
- Product quantities
- Selected products
- Manually edited prices
- Product categories
- Last price update status

This data stays in the user's browser and is not sent to any external server.

## Price Updates

When the user clicks the "Fiyatları Güncelle" ("Refresh Prices") button, the extension opens saved product links in background tabs, reads visible product page information again and updates the locally stored cart data. The background tabs are closed once each product has been read.

No product data, cart data, browsing data or personal data is sent to the developer or to any third-party server.

## Product Images

Product images are fetched directly from the retailer's own servers so they can be shown in the cart. These requests are made without cookies or credentials and no identifying information is attached to them.

On one supported site (Diesel), product images cannot be fetched this way. For that site only, and only while the user is adding a product, the extension captures the visible area of the active tab, crops the product image out of it and discards the rest. The capture is processed entirely on the user's device and is never transmitted anywhere.

## Supported Websites

The extension only runs on the product pages of the retailers it supports:

- Turkey: Amazon Türkiye, Hepsiburada, Trendyol, n11, Teknosa, Vatan Bilgisayar, MediaMarkt Türkiye, Pazarama, Çiçeksepeti, idefix, D&R, İtopya, İncehesap, IKEA Türkiye, Sephora Türkiye, Zara, Bershka, H&M, JeansLab
- United Kingdom: Amazon UK, eBay UK, Vinted UK, Argos, Currys, Diesel UK, Temu, AliExpress, Sephora UK, Gymshark, IKEA UK

## Third-Party Websites

The extension works with supported e-commerce websites by reading visible information from product pages. It is not affiliated with, endorsed by, sponsored by or officially connected to any listed website, brand or company.

All trademarks and brand names belong to their respective owners.

## User Control

Users can remove products from the cart, clear the cart and uninstall the extension at any time. Removing the extension or clearing extension storage may delete locally saved cart data.

## Contact

For support, issues or privacy-related questions, please use the GitHub repository:

https://github.com/den1zalp/ortak-sepet
