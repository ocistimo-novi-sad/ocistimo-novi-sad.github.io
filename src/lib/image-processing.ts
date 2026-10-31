import { LIMITS } from '../config';

/**
 * Photos are shrunk in the browser before upload, so people never have to
 * resize anything themselves. Re-encoding through a canvas also drops all
 * EXIF metadata, including the GPS position a phone writes into a photo.
 */

export interface PreparedImage {
  full: Blob;
  thumb: Blob;
  /** File extension matching the encoded type. */
  ext: 'webp' | 'jpg';
  contentType: 'image/webp' | 'image/jpeg';
}

type Drawable = ImageBitmap | HTMLImageElement;

function sizeOf(source: Drawable): { width: number; height: number } {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

/** Decodes with the camera orientation applied, so portrait photos stay upright. */
async function decode(file: File): Promise<Drawable> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to <img>, which modern browsers also orient correctly.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Draws the image scaled to fit `maxSide` and encodes it. Safari cannot
 * encode WebP and silently returns PNG, so anything other than WebP is
 * encoded again as JPEG.
 */
async function encode(
  source: Drawable,
  maxSide: number,
  preferWebp: boolean,
): Promise<{ blob: Blob; webp: boolean }> {
  const { width, height } = sizeOf(source);
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available.');
  // White behind transparent PNGs, which JPEG cannot store.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  if (preferWebp) {
    const webp = await canvasBlob(canvas, 'image/webp', 0.82);
    if (webp && webp.type === 'image/webp') return { blob: webp, webp: true };
  }
  const jpeg = await canvasBlob(canvas, 'image/jpeg', 0.85);
  if (!jpeg) throw new Error('Image encoding failed.');
  return { blob: jpeg, webp: false };
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const source = await decode(file);
  try {
    const full = await encode(source, LIMITS.imageFullPx, true);
    // The thumbnail uses the same format as the full image so both share one extension.
    const thumb = await encode(source, LIMITS.imageThumbPx, full.webp);
    return {
      full: full.blob,
      thumb: thumb.blob,
      ext: full.webp ? 'webp' : 'jpg',
      contentType: full.webp ? 'image/webp' : 'image/jpeg',
    };
  } finally {
    if ('close' in source) source.close();
  }
}
