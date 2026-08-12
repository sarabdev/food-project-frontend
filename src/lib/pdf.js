function fileSlug(value) {
  return String(value || "export")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "export";
}

export async function downloadElementPdf(element, name) {
  if (!element) throw new Error("The content to export could not be found.");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf")
  ]);
  const captureId = `pdf-${crypto.randomUUID()}`;
  const overflowWidths = [...element.querySelectorAll(".overflow-x-auto")].map((node) => node.scrollWidth);
  const captureWidth = Math.max(element.scrollWidth, ...overflowWidths);
  element.dataset.pdfCaptureId = captureId;

  let canvas;
  try {
    canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: Math.min(window.devicePixelRatio || 1, 2),
      useCORS: true,
      logging: false,
      width: captureWidth,
      windowWidth: captureWidth,
      ignoreElements: (node) => node instanceof HTMLElement && node.hasAttribute("data-pdf-exclude"),
      onclone: (clonedDocument) => {
        const clonedElement = clonedDocument.querySelector(`[data-pdf-capture-id="${captureId}"]`);
        if (!clonedElement) return;
        clonedElement.style.width = `${captureWidth}px`;
        clonedElement.querySelectorAll(".overflow-x-auto").forEach((node) => {
          node.style.overflow = "visible";
        });
      }
    });
  } finally {
    delete element.dataset.pdfCaptureId;
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageHeight = canvas.height * pageWidth / canvas.width;
  const image = canvas.toDataURL("image/jpeg", 0.95);

  let remainingHeight = imageHeight;
  let offset = 0;
  pdf.addImage(image, "JPEG", 0, offset, pageWidth, imageHeight, undefined, "FAST");
  remainingHeight -= pageHeight;

  while (remainingHeight > 0) {
    offset = remainingHeight - imageHeight;
    pdf.addPage();
    pdf.addImage(image, "JPEG", 0, offset, pageWidth, imageHeight, undefined, "FAST");
    remainingHeight -= pageHeight;
  }

  pdf.save(`${fileSlug(name)}.pdf`);
}
