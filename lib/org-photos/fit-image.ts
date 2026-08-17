import { centerCropRect, orgPhotoOutput } from "@/lib/org-photos/fit";
import type { OrgPhotoKind } from "@/lib/org-photos/slots";
import { ORG_PHOTO_MAX_BYTES } from "@/lib/storage";

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

export async function fitOrgPhotoFile(file: File, kind: OrgPhotoKind) {
  const output = orgPhotoOutput(kind);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That file doesn’t look like a photo. Use a JPEG, PNG, or WebP.");
  }

  try {
    if (bitmap.width < 64 || bitmap.height < 64) {
      throw new Error("Use a clearer photo. That one is too small.");
    }

    const crop = centerCropRect(
      bitmap.width,
      bitmap.height,
      output.width / output.height
    );
    const canvas = document.createElement("canvas");
    canvas.width = output.width;
    canvas.height = output.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Couldn’t prepare that photo. Try another file.");
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      bitmap,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      output.width,
      output.height
    );

    const blob = await encodeJpegUnderLimit(canvas, ORG_PHOTO_MAX_BYTES);
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
