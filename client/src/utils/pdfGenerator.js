import html2pdf from 'html2pdf.js';

/**
 * Generate a PDF Blob directly on the client side from a DOM element.
 * Fast, 100% reliable, zero backend dependencies or Puppeteer errors.
 */
export async function generatePDFBlob(elementId = 'invoice-print', filename = 'document.pdf') {
  const original = document.getElementById(elementId);
  if (!original) {
    throw new Error(`Element #${elementId} not found`);
  }

  // Clone the element into an isolated off-screen container without any parent transform: scale(...)
  const clone = original.cloneNode(true);
  clone.id = `${elementId}-pdf-clone`;

  // Standard A4 at 96 DPI: 210mm = 794px, 296mm = 1119px
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '0';
  container.style.width = '794px';
  container.style.minHeight = '1120px';
  container.style.margin = '0';
  container.style.padding = '0';
  container.style.zIndex = '-99999';
  container.style.background = '#FFFFFF';
  container.style.transform = 'none';
  container.style.webkitTransform = 'none';
  container.style.overflow = 'visible';

  // Normalize clone container styles
  clone.style.width = '794px';
  clone.style.maxWidth = '794px';
  clone.style.minHeight = '1120px';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.border = 'none';
  clone.style.boxShadow = 'none';
  clone.style.transform = 'none';
  clone.style.webkitTransform = 'none';
  clone.style.position = 'relative';
  clone.style.top = '0';
  clone.style.left = '0';

  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    const worker = html2pdf().set(opt).from(clone);
    const blob = await worker.outputPdf('blob');
    return blob;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Download a DOM element as a crisp, high-resolution PDF file.
 */
export async function downloadElementPDF(elementId = 'invoice-print', filename = 'document.pdf') {
  const blob = await generatePDFBlob(elementId, filename);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
