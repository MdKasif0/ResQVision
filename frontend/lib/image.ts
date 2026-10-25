/**
 * Client-Side Image Preprocessing & Downscaling
 * Ensures large images (e.g. 4000px+ phone or drone captures) are downscaled
 * to max 1920px before upload, preserving exact aspect ratio.
 */

export interface DownscaleResult {
  file: File;
  downscaled: boolean;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  originalSizeBytes: number;
  newSizeBytes: number;
}

export const MAX_CLIENT_DIMENSION = 1920;

export async function downscaleImageIfNeeded(
  file: File,
  maxDimension: number = MAX_CLIENT_DIMENSION
): Promise<DownscaleResult> {
  // If not an image, return as-is
  if (!file.type.startsWith("image/")) {
    return {
      file,
      downscaled: false,
      originalWidth: 0,
      originalHeight: 0,
      width: 0,
      height: 0,
      originalSizeBytes: file.size,
      newSizeBytes: file.size,
    };
  }

  return new Promise<DownscaleResult>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      // If already within bounds, keep original file
      if (origW <= maxDimension && origH <= maxDimension) {
        resolve({
          file,
          downscaled: false,
          originalWidth: origW,
          originalHeight: origH,
          width: origW,
          height: origH,
          originalSizeBytes: file.size,
          newSizeBytes: file.size,
        });
        return;
      }

      // Compute proportional downscale preserving aspect ratio
      const scale = maxDimension / Math.max(origW, origH);
      const targetW = Math.round(origW * scale);
      const targetH = Math.round(origH * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        // Fallback to original if canvas context unavailable
        resolve({
          file,
          downscaled: false,
          originalWidth: origW,
          originalHeight: origH,
          width: origW,
          height: origH,
          originalSizeBytes: file.size,
          newSizeBytes: file.size,
        });
        return;
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Determine output mime: JPEG for photos, PNG if original was PNG
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const quality = outputType === "image/jpeg" ? 0.90 : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              file,
              downscaled: false,
              originalWidth: origW,
              originalHeight: origH,
              width: origW,
              height: origH,
              originalSizeBytes: file.size,
              newSizeBytes: file.size,
            });
            return;
          }

          const newFilename = file.name.replace(/\.[^.]+$/, outputType === "image/png" ? ".png" : ".jpg");
          const downscaledFile = new File([blob], newFilename, {
            type: outputType,
            lastModified: Date.now(),
          });

          resolve({
            file: downscaledFile,
            downscaled: true,
            originalWidth: origW,
            originalHeight: origH,
            width: targetW,
            height: targetH,
            originalSizeBytes: file.size,
            newSizeBytes: downscaledFile.size,
          });
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for client-side downscaling."));
    };

    img.src = objectUrl;
  });
}
