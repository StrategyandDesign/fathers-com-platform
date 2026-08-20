import { LOGIN_BACKGROUND_MAX_BYTES } from "@/lib/storage";

const MAX_EDGE = 2560;

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Couldn’t prepare that photo. Try another file."));
      },
      "image/jpeg",
      quality
    );
  });
}

async function encodeJpegUnderLimit(canvas: HTMLCanvasElement, maxBytes: number) {
  let quality = 0.88;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > maxBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > maxBytes) {
    throw new Error("That photo is too large after fitting. Try a smaller file.");
  }
  return blob;
}

/** Scale a panoramic shot down. Do not crop — the login page covers the screen. */
export async function fitLoginBackgroundFile(file: File) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That file doesn’t look like a photo. Use a JPEG, PNG, or WebP.");
  }

  try {
    if (bitmap.width < 800 || bitmap.height < 400) {
      throw new Error("Use a wider photo. A panoramic landscape works best.");
    }

    let width = bitmap.width;
    let height = bitmap.height;
    if (width > MAX_EDGE || height > MAX_EDGE) {
      const scale = MAX_EDGE / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Couldn’t prepare that photo. Try another file.");
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await encodeJpegUnderLimit(canvas, LOGIN_BACKGROUND_MAX_BYTES);
    const base = file.name.replace(/\.[^.]+$/, "") || "login-background";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
