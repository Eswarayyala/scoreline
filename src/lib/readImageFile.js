export function readImageFile(file, onDone, onError, { maxChars = 700000, maxEdge = 1600 } = {}) {
  if (!file || !file.type.startsWith("image/")) {
    onError("Choose a PNG, JPG, or WebP image.");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    onError("Keep the original file under 8 MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const src = String(reader.result || "");
    compressImage(src, { maxChars, maxEdge })
      .then(onDone)
      .catch(() => onError("That image is still too large. Try a smaller poster."));
  };
  reader.readAsDataURL(file);
}

function compressImage(src, { maxChars, maxEdge }) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      let quality = 0.82;
      let out = canvas.toDataURL("image/jpeg", quality);
      while (out.length > maxChars && quality > 0.42) {
        quality -= 0.08;
        out = canvas.toDataURL("image/jpeg", quality);
      }
      if (out.length > maxChars) reject(new Error("too large"));
      else resolve(out);
    };
    image.onerror = () => reject(new Error("decode"));
    image.src = src;
  });
}
