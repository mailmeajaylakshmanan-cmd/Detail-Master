import html2pdf from 'html2pdf.js';

/**
 * Generate a PDF Blob directly on the client side from a DOM element.
 * Fast, 100% reliable, zero backend dependencies or Puppeteer errors.
 */
export async function generatePDFBlob(elementId = 'invoice-print', filename = 'document.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} not found`);
  }

  // Clone element briefly or render with perfect A4 proportions
  const opt = {
    margin: 0,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      windowWidth: element.scrollWidth || 800
    },
    jsPDF: {
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  const worker = html2pdf().set(opt).from(element);
  const blob = await worker.outputPdf('blob');
  return blob;
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
