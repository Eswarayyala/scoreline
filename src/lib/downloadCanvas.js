/** Download a canvas as PNG. Returns false if the browser blocked it. */
export function downloadCanvasPng(canvas, filename = "grindinfo-share.png") {
  if (!canvas) return false;
  try {
    const link = document.createElement("a");
    link.download = filename.replace(/[^\w.-]+/g, "-").slice(0, 80);
    link.href = canvas.toDataURL("image/png");
    link.click();
    return true;
  } catch {
    return false;
  }
}

export async function shareCanvasPng(canvas, { title = "GrindInfo", text = "" } = {}) {
  if (!canvas) return false;
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return downloadCanvasPng(canvas, `${title}.png`);
    const file = new File([blob], `${String(title || "grindinfo").replace(/[^\w.-]+/g, "-").slice(0, 40)}.png`, {
      type: "image/png",
    });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, text, files: [file] });
      return true;
    }
    return downloadCanvasPng(canvas, `${title}.png`);
  } catch {
    return downloadCanvasPng(canvas, `${title}.png`);
  }
}
