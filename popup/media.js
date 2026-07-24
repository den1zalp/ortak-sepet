// Ortak Sepet popup module: media.js
// This file was split from popup.js so popup logic can be maintained by responsibility.

function normalizeUrl(url) {
  if (!url) return "";

  try {
    const parsedUrl = new URL(url);

    parsedUrl.hash = "";

    const removableParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "trackingId",
      "gclid",
      "fbclid",
      "yclid",
      "ttclid",
      "msclkid",
    ];

    for (const param of removableParams) {
      parsedUrl.searchParams.delete(param);
    }

    return parsedUrl.toString();
  } catch {
    return url;
  }
}

function loadDataUrlImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function findNonWhiteBounds(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];
      const isWhite = red > 242 && green > 242 && blue > 242;

      if (alpha < 20 || isWhite) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const paddingX = Math.round((maxX - minX + 1) * 0.08);
  const paddingY = Math.round((maxY - minY + 1) * 0.05);

  return {
    left: Math.max(0, minX - paddingX),
    top: Math.max(0, minY - paddingY),
    right: Math.min(width, maxX + paddingX + 1),
    bottom: Math.min(height, maxY + paddingY + 1),
  };
}

async function cropCapturedProductImage(dataUrl, captureRect) {
  const sourceImage = await loadDataUrlImage(dataUrl);
  const scaleX = sourceImage.naturalWidth / captureRect.viewportWidth;
  const scaleY = sourceImage.naturalHeight / captureRect.viewportHeight;
  const visibleLeft = Math.max(0, captureRect.left);
  const visibleTop = Math.max(0, captureRect.top);
  const visibleRight = Math.min(
    captureRect.viewportWidth,
    captureRect.left + captureRect.width,
  );
  const visibleBottom = Math.min(
    captureRect.viewportHeight,
    captureRect.top + captureRect.height,
  );
  const sourceWidth = Math.max(1, (visibleRight - visibleLeft) * scaleX);
  const sourceHeight = Math.max(1, (visibleBottom - visibleTop) * scaleY);
  const sourceLeft = visibleLeft * scaleX;
  const sourceTop = visibleTop * scaleY;
  const analysisScale = Math.min(600 / sourceWidth, 600 / sourceHeight, 1);
  const analysisCanvas = document.createElement("canvas");
  analysisCanvas.width = Math.max(1, Math.round(sourceWidth * analysisScale));
  analysisCanvas.height = Math.max(1, Math.round(sourceHeight * analysisScale));
  const analysisContext = analysisCanvas.getContext("2d");

  if (!analysisContext) return "";

  analysisContext.drawImage(
    sourceImage,
    sourceLeft,
    sourceTop,
    sourceWidth,
    sourceHeight,
    0,
    0,
    analysisCanvas.width,
    analysisCanvas.height,
  );

  const contentBounds = findNonWhiteBounds(analysisCanvas);
  const trimLeftRatio = contentBounds ? contentBounds.left / analysisCanvas.width : 0;
  const trimTopRatio = contentBounds ? contentBounds.top / analysisCanvas.height : 0;
  const trimRightRatio = contentBounds ? contentBounds.right / analysisCanvas.width : 1;
  const trimBottomRatio = contentBounds ? contentBounds.bottom / analysisCanvas.height : 1;
  const trimmedSourceLeft = sourceLeft + sourceWidth * trimLeftRatio;
  const trimmedSourceTop = sourceTop + sourceHeight * trimTopRatio;
  const trimmedSourceWidth = Math.max(1, sourceWidth * (trimRightRatio - trimLeftRatio));
  const trimmedSourceHeight = Math.max(1, sourceHeight * (trimBottomRatio - trimTopRatio));
  const maxWidth = 320;
  const maxHeight = 420;
  const outputScale = Math.min(
    maxWidth / trimmedSourceWidth,
    maxHeight / trimmedSourceHeight,
    1,
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(trimmedSourceWidth * outputScale));
  canvas.height = Math.max(1, Math.round(trimmedSourceHeight * outputScale));

  const context = canvas.getContext("2d");
  if (!context) return "";

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    sourceImage,
    trimmedSourceLeft,
    trimmedSourceTop,
    trimmedSourceWidth,
    trimmedSourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas.toDataURL("image/jpeg", 0.82);
}

async function captureProductImage(activeTab, product) {
  if (!product?.imageCaptureRect || !activeTab?.windowId) return "";

  try {
    const screenshot = await browser.tabs.captureVisibleTab(activeTab.windowId, {
      format: "jpeg",
      quality: 85,
    });

    return await cropCapturedProductImage(screenshot, product.imageCaptureRect);
  } catch {
    return "";
  }
}
