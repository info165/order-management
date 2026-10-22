// Every document/photo attached to an order (invoices, e-way bill, CN copy,
// POD, generic documents) is stored as a base64 data: URL string directly in
// a Firestore field - there's no Cloud Storage bucket wired up in this app,
// so a real file upload isn't possible without adding and deploying that
// infrastructure separately. Firestore hard-caps a single document at 1 MiB,
// and base64 inflates a file's size by about a third - so an ordinary phone
// camera photo (often 2-8 MB) blows past that instantly. When it does, the
// write used to fail *silently* in the background (see the fix to
// syncDocToFirestore's callers): the UI showed "uploaded successfully"
// immediately because the local state update ran before the failed write
// was ever confirmed, and only a page refresh (which re-reads the real,
// unchanged document) revealed nothing had actually been saved.
//
// This resizes/recompresses images client-side to comfortably fit under
// that limit before they're ever turned into a data URL, and rejects
// non-image files (PDFs, etc., which can't be recompressed this way) up
// front with a clear message instead of attempting a doomed write.

const MAX_DATA_URL_LENGTH = 700_000; // leaves generous headroom under Firestore's 1 MiB/doc cap
const MAX_NON_IMAGE_BYTES = 500_000; // ~500 KB raw -> ~667 KB once base64-encoded

export class FileTooLargeError extends Error {}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load the selected image.'));
    };
    img.src = url;
  });
}

async function compressImageToDataUrl(file: File, maxDimension = 1600): Promise<string> {
  const img = await loadImage(file);
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return readFileAsDataUrl(file);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.75;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.3) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  // Still too big even at the lowest acceptable quality - shrink the
  // dimensions further and try the whole thing again, once.
  if (dataUrl.length > MAX_DATA_URL_LENGTH && maxDimension > 800) {
    return compressImageToDataUrl(file, Math.round(maxDimension * 0.7));
  }
  return dataUrl;
}

/**
 * Converts a File into a data URL safe to store as a single Firestore field,
 * compressing images automatically and rejecting oversized non-image files
 * (which can't be shrunk the same way) with a clear, catchable error.
 */
export async function processFileForUpload(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    const dataUrl = await compressImageToDataUrl(file);
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new FileTooLargeError(
        'This image is too large to save even after compression. Please try a lower-resolution photo.'
      );
    }
    return dataUrl;
  }

  if (file.size > MAX_NON_IMAGE_BYTES) {
    throw new FileTooLargeError(
      `This file is too large (${Math.round(file.size / 1024)} KB). Files other than images must be under ${Math.round(MAX_NON_IMAGE_BYTES / 1024)} KB - please use a smaller file.`
    );
  }
  return readFileAsDataUrl(file);
}

// Every attachment in this app is a data: URL (see the note at the top of
// this file - there's no file storage, just a base64 string in a Firestore
// field), and every "Download" link/button simply pointed straight at that
// data: URL with a `download` attribute. That works on desktop browsers,
// but not on mobile Safari or Chrome-on-iOS (both built on WebKit): neither
// honours `download` on a data: URL - tapping the link just navigates to it
// as if it were a web address, which the browser can't render, so it falls
// back to saving whatever it rendered as a generic .html file instead of
// the real PDF/image.
//
// This works around that by doing the download itself in JavaScript instead
// of relying on the browser to interpret the `download` attribute: turn the
// already-in-memory data URL into a real Blob, give that Blob a temporary
// object URL, and click a throwaway link pointed at THAT - which is the
// standard, reliably cross-browser way to save in-memory data, including on
// iPhone. This is purely local to the browser: `fetch()` on a data: URL
// never leaves the device, and nothing here reads or writes anything in the
// database - it only repackages a file this screen already has in memory.
//
// Falls back to the old behaviour (open the raw URL in a new tab) if the
// blob conversion fails for any reason, so a download never just silently
// does nothing.
export async function downloadDataUrl(url: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Give the browser a moment to pick up the click before freeing it.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.warn('Blob download failed, falling back to opening the file directly:', err);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
