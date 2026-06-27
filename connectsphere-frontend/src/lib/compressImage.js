// Downscale + re-encode an image File in the browser before uploading it.
// Returns a smaller File, or the original when compressing wouldn't help
// (GIFs, already-tiny images, or any failure). No external dependencies.
const MAX_DIM = 1920;
const QUALITY = 0.82;

export async function compressImage(file, { maxDim = MAX_DIM, quality = QUALITY } = {}) {
  // Leave non-images and animated GIFs untouched (canvas would flatten them).
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif') return file;

  try {
    const bitmap = await loadBitmap(file);
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

    // Never ship a file that ended up larger (e.g. already-optimised photos).
    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^.]+$/, '')}.jpg`;
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    // 'from-image' respects EXIF orientation so phone photos aren't rotated.
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() =>
      createImageBitmap(file)
    );
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
