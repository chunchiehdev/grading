import PDFDocument from 'pdfkit';

/**
 * Generate a real PDF file from text content
 *
 * This creates a properly formatted PDF with:
 * - PDF header and structure
 * - Binary encoding
 * - Text content rendered on pages
 *
 * @param content - The text content to include in the PDF
 * @returns Promise resolving to a Buffer containing the PDF binary data
 */
export function createTestPdf(content: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 72,
        right: 72,
      },
    });

    const chunks: Buffer[] = [];

    // Collect PDF data chunks
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Resolve with complete PDF when finished
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      console.log(`   📄 Generated PDF: ${pdfBuffer.length} bytes (real PDF format)`);
      resolve(pdfBuffer);
    });

    // Handle errors
    doc.on('error', reject);

    // Add title
    doc.fontSize(16).font('Helvetica-Bold').text('Test Submission', { align: 'center' });
    doc.moveDown();

    // Add content
    doc.fontSize(12).font('Helvetica').text(content, {
      align: 'left',
      lineGap: 2,
    });

    // Add footer
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica-Oblique').text('Generated for E2E testing', {
      align: 'center',
    });

    // Finalize the PDF
    doc.end();
  });
}

/**
 * Create multiple test PDFs concurrently
 *
 * @param contents - Array of text contents to generate PDFs for
 * @returns Promise resolving to array of PDF buffers
 */
export async function createTestPdfs(contents: string[]): Promise<Buffer[]> {
  return Promise.all(contents.map(content => createTestPdf(content)));
}
